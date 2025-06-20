"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Clock, ChevronRight, Bike } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StripeCheckout } from "@/components/stripe-checkout"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"
import { BikeSelectionInline } from "@/components/bike-selection-inline"
import { 
  formatTimeFromDB, 
  isClassOnSelectedDate, 
  getUniqueTimeSlotsFromClasses, 
  filterClassesByDateAndTime,
  createClassDateTime
} from "@/lib/utils/date"
import { isBusinessDay } from "@/lib/utils/business-days"

import { useUnlimitedWeek } from '@/lib/hooks/useUnlimitedWeek'
import { 
  UnlimitedWeekAlert, 
  WeeklyUsageDisplay, 
  UnlimitedWeekConfirmation 
} from '@/components/ui/unlimited-week-alerts'

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
  bikeNumber?: number
}

export default function BookingPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  // Estados para Semana Ilimitada - Activación automática
  const [unlimitedWeekValidation, setUnlimitedWeekValidation] = useState<any>(null)
  const [showUnlimitedWeekConfirmation, setShowUnlimitedWeekConfirmation] = useState(false)
  const [isValidatingUnlimitedWeek, setIsValidatingUnlimitedWeek] = useState(false)
  
  const {
    weeklyUsage,
    validateUnlimitedWeek,
    canUseUnlimitedWeek,
    hasActiveUnlimitedWeek,
    getWeeklyUsageMessage,
    isLoading: isLoadingWeekly
  } = useUnlimitedWeek()

  // Auto-activar Semana Ilimitada si el usuario tiene paquete activo
  const isUsingUnlimitedWeek = hasActiveUnlimitedWeek && Boolean(weeklyUsage)
  
  // Estados para la reserva
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [scheduledClassId, setScheduledClassId] = useState<number | null>(null)
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null)
  const [isProcessingBooking, setIsProcessingBooking] = useState(false)
  
  // Estados para modales
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // Estado para datos de la API
  const [availableClasses, setAvailableClasses] = useState<ScheduledClass[]>([])
  const [userAvailableClasses, setUserAvailableClasses] = useState<number>(0)
  const [isLoadingUserClasses, setIsLoadingUserClasses] = useState(false)
  const [selectedScheduledClassForBooking, setSelectedScheduledClassForBooking] = useState<ScheduledClass | null>(null)

  // Obtener clases disponibles del usuario
  useEffect(() => {
    const loadUserAvailableClasses = async () => {
      if (!isAuthenticated || !user) return;
      
      setIsLoadingUserClasses(true);
      try {
        const response = await fetch("/api/user/packages", {
          method: "GET",
          credentials: "include",
        });
        
        if (response.ok) {
          const packages = await response.json();
          const totalClasses = packages.reduce((total: number, pkg: any) => total + pkg.classesRemaining, 0);
          setUserAvailableClasses(totalClasses);
        }
      } catch (error) {
        console.error("Error al cargar clases disponibles del usuario:", error);
      } finally {
        setIsLoadingUserClasses(false);
      }
    };

    loadUserAvailableClasses();
  }, [isAuthenticated, user]);
  
  // Obtener clases disponibles al cargar o cambiar la fecha
  const loadAvailableClasses = async () => {
    setIsLoading(true)
    try {
      const dateParam = date ? `date=${format(date, 'yyyy-MM-dd')}` : '';
      
      const response = await fetch(`/api/scheduled-clases/available?${dateParam}`);
      if (response.ok) {
        const data: ScheduledClass[] = await response.json();
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
  }

  useEffect(() => {
    loadAvailableClasses();
  }, [date]);

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      if (!scheduledClassId || !selectedBikeId) {
        throw new Error("Falta información para completar la reserva");
      }
      
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          scheduledClassId,
          paymentId,
          bikeNumber: selectedBikeId
        }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setIsPaymentOpen(false);
        throw new Error(data.error || "Error al crear la reserva");
      }
      
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

  const handleClassSelection = async (classId: number) => {
    setSelectedClass(classId)
    setScheduledClassId(classId)
    setUnlimitedWeekValidation(null)
    
    // Auto-validar si tiene Semana Ilimitada activa
    if (isUsingUnlimitedWeek) {
      setIsValidatingUnlimitedWeek(true)
      const validation = await validateUnlimitedWeek(classId)
      setUnlimitedWeekValidation(validation)
      setIsValidatingUnlimitedWeek(false)
    }
  }

  const handleUnlimitedWeekToggle = async (enabled: boolean) => {
    // Funcionalidad removida - Semana Ilimitada se activa automáticamente
    // Esta función se mantiene para compatibilidad pero no hace nada
    return
  }

  const handleConfirmBooking = async () => {
    if (!selectedScheduledClassForBooking || !selectedBikeId) {
      console.log('handleConfirmBooking: Faltan datos necesarios')
      return
    }

    setIsProcessingBooking(true)
    
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledClassId: selectedScheduledClassForBooking.id,
          bikeId: selectedBikeId
        })
      })

      if (response.ok) {
        await loadAvailableClasses()
        setIsConfirmationOpen(true)
        
        // Actualizar clases disponibles del usuario
        if (isAuthenticated && user) {
          try {
            const packagesResponse = await fetch("/api/user/packages", {
              method: "GET",
              credentials: "include",
            });
            
            if (packagesResponse.ok) {
              const packages = await packagesResponse.json();
              const totalClasses = packages.reduce((total: number, pkg: any) => total + pkg.classesRemaining, 0);
              setUserAvailableClasses(totalClasses);
            }
          } catch (error) {
            console.error("Error al actualizar clases disponibles del usuario:", error);
          }
        }
        
        // Limpiar estados
        setSelectedScheduledClassForBooking(null)
        setSelectedBikeId(null)
      } else {
        const errorData = await response.text()
        console.error('Error al crear reserva:', errorData)
      }
    } catch (error) {
      console.error('Error en la solicitud:', error)
    } finally {
      setIsProcessingBooking(false)
    }
  }

  const proceedWithBooking = async () => {
    if (!selectedClass) return

    try {
      setIsLoading(true)
      
      const requestBody: any = {
        scheduledClassId: selectedClass,
        bikeNumber: selectedBikeId,
      }

      if (isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek) {
        requestBody.useUnlimitedWeek = true
      }

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        const data = await response.json()
        
        toast({
          title: "¡Reserva confirmada!",
          description: isUsingUnlimitedWeek 
            ? "Reserva creada con Semana Ilimitada. Recuerda confirmar por WhatsApp."
            : "Se ha enviado un correo de confirmación.",
        })

        setSelectedClass(null)
        setSelectedTime(null)
        setSelectedBikeId(null)
        setUnlimitedWeekValidation(null)
        setShowUnlimitedWeekConfirmation(false)
        
        loadAvailableClasses()
        
      } else {
        const errorData = await response.json()
        toast({
          title: "Error al confirmar la reserva",
          description: errorData.error || "No se pudo procesar la reserva",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error al confirmar la reserva",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener clases para fecha seleccionada
  const getClassesForSelectedDate = () => {
    return date 
      ? availableClasses.filter(cls => isClassOnSelectedDate(cls.date, date))
      : []
  }
  
  // Obtener horarios disponibles con información de disponibilidad
  const getTimeSlotsForSelectedDate = () => {
    const classesForDate = getClassesForSelectedDate()
    const timeSlots = getUniqueTimeSlotsFromClasses(
      classesForDate.map(cls => ({ date: cls.date, time: cls.time }))
    )
    
    // Agregar información de disponibilidad a cada time slot
    return timeSlots.map(time => {
      const classesForTime = getClassesForSelectedTime(time)
      const totalAvailableSpots = classesForTime.reduce((total, cls) => total + cls.availableSpots, 0)
      const hasAvailability = totalAvailableSpots > 0
      
      return {
        time,
        hasAvailability,
        totalAvailableSpots
      }
    })
  }
  
  // Obtener clases para horario específico
  const getClassesForSelectedTime = (time: string) => {
    if (!date) return []
    
    return filterClassesByDateAndTime(
      availableClasses.map(cls => ({ 
        date: cls.date, 
        time: cls.time,
        originalClass: cls
      })),
      date,
      time
    ).map(item => (item as any).originalClass)
  }

  // Verificar si una clase es reservable
  const isClassReservable = (cls: ScheduledClass | undefined) => {
    if (!cls) return false;
    
    try {
      const now = new Date()
      const classDateTime = createClassDateTime(cls.date, cls.time)
      const timeDiff = classDateTime.getTime() - now.getTime()
      const THIRTY_MIN = 30 * 60 * 1000
      
      return timeDiff > THIRTY_MIN
    } catch (error) {
      console.error("Error verificando disponibilidad:", error)
      return false
    }
  }

  // Verificar si una fecha tiene clases disponibles
  const hasAvailableClassesOnDate = (checkDate: Date) => {
    const classesForDate = availableClasses.filter(cls => 
      isClassOnSelectedDate(cls.date, checkDate)
    )
    return classesForDate.some(cls => cls.availableSpots > 0 && isClassReservable(cls))
  }

  // Verificar si una fecha está bloqueada por Semana Ilimitada (fines de semana)
  const isDateBlockedForUnlimitedWeek = (checkDate: Date) => {
    return isUsingUnlimitedWeek && !isBusinessDay(checkDate)
  }

  // Verificar si una fecha es pasada (ayer hacia atrás)
  const isPastDate = (checkDate: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate())
    yesterday.setHours(0, 0, 0, 0)
    
    const checkDateOnly = new Date(checkDate)
    checkDateOnly.setHours(0, 0, 0, 0)
    
    return checkDateOnly < yesterday
  }

  // Verificar si un día futuro tiene clases pero todas están llenas
  const hasClassesButAllFull = (checkDate: Date) => {
    if (isPastDate(checkDate)) return false
    const classesForDate = availableClasses.filter(cls => 
      isClassOnSelectedDate(cls.date, checkDate)
    )
    
    // Solo devolver true si hay clases Y todas están llenas (sin cupos disponibles)
    if (classesForDate.length === 0) return false
    
    // Verificar que TODAS las clases no tengan cupos disponibles
    const allClassesFull = classesForDate.every(cls => cls.availableSpots === 0)
    
    return allClassesFull
  }

  // Reset estados cuando cambia la disponibilidad de Semana Ilimitada
  useEffect(() => {
    // Si se activa Semana Ilimitada y la fecha seleccionada es fin de semana, resetear
    if (isUsingUnlimitedWeek && date && !isBusinessDay(date)) {
      setDate(undefined)
      setSelectedTime(null)
      setSelectedClass(null)
      setScheduledClassId(null)
    }
  }, [isUsingUnlimitedWeek, date])

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}
      <section className="py-12 pt-14 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-5xl md:text-5xl font-bold tracking-tight mb-4 anim-slide-in-up">
            RESERVA TU <span className="text-brand-sage">CLASE</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-zinc-700">
            Selecciona fecha, clase y horario para asegurar tu lugar
          </p>
          

        </div>
      </section>

      {/* Sección de Información de Semana Ilimitada */}
      {isUsingUnlimitedWeek && weeklyUsage && (
        <section className="py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-400 text-white rounded-full p-3 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-blue-900 mb-2">
                      Tú Semana Ilimitada esta activada
                    </h3>
                    <p className="text-blue-800 mb-3">
                      Todas tus reservas se realizarán automáticamente con tu paquete Semana Ilimitada. 
                      Solo puedes reservar de <strong>lunes a viernes</strong>.
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <WeeklyUsageDisplay 
                        usage={weeklyUsage} 
                        className="flex-1 min-w-64"
                      />
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex-shrink-0">
                        <p className="text-blue-700 font-medium text-sm">
                          Días disponibles para reservar
                        </p>
                        <p className="text-blue-600 text-xs mt-1">
                          Lunes • Martes • Miércoles • Jueves • Viernes
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Sección básica de uso semanal (cuando no hay Semana Ilimitada) */}
      {hasActiveUnlimitedWeek && weeklyUsage && !isUsingUnlimitedWeek && (
        <section className="py-4 bg-blue-50">
          <div className="container px-4 md:px-6">
            <WeeklyUsageDisplay 
              usage={weeklyUsage} 
              className="max-w-md mx-auto"
            />
          </div>
        </section>
      )}

      {/* Booking Section */}
      <section className="py-16 bg-white">
        <div className="container px-4 md:px-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                        onSelect={(selectedDate) => {
                          // Bloquear fechas pasadas y fines de semana si tiene Semana Ilimitada activa
                          if (selectedDate && (isPastDate(selectedDate) || (isUsingUnlimitedWeek && !isBusinessDay(selectedDate)))) {
                            return // No permitir selección
                          }
                          setDate(selectedDate)
                        }}
                        locale={es}
                        className="bg-white text-zinc-900 w-full rounded-lg"
                        classNames={{
                          day_selected: "bg-brand-mint text-white rounded-lg",
                          day_today: "bg-gray-100 text-zinc-900 rounded-lg",
                          day: "text-zinc-900 hover:bg-gray-100 rounded-lg relative",
                        }}
                        modifiers={{
                          pastDate: (day) => isPastDate(day),
                          fullButFuture: (day) => hasClassesButAllFull(day),
                          blockedWeekend: (day) => isDateBlockedForUnlimitedWeek(day)
                        }}
                        modifiersClassNames={{
                          pastDate: "bg-gray-100 text-gray-400 cursor-not-allowed opacity-50 line-through",
                          fullButFuture: "bg-blue-50 text-blue-700 font-bold cursor-pointer border border-blue-200 hover:bg-blue-100 before:absolute before:bottom-1 before:left-1/2 before:-translate-x-1/2 before:w-1 before:h-1 before:bg-blue-600 before:rounded-full",
                          blockedWeekend: "bg-red-100 text-red-400 cursor-not-allowed opacity-50 relative after:absolute after:inset-0 after:bg-red-500/20 after:rounded-lg"
                        }}
                        disabled={(date) => isPastDate(date) || isDateBlockedForUnlimitedWeek(date)}
                      />
                      
                      {/* Leyenda del calendario */}
                      <div className="mt-3 px-2">
                        <div className="flex justify-center gap-3 text-xs flex-wrap">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-gray-600 font-bold text-blue-700">Lleno</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-gray-600 line-through">Pasado</span>
                          </div>
                          {isUsingUnlimitedWeek && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                              <span className="text-gray-600">Bloqueado</span>
                            </div>
                          )}
                        </div>
                        {isUsingUnlimitedWeek && (
                          <div className="text-center mt-2">
                            <p className="text-xs text-red-600 font-medium">
                              Semana Ilimitada: Solo lunes a viernes
                            </p>
                          </div>
                        )}
                      </div>
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
                  
                  {/* Leyenda de disponibilidad */}
                  
                  <div className="p-4 grid grid-cols-3 gap-2">
                    {isLoading ? (
                      <div className="col-span-3 text-center py-8 text-gray-500">Cargando horarios...</div>
                    ) : getTimeSlotsForSelectedDate().length > 0 ? (
                      getTimeSlotsForSelectedDate().map((timeSlot) => {
                        const isSelected = selectedTime === timeSlot.time
                        const hasAvailability = timeSlot.hasAvailability
                        
                        return (
                          <Button
                            key={timeSlot.time}
                            variant={isSelected ? "default" : "outline"}
                            disabled={!hasAvailability}
                            className={`rounded-full relative ${
                              isSelected
                                ? "bg-brand-sage hover:bg-brand-sage/90 text-white"
                                : hasAvailability
                                ? "border-brand-sage text-brand-sage hover:bg-gray-50"
                                : "border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed"
                            } ${!hasAvailability ? "opacity-60" : ""}`}
                            onClick={() => {
                              if (hasAvailability) {
                                setSelectedTime(timeSlot.time);
                                setSelectedClass(null);
                              }
                            }}
                          >
                            <span className={!hasAvailability ? "line-through" : ""}>
                              {timeSlot.time}
                            </span>
                            {!hasAvailability && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                                ✕
                              </span>
                            )}
                          </Button>
                        )
                      })
                    ) : (
                      <div className="col-span-3 text-center py-8">
                        <div className="text-gray-500 mb-2">
                          {date && isPastDate(date) 
                            ? "Esta fecha ya pasó - Selecciona una fecha desde hoy en adelante"
                            : date && hasClassesButAllFull(date)
                            ? "¡Ups! Todas las clases están llenas para esta fecha"
                            : "No hay clases disponibles para la fecha seleccionada"
                          }
                        </div>
                        {date && !isPastDate(date) && (
                          <div className="text-sm text-gray-400">
                            {availableClasses.filter(cls => isClassOnSelectedDate(cls.date, date)).length > 0 
                              ? hasClassesButAllFull(date)
                                ? "Todas las clases de este día están llenas - Sin cupos disponibles"
                                : "Algunas clases están llenas o ya pasó el tiempo de reserva"
                              : "No hay clases programadas para este día"
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-brand-burgundy-dark" />
                    <h3 className="text-xl font-bold text-brand-burgundy-dark">Selecciona Clase</h3>
                  </div>
                  <div className="p-4 space-y-2">
                    {isLoading ? (
                      <div className="text-center py-8 text-gray-500">Cargando clases...</div>
                    ) : selectedTime ? (
                      <div className="space-y-4">
                        {getClassesForSelectedTime(selectedTime).map((cls) => {
                          const hasAvailability = cls.availableSpots > 0
                          const isReservable = isClassReservable(cls)
                          const canReserve = hasAvailability && isReservable
                          
                          return (
                            <Card 
                              key={cls.id} 
                              className={`transition-all ${
                                selectedClass === cls.id 
                                  ? 'ring-2 ring-[#4A102A] bg-gray-50' 
                                  : canReserve 
                                  ? 'hover:shadow-md cursor-pointer' 
                                  : !hasAvailability 
                                  ? 'cursor-not-allowed bg-green-900 border-green-700' // Color verde oscuro para sin cupo
                                  : 'opacity-60 cursor-not-allowed bg-gray-100'
                              }`}
                              onClick={() => canReserve && handleClassSelection(cls.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className={`font-medium ${
                                        !hasAvailability 
                                          ? 'text-white' // Texto blanco para contraste con verde oscuro
                                          : !canReserve 
                                          ? 'text-gray-500 line-through' 
                                          : ''
                                      }`}>
                                        {cls.classType.name}
                                      </h4>
                                      {!hasAvailability && (
                                        <span className="bg-white text-green-900 text-xs px-2 py-1 rounded-full font-semibold">
                                          SIN CUPO
                                        </span>
                                      )}
                                      {hasAvailability && !isReservable && (
                                        <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                                          TIEMPO AGOTADO
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-sm ${
                                      !hasAvailability 
                                        ? 'text-green-100' // Texto claro para el instructor en clases sin cupo
                                        : !canReserve 
                                        ? 'text-gray-400' 
                                        : 'text-gray-500'
                                    }`}>
                                      {cls.instructor.name}
                                    </p>
                                    <p className={`text-xs mt-1 ${
                                      !hasAvailability 
                                        ? 'text-green-200 font-medium' // Texto claro para la descripción en clases sin cupo
                                        : !isReservable
                                        ? 'text-gray-500'
                                        : 'text-green-600'
                                    }`}>
                                      {!hasAvailability 
                                        ? 'Clase llena - Sin cupos disponibles'
                                        : !isReservable
                                        ? 'Reservas cerradas (30 min antes del inicio)'
                                        : `${cls.availableSpots} lugar${cls.availableSpots !== 1 ? 'es' : ''} disponible${cls.availableSpots !== 1 ? 's' : ''}`
                                      }
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-sm ${!canReserve ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {cls.classType.duration} min
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}

                        {/* Opciones de reserva */}
                        {selectedClass && (
                          <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
                            <CardContent className="p-6">
                              <h3 className="font-semibold mb-4">Opciones de Reserva</h3>
                              
                              {/* Mensaje informativo de Semana Ilimitada */}
                              {isUsingUnlimitedWeek && (
                                <div className="space-y-3 mb-4">
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <div className="flex items-start gap-3">
                                      <div className="bg-blue-500 text-white rounded-full p-1 flex-shrink-0">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M9 12l2 2 4-4"/>
                                          <circle cx="12" cy="12" r="10"/>
                                        </svg>
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-blue-900 mb-1">
                                          Estas usando tu Semana Ilimitada
                                        </h4>
                                        <p className="text-sm text-blue-800">
                                          Esta reserva se realizará automáticamente con tu paquete Semana Ilimitada. 
                                          Recuerda confirmar por WhatsApp para garantizar tu lugar.
                                        </p>
                                        {weeklyUsage && (
                                          <div className="mt-2 text-xs text-blue-700">
                                            <span className="bg-blue-100 px-2 py-1 rounded-full">
                                              {weeklyUsage.used}/{weeklyUsage.limit} clases esta semana
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Mostrar validación de Semana Ilimitada */}
                                  {unlimitedWeekValidation && (
                                    <UnlimitedWeekAlert 
                                      validation={unlimitedWeekValidation}
                                      className="mt-3"
                                    />
                                  )}
                                  
                                  {isValidatingUnlimitedWeek && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                      Validando disponibilidad...
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Información de paquetes normales */}
                              {!isUsingUnlimitedWeek && isAuthenticated && userAvailableClasses > 0 && (
                                <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-4">
                                  <p className="text-sm text-green-800">
                                    Tienes {userAvailableClasses} clase(s) disponible(s) en tus paquetes
                                  </p>
                                </div>
                              )}
                              
                              {/* Información para usuarios no autenticados */}
                              {!isAuthenticated && (
                                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
                                  <p className="text-sm text-yellow-800">
                                   Inicia sesión para usar tus paquetes o completar la reserva
                                  </p>
                                </div>
                              )}

                              {/* Botón de reserva */}
                              <Button
                                className="w-full bg-brand-sage hover:bg-brand-sage text-white font-semibold py-3"
                                disabled={
                                  isProcessingBooking || 
                                  !selectedClass || 
                                  !selectedBikeId ||
                                  (isUsingUnlimitedWeek && !unlimitedWeekValidation?.canUseUnlimitedWeek) ||
                                  !isClassReservable(availableClasses.find(c => c.id === selectedClass))
                                }
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    setIsAuthModalOpen(true)
                                    return
                                  }
                                  
                                  const classToBook = availableClasses.find(c => c.id === selectedClass)
                                  if (classToBook) {
                                    setSelectedScheduledClassForBooking(classToBook)
                                    
                                    if (userAvailableClasses > 0 || (isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek)) {
                                      handleConfirmBooking()
                                    } else {
                                      setIsPaymentOpen(true)
                                    }
                                  }
                                }}
                              >
                                <span className="flex items-center gap-1">
                                  {isProcessingBooking ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      PROCESANDO...
                                    </>
                                  ) : !isAuthenticated ? (
                                    "INICIAR SESIÓN PARA RESERVAR"
                                  ) : !selectedBikeId ? (
                                    "SELECCIONA BICICLETA PRIMERO"
                                  ) : isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek ? (
                                    "RESERVAR CON SEMANA ILIMITADA"
                                  ) : isAuthenticated && userAvailableClasses > 0 ? (
                                    "USAR PAQUETE - RESERVAR" 
                                  ) : (
                                    "CONFIRMAR RESERVA"
                                  )} 
                                  {!isProcessingBooking && <ChevronRight className="h-4 w-4" />}
                                </span>
                              </Button>

                              {/* Mensaje de información adicional */}
                              {isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek && (
                                <p className="text-xs text-gray-600 mt-2 text-center">
                                  Deberás confirmar por WhatsApp para garantizar tu lugar
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Selecciona un horario para ver las clases disponibles
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Bike className="mr-2 h-5 w-5 text-brand-burgundy" />
                    <h3 className="text-xl font-bold text-brand-burgundy-dark">Selecciona Bicicleta</h3>
                  </div>
                  <div className="p-4">
                    {selectedClass ? (
                      <BikeSelectionInline
                        scheduledClassId={selectedClass}
                        selectedBikeId={selectedBikeId}
                        onBikeSelected={setSelectedBikeId}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Selecciona una clase para ver las bicicletas disponibles
                      </div>
                    )}
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
                      {selectedClass ? `${availableClasses.find((c) => c.id === selectedClass)?.classType.duration} minutos` : ""}
                    </span>
                  </div>
                  
                  {selectedBikeId && (
                    <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                      <span className="text-zinc-700">Bicicleta:</span>
                      <span className="font-medium text-brand-burgundy">
                        🚲 Bicicleta #{selectedBikeId}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Cupo disponible:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedClass 
                        ? `${availableClasses.find(c => c.id === selectedClass)?.availableSpots} lugares`
                        : "N/A"
                      }
                    </span>
                  </div>
                  
                  {/* Mostrar clases disponibles del usuario si está autenticado */}
                  {isAuthenticated && (
                    <div className="bg-brand-mint/10 rounded-lg p-3 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-700 font-medium">Tus clases disponibles:</span>
                        <span className="font-bold text-xl text-brand-sage">
                          {isLoadingUserClasses ? "..." : userAvailableClasses}
                        </span>
                      </div>
                      {userAvailableClasses > 0 ? (
                        <p className="text-sm text-green-700 mt-1">
                          ✓ Puedes reservar esta clase usando tu paquete
                        </p>
                      ) : (
                        <>
                          <p className="text-sm text-orange-700 mt-1">
                            ⚠ Necesitarás pagar para reservar esta clase
                          </p>
                          <Button
                            variant="outline"
                            className="mt-3 w-full border-brand-sage text-brand-sage hover:bg-brand-sage/10"
                            onClick={() => router.push('/paquetes')}
                          >
                            Comprar Paquetes
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full mt-6 bg-brand-mint hover:bg-brand-mint/90 font-bold text-lg py-6 rounded-full text-white"
                  disabled={!date || !selectedClass || !selectedTime || !selectedBikeId || isProcessingBooking || !isClassReservable(availableClasses.find(c => c.id === selectedClass))}
                  onClick={() => {
                    if (!isAuthenticated) {
                      setIsAuthModalOpen(true)
                      return
                    }
                    
                    const classToBook = availableClasses.find(c => c.id === selectedClass)
                    if (classToBook) {
                      setSelectedScheduledClassForBooking(classToBook)
                      
                      if (userAvailableClasses > 0 || (isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek)) {
                        handleConfirmBooking()
                      } else {
                        setIsPaymentOpen(true)
                      }
                    }
                  }}
                >
                  <span className="flex items-center gap-1">
                    {isProcessingBooking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        PROCESANDO...
                      </>
                    ) : !isAuthenticated ? (
                      "INICIAR SESIÓN PARA RESERVAR"
                    ) : !selectedBikeId ? (
                      "SELECCIONA BICICLETA PRIMERO"
                    ) : isAuthenticated && userAvailableClasses > 0 ? (
                      "USAR PAQUETE - RESERVAR" 
                    ) : (
                      "CONFIRMAR RESERVA"
                    )} 
                    {!isProcessingBooking && <ChevronRight className="h-4 w-4" />}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-brand-burgundy-dark">Cancelaciones</h3>
              <p className="text-zinc-600">
                Puedes cancelar tu reserva hasta 12 horas antes de la clase sin penalización. Cancelaciones tardías
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
                 Si una persona reservada no llega antes del inicio de la segunda canción, su lugar se liberará en la plataforma.
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
      <Dialog open={isConfirmationOpen} onOpenChange={(open) => {
        setIsConfirmationOpen(open);
        if (!open) {
          router.push("/mi-cuenta");
        }
      }}>
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
                {selectedBikeId && (
                  <p className="font-medium text-brand-burgundy">
                    🚲 Bicicleta #{selectedBikeId}
                  </p>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Se ha enviado un correo de confirmación con los detalles de tu reserva. Te esperamos en el estudio.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              className="bg-brand-burgundy hover:bg-brand-burgundy/90 text-white"
              onClick={() => setIsConfirmationOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              variant="outline"
              className="border-brand-burgundy text-brand-burgundy"
              onClick={() => router.push("/mi-cuenta")}
            >
              Ver reservas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A] text-xl">¡Estás a un paso!</DialogTitle>
            <DialogDescription className="text-gray-600">
              Regístrate o inicia sesión para confirmar tu lugar en esta clase increíble.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Mostrar resumen de la clase seleccionada */}
            {selectedClass && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-brand-burgundy mb-2">Tu selección:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Clase:</strong> {availableClasses.find((c) => c.id === selectedClass)?.classType.name}</p>
                  <p><strong>Fecha:</strong> {date ? format(date, "EEEE, d 'de' MMMM", { locale: es }) : ""}</p>
                  <p><strong>Hora:</strong> {selectedTime}</p>
                  <p><strong>Instructor:</strong> {availableClasses.find((c) => c.id === selectedClass)?.instructor.name}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <Button 
                className="w-full bg-brand-mint hover:bg-brand-mint/90 text-white font-semibold py-3" 
                onClick={() => {
                  router.push("/login?redirect=/reservar");
                  setIsAuthModalOpen(false);
                }}
              >
                Iniciar Sesión
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-brand-mint text-brand-mint hover:bg-brand-mint/10 font-semibold py-3"
                onClick={() => {
                  router.push("/registro?redirect=/reservar");
                  setIsAuthModalOpen(false);
                }}
              >
                Registrarse Gratis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de Semana Ilimitada */}
      <Dialog open={showUnlimitedWeekConfirmation} onOpenChange={setShowUnlimitedWeekConfirmation}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Confirmar Reserva con Semana Ilimitada</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <UnlimitedWeekConfirmation
              graceTimeHours={12}
              onConfirm={() => {
                setShowUnlimitedWeekConfirmation(false)
                if (selectedBikeId) {
                  proceedWithBooking()
                } else {
                  // Si no hay bicicleta seleccionada, mostrar un mensaje
                  toast({
                    title: "Selecciona una bicicleta",
                    description: "Por favor, selecciona una bicicleta antes de confirmar la reserva.",
                    variant: "destructive",
                  })
                }
              }}
              onCancel={() => {
                setShowUnlimitedWeekConfirmation(false)
              }}
            />
            
            {/* Solo mostrar el botón de WhatsApp cuando ya se ha seleccionado una bicicleta */}
            {selectedBikeId && (
              <div className="text-center mt-6 space-y-3">
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Confirma tu asistencia por WhatsApp:
                  </p>
                  <a 
                    href={`https://wa.me/527753571894?text=${encodeURIComponent(
                      `Hola! Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. ` + 
                      `Fecha: ${date ? format(date, "EEEE, d 'de' MMMM", { locale: es }) : ""} ` + 
                      `Hora: ${selectedTime || ""} ` + 
                      `Clase: ${selectedClass ? availableClasses.find((c) => c.id === selectedClass)?.classType.name : ""} ` +
                      `Bicicleta: #${selectedBikeId}`
                    )}`} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] text-white px-6 py-3 rounded-full font-semibold inline-flex items-center gap-2 hover:bg-[#20BD5A] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Confirmar por WhatsApp
                  </a>
                  
                  <div className="text-sm text-gray-600 mt-2">
                    <p>Si el botón no funciona, envía un mensaje al:</p>
                    <p className="font-semibold mt-1">+52 77 5357 1894</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}