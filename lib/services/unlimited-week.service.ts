// lib/services/unlimited-week.service.ts

import { prisma } from '@/lib/prisma'
import { SystemConfigService } from './system-config.service'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns' // Added addWeeks
import { 
  isBusinessDay, 
  isUnlimitedWeekValid, 
  getUnlimitedWeekValidityInfo,
  countBusinessDays 
} from '@/lib/utils/business-days'
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
    scheduledClassId: number
  ): Promise<UnlimitedWeekValidation> {
    
    try {
      // 1. Verificar que el usuario tenga un paquete Semana Ilimitada activo
      const activePackage = await this.getActiveUnlimitedWeekPackage(userId)
      if (!activePackage) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'NO_ACTIVE_PACKAGE',
          message: 'No tienes un paquete Semana Ilimitada activo'
        }
      }

      // 2. Verificar vigencia basada en días hábiles
      const packageValidityInfo = getUnlimitedWeekValidityInfo(activePackage.purchaseDate)
      if (!packageValidityInfo.isValid) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'PACKAGE_EXPIRED',
          message: `Tu paquete Semana Ilimitada expiró el ${packageValidityInfo.expiryDate.toLocaleDateString('es-ES')}`,
          packageValidity: packageValidityInfo
        }
      }

      // 3. Obtener información de la clase
      const scheduledClass = await prisma.scheduledClass.findUnique({
        where: { id: scheduledClassId },
        include: {
          classType: true
        }
      })

      if (!scheduledClass) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'CLASS_NOT_FOUND',
          message: 'Clase no encontrada'
        }
      }

      // 4. Verificar que la clase esté en días hábiles (lunes a viernes)
      const classDate = convertUTCToLocalDate(scheduledClass.date.toISOString())
      
      if (!isBusinessDay(classDate)) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'NON_BUSINESS_DAY',
          message: 'El paquete Semana Ilimitada solo está disponible de lunes a viernes'
        }
      }

      // NUEVA VALIDACIÓN: Límite diario de clases (Correctly placed)
      const dailyLimit = 5 // Límite diario harcodeado por ahora
      const startOfDayForDailyCheck = new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate())
      const endOfDayForDailyCheck = new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate() + 1)
      
      const dailyReservations = await prisma.reservation.count({
        where: {
          userId,
          status: 'confirmed',
          userPackage: {
            packageId: UnlimitedWeekService.UNLIMITED_WEEK_PACKAGE_ID
          },
          scheduledClass: {
            date: { 
              gte: startOfDayForDailyCheck,
              lt: endOfDayForDailyCheck
            }
          }
        }
      })

      if (dailyReservations >= dailyLimit) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'DAILY_LIMIT_EXCEEDED',
          message: `Has alcanzado el límite diario de ${dailyLimit} clases para el día ${classDate.toLocaleDateString('es-ES')}`
        }
      }

      // 5. Verificar límite semanal de clases
      const weeklyValidation = await this.validateWeeklyLimit(userId, scheduledClass.date)
      if (!weeklyValidation.canReserve) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'WEEKLY_LIMIT_EXCEEDED',
          message: `Has alcanzado el límite semanal de ${weeklyValidation.limit} clases`,
          weeklyUsage: {
            used: weeklyValidation.used,
            limit: weeklyValidation.limit,
            remaining: weeklyValidation.remaining
          }
        }
      }

      // 6. Verificar tiempo de anticipación
      const timeValidation = await this.validateTimeRequirements(scheduledClass.date, scheduledClass.time)
      if (!timeValidation.isValid) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'INSUFFICIENT_TIME',
          message: timeValidation.message,
          timeRemaining: timeValidation.timeRemaining
        }
      }

      // 7. Verificar que no exceda el límite de reserva futura (3 semanas calendario completas)
      const today = new Date()
      const endOfThirdWeek = endOfWeek(addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 3), { weekStartsOn: 1 })
      endOfThirdWeek.setHours(23, 59, 59, 999)

      if (classDate > endOfThirdWeek) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'TOO_FAR_IN_ADVANCE',
          message: `Solo puedes reservar clases hasta el ${endOfThirdWeek.toLocaleDateString('es-ES')}.`
        }
      }

      // 8. Verificar que el usuario no tenga otra reserva para la misma clase
      const existingReservation = await prisma.reservation.findFirst({
        where: {
          userId,
          scheduledClassId,
          status: "confirmed"
        }
      })


      if (existingReservation) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          reason: 'ALREADY_RESERVED',
          message: 'Ya tienes una reserva para esta clase'
        }
      }

      // Si llegamos aquí, la validación es exitosa
      return {
        isValid: true,
        canUseUnlimitedWeek: true,
        message: `Estás reservando con Semana Ilimitada. Para garantizar tu lugar, envía tu confirmación por WhatsApp con al menos 12 horas de anticipación`,
        
      }

    } catch (error) {
      console.error('Error validando Semana Ilimitada:', error)
      return {
        isValid: false,
        canUseUnlimitedWeek: false,
        reason: 'SYSTEM_ERROR',
        message: 'Error del sistema al validar la reserva'
      }
    }
  }

  /**
   * Obtiene el paquete Semana Ilimitada activo del usuario
   * Ahora incluye verificación de vigencia por días hábiles
   */
  private static async getActiveUnlimitedWeekPackage(userId: number) {
    const packages = await prisma.userPackage.findMany({
      where: {
        userId,
        packageId: this.UNLIMITED_WEEK_PACKAGE_ID,
        isActive: true,
        classesRemaining: { gt: 0 }
      },
      include: {
        package: true
      },
      orderBy: {
        purchaseDate: 'desc' // Más reciente primero
      }
    })

    // Verificar vigencia basada en días hábiles para cada paquete
    for (const pkg of packages) {
      if (isUnlimitedWeekValid(pkg.purchaseDate)) {
        return pkg
      }
    }

    return null
  }

  /**
   * Valida el límite semanal de clases
   */
  private static async validateWeeklyLimit(userId: number, classDate: Date | string) {
    const dateString = classDate instanceof Date ? classDate.toISOString() : classDate
    const targetDate = convertUTCToLocalDate(dateString)
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }) // Lunes
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }) // Domingo

    // Contar reservas confirmadas en la semana con paquete Semana Ilimitada
    // Solo contar reservas en días hábiles
    const weeklyReservations = await prisma.reservation.count({
      where: {
        userId,
        status: 'confirmed',
        userPackage: {
          packageId: this.UNLIMITED_WEEK_PACKAGE_ID
        },
        scheduledClass: {
          date: {
            gte: weekStart,
            lte: weekEnd
          }
          // Solo necesitamos contar clases en días hábiles, pero esto se filtra naturalmente
          // ya que solo se pueden hacer reservas en días hábiles con Semana Ilimitada
        }
      }
    })

    const weeklyLimit = await SystemConfigService.getWeeklyClassLimit()
    
    return {
      used: weeklyReservations,
      limit: weeklyLimit,
      remaining: weeklyLimit - weeklyReservations,
      canReserve: weeklyReservations < weeklyLimit
    }
  }
  /**
   * Valida los requerimientos de tiempo
   */
  private static async validateTimeRequirements(classDate: Date | string, classTime: Date | string) {
    const now = new Date()
    
    // Combinar fecha y hora de la clase usando manejo correcto de fechas
    const dateString = classDate instanceof Date ? classDate.toISOString() : classDate
    const classDateObj = convertUTCToLocalDate(dateString)
    const classTimeObj = new Date(classTime)
    
    const classDateTime = new Date(
      classDateObj.getFullYear(),
      classDateObj.getMonth(),
      classDateObj.getDate(),
      classTimeObj.getUTCHours(),
      classTimeObj.getUTCMinutes(),
      0,
      0
    )

    // Calcular tiempo de anticipación en minutos
    const timeUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60)
    
    // Obtener tiempo de gracia configurado
    const graceTimeHours = 12
    const minimumRequiredMinutes = (graceTimeHours * 60) + 30 // gracia + 30 minutos

    if (timeUntilClass < minimumRequiredMinutes) {
      const remainingHours = Math.floor(timeUntilClass / 60)
      const remainingMinutes = Math.floor(timeUntilClass % 60)
      
      return {
        isValid: false,
        message: 'No puedes reservar con Semana Ilimitada en este horario. Ya no hay tiempo suficiente para enviar tu confirmación.',
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
    used: number;
    limit: number;
    remaining: number;
    weekStart: Date;
    weekEnd: Date;
    activePackageInfo?: {
      isValid: boolean;
      businessDaysRemaining: number;
      expiryDate: Date;
    };
  }> {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const weeklyReservations = await prisma.reservation.count({
      where: {
        userId,
        status: 'confirmed',
        userPackage: {
          packageId: this.UNLIMITED_WEEK_PACKAGE_ID
        },
        scheduledClass: {
          date: {
            gte: weekStart,
            lte: weekEnd
          }
        }
      }
    })

    const weeklyLimit = await SystemConfigService.getWeeklyClassLimit()

    // Obtener información del paquete activo
    const activePackage = await this.getActiveUnlimitedWeekPackage(userId)
    let activePackageInfo = undefined

    if (activePackage) {
      activePackageInfo = getUnlimitedWeekValidityInfo(activePackage.purchaseDate)
    }

    return {
      used: weeklyReservations,
      limit: weeklyLimit,
      remaining: weeklyLimit - weeklyReservations,
      weekStart,
      weekEnd,
      activePackageInfo
    }
  }
}