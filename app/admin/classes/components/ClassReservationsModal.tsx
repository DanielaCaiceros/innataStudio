// app/admin/classes/components/ClassReservationsModal.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  CheckCircle, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  BikeIcon,
  UserCheck,
  UserX
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { convertUtcToLocalDateForDisplay, formatTime } from "../typesAndConstants"

interface Reservation {
  id: number
  user: string
  email: string
  phone: string
  bikeNumber: number | null
  packageName: string
  checkedIn: boolean
  checkedInAt: string | null
  createdAt: string
  paymentMethod: string
  status: string
}

interface ClassInfo {
  id: number
  className: string
  instructor: string
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  totalReservations: number
  cancelledReservations: number
  canCheckIn: boolean
  checkInMessage?: string
}

interface ClassReservationsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  scheduledClassId: number | null
}

export default function ClassReservationsModal({
  isOpen,
  onOpenChange,
  scheduledClassId
}: ClassReservationsModalProps) {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && scheduledClassId) {
      loadReservations()
    }
  }, [isOpen, scheduledClassId])

  const loadReservations = async () => {
    if (!scheduledClassId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${scheduledClassId}/reservations`)
      
      if (response.ok) {
        const data = await response.json()
        setClassInfo(data.classInfo)
        setReservations(data.reservations)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar las reservaciones",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading reservations:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckIn = async (reservationId: number) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast({
          title: "Check-in exitoso",
          description: "El cliente ha sido registrado correctamente",
        })
        
        // Actualizar el estado local
        setReservations(prev => 
          prev.map(res => 
            res.id === reservationId 
              ? { ...res, checkedIn: true, checkedInAt: new Date().toISOString() }
              : res
          )
        )
      } else {
        const errorData = await response.json()
        toast({
          title: "Error en check-in",
          description: errorData.error || "No se pudo completar el check-in",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error en check-in:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    }
  }

  const handleUndoCheckIn = async (reservationId: number) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/checkin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        toast({
          title: "Check-in revertido",
          description: "El check-in ha sido deshecho",
        })
        
        // Actualizar el estado local
        setReservations(prev => 
          prev.map(res => 
            res.id === reservationId 
              ? { ...res, checkedIn: false, checkedInAt: null }
              : res
          )
        )
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "No se pudo deshacer el check-in",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deshaciendo check-in:", error)
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive"
      })
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "d 'de' MMMM 'a las' HH:mm", { locale: es })
    } catch {
      return "Fecha no disponible"
    }
  }

  const formatClassDateTime = (dateString: string, timeString: string) => {
    try {
      const localDate = convertUtcToLocalDateForDisplay(dateString)
      return `${format(localDate, "EEEE, d 'de' MMMM", { locale: es })} a las ${formatTime(timeString)}`
    } catch {
      return "Fecha no disponible"
    }
  }

  const checkedInCount = reservations.filter(r => r.checkedIn).length

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-[#4A102A] text-lg">
            Lista de Clientes Registrados
          </DialogTitle>
          {classInfo && (
            <>
              <DialogDescription className="text-gray-600 text-sm">
                {classInfo.className} - {formatClassDateTime(classInfo.date, classInfo.time)}
              </DialogDescription>
              <div className="space-y-1 mt-1">
                <div className="font-medium text-[#4A102A]">{classInfo.className}</div>
                <div className="text-sm">Instructor: {classInfo.instructor}</div>
                <div className="text-sm">{formatClassDateTime(classInfo.date, classInfo.time)}</div>
                <div className="flex gap-4 text-xs">
                  <span>Capacidad: {classInfo.maxCapacity}</span>
                  <span>Reservados: {classInfo.totalReservations}</span>
                  <span>Check-in: {checkedInCount}/{classInfo.totalReservations}</span>
                  {classInfo.cancelledReservations > 0 && (
                    <span className="text-red-600">Cancelados: {classInfo.cancelledReservations}</span>
                  )}
                </div>
                {!classInfo.canCheckIn && classInfo.checkInMessage && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {classInfo.checkInMessage}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A102A]"></div>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay reservaciones para esta clase
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Cliente</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Email</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Teléfono</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Bici</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Paquete</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-900">Estado</th>
                      <th className="text-center py-2 px-3 font-medium text-gray-900">Check In</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs">
                  {reservations.map((reservation) => (
                    <tr 
                      key={reservation.id} 
                      className={`transition-colors ${
                        reservation.status === 'cancelled' 
                          ? 'bg-red-50' 
                          : reservation.checkedIn 
                            ? 'bg-green-50' 
                            : 'bg-white'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate max-w-[120px]">
                            {reservation.user}
                          </span>
                          {reservation.checkedIn && (
                            <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-600 text-xs truncate max-w-[150px] block">
                          {reservation.email}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-gray-600 text-xs">
                          {reservation.phone || '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {reservation.bikeNumber ? (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            #{reservation.bikeNumber}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 max-w-[80px] truncate">
                          {reservation.packageName}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        {reservation.checkedIn ? (
                          <div className="flex flex-col">
                            <Badge variant="default" className="bg-green-100 text-green-600 text-xs px-1 py-0 w-fit hover:bg-green-700">
                              Presente
                            </Badge>
                            {reservation.checkedInAt && (
                              <span className="text-[10px] text-green-600 mt-1">
                                {formatDateTime(reservation.checkedInAt)}
                              </span>
                            )}
                          </div>
                        ) : reservation.status === 'cancelled' ? (
                          <Badge variant="destructive" className="text-xs px-1 py-0">
                            Cancelado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {reservation.status === 'cancelled' ? (
                          <span className="text-red-500 text-xs">N/A</span>
                        ) : reservation.checkedIn ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUndoCheckIn(reservation.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50 h-6 px-2 text-xs"
                            disabled={!classInfo?.canCheckIn}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleCheckIn(reservation.id)}
                            className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed h-6 px-2 text-xs"
                            disabled={!classInfo?.canCheckIn}
                          >
                            <UserCheck className="h-3 w-3" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-200 text-zinc-900 hover:bg-green-100"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

