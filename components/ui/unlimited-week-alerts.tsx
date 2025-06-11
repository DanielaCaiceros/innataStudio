// components/ui/unlimited-week-alerts.tsx

import React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, CheckCircle, MessageCircle, Calendar, Hourglass } from 'lucide-react'

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
      default:
        return validation.canUseUnlimitedWeek ? 
          <MessageCircle className="h-4 w-4" /> : 
          <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <Alert variant={getAlertVariant()} className={className}>
      {getIcon()}
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium">{validation.message}</p>
          
          {/* Mostrar tiempo restante si está disponible */}
          {validation.timeRemaining && validation.reason === 'INSUFFICIENT_TIME' && (
            <div className="text-sm">
              <p>
                Tiempo hasta la clase: {validation.timeRemaining.hours}h {validation.timeRemaining.minutes}m
              </p>
            </div>
          )}
          
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