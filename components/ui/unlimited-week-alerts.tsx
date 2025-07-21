// components/ui/unlimited-week-alerts.tsx

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, CheckCircle, MessageCircle, Calendar, Hourglass, Info } from 'lucide-react'

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
  packageValidity?: {
    isValid: boolean
    businessDaysRemaining: number
    expiryDate: Date
  }
}

interface UnlimitedWeekAlertProps {
  validation: UnlimitedWeekValidation
  className?: string
}

export function UnlimitedWeekAlert({ validation, className }: UnlimitedWeekAlertProps) {
  const getAlertVariant = () => {
    if (!validation.canUseUnlimitedWeek) {
      return 'destructive'
    }
    if (validation.isValid) {
      return 'default'
    }
    return 'default'
  }

  const getIcon = () => {
    switch (validation.reason) {
      case 'INSUFFICIENT_TIME':
        return <Clock className="h-4 w-4" />
      case 'WEEKLY_LIMIT_EXCEEDED':
        return <Calendar className="h-4 w-4" />
      case 'NO_ACTIVE_PACKAGE':
      case 'PACKAGE_EXPIRED':
        return <AlertTriangle className="h-4 w-4" />
      case 'NON_BUSINESS_DAY':
        return <Hourglass className="h-4 w-4" />
      case 'WRONG_WEEK':
        return <Calendar className="h-4 w-4" />
      case 'ALREADY_RESERVED':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return validation.canUseUnlimitedWeek ? 
          <MessageCircle className="h-4 w-4" /> : 
          <AlertTriangle className="h-4 w-4" />
    }
  }

  const getEnhancedMessage = () => {
    if (validation.reason === 'WRONG_WEEK') {
      return (
        <div className="space-y-2">
          <p className="font-medium text-red-800">{validation.message}</p>
          <div className="bg-red-50 p-3 rounded-md border border-red-200">
            <p className="text-sm text-red-700 font-medium mb-1">¡Ups! Recuerda las reglas de Semana Ilimitada:</p>
            <ul className="text-xs text-red-700 space-y-1">
              <li>• Solo puedes reservar clases en la semana específica que contrataste</li>
              <li>• Para otras fechas, usa tus paquetes normales</li>
              <li>• Cada Semana Ilimitada es válida solo de lunes a viernes</li>
            </ul>
          </div>
        </div>
      )
    }

    if (validation.reason === 'INSUFFICIENT_TIME') {
      return (
        <div className="space-y-2">
          <p className="font-medium text-red-800">{validation.message}</p>
          <div className="bg-red-50 p-3 rounded-md border border-red-200">
            <p className="text-sm text-red-700 font-medium mb-1">Tiempo requerido para Semana Ilimitada:</p>
            <ul className="text-xs text-red-700 space-y-1">
              <li>• Mínimo 1 minuto de anticipación para reservar</li>
              <li>• Para cancelar sin penalización: 12 horas de anticipación</li>
              <li>• Sin confirmación, tu lugar puede ser liberado</li>
            </ul>
            {validation.timeRemaining && (
              <p className="text-xs text-red-600 mt-2">
                Tiempo disponible: {validation.timeRemaining.hours}h {validation.timeRemaining.minutes}m
              </p>
            )}
          </div>
        </div>
      )
    }

    if (validation.reason === 'WEEKLY_LIMIT_EXCEEDED') {
      return (
        <div className="space-y-2">
          <p className="font-medium text-red-800">{validation.message}</p>
          <div className="bg-red-50 p-3 rounded-md border border-red-200">
            <p className="text-sm text-red-700 font-medium mb-1">¡Ups! Haz alcanzado tú límite semanal con Semana Ilimitada:</p>
            <ul className="text-xs text-red-700 space-y-1">
              <li>• Has usado todas las clases de tu Semana Ilimitada</li>
              <li>• Para más clases, usa tus paquetes normales</li>
              <li>• El límite se reinicia cada semana contratada</li>
            </ul>
          </div>
        </div>
      )
    }

    if (validation.reason === 'NON_BUSINESS_DAY') {
      return (
        <div className="space-y-2">
          <p className="font-medium text-red-800">{validation.message}</p>
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
            <p className="text-sm text-blue-700 font-medium mb-1">¡Ups! Recuerda que las reservas con Semana Ilimitada solo son válidas de lunes a viernes.</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Para fines de semana, usa tus paquetes normales</li>
              <li>• Cada Semana Ilimitada cubre 5 días hábiles</li>
            </ul>
          </div>
        </div>
      )
    }

    if (validation.reason === 'ALREADY_RESERVED') {
      return (
        <div className="space-y-2">
          <p className="font-medium text-red-800">{validation.message}</p>
          <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
            <p className="text-sm text-orange-700 font-medium mb-1">¡Ups! Ya has reservado un lugar en esta clase.</p>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• Solo 1 reserva por clase con Semana Ilimitada</li>
              <li>• Diferente a paquetes normales que permiten múltiples reservas</li>
              <li>• Cancela tu reserva actual si quieres cambiar</li>
            </ul>
          </div>
        </div>
      )
    }

    if (validation.isValid && validation.canUseUnlimitedWeek) {
      return (
        <div className="space-y-2">
          <p className="font-medium text-green-800">{validation.message}</p>
          <div className="bg-green-50 p-3 rounded-md border border-green-200">
            <p className="text-sm text-green-700 font-medium mb-1">¡Muy bien! tú Semana Ilimitada está activa:</p>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Recuerda confirmar por WhatsApp con 12+ horas de anticipación</li>
              <li>• Sin confirmación, tu lugar puede ser liberado</li>
              <li>• Solo válido de lunes a viernes</li>
            </ul>
          </div>
        </div>
      )
    }

    return <p className="font-medium">{validation.message}</p>
  }

  return (
    <Alert variant={getAlertVariant()} className={className}>
      {getIcon()}
      <AlertDescription>
        <div className="space-y-2">
          {getEnhancedMessage()}
          
          {/* Mostrar información de validez del paquete */}
          {validation.packageValidity && (
            <div className="flex gap-2 items-center text-sm">
              <Hourglass className="h-4 w-4" />
              <span>Paquete:</span>
              {validation.packageValidity.isValid ? (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  {validation.packageValidity.businessDaysRemaining} días hábiles restantes
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Expirado el {validation.packageValidity.expiryDate.toLocaleDateString('es-ES')}
                </Badge>
              )}
            </div>
          )}
          
          {/* Mostrar uso semanal si está disponible */}
          {validation.weeklyUsage && (
            <div className="flex gap-2 items-center text-sm">
              <span>Uso semanal:</span>
              <Badge variant="outline">
                {validation.weeklyUsage.used}/{validation.weeklyUsage.limit} clases
              </Badge>
              {validation.weeklyUsage.remaining > 0 && (
                <span className="text-muted-foreground">
                  ({validation.weeklyUsage.remaining} restantes)
                </span>
              )}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

interface WeeklyUsageDisplayProps {
  usage: {
    used: number
    limit: number
    remaining: number
    activePackageInfo?: {
      isValid: boolean
      businessDaysRemaining: number
      expiryDate: Date
    }
  }
  className?: string
}

export function WeeklyUsageDisplay({ usage, className }: WeeklyUsageDisplayProps) {
  const getUsageColor = () => {
    const percentage = (usage.used / usage.limit) * 100
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getPackageValidityColor = () => {
    if (!usage.activePackageInfo?.isValid) return 'text-red-600'
    if (usage.activePackageInfo.businessDaysRemaining <= 1) return 'text-red-600'
    if (usage.activePackageInfo.businessDaysRemaining <= 2) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm">Semana Ilimitada</h4>
        <Badge variant="outline">{usage.used}/{usage.limit}</Badge>
      </div>
      
      {/* Barra de progreso semanal */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            usage.remaining <= 0 ? 'bg-red-500' :
            usage.remaining <= 2 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
        />
      </div>
      
      <p className={`text-xs ${getUsageColor()}`}>
        {usage.remaining > 0 
          ? `${usage.remaining} clases restantes esta semana`
          : 'Límite semanal alcanzado'
        }
      </p>

      {/* Información de validez del paquete */}
      {usage.activePackageInfo && (
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1 text-xs">
            <Hourglass className="h-3 w-3" />
            <span className="text-gray-600">Validez:</span>
            <span className={`font-medium ${getPackageValidityColor()}`}>
              {usage.activePackageInfo.isValid 
                ? `${usage.activePackageInfo.businessDaysRemaining} días hábiles`
                : 'Expirado'
              }
            </span>
          </div>
          {usage.activePackageInfo.isValid && usage.activePackageInfo.businessDaysRemaining <= 2 && (
            <p className="text-xs text-yellow-700 mt-1">
              ⚠️ Tu paquete expira pronto
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface UnlimitedWeekConfirmationProps {
  graceTimeHours: number
  onConfirm: () => void
  onCancel: () => void
  className?: string
}

export function UnlimitedWeekConfirmation({ 
  graceTimeHours, 
  onConfirm, 
  onCancel,
  className 
}: UnlimitedWeekConfirmationProps) {
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <MessageCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-blue-900 mb-1">
              Reserva con Semana Ilimitada
            </p>
            <p className="text-sm text-blue-800">
              Para garantizar tu lugar, debes enviar tu confirmación por WhatsApp 
              con al menos <strong>{graceTimeHours} horas</strong> de anticipación.
            </p>
          </div>
          
          <div className="bg-blue-100 p-3 rounded-md">
            <p className="text-xs text-blue-700 mb-2 font-medium flex items-center gap-1">
              <Hourglass className="h-3 w-3" />
              Recordatorio: Solo días hábiles (L-V)
            </p>
            <p className="text-xs text-blue-700 mb-2 font-medium">
              📱 Proceso de confirmación:
            </p>
            <ol className="text-xs text-blue-700 space-y-1 ml-4">
              <li>1. Confirma esta reserva</li>
              <li>2. Envía mensaje por WhatsApp antes del tiempo límite</li>
              <li>3. Tu lugar queda garantizado automáticamente</li>
            </ol>
          </div>
          
          <div className="flex gap-2 pt-2">
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Entiendo, confirmar reserva
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}