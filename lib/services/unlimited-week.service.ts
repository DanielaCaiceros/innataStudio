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
    try {
      // 1. Obtener información de la clase
      const scheduledClass = await prisma.scheduledClass.findUnique({
        where: { id: scheduledClassId },
        include: {
          classType: true,
        },
      })

      if (!scheduledClass) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'CLASS_NOT_FOUND',
          message: 'Clase no encontrada',
        }
      }

      const classDate = scheduledClass.date

      // 2. Buscar un paquete de Semana Ilimitada válido para la fecha de esta clase
      const userPackages = await prisma.userPackage.findMany({
        where: {
          userId,
          packageId: this.UNLIMITED_WEEK_PACKAGE_ID,
          isActive: true,
        },
        orderBy: { purchaseDate: 'desc' },
      })

      const validPackageForClass = userPackages.find(pkg => {
        // Timezone-safe date comparison.
        // This normalizes all dates to midnight UTC to compare only the calendar date,
        // ignoring time-of-day and timezone shifts.
        const classCalDate = new Date(Date.UTC(classDate.getUTCFullYear(), classDate.getUTCMonth(), classDate.getUTCDate()));
        
        const packageStartDate = new Date(pkg.purchaseDate);
        packageStartDate.setUTCHours(0,0,0,0);

        const packageEndDate = new Date(pkg.expiryDate);
        packageEndDate.setUTCHours(0,0,0,0);
        
        return classCalDate >= packageStartDate && classCalDate <= packageEndDate;
      })

      if (!validPackageForClass) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'NO_VALID_PACKAGE_FOR_DATE',
          message:
            'No tienes un paquete de Semana Ilimitada válido para esta fecha.',
        }
      }

      // 3. Verificar que la clase esté en días hábiles (lunes a viernes)
      if (!isBusinessDay(classDate)) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'NON_BUSINESS_DAY',
          message:
            'El paquete Semana Ilimitada solo está disponible de lunes a viernes',
        }
      }

      // 4. Verificar límite de clases (usando el paquete específico)
      const weeklyValidation = await this.validateWeeklyLimit(
        userId,
        validPackageForClass.id,
      )
      if (!weeklyValidation.canReserve) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'WEEKLY_LIMIT_EXCEEDED',
          message: `Has alcanzado el límite de ${weeklyValidation.limit} clases para esta semana.`,
          weeklyUsage: {
            used: weeklyValidation.used,
            limit: weeklyValidation.limit,
            remaining: weeklyValidation.remaining,
          },
        }
      }

      // 5. Verificar tiempo de anticipación
      const timeValidation = await this.validateTimeRequirements(
        scheduledClass.date,
        scheduledClass.time,
      )
      if (!timeValidation.isValid) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'INSUFFICIENT_TIME',
          message: timeValidation.message,
          timeRemaining: timeValidation.timeRemaining,
        }
      }

      // 6. Verificar que no exceda 1 mes de anticipación
      const oneMonthFromNow = new Date()
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

      if (convertUTCToLocalDate(classDate.toISOString()) > oneMonthFromNow) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'TOO_FAR_IN_ADVANCE',
          message: 'No puedes reservar con más de 1 mes de anticipación',
        }
      }

      // 7. Verificar que el usuario no tenga otra reserva para la misma clase
      const existingReservation = await prisma.reservation.findFirst({
        where: {
          userId,
          scheduledClassId,
          status: {
            in: ['confirmed', 'pending'] // Check both confirmed and pending reservations
          },
        },
      })

      if (existingReservation) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'ALREADY_RESERVED',
          message: 'Ya tienes una reserva para esta clase',
        }
      }

      // Si llegamos aquí, la validación es exitosa
      return {
        isValid: true,
        canUseUnlimitedWeek: true,
        message:
          'Estás reservando con Semana Ilimitada. Para garantizar tu lugar, envía tu confirmación por WhatsApp con al menos 12 horas de anticipación',
      }
    } catch (error) {
      console.error('Error validando Semana Ilimitada:', error)
      return {
        isValid: false,
        canUseUnlimitedWeek: false,
        reason: 'SYSTEM_ERROR',
        message: 'Error del sistema al validar la reserva',
      }
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
    const now = new Date()
    
    // Combinar fecha y hora de la clase usando manejo correcto de fechas para México
    const dateString = classDate instanceof Date ? classDate.toISOString() : classDate
    const classDateObj = new Date(dateString)
    const classTimeObj = new Date(classTime)
    
    const classDateTime = new Date(
      classDateObj.getFullYear(),
      classDateObj.getMonth(),
      classDateObj.getDate(),
      classTimeObj.getHours(),
      classTimeObj.getMinutes(),
      0,
      0
    )

    // Calcular tiempo de anticipación en minutos
    const timeUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    // Obtener tiempo de gracia configurado (12.5 horas para Semana Ilimitada)
    const graceTimeHours = 12
    const minimumRequiredMinutes = (graceTimeHours * 60) + 30 // gracia + 30 minutos

    if (timeUntilClass < minimumRequiredMinutes) {
      const remainingHours = Math.floor(timeUntilClass / 60)
      const remainingMinutes = Math.floor(timeUntilClass % 60)
      
      return {
        isValid: false,
        message: 'No puedes reservar con Semana Ilimitada en este horario. Ya no hay tiempo suficiente para enviar tu confirmación por WhatsApp.',
        timeRemaining: {
          hours: Math.max(0, remainingHours),
          minutes: Math.max(0, remainingMinutes)
        }
      }
    }

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