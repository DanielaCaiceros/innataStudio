"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Clock, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StripeCheckout } from "@/components/stripe-checkout"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"

// Interfaces para datos de API
interface ClassType {
  id: number
  name: string
  description?: string
  duration: number
}

interface ScheduledClass {
  id: number
  classType: ClassType
  instructor: {
    id: number
    name: string
  }
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  enrolledCount: number
}

export default function BookingPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  
  // Estados para la reserva
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [scheduledClassId, setScheduledClassId] = useState<number | null>(null)
  
  // Estados para modales
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  
  // Estado para datos de la API
  const [availableClasses, setAvailableClasses] = useState<ScheduledClass[]>([])
  
  // Obtener clases disponibles al cargar o cambiar la fecha
  useEffect(() => {
    const loadAvailableClasses = async () => {
      setIsLoading(true)
      try {
        // Formatear fecha para query params si hay una fecha seleccionada
        const dateParam = date ? `date=${format(date, 'yyyy-MM-dd')}` : '';
        
        const response = await fetch(`/api/scheduled-clases/available?${dateParam}`);
        if (response.ok) {
          const data: ScheduledClass[] = await response.json();
          // Log para depuración del formato de tiempo
          if (data.length > 0) {
            console.log("Ejemplo de formato de tiempo:", data[0].time, typeof data[0].time);
          }
          setAvailableClasses(data);
        } else {
          console.error("Error al cargar clases disponibles");
          toast({
            title: "Error",
            description: "No se pudieron cargar las clases disponibles. Por favor, intenta de nuevo.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error de conexión",
          description: "Hubo un problema al conectar con el servidor.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailableClasses();
  }, [date]);
  
  // Comprobar autenticación
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      // Redirigir a login si no está autenticado
      router.push("/login?redirect=/reservar");
    }
  }, [isAuthenticated, isLoading, router]);

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      if (!scheduledClassId) {
        throw new Error("No se ha seleccionado una clase para reservar");
      }
      
      console.log("Creando reserva para la clase:", scheduledClassId);
      
      // Crear la reserva en el backend
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          scheduledClassId,
          paymentId // Incluir el ID de pago para registrar la transacción
        }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al crear la reserva");
      }
      
      // Cerrar modal de pago y mostrar confirmación
      setIsPaymentOpen(false);
      setIsConfirmationOpen(true);
      
      toast({
        title: "Reserva confirmada",
        description: "Se ha enviado un correo de confirmación a tu email.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error al confirmar la reserva",
        description: error instanceof Error ? error.message : "No se pudo procesar la reserva",
        variant: "destructive",
      });
      
      // Cerrar el modal de pago en caso de error
      setIsPaymentOpen(false);
    }
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
    
    // Buscar la clase programada que coincida con la selección
    const selectedScheduledClass = availableClasses.find(
      cls => cls.id === selectedClass
    );
    
    if (!selectedScheduledClass) {
      toast({
        title: "Error",
        description: "La clase seleccionada ya no está disponible.",
        variant: "destructive",
      });
      return;
    }
    
    // Guardar el ID de la clase programada para la reserva
    setScheduledClassId(selectedScheduledClass.id);
    setIsPaymentOpen(true);
  }

  // Obtener las clases disponibles para la fecha seleccionada
  const getClassesForSelectedDate = () => {
    if (!date) return [];
    
    return availableClasses.filter((cls) => {
      const classDate = new Date(cls.date);
      return isSameDay(classDate, date);
    });
  }
  
  // Obtener horarios disponibles para la fecha seleccionada
  const getTimeSlotsForSelectedDate = () => {
    const classesForDate = getClassesForSelectedDate();
    
    // Extraer horarios únicos
    return [...new Set(classesForDate.map((cls) => {
      try {
        // Asegurarnos de que el formato de tiempo es válido
        let timeString = cls.time;
        
        // Si el tiempo ya incluye la T y la zona horaria, usar directamente
        if (typeof timeString === 'string' && timeString.includes('T')) {
          const date = new Date(timeString);
          return format(date, "HH:mm");
        }
        
        // Si es un string en formato HH:MM:SS, añadir la fecha base
        if (typeof timeString === 'string' && timeString.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
          const date = new Date(`1970-01-01T${timeString}`);
          return format(date, "HH:mm");
        }
        
        // Caso de fallback - mostrar el tiempo tal cual está
        return typeof timeString === 'string' ? timeString.substring(0, 5) : "00:00";
      } catch (error) {
        console.error("Error al formatear hora:", error, cls.time);
        // En caso de error, devolver un formato de tiempo simple sin procesar
        return typeof cls.time === 'string' ? cls.time.substring(0, 5) : "00:00";
      }
    }))].sort();
  }
  
  // Obtener clases disponibles para un horario específico
  const getClassesForSelectedTime = (time: string) => {
    if (!date) return [];
    
    return availableClasses.filter((cls) => {
      const classDate = new Date(cls.date);
      
      try {
        let formattedTime;
        
        // Si el tiempo ya incluye la T y la zona horaria, usar directamente
        if (typeof cls.time === 'string' && cls.time.includes('T')) {
          const timeDate = new Date(cls.time);
          formattedTime = format(timeDate, "HH:mm");
        }
        // Si es un string en formato HH:MM:SS, añadir la fecha base
        else if (typeof cls.time === 'string' && cls.time.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
          const timeDate = new Date(`1970-01-01T${cls.time}`);
          formattedTime = format(timeDate, "HH:mm");
        }
        // Caso de fallback
        else {
          formattedTime = typeof cls.time === 'string' ? cls.time.substring(0, 5) : "00:00";
        }
        
        return isSameDay(classDate, date) && formattedTime === time;
      } catch (error) {
        console.error("Error al comparar tiempos:", error, cls.time);
        return false;
      }
    });
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
                    <h3 className="text-xl font-bold text-brand-sage-dark">Selecciona Horario</h3>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-2">
                    {isLoading ? (
                      <div className="col-span-3 text-center py-8 text-gray-500">Cargando horarios...</div>
                    ) : getTimeSlotsForSelectedDate().length > 0 ? (
                      getTimeSlotsForSelectedDate().map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={`rounded-full ${
                            selectedTime === time
                              ? "bg-brand-sage hover:bg-brand-sage/90 text-white"
                              : "border-brand-sage text-brand-sage hover:bg-gray-50"
                          }`}
                          onClick={() => {
                            setSelectedTime(time);
                            setSelectedClass(null); // Resetear selección de clase
                          }}
                        >
                          {time}
                        </Button>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        No hay clases disponibles para la fecha seleccionada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-brand-sage" />
                    <h3 className="text-xl font-bold text-brand-burgundy-dark">Selecciona Clase</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-500">Cargando clases...</div>
                    ) : selectedTime ? (
                      getClassesForSelectedTime(selectedTime).map((classItem) => (
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
                          <span>{classItem.classType.name}</span>
                          <span className="text-sm opacity-70">{classItem.classType.duration} min</span>
                        </Button>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Selecciona un horario para ver las clases disponibles
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-brand-yellow/10 border-none rounded-3xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-brand-mint-dark">Resumen de Reserva</h3>

                <div className="space-y-4">                <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                  <span className="text-zinc-700">Fecha:</span>
                  <span className="font-medium text-brand-burgundy">
                    {date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "No seleccionada"}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                  <span className="text-zinc-700">Horario:</span>
                  <span className="font-medium text-brand-burgundy">
                    {selectedTime ? `${selectedTime} hrs` : "No seleccionado"}
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                  <span className="text-zinc-700">Clase:</span>
                  <span className="font-medium text-brand-burgundy">
                    {selectedClass 
                      ? availableClasses.find(c => c.id === selectedClass)?.classType.name 
                      : "No seleccionada"
                    }
                  </span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                  <span className="text-zinc-700">Instructor:</span>
                  <span className="font-medium text-brand-burgundy">
                    {selectedClass 
                      ? availableClasses.find(c => c.id === selectedClass)?.instructor.name
                      : "No seleccionado"
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                  <span className="text-zinc-700">Duración:</span>
                  <span className="font-medium text-brand-burgundy">
                    {selectedClass 
                      ? `${availableClasses.find(c => c.id === selectedClass)?.classType.duration} minutos`
                      : "No seleccionada"
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                  <span className="text-zinc-700">Cupo disponible:</span>
                  <span className="font-medium text-brand-burgundy">
                    {selectedClass 
                      ? `${availableClasses.find(c => c.id === selectedClass)?.availableSpots} lugares`
                      : "N/A"
                    }
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
              amount={selectedClass && availableClasses.find(c => c.id === selectedClass)?.classType ? 69 : 0}
              description={`Reserva: ${selectedClass ? availableClasses.find((c) => c.id === selectedClass)?.classType.name : ""} - ${
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
                  Clase: {selectedClass ? availableClasses.find((c) => c.id === selectedClass)?.classType.name : ""}
                </p>
                <p className="font-medium">
                  Fecha: {date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""}
                </p>
                <p className="font-medium">Horario: {selectedTime}</p>
                <p className="font-medium">
                  Instructor: {selectedClass ? availableClasses.find((c) => c.id === selectedClass)?.instructor.name : ""}
                </p>
                <p className="font-medium">
                  Duración: {selectedClass ? `${availableClasses.find((c) => c.id === selectedClass)?.classType.duration} minutos` : ""}
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
