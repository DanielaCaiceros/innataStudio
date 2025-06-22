// lib/services/unlimited-week.service.ts

import { prisma } from '@/lib/prisma'
import { SystemConfigService } from './system-config.service'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { isBusinessDay, countBusinessDays } from '@/lib/utils/business-days'
import { convertUTCToLocalDate } from '@/lib/utils/date'

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
    console.log(`[UWService_Trace] Start validation for userId: ${userId}, classId: ${scheduledClassId}`);
    try {
      // 1. Obtener información de la clase
      const scheduledClass = await prisma.scheduledClass.findUnique({
        where: { id: scheduledClassId },
        include: { classType: true },
      });

      if (!scheduledClass) {
        console.log('[UWService_Trace] Failed: Class not found.');
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'CLASS_NOT_FOUND', message: 'Clase no encontrada' };
      }
      console.log(`[UWService_Trace] Found scheduledClass: ID=${scheduledClass.id}, Date=${scheduledClass.date.toISOString()}`);

      // Normalize class date to UTC midnight for comparison
      const classDateRaw = scheduledClass.date;
      // console.log('[UWService_Trace] classDateRaw (from scheduledClass.date):', classDateRaw.toISOString()); // Covered by existing log
      const rawYear = classDateRaw.getUTCFullYear();
      const rawMonth = classDateRaw.getUTCMonth(); // 0-indexed
      const rawDay = classDateRaw.getUTCDate();
      // console.log(`[UWService_Trace] Raw UTC Date components from classDateRaw: Year=${rawYear}, Month=${rawMonth}, Day=${rawDay}`); // Covered by existing log
      const classDateUTC = new Date(Date.UTC(rawYear, rawMonth, rawDay, 0, 0, 0, 0));
      // console.log('[UWService_Trace] Constructed classDateUTC (for query):', classDateUTC.toISOString()); // Covered by existing log

      // 2. Buscar un paquete de Semana Ilimitada válido para la fecha de esta clase
      console.log(`[UWService_Trace] Check 2: Querying for valid package for userId: ${userId}, classDateUTC: ${classDateUTC.toISOString()}`);
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
        console.log('[UWService_Trace] Initial package query: No package found matching specific date criteria.');
        const anyActiveUnlimitedPackage = await prisma.userPackage.findFirst({
          where: { userId, packageId: this.UNLIMITED_WEEK_PACKAGE_ID, isActive: true },
          orderBy: { purchaseDate: 'desc' },
        });

        if (anyActiveUnlimitedPackage) {
          console.log('[UWService_Trace] Debug: An active unlimited package exists, but its dates did not match the classDateUTC for the query:', {
            packageId: anyActiveUnlimitedPackage.id,
            packagePurchaseDate: anyActiveUnlimitedPackage.purchaseDate.toISOString(), // Ensure toISOString for consistent logging
            packageExpiryDate: anyActiveUnlimitedPackage.expiryDate.toISOString(),   // Ensure toISOString
            classDateUTC: classDateUTC.toISOString(),
            condition_purchaseDate_lte_classDate: anyActiveUnlimitedPackage.purchaseDate <= classDateUTC,
            condition_expiryDate_gte_classDate: anyActiveUnlimitedPackage.expiryDate >= classDateUTC,
          });
        } else {
          console.log('[UWService_Trace] Debug: No active unlimited package of any kind found for this user.');
        }
        
        const anyUnlimitedPackageToShowMsg = await prisma.userPackage.findFirst({ // Renamed from anyUnlimitedPackage
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
        console.log(`[UWService_Trace] Failed at Check 2: No valid package for date. Reason: ${finalReason}`);
        return { isValid: false, canUseUnlimitedWeek: false, reason: finalReason, message: finalMessage };
      }
      console.log(`[UWService_Trace] Found valid package: ID=${validPackageForClass.id}, Purchase=${validPackageForClass.purchaseDate.toISOString()}, Expiry=${validPackageForClass.expiryDate.toISOString()}`);

      // 3. Verificar que la clase esté en días hábiles (lunes a viernes)
      console.log('[UWService_Trace] Check 3: Business day validation...');
      const isBusiness = isBusinessDay(classDateUTC);
      console.log(`[UWService_Trace] isBusinessDay(${classDateUTC.toISOString()}) result: ${isBusiness}`);
      if (!isBusiness) {
        console.log('[UWService_Trace] Failed at Check 3: Not a business day.');
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'NON_BUSINESS_DAY', message: 'El paquete Semana Ilimitada solo está disponible de lunes a viernes' };
      }

      // 4. Verificar límite de clases (usando el paquete específico)
      console.log('[UWService_Trace] Check 4: Weekly limit validation...');
      const weeklyValidation = await this.validateWeeklyLimit(userId, validPackageForClass.id);
      console.log('[UWService_Trace] Weekly limit validation result:', weeklyValidation);
      if (!weeklyValidation.canReserve) {
        console.log('[UWService_Trace] Failed at Check 4: Weekly limit exceeded.');
        return {
          isValid: false, canUseUnlimitedWeek: false, reason: 'WEEKLY_LIMIT_EXCEEDED',
          message: `Has alcanzado el límite de ${weeklyValidation.limit} clases para esta semana.`,
          weeklyUsage: { used: weeklyValidation.used, limit: weeklyValidation.limit, remaining: weeklyValidation.remaining },
        };
      }

      // 5. Verificar tiempo de anticipación
      console.log(`[UWService_Trace] Check 5: Time requirements. Class ID ${scheduledClass.id}, scheduledClass.date: ${scheduledClass.date.toISOString()}, scheduledClass.time: ${scheduledClass.time.toISOString()}`);
      const timeValidation = await this.validateTimeRequirements(scheduledClass.date, scheduledClass.time);
      // console.log('[UWService_Trace] Time validation result:', JSON.stringify(timeValidation, null, 2)); // Covered by existing log
      if (!timeValidation.isValid) {
        console.log('[UWService_Trace] Failed at Check 5: Insufficient time for booking.');
        return {
          isValid: false, canUseUnlimitedWeek: false, reason: 'INSUFFICIENT_TIME',
          message: timeValidation.message, timeRemaining: timeValidation.timeRemaining,
        };
      }

      // 6. Verificar que no exceda 1 mes de anticipación
      console.log('[UWService_Trace] Check 6: >1 month advance booking validation...');
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      const isTooFarInAdvance = convertUTCToLocalDate(classDateUTC.toISOString()) > oneMonthFromNow;
      console.log(`[UWService_Trace] Is too far in advance (>1 month) result: ${isTooFarInAdvance}`);
      if (isTooFarInAdvance) {
        console.log('[UWService_Trace] Failed at Check 6: Booking too far in advance.');
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'TOO_FAR_IN_ADVANCE', message: 'No puedes reservar con más de 1 mes de anticipación' };
      }

      // 7. Verificar que el usuario no tenga otra reserva para la misma clase
      console.log('[UWService_Trace] Check 7: Existing reservation validation for this class...');
      const existingReservation = await prisma.reservation.findFirst({
        where: { userId, scheduledClassId, status: { in: ['confirmed', 'pending'] } },
      });
      console.log(`[UWService_Trace] Existing reservation found: ${existingReservation ? `ID=${existingReservation.id}` : 'None'}`);
      if (existingReservation) {
        console.log('[UWService_Trace] Failed at Check 7: Already reserved this class.');
        return { isValid: false, canUseUnlimitedWeek: false, reason: 'ALREADY_RESERVED', message: 'Ya tienes una reserva para esta clase' };
      }

      console.log('[UWService_Trace] All validations passed. Granting unlimited week usage.');
      return {
        isValid: true, canUseUnlimitedWeek: true,
        message: 'Estás reservando con Semana Ilimitada. Para garantizar tu lugar, envía tu confirmación por WhatsApp con al menos 12 horas de anticipación',
      };
    } catch (error) {
      console.error('[UWService_Trace] Error during validation:', error); // Added trace prefix
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
    console.log(`[Service TimeCheck]  validating time for classDate: ${classDate}, classTime: ${classTime}`);
    const now = new Date()
    
    // FIX: Combine date and time using UTC methods to prevent timezone corruption.
    // The previous implementation used local-time methods (.getFullYear(), .getHours())
    // which could corrupt the date when the server's timezone was different from UTC.
    const dateString = classDate instanceof Date ? classDate.toISOString() : classDate
    const classDateObj = new Date(dateString)
    const classTimeObj = new Date(classTime)
    
    const classDateTime = new Date(Date.UTC(
      classDateObj.getUTCFullYear(),
      classDateObj.getUTCMonth(),
      classDateObj.getUTCDate(),
      classTimeObj.getUTCHours(),
      classTimeObj.getUTCMinutes(),
      0,
      0
    ))

    console.log(`[Service TimeCheck] Now (local): ${now.toString()}`);
    console.log(`[Service TimeCheck] Calculated classDateTime (UTC): ${classDateTime.toUTCString()}`);

    // Calcular tiempo de anticipación en minutos
    const timeUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    console.log(`[Service TimeCheck] Time until class (minutes): ${timeUntilClass}`);
    
    // Obtener tiempo de gracia configurado (12.5 horas para Semana Ilimitada)
    const graceTimeHours = 12
    const minimumRequiredMinutes = (graceTimeHours * 60) + 30 // gracia + 30 minutos

    console.log(`[Service TimeCheck] Minimum required minutes: ${minimumRequiredMinutes}`);

    if (timeUntilClass < minimumRequiredMinutes) {
      const remainingHours = Math.floor(timeUntilClass / 60)
      const remainingMinutes = Math.floor(timeUntilClass % 60)
      
      console.log('[Service TimeCheck] ❌ Time requirement NOT MET.');
      return {
        isValid: false,
        message: 'No puedes reservar con Semana Ilimitada en este horario. Ya no hay tiempo suficiente para enviar tu confirmación por WhatsApp.',
        timeRemaining: {
          hours: Math.max(0, remainingHours),
          minutes: Math.max(0, remainingMinutes)
        }
      }
    }

    console.log('[Service TimeCheck] ✅ Time requirement MET.');
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