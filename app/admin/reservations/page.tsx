// app/admin/reservations/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { formatAdminDate, formatAdminTime } from "@/lib/utils/admin-date"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Search, Download, DollarSign, CalendarIcon, X, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Tipos
interface Reservation {
  id: number
  user: string
  email: string
  phone: string
  class: string
  date: string
  time: string
  status: string
  package: string
  remainingClasses: number | string
  paymentStatus: string
  paymentMethod: string
}

const timeSlots = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
]

export default function ReservationsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [editFormData, setEditFormData] = useState({
    class: "",
    date: "",
    time: "",
    status: "",
  })
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [classTypes, setClassTypes] = useState<Array<{ id: number; name: string; duration: number }>>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("pending")

  // Cargar reservaciones con mejor debugging
  useEffect(() => {
    const fetchReservations = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        let url = "/api/admin/reservations"
        const params = new URLSearchParams()

        if (date) {
          params.append("date", format(date, "yyyy-MM-dd"))
        }

        if (statusFilter !== "all") {
          params.append("status", statusFilter)
        }

        if (params.toString()) {
          url += `?${params.toString()}`
        }

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        setReservations(data)
        
      } catch (error) {
        setError(error instanceof Error ? error.message : "Error desconocido")
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [date, statusFilter])

  // Filtrar reservaciones localmente para búsqueda
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.class.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const handlePayment = (reservationId: number) => {
    setSelectedReservation(reservationId)
    setIsPaymentDialogOpen(true)
  }

  const processPayment = async () => {
    const reservation = reservations.find((r) => r.id === selectedReservation)

    if (!reservation) {
      alert("Error: No se encontró la reservación")
      return
    }

    try {
      const response = await fetch(`/api/admin/reservations/${selectedReservation}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod,
          amount:
            reservation.package === "PASE INDIVIDUAL"
              ? 69
              : reservation.package === "PAQUETE 5 CLASES"
                ? 299
                : reservation.package === "PAQUETE 10 CLASES"
                  ? 599
                  : 399,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar el pago")
      }

      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === selectedReservation ? { ...r, paymentStatus: "paid", paymentMethod: paymentMethod } : r,
        ),
      )

      alert(
        `Pago registrado con éxito para ${reservation.user} - Método: ${paymentMethod === "cash" ? "Efectivo" : "Pago en línea"}`,
      )
    } catch (error) {
      console.error("Error al procesar el pago:", error)
      alert(`Error al procesar el pago: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsPaymentDialogOpen(false)
      setSelectedReservation(null)
    }
  }

  const handleCancelReservation = async (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)

    if (
      reservation &&
      confirm(
        `¿Estás seguro de que deseas cancelar la reservación de ${reservation.user} para la clase ${reservation.class}?`,
      )
    ) {
      try {
        const response = await fetch(`/api/admin/reservations/${reservationId}/cancel`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: "Cancelado por administrador",
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al cancelar la reservación")
        }

        setReservations((prevReservations) =>
          prevReservations.map((r) => (r.id === reservationId ? { ...r, status: "cancelled" } : r)),
        )

        alert("Reservación cancelada con éxito")
      } catch (error) {
        console.error("Error al cancelar la reservación:", error)
        alert(`Error al cancelar la reservación: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  const handleEditReservation = (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)

    if (reservation) {
      let formattedDate = reservation.date

      if (reservation.date && !reservation.date.includes("-")) {
        const dateObj = new Date(reservation.date)
        formattedDate = format(dateObj, "yyyy-MM-dd")
      }

      setEditFormData({
        class: reservation.class,
        date: formattedDate,
        time: reservation.time,
        status: reservation.status,
      })

      setSelectedReservation(reservationId)
      setIsEditDialogOpen(true)
    }
  }

  const saveEditedReservation = async () => {
    const reservation = reservations.find((r) => r.id === selectedReservation)

    if (reservation) {
      try {
        const response = await fetch(`/api/admin/reservations/${selectedReservation}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            class: editFormData.class,
            date: editFormData.date,
            time: editFormData.time,
            status: editFormData.status,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al actualizar la reservación")
        }

        setReservations((prevReservations) =>
          prevReservations.map((r) =>
            r.id === selectedReservation
              ? {
                  ...r,
                  class: editFormData.class,
                  date: editFormData.date,
                  time: editFormData.time,
                  status: editFormData.status,
                }
              : r,
          ),
        )

        alert("Reservación actualizada con éxito")
      } catch (error) {
        console.error("Error al actualizar la reservación:", error)
        alert(`Error al actualizar la reservación: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setIsEditDialogOpen(false)
        setSelectedReservation(null)
      }
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Reservaciones</h1>
          <p className="text-gray-600">Administra todas las reservaciones de clases</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={() => setIsNewReservationOpen(true)}
            className="bg-[#4A102A] hover:bg-[#85193C] text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Nueva Reserva
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="space-y-2">
          <Label>Buscar</Label>
          <Input
            placeholder="Nombre, email o clase..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Error al cargar reservaciones</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2 text-red-600">
                  Revisa la consola del navegador (F12) para más detalles técnicos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">Cargando reservaciones...</div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredReservations.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              {reservations.length === 0 
                ? "No hay reservaciones en el sistema" 
                : "No se encontraron reservaciones con los filtros aplicados"
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reservations Table */}
      {!isLoading && !error && filteredReservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservaciones ({filteredReservations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Usuario</th>
                    <th className="text-left py-3 px-2">Clase</th>
                    <th className="text-left py-3 px-2">Fecha</th>
                    <th className="text-left py-3 px-2">Hora</th>
                    <th className="text-left py-3 px-2">Estado</th>
                    <th className="text-left py-3 px-2">Paquete</th>
                    <th className="text-left py-3 px-2">Pago</th>
                    <th className="text-left py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{reservation.user}</div>
                          <div className="text-sm text-gray-500">{reservation.email}</div>
                          {reservation.phone && (
                            <div className="text-sm text-gray-500">{reservation.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-medium">{reservation.class}</td>
                      <td className="py-3 px-2">{reservation.date}</td>
                      <td className="py-3 px-2">{reservation.time}</td>
                      <td className="py-3 px-2">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            reservation.status === "confirmed" && "bg-green-100 text-green-800",
                            reservation.status === "pending" && "bg-yellow-100 text-yellow-800",
                            reservation.status === "cancelled" && "bg-red-100 text-red-800",
                          )}
                        >
                          {reservation.status === "confirmed" && "Confirmada"}
                          {reservation.status === "pending" && "Pendiente"}
                          {reservation.status === "cancelled" && "Cancelada"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="text-sm">{reservation.package}</div>
                          {typeof reservation.remainingClasses === 'number' && (
                            <div className="text-xs text-gray-500">
                              {reservation.remainingClasses} clases restantes
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            reservation.paymentStatus === "paid" && "bg-green-100 text-green-800",
                            reservation.paymentStatus === "pending" && "bg-yellow-100 text-yellow-800",
                          )}
                        >
                          {reservation.paymentStatus === "paid" && "Pagado"}
                          {reservation.paymentStatus === "pending" && "Pendiente"}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          {reservation.paymentStatus === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayment(reservation.id)}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditReservation(reservation.id)}
                          >
                            Editar
                          </Button>
                          {reservation.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancelReservation(reservation.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesar Pago</DialogTitle>
            <DialogDescription>
              Selecciona el método de pago para esta reservación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="online">Pago en línea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={processPayment}>Confirmar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Reservación</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la reservación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-class">Clase</Label>
              <Input
                id="edit-class"
                value={editFormData.class}
                onChange={(e) => setEditFormData({ ...editFormData, class: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-time">Hora</Label>
              <Select
                value={editFormData.time}
                onValueChange={(value) => setEditFormData({ ...editFormData, time: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEditedReservation}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}