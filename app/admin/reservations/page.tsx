"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
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
import { PlusCircle, Search, Download, DollarSign, CalendarIcon, X } from "lucide-react"
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

  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [classTypes, setClassTypes] = useState<Array<{ id: number; name: string; duration: number }>>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("pending")

  // Cargar reservaciones
  useEffect(() => {
    const fetchReservations = async () => {
      setIsLoading(true)
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

        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`Error al cargar las reservaciones: ${response.statusText}`)
        }

        const data = await response.json()
        setReservations(data)
      } catch (error) {
        console.error("Error loading reservations:", error)
        // Datos de ejemplo en caso de error
        const todayFormatted = format(new Date(), "yyyy-MM-dd")
        const fallbackReservations: Reservation[] = [
          {
            id: 1,
            user: "María García",
            email: "maria@example.com",
            phone: "123-456-7890",
            class: "RHYTHM RIDE",
            date: todayFormatted,
            time: "18:00",
            status: "confirmed",
            package: "PAQUETE 10 CLASES",
            remainingClasses: 8,
            paymentStatus: "paid",
            paymentMethod: "online",
          },
        ]
        setReservations(fallbackReservations)
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
      alert(`Error al procesar el pago: ${error.message}`)

      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === selectedReservation ? { ...r, paymentStatus: "paid", paymentMethod: paymentMethod } : r,
        ),
      )
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
        alert(`Error al cancelar la reservación: ${error.message}`)

        setReservations((prevReservations) =>
          prevReservations.map((r) => (r.id === reservationId ? { ...r, status: "cancelled" } : r)),
        )
      }
    }
  }

  const handleEditReservation = (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)

    if (reservation) {
      // Asegurar que la fecha se mantenga correcta sin conversión de zona horaria
      let formattedDate = reservation.date

      // Si la fecha viene en formato diferente, normalizarla
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
        alert(`Error al actualizar la reservación: ${error.message}`)

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
      } finally {
        setIsEditDialogOpen(false)
        setSelectedReservation(null)
      }
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
                      alert(`Error al crear la reservación: ${error.message}`)
                    }
                  }}
                >
                  Crear Reservación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100">
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {/* Filtros Horizontales */}
      <Card className="bg-white border-gray-200 mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-[#4A102A]">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="search"
                  placeholder="Nombre, email o clase..."
                  className="pl-8 bg-white border-gray-200 text-zinc-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filtro por fecha */}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-white border-gray-200",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-gray-200" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => {
                      if (newDate) {
                        // Crear una nueva fecha ajustando la zona horaria
                        const adjustedDate = new Date(newDate.getTime() + newDate.getTimezoneOffset() * 60000)
                        setDate(adjustedDate)
                      } else {
                        setDate(newDate)
                      }
                    }}
                    locale={es}
                    initialFocus
                    className="bg-white text-zinc-900"
                    classNames={{
                      day_selected: "bg-[#4A102A] text-white",
                      day_today: "bg-gray-100 text-zinc-900",
                      day: "text-zinc-900 hover:bg-gray-100",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro por estado */}
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botones de acción rápida */}
            <div className="space-y-2">
              <Label>Acciones rápidas</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-200 text-zinc-900 hover:bg-gray-100"
                  onClick={() => setDate(new Date())}
                >
                  Hoy
                </Button>
                {date && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                    onClick={() => setDate(undefined)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Reservaciones */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg text-[#4A102A]">
            Reservaciones {date && `- ${format(date, "PPP", { locale: es })}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-medium text-gray-600">ID</th>
                  <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-600">Clase</th>
                  <th className="text-left p-4 font-medium text-gray-600">Fecha</th>
                  <th className="text-left p-4 font-medium text-gray-600">Hora</th>
                  <th className="text-left p-4 font-medium text-gray-600">Paquete</th>
                  <th className="text-left p-4 font-medium text-gray-600">Estado</th>
                  <th className="text-left p-4 font-medium text-gray-600">Pago</th>
                  <th className="text-left p-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-600">
                      Cargando reservaciones...
                    </td>
                  </tr>
                ) : filteredReservations.length > 0 ? (
                  filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-gray-200">
                      <td className="p-4">#{reservation.id}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{reservation.user}</div>
                          <div className="text-sm text-gray-600">{reservation.email}</div>
                        </div>
                      </td>
                      <td className="p-4">{reservation.class}</td>
                      <td className="p-4">{reservation.date}</td>
                      <td className="p-4">{reservation.time}</td>
                      <td className="p-4">
                        <div>
                          <div>{reservation.package}</div>
                          <div className="text-sm text-gray-600">Restantes: {reservation.remainingClasses}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            reservation.status === "confirmed"
                              ? "bg-green-500/20 text-green-700"
                              : reservation.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-700"
                                : "bg-red-500/20 text-red-700"
                          }`}
                        >
                          {reservation.status === "confirmed"
                            ? "Confirmada"
                            : reservation.status === "pending"
                              ? "Pendiente"
                              : "Cancelada"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            reservation.paymentStatus === "paid"
                              ? "bg-green-500/20 text-green-700"
                              : reservation.paymentStatus === "pending"
                                ? "bg-yellow-500/20 text-yellow-700"
                                : "bg-red-500/20 text-red-700"
                          }`}
                        >
                          {reservation.paymentStatus === "paid"
                            ? `Pagado (${reservation.paymentMethod === "online" ? "Stripe" : "Efectivo"})`
                            : reservation.paymentStatus === "pending"
                              ? "Pendiente"
                              : "Reembolsado"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {reservation.paymentStatus === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-[#4A102A] text-[#4A102A] hover:bg-[#FCF259]/10"
                              onClick={() => handlePayment(reservation.id)}
                            >
                              Registrar Pago
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-zinc-900 hover:bg-gray-100"
                            onClick={() => handleEditReservation(reservation.id)}
                          >
                            Editar
                          </Button>
                          {reservation.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 border-gray-200 text-zinc-900 hover:bg-gray-100"
                              onClick={() => handleCancelReservation(reservation.id)}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-600">
                      No se encontraron reservaciones con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                <div className="space-y-2">
                  <Label htmlFor="email">Email del Cliente</Label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="cliente@ejemplo.com"
                    className="bg-white border-gray-200 text-zinc-900"
                    value={selectedReservation ? reservations.find((r) => r.id === selectedReservation)?.email : ""}
                  />
                </div>
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
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={processPayment}>
              {paymentMethod === "cash" ? "Registrar Pago" : "Enviar Enlace de Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reservation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Reservación</DialogTitle>
            <DialogDescription className="text-gray-600">Actualice los detalles de la reservación</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class">Clase</Label>
              <Select
                value={editFormData.class}
                onValueChange={(value) => setEditFormData({ ...editFormData, class: value })}
              >
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue placeholder="Seleccionar clase" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
                  {classTypes.map((classType) => (
                    <SelectItem key={classType.id} value={classType.name}>
                      {classType.name} ({classType.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  type="date"
                  id="date"
                  className="bg-white border-gray-200 text-zinc-900"
                  value={editFormData.date ? format(new Date(editFormData.date), "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Crear fecha local sin conversión de zona horaria
                      const [year, month, day] = e.target.value.split("-").map(Number)
                      const localDate = new Date(year, month - 1, day)
                      setEditFormData({ ...editFormData, date: format(localDate, "yyyy-MM-dd") })
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Hora</Label>
                <Select
                  value={editFormData.time}
                  onValueChange={(value) => setEditFormData({ ...editFormData, time: value })}
                >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue placeholder="Seleccionar estado" />
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
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={saveEditedReservation}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
