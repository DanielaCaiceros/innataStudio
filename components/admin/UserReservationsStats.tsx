"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  User
} from "lucide-react"

interface UserReservationsStatsProps {
  statistics: {
    upcoming: number
    past: number
    cancelled: number
    attended: number
    total: number
  }
  className?: string
}

export default function UserReservationsStats({ 
  statistics, 
  className = "" 
}: UserReservationsStatsProps) {
  // Calcular porcentajes
  const attendanceRate = statistics.total > 0 
    ? Math.round((statistics.attended / statistics.total) * 100) 
    : 0
  
  const cancellationRate = statistics.total > 0 
    ? Math.round((statistics.cancelled / statistics.total) * 100) 
    : 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
              <div className="text-xs text-blue-700">Total</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.upcoming}</div>
              <div className="text-xs text-green-700">Próximas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{statistics.past}</div>
              <div className="text-xs text-gray-700">Pasadas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.attended}</div>
              <div className="text-xs text-blue-700">Asistió</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.cancelled}</div>
              <div className="text-xs text-red-700">Canceladas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Tasa de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{attendanceRate}%</div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                {statistics.attended} de {statistics.total}
              </Badge>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${attendanceRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Tasa de Cancelación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-600">{cancellationRate}%</div>
              <Badge className="bg-red-100 text-red-800 border-red-200">
                {statistics.cancelled} de {statistics.total}
              </Badge>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${cancellationRate}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de actividad */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Resumen de Actividad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statistics.upcoming > 0 && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">Clases próximas</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  {statistics.upcoming}
                </Badge>
              </div>
            )}
            
            {statistics.attended > 0 && (
              <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">Clases completadas</span>
                </div>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  {statistics.attended}
                </Badge>
              </div>
            )}
            
            {statistics.cancelled > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800">Clases canceladas</span>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  {statistics.cancelled}
                </Badge>
              </div>
            )}
            
            {statistics.total === 0 && (
              <div className="text-center py-4 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No hay reservaciones registradas</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 