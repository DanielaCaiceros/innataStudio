// lib/services/unlimited-week.service.ts

import { prisma } from '@/lib/prisma'
import { SystemConfigService } from './system-config.service'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { isBusinessDay, countBusinessDays } from '@/lib/utils/business-days'
import { convertUTCToLocalDate, createClassDateTime } from '@/lib/utils/date'

export interface UnlimitedWeekValidation {
  isValid: boolean
  canUseUnlimitedWeek: boolean
  reason?: string
  message?: string
  timeRemaining?: {
    hours: number
    minutes: number
  }
  weeklyUsage?: {
    used: number
    limit: number
    remaining: number
  }
  packageValidity?: {
    isValid: boolean
    businessDaysRemaining: number
    expiryDate: Date
  }
}

export class UnlimitedWeekService {
  /**
   * ID del paquete Semana Ilimitada
   */
  private static readonly UNLIMITED_WEEK_PACKAGE_ID = 3

  /**
   * Valida si un usuario puede usar Semana Ilimitada para una clase específica
   */
  static async validateUnlimitedWeekReservation(
    userId: number,
    scheduledClassId: number,
  ): Promise<UnlimitedWeekValidation> {
    console.log(`\n🔍 [UW-MAIN-DEBUG] ===== STARTING UNLIMITED WEEK VALIDATION =====`);
    console.log(`🔍 [UW-MAIN-DEBUG] Input - userId: ${userId}, scheduledClassId: ${scheduledClassId}`);
    
    try {
      // 1. Obtener información de la clase
      console.log(`🔍 [UW-MAIN-DEBUG] Step 1: Fetching scheduled class information...`);
      const scheduledClass = await prisma.scheduledClass.findUnique({
        where: { id: scheduledClassId },
        include: { classType: true },
      });

      if (!scheduledClass) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 1 FAILED: Class not found`);
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'CLASS_NOT_FOUND', message: 'Clase no encontrada' };
      }

      console.log(`✅ [UW-MAIN-DEBUG] Step 1 PASSED: Class found`);
      console.log(`🔍 [UW-MAIN-DEBUG] Class details:`, {
        id: scheduledClass.id,
        date: scheduledClass.date.toISOString(),
        time: scheduledClass.time.toISOString(),
        classType: scheduledClass.classType?.name,
        availableSpots: scheduledClass.availableSpots
      });

      // Normalize class date to UTC midnight for comparison
      console.log(`🔍 [UW-MAIN-DEBUG] Step 2: Normalizing class date for package query...`);
      const classDateRaw = scheduledClass.date;
      console.log(`🔍 [UW-MAIN-DEBUG] classDateRaw (from scheduledClass.date):`, classDateRaw.toISOString());
      const rawYear = classDateRaw.getUTCFullYear();
      const rawMonth = classDateRaw.getUTCMonth(); // 0-indexed
      const rawDay = classDateRaw.getUTCDate();
      console.log(`🔍 [UW-MAIN-DEBUG] Raw UTC Date components from classDateRaw: Year=${rawYear}, Month=${rawMonth}, Day=${rawDay}`);
      const classDateUTC = new Date(Date.UTC(rawYear, rawMonth, rawDay, 0, 0, 0, 0));
      console.log(`🔍 [UW-MAIN-DEBUG] Constructed classDateUTC (for query):`, classDateUTC.toISOString());

      // 2. Buscar un paquete de Semana Ilimitada válido para la fecha de esta clase
      console.log(`🔍 [UW-MAIN-DEBUG] Step 2: Searching for valid Unlimited Week package...`);
      console.log(`🔍 [UW-MAIN-DEBUG] Query criteria:`, {
        userId,
        packageId: this.UNLIMITED_WEEK_PACKAGE_ID,
        isActive: true,
        purchaseDate_lte: classDateUTC.toISOString(),
        expiryDate_gte: classDateUTC.toISOString()
      });
      
      const validPackageForClass = await prisma.userPackage.findFirst({
        where: {
          userId,
          packageId: this.UNLIMITED_WEEK_PACKAGE_ID,
          isActive: true,
          purchaseDate: { lte: classDateUTC },
          expiryDate: { gte: classDateUTC },
        },
      });

      if (!validPackageForClass) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 2 FAILED: No valid package found for class date`);
        
        const anyActiveUnlimitedPackage = await prisma.userPackage.findFirst({
          where: { userId, packageId: this.UNLIMITED_WEEK_PACKAGE_ID, isActive: true },
          orderBy: { purchaseDate: 'desc' },
        });

        if (anyActiveUnlimitedPackage) {
          console.log(`🔍 [UW-MAIN-DEBUG] Debug: An active unlimited package exists, but its dates did not match:`, {
            packageId: anyActiveUnlimitedPackage.id,
            packagePurchaseDate: anyActiveUnlimitedPackage.purchaseDate.toISOString(),
            packageExpiryDate: anyActiveUnlimitedPackage.expiryDate.toISOString(),
            classDateUTC: classDateUTC.toISOString(),
            condition_purchaseDate_lte_classDate: anyActiveUnlimitedPackage.purchaseDate <= classDateUTC,
            condition_expiryDate_gte_classDate: anyActiveUnlimitedPackage.expiryDate >= classDateUTC,
          });
        } else {
          console.log(`🔍 [UW-MAIN-DEBUG] Debug: No active unlimited package of any kind found for this user.`);
        }
        
        const anyUnlimitedPackageToShowMsg = await prisma.userPackage.findFirst({
          where: { userId, packageId: this.UNLIMITED_WEEK_PACKAGE_ID, isActive: true },
          orderBy: { purchaseDate: 'desc' },
        });
        let finalMessage = 'No tienes un paquete de Semana Ilimitada válido para esta fecha.';
        let finalReason = 'NO_VALID_PACKAGE_FOR_DATE';
        if (anyUnlimitedPackageToShowMsg) {
          const packageWeekStart = startOfWeek(anyUnlimitedPackageToShowMsg.purchaseDate, { weekStartsOn: 1 });
          const packageWeekEnd = anyUnlimitedPackageToShowMsg.expiryDate;
          finalMessage = `Tu Semana Ilimitada es válida solo del ${packageWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} al ${packageWeekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}. Esta clase no está en tu semana contratada.`;
          finalReason = 'WRONG_WEEK';
        }
        console.log(`❌ [UW-MAIN-DEBUG] Final result for Step 2: Reason=${finalReason}, Message=${finalMessage}`);
        return { isValid: false, canUseUnlimitedWeek: false, reason: finalReason, message: finalMessage };
      }

