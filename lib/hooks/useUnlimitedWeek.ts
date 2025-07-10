// lib/hooks/useUnlimitedWeek.ts

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

interface UnlimitedWeekValidation {
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
}

interface WeeklyUsage {
  used: number
  limit: number
  remaining: number
  weekStart: string
  weekEnd: string
  activePackageInfo?: {
    isValid: boolean
    businessDaysRemaining: number
    expiryDate: string
  }
  allUnlimitedPackages: any[]
}

export function useUnlimitedWeek() {
  const { isAuthenticated } = useAuth()
  const [weeklyUsage, setWeeklyUsage] = useState<WeeklyUsage | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Obtener uso semanal actual
  const fetchWeeklyUsage = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('🔍 [Frontend] fetchWeeklyUsage: Usuario no autenticado')
      setIsLoading(false)
      return
    }

    console.log('🔍 [Frontend] fetchWeeklyUsage: Iniciando solicitud de uso semanal')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reservations/validate-unlimited-week', {
        method: 'GET',
        credentials: 'include',
      })

      console.log('🔍 [Frontend] fetchWeeklyUsage: Respuesta recibida, status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 [Frontend] fetchWeeklyUsage: Datos recibidos:', {
          hasActivePackage: !!data.activePackageInfo,
          used: data.used,
          limit: data.limit,
          remaining: data.remaining,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          businessDaysRemaining: data.activePackageInfo?.businessDaysRemaining,
          expiryDate: data.activePackageInfo?.expiryDate
        })
        setWeeklyUsage(data)
      } else {
        const errorData = await response.json()
        console.error('🔍 [Frontend] fetchWeeklyUsage: Error en respuesta:', errorData)
        setError(errorData.error || 'Error obteniendo uso semanal')
        setWeeklyUsage(null) // Set to null on error
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('🔍 [Frontend] fetchWeeklyUsage: Error de conexión:', err)
      setWeeklyUsage(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Validar si se puede usar Semana Ilimitada para una clase específica
  const validateUnlimitedWeek = useCallback(
    async (scheduledClassId: number): Promise<UnlimitedWeekValidation> => {
      console.log('🔍 [Frontend] validateUnlimitedWeek: Iniciando validación para clase:', scheduledClassId)
      
      if (!isAuthenticated) {
        console.log('🔍 [Frontend] validateUnlimitedWeek: Usuario no autenticado')
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          message: 'Debes iniciar sesión',
        }
      }

      try {
        console.log('🔍 [Frontend] validateUnlimitedWeek: Enviando solicitud POST a API')
        const response = await fetch(
          '/api/reservations/validate-unlimited-week',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ scheduledClassId }),
          },
        )

        console.log('🔍 [Frontend] validateUnlimitedWeek: Respuesta recibida, status:', response.status)
        
        const data = await response.json()
        
        console.log('🔍 [Frontend] validateUnlimitedWeek: Datos de respuesta:', {
          isValid: data.isValid,
          canUseUnlimitedWeek: data.canUseUnlimitedWeek,
          reason: data.reason,
          message: data.message,
          timeRemaining: data.timeRemaining,
          weeklyUsage: data.weeklyUsage,
          responseStatus: response.status
        })

        // Actualizar uso semanal si viene en la respuesta de error
        if (data.weeklyUsage) {
          console.log('🔍 [Frontend] validateUnlimitedWeek: Actualizando uso semanal desde respuesta')
          setWeeklyUsage(current => {
            if (!current) return null
            return {
              ...current,
              ...data.weeklyUsage,
            }
          })
        }

        return data
      } catch (err) {
        console.error('🔍 [Frontend] validateUnlimitedWeek: Error en solicitud:', err)
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          message: 'Error del sistema al validar',
        }
      }
    },
    [isAuthenticated],
  )

  // Cargar uso semanal al montar el hook
  useEffect(() => {
    console.log('🔍 [Frontend] useUnlimitedWeek: Hook montado, iniciando carga de datos')
    fetchWeeklyUsage()
  }, [fetchWeeklyUsage])

  // Helpers para determinar estados
  const hasActiveUnlimitedWeek = !!weeklyUsage?.activePackageInfo
  const isNearWeeklyLimit =
    weeklyUsage && weeklyUsage.activePackageInfo ? weeklyUsage.remaining <= 2 : false
  const hasReachedWeeklyLimit =
    weeklyUsage && weeklyUsage.activePackageInfo ? weeklyUsage.remaining <= 0 : false

  // Log de estados calculados cuando weeklyUsage cambia
  useEffect(() => {
    if (weeklyUsage) {
      console.log('🔍 [Frontend] Estados calculados:', {
        hasActiveUnlimitedWeek,
        isNearWeeklyLimit,
        hasReachedWeeklyLimit,
        canUseUnlimitedWeek: hasActiveUnlimitedWeek && !hasReachedWeeklyLimit,
        weeklyUsage: {
          used: weeklyUsage.used,
          limit: weeklyUsage.limit,
          remaining: weeklyUsage.remaining,
          hasActivePackage: !!weeklyUsage.activePackageInfo,
          businessDaysRemaining: weeklyUsage.activePackageInfo?.businessDaysRemaining
        }
      })
    }
  }, [weeklyUsage, hasActiveUnlimitedWeek, isNearWeeklyLimit, hasReachedWeeklyLimit])

  // Función para formatear el mensaje de uso semanal
  const getWeeklyUsageMessage = () => {
    if (!weeklyUsage || !weeklyUsage.activePackageInfo) return null

    if (hasReachedWeeklyLimit) {
      return `Has alcanzado el límite semanal de ${weeklyUsage.limit} clases`
    }

    if (isNearWeeklyLimit) {
      return `Te quedan ${weeklyUsage.remaining} clases esta semana`
    }

    return `Has usado ${weeklyUsage.used} de ${weeklyUsage.limit} clases esta semana`
  }

  return {
    // Estados
    weeklyUsage,
    isLoading,
    error,
    hasActiveUnlimitedWeek,
    isNearWeeklyLimit,
    hasReachedWeeklyLimit,

    // Funciones
    validateUnlimitedWeek,
    fetchWeeklyUsage,
    getWeeklyUsageMessage,

    // Helpers
    canUseUnlimitedWeek: hasActiveUnlimitedWeek && !hasReachedWeeklyLimit,
  }
}