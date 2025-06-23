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
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reservations/validate-unlimited-week', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setWeeklyUsage(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error obteniendo uso semanal')
        setWeeklyUsage(null) // Set to null on error
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error fetching weekly usage:', err)
      setWeeklyUsage(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Validar si se puede usar Semana Ilimitada para una clase específica
  const validateUnlimitedWeek = useCallback(
    async (scheduledClassId: number): Promise<UnlimitedWeekValidation> => {
      if (!isAuthenticated) {
        return {
          isValid: false,
          canUseUnlimitedWeek: false,
          message: 'Debes iniciar sesión',
        }
      }

      try {
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

        const data = await response.json()

        // Actualizar uso semanal si viene en la respuesta de error
        if (data.weeklyUsage) {
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
        console.error('Error validating unlimited week:', err)
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
    fetchWeeklyUsage()
  }, [fetchWeeklyUsage])

  // Helpers para determinar estados
  const hasActiveUnlimitedWeek = !!weeklyUsage?.activePackageInfo
  const isNearWeeklyLimit =
    weeklyUsage && weeklyUsage.activePackageInfo ? weeklyUsage.remaining <= 2 : false
  const hasReachedWeeklyLimit =
    weeklyUsage && weeklyUsage.activePackageInfo ? weeklyUsage.remaining <= 0 : false

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