      console.log(`✅ [UW-MAIN-DEBUG] Step 2 PASSED: Valid package found`);
      console.log(`🔍 [UW-MAIN-DEBUG] Package details:`, {
        id: validPackageForClass.id,
        purchaseDate: validPackageForClass.purchaseDate.toISOString(),
        expiryDate: validPackageForClass.expiryDate.toISOString(),
        isActive: validPackageForClass.isActive
      });

      // 3. Verificar que la clase esté en días hábiles (lunes a viernes)
      console.log(`🔍 [UW-MAIN-DEBUG] Step 3: Checking if class is on business day...`);
      const isBusiness = isBusinessDay(classDateUTC);
      console.log(`🔍 [UW-MAIN-DEBUG] Is business day check:`, {
        classDateUTC: classDateUTC.toISOString(),
        dayOfWeek: classDateUTC.getUTCDay(), // 0=Sunday, 1=Monday, etc.
        isBusiness
      });
      
      if (!isBusiness) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 3 FAILED: Class is not on a business day`);
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'NON_BUSINESS_DAY', message: 'El paquete Semana Ilimitada solo está disponible de lunes a viernes' };
      }
      
      console.log(`✅ [UW-MAIN-DEBUG] Step 3 PASSED: Class is on a business day`);

      // 4. Verificar límite de clases (usando el paquete específico)
      console.log(`🔍 [UW-MAIN-DEBUG] Step 4: Checking weekly limit...`);
      const weeklyValidation = await this.validateWeeklyLimit(userId, validPackageForClass.id);
      console.log(`🔍 [UW-MAIN-DEBUG] Weekly validation result:`, {
        used: weeklyValidation.used,
        limit: weeklyValidation.limit,
        remaining: weeklyValidation.remaining,
        canReserve: weeklyValidation.canReserve
      });
      
      if (!weeklyValidation.canReserve) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 4 FAILED: Weekly limit exceeded`);
        return {
          isValid: false, canUseUnlimitedWeek: false, reason: 'WEEKLY_LIMIT_EXCEEDED',
          message: `Has alcanzado el límite de ${weeklyValidation.limit} clases para esta semana.`,
          weeklyUsage: { used: weeklyValidation.used, limit: weeklyValidation.limit, remaining: weeklyValidation.remaining },
        };
      }
      
      console.log(`✅ [UW-MAIN-DEBUG] Step 4 PASSED: Weekly limit OK`);

      // 5. Verificar tiempo de anticipación
      console.log(`🔍 [UW-MAIN-DEBUG] Step 5: Validating time requirements...`);
      const timeValidation = await this.validateTimeRequirements(scheduledClass.date, scheduledClass.time);
      console.log(`🔍 [UW-MAIN-DEBUG] Time validation result:`, {
        isValid: timeValidation.isValid,
        message: timeValidation.message,
        timeRemaining: timeValidation.timeRemaining
      });
      
      if (!timeValidation.isValid) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 5 FAILED: Time requirements not met`);
        return {
          isValid: false, canUseUnlimitedWeek: false, reason: 'INSUFFICIENT_TIME',
          message: timeValidation.message, timeRemaining: timeValidation.timeRemaining,
        };
      }
      
      console.log(`✅ [UW-MAIN-DEBUG] Step 5 PASSED: Time requirements met`);

      // 6. Verificar que no exceda 1 mes de anticipación
      console.log(`🔍 [UW-MAIN-DEBUG] Step 6: Checking if class is not too far in advance...`);
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      const classDateLocal = convertUTCToLocalDate(classDateUTC.toISOString());
      const isTooFarInAdvance = classDateLocal > oneMonthFromNow;
      console.log(`🔍 [UW-MAIN-DEBUG] Advance booking check:`, {
        classDateUTC: classDateUTC.toISOString(),
        classDateLocal: classDateLocal.toISOString(),
        oneMonthFromNow: oneMonthFromNow.toISOString(),
        isTooFarInAdvance
      });
      
      if (isTooFarInAdvance) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 6 FAILED: Class is too far in advance`);
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'TOO_FAR_IN_ADVANCE', message: 'No puedes reservar con más de 1 mes de anticipación' };
      }
      
      console.log(`✅ [UW-MAIN-DEBUG] Step 6 PASSED: Class is within allowed advance booking period`);

      // 7. Verificar que el usuario no tenga otra reserva para la misma clase
      console.log(`🔍 [UW-MAIN-DEBUG] Step 7: Checking for existing reservations...`);
      const existingReservation = await prisma.reservation.findFirst({
        where: { userId, scheduledClassId, status: { in: ['confirmed', 'pending'] } },
      });
      console.log(`🔍 [UW-MAIN-DEBUG] Existing reservation check:`, {
        foundExistingReservation: !!existingReservation,
        reservationId: existingReservation?.id,
        reservationStatus: existingReservation?.status
      });
      
      if (existingReservation) {
        console.log(`❌ [UW-MAIN-DEBUG] Step 7 FAILED: User already has a reservation for this class`);
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'ALREADY_RESERVED', message: 'Ya tienes una reserva para esta clase' };
      }
      
      console.log(`✅ [UW-MAIN-DEBUG] Step 7 PASSED: No existing reservation found`);

      console.log(`🎉 [UW-MAIN-DEBUG] ALL VALIDATIONS PASSED: User can use Unlimited Week for this class`);
      console.log(`🔍 [UW-MAIN-DEBUG] ===== UNLIMITED WEEK VALIDATION COMPLETE =====\n`);
      
      return {
        isValid: true, canUseUnlimitedWeek: true,
      };
    } catch (error) {
      console.error(`💥 [UW-MAIN-DEBUG] SYSTEM ERROR during validation:`, error);
      console.log(`🔍 [UW-MAIN-DEBUG] ===== UNLIMITED WEEK VALIDATION FAILED WITH ERROR =====\n`);
      return {
        isValid: false, canUseUnlimitedWeek: false, reason: 'SYSTEM_ERROR',
        message: 'Error del sistema al validar la reserva',
      };
    }
  }

  /**
   * Valida el límite semanal de clases
   */
  private static async validateWeeklyLimit(userId: number, userPackageId: number) {
    const reservationsCount = await prisma.reservation.count({
      where: {
        userId,
        status: 'confirmed',
        userPackageId: userPackageId,
      },
    })

    const weeklyLimit = await SystemConfigService.getWeeklyClassLimit()

    return {
      used: reservationsCount,
      limit: weeklyLimit,
      remaining: weeklyLimit - reservationsCount,
      canReserve: reservationsCount < weeklyLimit,
    }

  }

  /**
   * Valida los requerimientos de tiempo
   */
  private static async validateTimeRequirements(classDate: Date | string, classTime: Date | string) {
    console.log(`\n🕐 [UW-DEBUG] ===== VALIDATING TIME REQUIREMENTS =====`);
    
    const now = new Date()
    
    // FIXED: Use createClassDateTime to ensure consistent timezone handling
    // This resolves the issue where localhost and deployed servers had different
    // timezone interpretations causing inconsistent unlimited week validation
    const dateString = classDate instanceof Date ? classDate.toISOString() : classDate
    const timeString = classTime instanceof Date ? classTime.toISOString() : classTime
    
    console.log(`🕐 [UW-DEBUG] Input classDate: ${classDate} (type: ${typeof classDate})`);
    console.log(`🕐 [UW-DEBUG] Input classTime: ${classTime} (type: ${typeof classTime})`);
    console.log(`🕐 [UW-DEBUG] Converted dateString: ${dateString}`);
    console.log(`🕐 [UW-DEBUG] Converted timeString: ${timeString}`);
    
    // Use the same createClassDateTime function that frontend uses
    // This ensures consistent UTC handling regardless of server timezone
    const classDateTime = createClassDateTime(dateString, timeString)

    console.log(`🕐 [UW-DEBUG] Now (UTC): ${now.toISOString()}`);
    console.log(`🕐 [UW-DEBUG] Now (Local): ${now.toString()}`);
    console.log(`🕐 [UW-DEBUG] Calculated classDateTime (UTC): ${classDateTime.toISOString()}`);
    console.log(`🕐 [UW-DEBUG] Calculated classDateTime (Local): ${classDateTime.toString()}`);

    // Calcular tiempo de anticipación en minutos
    const timeUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    console.log(`🕐 [UW-DEBUG] Time until class (minutes): ${timeUntilClass}`);
    console.log(`🕐 [UW-DEBUG] Time until class (hours): ${timeUntilClass / 60}`);
    
    // Obtener tiempo de gracia configurado (1 minuto para Semana Ilimitada)
    const graceTimeHours = 0
    const minimumRequiredMinutes = 1 // solo 1 minuto de anticipación

    console.log(`🕐 [UW-DEBUG] Grace time hours: ${graceTimeHours}`);
    console.log(`🕐 [UW-DEBUG] Minimum required minutes: ${minimumRequiredMinutes}`);
    console.log(`🕐 [UW-DEBUG] Minimum required hours: ${minimumRequiredMinutes / 60}`);

    if (timeUntilClass < minimumRequiredMinutes) {
      const remainingHours = Math.floor(timeUntilClass / 60)
      const remainingMinutes = Math.floor(timeUntilClass % 60)
      
      console.log(`❌ [UW-DEBUG] VALIDATION FAILED: Not enough time remaining`);
      console.log(`❌ [UW-DEBUG] Required: ${minimumRequiredMinutes} minutes (${minimumRequiredMinutes/60} hours)`);
      console.log(`❌ [UW-DEBUG] Available: ${timeUntilClass} minutes (${timeUntilClass/60} hours)`);
      console.log(`❌ [UW-DEBUG] Short by: ${minimumRequiredMinutes - timeUntilClass} minutes`);
      
      return {
        isValid: false,
        message: 'No puedes reservar con Semana Ilimitada en este horario. Ya no hay tiempo suficiente para enviar tu confirmación por WhatsApp.',
        timeRemaining: {
          hours: Math.max(0, remainingHours),
          minutes: Math.max(0, remainingMinutes)
        }
      }
    }

    console.log(`✅ [UW-DEBUG] VALIDATION PASSED: Enough time remaining`);
    console.log(`✅ [UW-DEBUG] Required: ${minimumRequiredMinutes} minutes (${minimumRequiredMinutes/60} hours)`);
    console.log(`✅ [UW-DEBUG] Available: ${timeUntilClass} minutes (${timeUntilClass/60} hours)`);
    console.log(`✅ [UW-DEBUG] Extra time: ${timeUntilClass - minimumRequiredMinutes} minutes`);
    console.log(`🕐 [UW-DEBUG] ===== TIME VALIDATION COMPLETE =====\n`);

    return {
      isValid: true,
      timeRemaining: {
        hours: Math.floor(timeUntilClass / 60),
        minutes: Math.floor(timeUntilClass % 60)
      }
    }
  }

  /**
   * Obtiene el uso semanal actual del usuario
   */
  static async getWeeklyUsage(userId: number): Promise<{
    used: number
    limit: number
    remaining: number
    weekStart: Date
    weekEnd: Date
    activePackageInfo?: {
      isValid: boolean
      businessDaysRemaining: number
      expiryDate: Date
    }
    allUnlimitedPackages: any[]
  }> {
    const now = new Date()

    // 1. Obtener TODOS los paquetes de semana ilimitada del usuario
    const allUserPackages = await prisma.userPackage.findMany({
      where: {
        userId,
        packageId: this.UNLIMITED_WEEK_PACKAGE_ID,
        isActive: true,
      },
      orderBy: { purchaseDate: 'desc' },
    })

    // 2. Encontrar si uno de ellos está activo para HOY
    const currentPackage = allUserPackages.find(pkg =>
      isWithinInterval(now, { start: pkg.purchaseDate, end: pkg.expiryDate }),
    )

    const weeklyLimit = await SystemConfigService.getWeeklyClassLimit()

    if (!currentPackage) {
      // Si no hay paquete para la semana actual, devolver valores por defecto pero aun así devolver la lista de todos los paquetes
      return {
        used: 0,
        limit: weeklyLimit,
        remaining: weeklyLimit,
        weekStart: startOfWeek(now, { weekStartsOn: 1 }),
        weekEnd: endOfWeek(now, { weekStartsOn: 1 }),
        activePackageInfo: undefined,
        allUnlimitedPackages: allUserPackages,
      }
    }

    // 3. Si se encuentra un paquete activo, calcular su uso
    const reservationsCount = await prisma.reservation.count({
      where: {
        userId,
        status: 'confirmed',
        userPackageId: currentPackage.id,
      },
    })

    const businessDaysRemaining = countBusinessDays(now, currentPackage.expiryDate)

    return {
      used: reservationsCount,
      limit: weeklyLimit,
      remaining: weeklyLimit - reservationsCount,
      weekStart: currentPackage.purchaseDate,
      weekEnd: currentPackage.expiryDate,
      activePackageInfo: {
        isValid: true,
        businessDaysRemaining,
        expiryDate: currentPackage.expiryDate,
      },
      allUnlimitedPackages: allUserPackages,
    }
  }
}