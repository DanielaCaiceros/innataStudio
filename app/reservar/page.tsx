"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Clock, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StripeCheckout } from "@/components/stripe-checkout"
import { toast } from "@/components/ui/use-toast"

const timeSlots = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "13:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
]

const classes = [
  { id: 1, name: "RHYTHM RIDE", instructor: "Carlos Mendez", duration: "45 min" },
  { id: 2, name: "POWER CYCLE", instructor: "Ana Torres", duration: "60 min" },
  { id: 3, name: "ENDURANCE RIDE", instructor: "Miguel Ángel", duration: "75 min" },
  { id: 4, name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min" },
]

export default function BookingPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)

  const handlePaymentSuccess = (paymentId: string) => {
    setIsPaymentOpen(false)
    setIsConfirmationOpen(true)
    toast({
      title: "Reserva confirmada",
      description: "Se ha enviado un correo de confirmación a tu email.",
    })
  }

  const handlePaymentCancel = () => {
    setIsPaymentOpen(false)
    toast({
      title: "Pago cancelado",
      description: "El proceso de pago ha sido cancelado.",
      variant: "destructive",
    })
  }

  const handleConfirmBooking = () => {
    if (!date || !selectedClass || !selectedTime) return
    setIsPaymentOpen(true)
  }

  const handleClassSelect = (classId: number) => {
    setSelectedClass(classId)
    const calendarTab = document.querySelector('[data-value="calendar"]') as HTMLElement
    if (calendarTab) {
      calendarTab.click()
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}
      <section className="py-16 pt-32 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            RESERVA TU <span className="text-brand-burgundy">CLASE</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-zinc-700">
            Selecciona fecha, clase y horario para asegurar tu lugar
          </p>
        </div>
      </section>

      {/* Booking Section */}
      <section className="py-16 bg-white">
        <div className="container px-4 md:px-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <CalendarIcon className="mr-2 h-5 w-5 text-brand-mint" />
                    <h3 className="text-xl font-bold text-brand-mint-dark">Selecciona Fecha</h3>
                  </div>
                  <div className="flex justify-center items-center py-6">
                    <div className="w-full max-w-[280px]">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={es}
                        className="bg-white text-zinc-900 w-full"
                        classNames={{
                          day_selected: "bg-brand-sage text-white",
                          day_today: "bg-gray-100 text-zinc-900",
                          day: "text-zinc-900 hover:bg-gray-100",
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-brand-sage" />
                    <h3 className="text-xl font-bold text-brand-sage-dark">Selecciona Clase</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {classes.map((classItem) => (
                      <Button
                        key={classItem.id}
                        variant={selectedClass === classItem.id ? "default" : "outline"}
                        className={`w-full justify-between rounded-full ${
                          selectedClass === classItem.id
                            ? "bg-brand-sage hover:bg-brand-sage/90 text-white"
                            : "border-brand-burgundy text-brand-sage hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedClass(classItem.id)}
                      >
                        <span>{classItem.name}</span>
                        <span className="text-sm opacity-70">{classItem.duration}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-brand-sage" />
                    <h3 className="text-xl font-bold text-brand-burgundy-dark">Selecciona Horario</h3>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className={`rounded-full ${
                          selectedTime === time
                            ? "bg-brand-sage hover:bg-brand-sage/90 text-white"
                            : "border-brand-sage text-brand-sage hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-brand-yellow/10 border-none rounded-3xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-brand-mint-dark">Resumen de Reserva</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Fecha:</span>
                    <span className="font-medium text-brand-burgundy">
                      {date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "No seleccionada"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Clase:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedClass ? classes.find((c) => c.id === selectedClass)?.name : "No seleccionada"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Instructor:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedClass ? classes.find((c) => c.id === selectedClass)?.instructor : "No seleccionado"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Horario:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedTime ? `${selectedTime} hrs` : "No seleccionado"}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full mt-6 bg-brand-mint hover:bg-brand-mint/90 font-bold text-lg py-6 rounded-full text-white"
                  disabled={!date || !selectedClass || !selectedTime}
                  onClick={handleConfirmBooking}
                >
                  <span className="flex items-center gap-1">
                    CONFIRMAR RESERVA <ChevronRight className="h-4 w-4" />
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Policy Section */}
      <section className="py-16 bg-gray-50">
        <div className="container px-4 md:px-6">
          <h2 className="text-2xl font-bold text-center mb-8">
            POLÍTICAS DE <span className="text-brand-burgundy">RESERVA</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-brand-burgundy-dark">Cancelaciones</h3>
              <p className="text-zinc-600">
                Puedes cancelar tu reserva hasta 4 horas antes de la clase sin penalización. Cancelaciones tardías
                resultarán en el cargo de la clase.
              </p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-brand-burgundy-dark">Llegada</h3>
              <p className="text-zinc-600">
                Te recomendamos llegar 15 minutos antes de tu clase. El acceso se cierra 5 minutos después del inicio de
                la sesión.
              </p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-brand-burgundy-dark">Lista de espera</h3>
              <p className="text-zinc-600">
                Si la clase está llena, puedes unirte a la lista de espera y serás notificado automáticamente si se
                libera un lugar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Procesar Pago</DialogTitle>
            <DialogDescription className="text-gray-600">
              Completa el pago para confirmar tu reserva
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <StripeCheckout
              amount={69}
              description={`Reserva: ${selectedClass ? classes.find((c) => c.id === selectedClass)?.name : ""} - ${
                date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""
              } ${selectedTime || ""}`}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">¡Reserva Confirmada!</DialogTitle>
            <DialogDescription className="text-gray-600">
              Tu reserva ha sido confirmada exitosamente
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Detalles de tu reserva:</p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="font-medium">
                  Clase: {selectedClass ? classes.find((c) => c.id === selectedClass)?.name : ""}
                </p>
                <p className="font-medium">
                  Fecha: {date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""}
                </p>
                <p className="font-medium">Horario: {selectedTime}</p>
                <p className="font-medium">
                  Instructor: {selectedClass ? classes.find((c) => c.id === selectedClass)?.instructor : ""}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Se ha enviado un correo de confirmación con los detalles de tu reserva. Te esperamos en el estudio.
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-brand-burgundy hover:bg-brand-burgundy/90 text-white"
              onClick={() => setIsConfirmationOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
