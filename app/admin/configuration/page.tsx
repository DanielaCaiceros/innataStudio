// app/admin/configuracion/page.tsx

"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Separator } from '@/components/ui/separator'
import { Clock, Calendar, Save, RefreshCw } from 'lucide-react'

interface SystemConfig {
  key: string
  value: string
  description?: string
}

export default function ConfiguracionPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const { toast } = useToast()

  // Estados para los valores individuales
  const [graceTimeHours, setGraceTimeHours] = useState('')
  const [weeklyClassLimit, setWeeklyClassLimit] = useState('')

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/admin/configuration', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setConfigs(data)
        
        // Setear valores individuales
        const graceTime = data.find((c: SystemConfig) => c.key === 'grace_time_hours')
        const weeklyLimit = data.find((c: SystemConfig) => c.key === 'weekly_class_limit')
        
        if (graceTime) setGraceTimeHours(graceTime.value)
        if (weeklyLimit) setWeeklyClassLimit(weeklyLimit.value)
      } else {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar las configuraciones',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error loading configs:', error)
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateConfig = async (key: string, value: string, description?: string) => {
    try {
      const response = await fetch('/api/admin/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ key, value, description })
      })

      if (response.ok) {
        return true
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Error actualizando configuración',
          variant: 'destructive'
        })
        return false
      }
    } catch (error) {
      console.error('Error updating config:', error)
      toast({
        title: 'Error de conexión',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive'
      })
      return false
    }
  }

  const handleSaveAll = async () => {
    setSaving(true)
    let allSuccess = true

    // Validaciones
    const graceHours = parseInt(graceTimeHours, 10)
    const weeklyLimit = parseInt(weeklyClassLimit, 10)

    if (isNaN(graceHours) || graceHours < 1 || graceHours > 12) {
      toast({
        title: 'Error de validación',
        description: 'El tiempo de gracia debe ser entre 1 y 12 horas',
        variant: 'destructive'
      })
      setSaving(false)
      return
    }

    if (isNaN(weeklyLimit) || weeklyLimit < 1 || weeklyLimit > 50) {
      toast({
        title: 'Error de validación',
        description: 'El límite semanal debe ser entre 1 y 50 clases',
        variant: 'destructive'
      })
      setSaving(false)
      return
    }

    // Actualizar tiempo de gracia
    const graceSuccess = await updateConfig(
      'grace_time_hours',
      graceTimeHours,
      'Tiempo de gracia en horas para confirmación de reservas con Semana Ilimitada'
    )
    if (!graceSuccess) allSuccess = false

    // Actualizar límite semanal
    const limitSuccess = await updateConfig(
      'weekly_class_limit',
      weeklyClassLimit,
      'Límite máximo de clases por semana para paquete Semana Ilimitada'
    )
    if (!limitSuccess) allSuccess = false

    if (allSuccess) {
      toast({
        title: 'Configuración guardada',
        description: 'Todas las configuraciones se actualizaron exitosamente',
      })
      await loadConfigs() // Recargar para confirmar cambios
    }

    setSaving(false)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#4A102A]" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#4A102A] mb-2">
          Configuración del Sistema
        </h1>
        <p className="text-gray-600">
          Gestiona las configuraciones para el sistema de reservas de Semana Ilimitada
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuración de Tiempo de Gracia */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#4A102A]" />
              <CardTitle>Tiempo de Gracia</CardTitle>
            </div>
            <CardDescription>
              Tiempo mínimo requerido (en horas) para que los usuarios confirmen 
              sus reservas de Semana Ilimitada por WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="grace-time">Horas de anticipación</Label>
                <Input
                  type="number"
                  id="grace-time"
                  value={graceTimeHours}
                  onChange={(e) => setGraceTimeHours(e.target.value)}
                  min="1"
                  max="48"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Debe ser entre 1 y 48 horas. Valor actual: {graceTimeHours} horas
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">¿Cómo funciona?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Los usuarios deben enviar confirmación por WhatsApp</li>
                  <li>• Se bloquea la reserva si queda menos tiempo del configurado</li>
                  <li>• Se añaden 30 minutos adicionales al tiempo de gracia</li>
                  <li>• Ejemplo: {graceTimeHours}h + 30min = {parseInt(graceTimeHours || '0') * 60 + 30} minutos mínimos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuración de Límite Semanal */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#4A102A]" />
              <CardTitle>Límite Semanal</CardTitle>
            </div>
            <CardDescription>
              Número máximo de clases que un usuario puede reservar por semana 
              con el paquete Semana Ilimitada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="weekly-limit">Clases por semana</Label>
                <Input
                  type="number"
                  id="weekly-limit"
                  value={weeklyClassLimit}
                  onChange={(e) => setWeeklyClassLimit(e.target.value)}
                  min="1"
                  max="50"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Debe ser entre 1 y 50 clases. Valor actual: {weeklyClassLimit} clases
                </p>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">Información importante</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Se cuenta solo clases confirmadas de lunes a domingo</li>
                  <li>• Solo aplica para paquetes "Semana Ilimitada"</li>
                  <li>• Los usuarios ven su progreso semanal en tiempo real</li>
                  <li>• Se resetea automáticamente cada lunes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen de Configuración Actual */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Configuración</CardTitle>
            <CardDescription>
              Vista general de la configuración actual del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Tiempo Mínimo de Reserva</h4>
                  <p className="text-2xl font-bold text-[#4A102A]">
                    {parseInt(graceTimeHours || '0') * 60 + 30} min
                  </p>
                  <p className="text-sm text-gray-600">
                    {graceTimeHours}h gracia + 30min buffer
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Límite Semanal</h4>
                  <p className="text-2xl font-bold text-[#4A102A]">
                    {weeklyClassLimit}
                  </p>
                  <p className="text-sm text-gray-600">
                    clases por semana máximo
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex gap-3">
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-[#4A102A] hover:bg-[#85193C] text-white"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={loadConfigs}
            disabled={isSaving}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar
          </Button>
        </div>
      </div>
    </div>
  )
}