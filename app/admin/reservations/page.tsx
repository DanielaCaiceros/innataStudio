"use client"

import { useState } from "react"
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
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Search, Download, DollarSign } from "lucide-react"

// Datos de ejemplo
const reservations = [
  {
    id: 1,
    user: "María García",
    email: "maria@example.com",
    phone: "123-456-7890",
    class: "RHYTHM RIDE",
    date: "2023-04-22",
    time: "18:00",
    status: "confirmed",
    package: "PAQUETE 10 CLASES",
    remainingClasses: 8,
    paymentStatus: "paid",
    paymentMethod: "online",
  },
  {
    id: 2,
    user: "Juan Pérez",
    email: "juan@example.com",
    phone: "123-456-7891",
    class: "POWER CYCLE",
    date: "2023-04-22",
    time: "19:00",
    status: "confirmed",
    package: "MEMBRESÍA MENSUAL",
    remainingClasses: "Ilimitado",
    paymentStatus: "paid",
    paymentMethod: "cash",
  },
  {
    id: 3,
    user: "Ana Rodríguez",
    email: "ana@example.com",
    phone: "123-456-7892",
    class: "HIIT CYCLE",
    date: "2023-04-23",
    time: "07:00",
    status: "pending",
    package: "PASE INDIVIDUAL",
    remainingClasses: 0,
    paymentStatus: "pending",
    paymentMethod: "pending",
  },
  {
    id: 4,
    user: "Carlos López",
    email: "carlos@example.com",
    phone: "123-456-7893",
    class: "ENDURANCE RIDE",
    date: "2023-04-23",
    time: "08:00",
    status: "confirmed",
    package: "PAQUETE 5 CLASES",
    remainingClasses: 3,
    paymentStatus: "paid",
    paymentMethod: "online",
  },
  {
    id: 5,
    user: "Laura Martínez",
    email: "laura@example.com",
    phone: "123-456-7894",
    class: "RHYTHM RIDE",
    date: "2023-04-24",
    time: "17:00",
    status: "cancelled",
    package: "PASE INDIVIDUAL",
    remainingClasses: 0,
    paymentStatus: "refunded",
    paymentMethod: "online",
  },
  {
    id: 6,
    user: "Roberto Sánchez",
    email: "roberto@example.com",
    phone: "123-456-7895",
    class: "POWER CYCLE",
    date: "2023-04-24",
    time: "18:00",
    status: "confirmed",
    package: "PAQUETE 10 CLASES",
    remainingClasses: 5,
    paymentStatus: "paid",
    paymentMethod: "cash",
  },
  {
    id: 7,
    user: "Patricia Gómez",
    email: "patricia@example.com",
    phone: "123-456-7896",
    class: "RHYTHM RIDE",
    date: "2023-04-25",
    time: "07:00",
    status: "confirmed",
    package: "MEMBRESÍA MENSUAL",
    remainingClasses: "Ilimitado",
    paymentStatus: "paid",
    paymentMethod: "online",
  },
  {
    id: 8,
    user: "Miguel Torres",
    email: "miguel@example.com",
    phone: "123-456-7897",
    class: "HIIT CYCLE",
    date: "2023-04-25",
    time: "18:00",
    status: "pending",
    package: "PAQUETE 5 CLASES",
    remainingClasses: 2,
    paymentStatus: "pending",
    paymentMethod: "pending",
  },
]

const classes = [
  { id: 1, name: "RHYTHM RIDE", instructor: "Carlos Mendez", duration: "45 min", capacity: 10, enrolled: 7 },
  { id: 2, name: "POWER CYCLE", instructor: "Ana Torres", duration: "60 min", capacity: 10, enrolled: 10 },
  { id: 3, name: "ENDURANCE RIDE", instructor: "Miguel Ángel", duration: "75 min", capacity: 10, enrolled: 4 },
  { id: 4, name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min", capacity: 10, enrolled: 8 },
  { id: 5, name: "RECOVERY RIDE", instructor: "Carlos Mendez", duration: "45 min", capacity: 10, enrolled: 3 },
  { id: 6, name: "RHYTHM & STRENGTH", instructor: "Ana Torres", duration: "60 min", capacity: 10, enrolled: 6 },
]

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
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")

  // Filtrar reservaciones
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.class.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handlePayment = (reservationId: number) => {
    setSelectedReservation(reservationId)
    setIsPaymentDialogOpen(true)
  }

  const processPayment = () => {
    // Here you would integrate with Stripe for online payments
    // For now, we'll just close the dialog
    setIsPaymentDialogOpen(false)
    setSelectedReservation(null)
  }

  return (
    <div className="p-6">
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
            <DialogContent className="bg-white border-gray-200 text-zinc-900">
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
                    <Select>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        <SelectItem value="maria">María García</SelectItem>
                        <SelectItem value="juan">Juan Pérez</SelectItem>
                        <SelectItem value="ana">Ana Rodríguez</SelectItem>
                        <SelectItem value="carlos">Carlos López</SelectItem>
                        <SelectItem value="laura">Laura Martínez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class">Clase</Label>
                    <Select>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar clase" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        {classes.map((classItem) => (
                          <SelectItem key={classItem.id} value={classItem.id.toString()}>
                            {classItem.name} - {classItem.instructor} ({classItem.enrolled}/{classItem.capacity})
                          </SelectItem>
                        ))}
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select>
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
                    <Select>
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
                    <Select defaultValue="pending">
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
                  onClick={() => setIsNewReservationOpen(false)}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white border-gray-200 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg text-[#4A102A]">Filtrar por Fecha</CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden flex justify-center px-0">
            <div className="w-full max-w-[280px]">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={es}
                className="bg-white text-zinc-900"
                classNames={{
                  day_selected: "bg-[#4A102A] text-white",
                  day_today: "bg-gray-100 text-zinc-900",
                  day: "text-zinc-900 hover:bg-gray-100",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg text-[#4A102A]">Reservaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, email o clase..."
                  className="pl-8 bg-white border-gray-200 text-zinc-900 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900 w-full sm:w-[180px]">
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
                  {filteredReservations.length > 0 ? (
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
                            >
                              Editar
                            </Button>
                            {reservation.status !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-gray-200 text-zinc-900 hover:bg-gray-100"
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
      </div>

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
    </div>
  )
}
