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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
import { PlusCircle, Search, Download, DollarSign, CalendarIcon, X, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react"
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
  checkedIn: boolean
  checkedInAt: string | null
  bikeNumber: number | null
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

  // Función para validar si se puede hacer check-in
  const canCheckIn = (reservation: Reservation) => {
    if (reservation.status !== 'confirmed') return false
    
    const now = new Date()
    const classDateTime = new Date(`${reservation.date}T${reservation.time}:00`)
    
    // Permitir check-in desde 20 minutos antes hasta 2 horas después del inicio de la clase
    const twentyMinutesBefore = new Date(classDateTime.getTime() - 20 * 60 * 1000)
    const oneHourAfter = new Date(classDateTime.getTime() + 1 * 60 * 60 * 1000)
    
    return now >= twentyMinutesBefore && now <= oneHourAfter
  }
  
  // Función para hacer check-in
  const handleCheckIn = async (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)
    
    if (!reservation) {
      alert("Error: No se encontró la reservación")
      return
    }
    
    if (!canCheckIn(reservation)) {
      alert("No se puede hacer check-in fuera del horario permitido (20 minutos antes hasta 2 horas después del inicio de la clase)")
      return
    }
    
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al hacer check-in")
      }
      
      const data = await response.json()
      
      // Actualizar la reservación local
      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === reservationId 
            ? { 
                ...r, 
                checkedIn: true, 
                checkedInAt: data.checkedInAt || new Date().toISOString()
              } 
            : r
        )
      )
      
      alert(`Check-in exitoso para ${reservation.user}`)
    } catch (error) {
      console.error("Error al hacer check-in:", error)
      alert(`Error al hacer check-in: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // Función para deshacer check-in
  const handleUndoCheckIn = async (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)
    
    if (!reservation) {
      alert("Error: No se encontró la reservación")
      return
    }
    
    if (!confirm(`¿Estás seguro de que deseas deshacer el check-in de ${reservation.user}?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/checkin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al deshacer check-in")
      }
      
      // Actualizar la reservación local
      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === reservationId 
            ? { 
                ...r, 
                checkedIn: false, 
                checkedInAt: null 
              } 
            : r
        )
      )
      
      alert(`Check-in deshecho para ${reservation.user}`)
    } catch (error) {
      console.error("Error al deshacer check-in:", error)
      alert(`Error al deshacer check-in: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Función para exportar a CSV
  const exportToCSV = () => {
    const dataToExport = filteredReservations.length > 0 ? filteredReservations : reservations
    
    if (dataToExport.length === 0) {
      alert("No hay datos para exportar")
      return
    }

    // Crear encabezados del CSV
    const headers = [
      "ID",
      "Cliente", 
      "Email",
      "Teléfono",
      "Clase",
      "Fecha", 
      "Hora",
      "Estado",
      "Paquete",
      "Clases Restantes",
      "Estado de Pago",
      "Método de Pago"
    ]

    // Convertir datos a formato CSV
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(reservation => [
        reservation.id,
        `"${reservation.user}"`,
        `"${reservation.email}"`,
        `"${reservation.phone || ''}"`,
        `"${reservation.class}"`,
        reservation.date,
        reservation.time,
        reservation.status === "confirmed" ? "Confirmada" : 
        reservation.status === "pending" ? "Pendiente" : "Cancelada",
        `"${reservation.package}"`,
        reservation.remainingClasses,
        reservation.paymentStatus === "paid" ? "Pagado" : 
        reservation.paymentStatus === "pending" ? "Pendiente" : "Reembolsado",
        reservation.paymentMethod === "online" ? "Stripe" : "Efectivo"
      ].join(","))
    ].join("\n")

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      
      const today = format(new Date(), "yyyy-MM-dd")
      const dateFilter = date ? format(date, "yyyy-MM-dd") : "todas-fechas"
      link.setAttribute("download", `reservaciones-${dateFilter}-${today}.csv`)
      
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Cargar usuarios para el selector
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/reservations/clients")
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error("Error al cargar usuarios:", error)
      }
    }

    if (isNewReservationOpen) {
      fetchUsers()
    }
  }, [isNewReservationOpen])

  // Cargar tipos de clases para el selector
  useEffect(() => {
    const fetchClassTypes = async () => {
      try {
        const response = await fetch("/api/admin/reservations/class-types")
        if (response.ok) {
          const data = await response.json()
          setClassTypes(data)
        }
      } catch (error) {
        console.error("Error al cargar tipos de clases:", error)
      }
    }

    if (isNewReservationOpen) {
      fetchClassTypes()
    }
  }, [isNewReservationOpen])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Reservaciones</h1>
          <p className="text-gray-600">Administra todas las reservaciones de clases</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                <PlusCircle className="h-4 w-4 mr-2" /> Nueva Reserva
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#4A102A]">Crear Nueva Reservación</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Complete los detalles para crear una nueva reservación
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">Cliente</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        {users.length > 0 ? (
                          users.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} - {user.email}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            Cargando clientes...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class">Clase</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar clase" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        {classTypes.length > 0 ? (
                          classTypes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id.toString()}>
                              {classItem.name} - {classItem.duration} min
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="loading" disabled>
                            Cargando clases...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      type="date"
                      id="date"
                      className="bg-white border-gray-200 text-zinc-900"
                      value={date ? format(date, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Crear fecha local sin conversión de zona horaria
                          const [year, month, day] = e.target.value.split("-").map(Number)
                          const localDate = new Date(year, month - 1, day)
                          setDate(localDate)
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="package">Paquete</Label>
                    <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar paquete" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        <SelectItem value="individual">PASE INDIVIDUAL</SelectItem>
                        <SelectItem value="5classes">PAQUETE 5 CLASES</SelectItem>
                        <SelectItem value="10classes">PAQUETE 10 CLASES</SelectItem>
                        <SelectItem value="monthly">MEMBRESÍA MENSUAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment">Método de Pago</Label>
                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="online">Pago en línea (Stripe)</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNewReservationOpen(false)}
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                  onClick={async () => {
                    try {
                      if (!selectedUser || !selectedClass || !date || !selectedTime || !selectedPackage) {
                        const camposFaltantes = []
                        if (!selectedUser) camposFaltantes.push("Cliente")
                        if (!selectedClass) camposFaltantes.push("Clase")
                        if (!date) camposFaltantes.push("Fecha")
                        if (!selectedTime) camposFaltantes.push("Hora")
                        if (!selectedPackage) camposFaltantes.push("Paquete")

                        alert(
                          `Por favor complete todos los campos requeridos. Campos faltantes: ${camposFaltantes.join(", ")}`,
                        )
                        return
                      }

                      const newReservationData = {
                        userId: Number.parseInt(selectedUser),
                        classId: Number.parseInt(selectedClass),
                        date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
                        time: selectedTime,
                        package: selectedPackage,
                        paymentMethod: selectedPaymentMethod,
                      }

                      const response = await fetch("/api/admin/reservations", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(newReservationData),
                      })

                      if (!response.ok) {
                        const errorData = await response.json()
                        throw new Error(errorData.error || "Error al crear la reservación")
                      }

                      const createdReservation = await response.json()
                      setReservations([...reservations, createdReservation])
                      alert("Nueva reservación creada con éxito")

                      setSelectedUser("")
                      setSelectedClass("")
                      setSelectedTime("")
                      setSelectedPackage("")
                      setSelectedPaymentMethod("pending")
                      setIsNewReservationOpen(false)
                    } catch (error) {
                      console.error("Error al crear la reservación:", error)
                      alert(`Error al crear la reservación: ${error instanceof Error ? error.message : String(error)}`)
                    }
                  }}
                >
                  Crear Reservación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
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
                    <th className="text-left py-3 px-2">Check-in</th>
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
                        <div className="flex items-center gap-2">
                          {reservation.checkedIn ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <div>
                                <div className="text-sm font-medium text-green-700">Presente</div>
                                <div className="text-xs text-gray-500">
                                  {reservation.checkedInAt ? new Date(reservation.checkedInAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleUndoCheckIn(reservation.id)}
                              >
                                Deshacer
                              </Button>
                            </div>
                          ) : canCheckIn(reservation) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-green-200 text-green-600 hover:bg-green-50"
                              onClick={() => handleCheckIn(reservation.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Check-in
                            </Button>
                          ) : reservation.status === 'confirmed' ? (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span className="text-xs">Fuera de horario</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">No disponible</span>
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
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Registrar Pago</DialogTitle>
            <DialogDescription className="text-gray-600">
              Seleccione el método de pago y complete la transacción
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="online">Pago en línea (Stripe)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label htmlFor="amount">Monto Recibido</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    id="amount"
                    placeholder="0.00"
                    className="pl-8 bg-white border-gray-200 text-zinc-900"
                  />
                </div>
              </div>
            )}

            {paymentMethod === "online" && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-4">
                  Al procesar el pago en línea, se enviará un enlace de pago al cliente a través de Stripe.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={processPayment}
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
            >
              {paymentMethod === "cash" ? "Registrar Pago en Efectivo" : "Enviar Enlace de Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Reservación</DialogTitle>
            <DialogDescription className="text-gray-600">
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
                className="bg-white border-gray-200 text-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                className="bg-white border-gray-200 text-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-time">Hora</Label>
              <Select
                value={editFormData.time}
                onValueChange={(value) => setEditFormData({ ...editFormData, time: value })}
              >
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
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
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveEditedReservation}
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}