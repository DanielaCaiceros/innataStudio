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
  weekStart: Date
  weekEnd: Date
  activePackageInfo?: {
    isValid: boolean
    businessDaysRemaining: number
    expiryDate: Date
  }
}

export function useUnlimitedWeek() {
  const { isAuthenticated } = useAuth()
  const [weeklyUsage, setWeeklyUsage] = useState<WeeklyUsage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener uso semanal actual
  const fetchWeeklyUsage = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reservations/validate-unlimited-week', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        // Only set weeklyUsage if there's an active package info and it's valid
        if (data.activePackageInfo && data.activePackageInfo.isValid) {
          setWeeklyUsage({
            ...data,
            weekStart: new Date(data.weekStart),
            weekEnd: new Date(data.weekEnd)
          })
        } else {
          // If no active package info or it's invalid, set weeklyUsage to null
          setWeeklyUsage(null)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error obteniendo uso semanal')
        setWeeklyUsage(null) // Set to null on error
      }
    } catch (err) {
      setError('Error de conexión')
      console.error('Error fetching weekly usage:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Validar si se puede usar Semana Ilimitada para una clase específica
  const validateUnlimitedWeek = useCallback(async (
    scheduledClassId: number
  ): Promise<UnlimitedWeekValidation> => {
    if (!isAuthenticated) {
      return {
        isValid: false,
        canUseUnlimitedWeek: false,
        message: 'Debes iniciar sesión'
      }
    }

    try {
      const response = await fetch('/api/reservations/validate-unlimited-week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ scheduledClassId })
      })

      const data = await response.json()
      
      // Actualizar uso semanal si viene en la respuesta
      if (data.weeklyUsage) {
        setWeeklyUsage(current => ({
          ...current,
          ...data.weeklyUsage,
          weekStart: current?.weekStart || new Date(),
          weekEnd: current?.weekEnd || new Date()
        }))
      }

      return data
    } catch (err) {
      console.error('Error validating unlimited week:', err)
      return {
        isValid: false,
        canUseUnlimitedWeek: false,
        message: 'Error del sistema al validar'
      }
    }
  }, [isAuthenticated])

  // Cargar uso semanal al montar el hook
  useEffect(() => {
    fetchWeeklyUsage()
  }, [fetchWeeklyUsage])

  // Helpers para determinar estados
  const hasActiveUnlimitedWeek = weeklyUsage !== null
  const isNearWeeklyLimit = weeklyUsage ? weeklyUsage.remaining <= 2 : false
  const hasReachedWeeklyLimit = weeklyUsage ? weeklyUsage.remaining <= 0 : false

  // Función para formatear el mensaje de uso semanal
  const getWeeklyUsageMessage = () => {
    if (!weeklyUsage) return null
    
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
    canUseUnlimitedWeek: hasActiveUnlimitedWeek && !hasReachedWeeklyLimit
  }
}