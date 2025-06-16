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

import { 
  isBusinessDay, 
  addBusinessDays 
} from "@/lib/utils/business-days"

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

  // Estados para Semana Ilimitada
  const [isUsingUnlimitedWeek, setIsUsingUnlimitedWeek] = useState(false)
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
  
  // Estados para la reserva
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [scheduledClassId, setScheduledClassId] = useState<number | null>(null)
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null)
  
  // Estados para modales
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // Estado para datos de la API
  const [availableClasses, setAvailableClasses] = useState<ScheduledClass[]>([])
  const [userAvailableClasses, setUserAvailableClasses] = useState<number>(0)
  const [isLoadingUserClasses, setIsLoadingUserClasses] = useState(false)
  const [selectedScheduledClassForBooking, setSelectedScheduledClassForBooking] = useState<ScheduledClass | null>(null)
  const [isProcessingBooking, setIsProcessingBooking] = useState(false)

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
    
    if (hasActiveUnlimitedWeek === true) {
      setIsValidatingUnlimitedWeek(true)
      const validation = await validateUnlimitedWeek(classId)
      setUnlimitedWeekValidation(validation)
      setIsValidatingUnlimitedWeek(false)
    }
  }

  const handleUnlimitedWeekToggle = async (enabled: boolean) => {
    // Verificar si es día hábil antes de permitir activar
    if (enabled && date && !isBusinessDay(date)) {
      toast({
        title: "Día no válido",
        description: "La Semana Ilimitada solo está disponible de lunes a viernes.",
        variant: "destructive",
      })
      return
    }
    
    setIsUsingUnlimitedWeek(enabled)
    
    if (enabled && selectedClass && !unlimitedWeekValidation) {
      setIsValidatingUnlimitedWeek(true)
      const validation = await validateUnlimitedWeek(selectedClass)
      setUnlimitedWeekValidation(validation)
      setIsValidatingUnlimitedWeek(false)
    }
  }

  const handleConfirmBooking = async () => {
    console.log("handleConfirmBooking called")
    console.log("isAuthenticated:", isAuthenticated)
    console.log("isUsingUnlimitedWeek:", isUsingUnlimitedWeek)
    console.log("selectedBikeId:", selectedBikeId)
    
    // Verificar autenticación primero
    if (!isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }
    
    if (!selectedClass || !selectedBikeId) {
      toast({
        title: "Información incompleta",
        description: "Por favor selecciona una clase y una bicicleta antes de continuar.",
        variant: "destructive",
      })
      return
    }

    const classToBook = availableClasses.find(c => c.id === selectedClass)
    if (!classToBook) {
      console.log("Class not found in availableClasses, returning")
      return
    }

    // Verificar si la clase aún es reservable
    if (!isClassReservable(classToBook)) {
      toast({
        title: "Clase no disponible",
        description: "Esta clase ya no se puede reservar (inicia en menos de 30 minutos).",
        variant: "destructive",
      })
      return
    }

    setSelectedScheduledClassForBooking(classToBook)

    // Toast inmediato para feedback
    toast({
      title: "Procesando reserva...",
      description: "Por favor espera mientras confirmamos tu reserva.",
      duration: 2000,
    })

    // 1. Handle Unlimited Week reservation - needs confirmation first
    if (hasActiveUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek) {
      console.log("Using Unlimited Week, showing confirmation")
      setShowUnlimitedWeekConfirmation(true)
      return
    }

    // 2. For regular bookings, proceed directly since bike is already selected
    console.log("Bike already selected. User available classes:", userAvailableClasses)
    if (!hasActiveUnlimitedWeek && userAvailableClasses > 0) {
      console.log("User has available classes, proceeding with booking")
      await proceedWithBooking()
    } else if (!hasActiveUnlimitedWeek) {
      console.log("User has no available classes, opening payment dialog")
      setIsPaymentOpen(true)
    }
  }

  const proceedWithBooking = async () => {
    if (!selectedClass) return

    try {
      setIsProcessingBooking(true)
      
      const requestBody: any = {
        scheduledClassId: selectedClass,
        bikeNumber: selectedBikeId,
      }

      if (hasActiveUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek) {
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
          description: hasActiveUnlimitedWeek 
            ? "Reserva creada con Semana Ilimitada. Recuerda confirmar por WhatsApp."
            : "Se ha enviado un correo de confirmación.",
        })

        setSelectedClass(null)
        setSelectedTime(null)
        setSelectedBikeId(null)
        setIsUsingUnlimitedWeek(false)
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
      setIsProcessingBooking(false)
    }
  }

  const handleBikeSelected = async (bikeId: number) => {
    console.log("handleBikeSelected called with bikeId:", bikeId)
    setSelectedBikeId(bikeId)
    // Note: No longer auto-proceeding with booking, user must click the main button
  }

  // Obtener clases para fecha seleccionada
  const getClassesForSelectedDate = () => {
    return date 
      ? availableClasses.filter(cls => isClassOnSelectedDate(cls.date, date))
      : []
  }
  
  // Obtener horarios disponibles
  const getTimeSlotsForSelectedDate = () => {
    const classesForDate = getClassesForSelectedDate()
    return getUniqueTimeSlotsFromClasses(
      classesForDate.map(cls => ({ date: cls.date, time: cls.time }))
    )
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
  const isClassReservable = (cls: ScheduledClass) => {
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

  // Función para verificar si una fecha es pasada
  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  // Función para verificar si una fecha está bloqueada para semana ilimitada
  const isDateBlockedForUnlimitedWeek = (date: Date) => {
    if (!hasActiveUnlimitedWeek) return false
    
    // Bloquear TODOS los fines de semana (sábados y domingos)
    if (!isBusinessDay(date)) {
      return true
    }
    
    // Usar la fecha de expiración real del paquete en lugar de un límite fijo
    if (weeklyUsage?.activePackageInfo?.expiryDate) {
      const expiryDate = new Date(weeklyUsage.activePackageInfo.expiryDate)
      // Normalizar las fechas para comparar solo el día (sin hora)
      const targetDate = new Date(date)
      targetDate.setHours(0, 0, 0, 0)
      expiryDate.setHours(23, 59, 59, 999)
      
      return targetDate > expiryDate
    }
    
    // Fallback: si no hay información del paquete, usar límite de 7 días hábiles
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = addBusinessDays(today, 5)
    
    return date > maxDate
  }

  // Función para verificar si una fecha tiene clases pero todas están llenas
  const hasClassesButAllFull = (date: Date) => {
    const dayClasses = availableClasses.filter(cls => 
      isClassOnSelectedDate(cls.date, date)
    )
    
    if (dayClasses.length === 0) return false
    
    // Verificar si todas las clases están llenas (availableSpots <= 0)
    return dayClasses.every(cls => cls.availableSpots <= 0)
  }

  // Función para deshabilitar fechas en el calendario
  const isDateDisabled = (date: Date) => {
    return isPastDate(date) || isDateBlockedForUnlimitedWeek(date)
  }

  // Reset isUsingUnlimitedWeek if hasActiveUnlimitedWeek becomes false
  useEffect(() => {
    if (!hasActiveUnlimitedWeek) {
      setIsUsingUnlimitedWeek(false)
    }
  }, [hasActiveUnlimitedWeek])

  // Auto-forzar uso de Semana Ilimitada cuando está activa
  useEffect(() => {
    if (hasActiveUnlimitedWeek) {
      setIsUsingUnlimitedWeek(true) // Forzar automáticamente
    }
  }, [hasActiveUnlimitedWeek])

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}
      <section className="py-12 pt-14 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-5xl md:text-5xl font-bold tracking-tight mb-4 anim-slide-in-up">
            RESERVA TU <span className="text-brand-sage">CLASE</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-zinc-700">
            Selecciona fecha, horario, clase y bicicleta para asegurar tu lugar
          </p>
        </div>
      </section>

      {/* Sección de Información de Semana Ilimitada */}
      {hasActiveUnlimitedWeek && weeklyUsage && (
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
                        onSelect={setDate}
                        locale={es}
                        disabled={isDateDisabled}
                        modifiers={{
                          fullDate: (date) => hasClassesButAllFull(date),
                          pastDate: (date) => isPastDate(date),
                          blockedDate: (date) => isDateBlockedForUnlimitedWeek(date)
                        }}
                        modifiersStyles={{
                          fullDate: { 
                            position: 'relative',
                            backgroundColor: '#e0f2fe',
                            border: '2px solid #0284c7',
                          },
                          pastDate: {
                            opacity: 0.5,
                            textDecoration: 'line-through'
                          },
                          blockedDate: {
                            opacity: 0.3,
                            background: '#f3f4f6'
                          }
                        }}
                        className="bg-white text-zinc-900 w-full rounded-lg"
                        classNames={{
                          day_selected: "bg-brand-mint text-white rounded-lg",
                          day_today: "bg-gray-100 text-zinc-900 rounded-lg",
                          day: "text-zinc-900 hover:bg-gray-100 rounded-lg",
                          day_disabled: "text-gray-400 opacity-50 cursor-not-allowed",
                        }}
                      />
                      
                      {/* Leyenda del calendario */}
                      <div className="mt-4 space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-brand-mint rounded"></div>
                          <span>Fecha seleccionada</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-100 rounded border-2 border-blue-500"></div>
                          <span>Todas las clases llenas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-200 rounded opacity-50 line-through"></div>
                          <span>Fechas pasadas</span>
                        </div>
                        {hasActiveUnlimitedWeek && (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-gray-100 rounded opacity-30"></div>
                              <span>Fines de semana (Semana Ilimitada)</span>
                            </div>
                            {weeklyUsage?.activePackageInfo?.expiryDate && (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-100 rounded opacity-50"></div>
                                <span>Después del {new Date(weeklyUsage.activePackageInfo.expiryDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                              </div>
                            )}
                          </>
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
                            setSelectedClass(null);
                            setSelectedBikeId(null); // Reset bike selection when time changes
                          }}
                        >
                          {time}
                        </Button>
                      ))
                    ) : (
                      <div className="col-span-3 text-center py-8 text-gray-500">
                        {date ? (
                          <>
                            <div className="text-sm">No hay clases disponibles para:</div>
                            <div className="font-medium mt-1">{format(date, "EEEE, d 'de' MMMM", { locale: es })}</div>
                            <div className="text-xs mt-2 text-gray-400">
                              {hasClassesButAllFull(date) 
                                ? "Todas las clases están llenas para este día"
                                : "No hay clases programadas para esta fecha"
                              }
                            </div>
                            {hasClassesButAllFull(date) && (
                              <div className="text-xs mt-1 text-blue-600">
                                💡 Puedes unirte a la lista de espera cuando selecciones una clase
                              </div>
                            )}
                          </>
                        ) : (
                          "Selecciona una fecha para ver los horarios disponibles"
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
                        {getClassesForSelectedTime(selectedTime).map((cls) => (
                          <Card 
                            key={cls.id} 
                            className={`transition-all ${
                              !isClassReservable(cls) 
                                ? 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200' 
                                : selectedClass === cls.id 
                                  ? 'ring-2 ring-[#4A102A] bg-gray-50 cursor-pointer' 
                                  : 'hover:shadow-md cursor-pointer'
                            }`}
                            onClick={() => {
                              if (isClassReservable(cls)) {
                                handleClassSelection(cls.id)
                                setSelectedBikeId(null) // Reset bike selection when class changes
                              }
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-medium">{cls.classType.name}</h4>
                                  <p className="text-sm text-gray-500">{cls.instructor.name}</p>
                                  
                                  {/* Verificar si la clase es reservable */}
                                  {!isClassReservable(cls) ? (
                                    <div className="mt-2">
                                      <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">
                                        Ya no se puede reservar
                                      </span>
                                      <p className="text-xs text-red-600 mt-1">
                                        La clase inicia en menos de 30 minutos o ya paso.
                                      </p>
                                    </div>
                                  ) : (
                                    /* Información de disponibilidad */
                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                      <span className={`px-2 py-1 rounded-full ${
                                        cls.availableSpots <= 2 
                                          ? 'bg-red-100 text-red-700' 
                                          : cls.availableSpots <= 5 
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-green-100 text-green-700'
                                      }`}>
                                        {cls.availableSpots} {cls.availableSpots === 1 ? 'lugar' : 'lugares'} disponible{cls.availableSpots === 1 ? '' : 's'}
                                      </span>
                                      
                                      {cls.availableSpots <= 2 && (
                                        <span className="text-red-600 font-medium">¡Últimos lugares!</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right ml-3">
                                  <span className="text-sm text-gray-500">{cls.classType.duration} min</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Opciones de reserva - Solo mostrar cuando hay opciones reales disponibles */}
                        {selectedClass && (hasActiveUnlimitedWeek || (isAuthenticated && userAvailableClasses > 0)) && (
                          <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
                            <CardContent className="p-6">
                              <h3 className="font-semibold mb-4">Opciones de Reserva</h3>
                              
                              {/* Información cuando tiene Semana Ilimitada activa */}
                              {hasActiveUnlimitedWeek && (
                                <div className="space-y-3 mb-4">
                                  {/* Mensaje informativo para Semana Ilimitada forzada */}
                                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                    <p className="text-sm text-blue-800 font-medium">
                                      ¡Felicidades por comprar Semana Ilimitada! Ahora, estas usando Semana Ilimitada
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      Recuerda que es solo válida de lunes a viernes. No puedes usar otros paquetes mientras esté activa.Y deberás mandar confirmar por WhatsApp para garantizar tu lugar.
                                    </p>
                                  </div>
                                  
                                  {/* Mensaje informativo para fines de semana */}
                                  {date && !isBusinessDay(date) && (
                                    <div className="bg-orange-50 p-3 rounded-md border border-orange-200">
                                      <p className="text-sm text-orange-800 font-medium">
                                        ¡Ups! la Semana Ilimitada no es válida en fines de semana
                                      </p>
                                      <p className="text-xs text-orange-600 mt-1">
                                        Selecciona un día hábil (lunes a viernes) o espera a que termine tu Semana Ilimitada.
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Mostrar validación de Semana Ilimitada */}
                                  {unlimitedWeekValidation && (
                                    <UnlimitedWeekAlert 
                                      validation={unlimitedWeekValidation}
                                      className="mt-3"
                                    />
                                  )}
                                  
                                  {/* Mensaje de información adicional para semana ilimitada */}
                                  {unlimitedWeekValidation?.canUseUnlimitedWeek && date && isBusinessDay(date) && (
                                    <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                      <p className="text-xs text-blue-800 text-center">
                                        ℹ️ Deberás confirmar por WhatsApp para garantizar tu lugar
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Información de paquetes normales - SOLO cuando NO tiene Semana Ilimitada */}
                              {!hasActiveUnlimitedWeek && isAuthenticated && userAvailableClasses > 0 && (
                                <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-4">
                                  <p className="text-sm text-green-800">
                                    ✅ Tienes {userAvailableClasses} clase(s) disponible(s) en tus paquetes
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {selectedTime ? (
                          <>
                            <div className="text-sm">No hay clases disponibles para:</div>
                            <div className="font-medium mt-1">{selectedTime} hrs</div>
                            <div className="text-xs mt-2 text-gray-400">
                              Las clases pueden estar llenas o no hay cupo disponible
                            </div>
                          </>
                        ) : (
                          "Selecciona un horario para ver las clases disponibles"
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Selección de Bicicleta - Siempre visible estructuralmente */}
              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Bike className="mr-2 h-5 w-5 text-brand-burgundy" />
                    <h3 className="text-xl font-bold text-brand-burgundy-dark">Selecciona Bicicleta</h3>
                  </div>
                  
                  <div className="p-4">
                    {!selectedClass ? (
                      <div className="text-center py-8 text-gray-500">
                        Selecciona una clase para ver las bicicletas disponibles
                      </div>
                    ) : (
                      <BikeSelectionInline
                        scheduledClassId={scheduledClassId}
                        selectedBikeId={selectedBikeId}
                        onBikeSelected={setSelectedBikeId}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-brand-yellow/10 border-none rounded-3xl shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold mb-4 text-brand-mint-dark">Resumen de Reserva</h3>

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
                      {selectedClass ? `${availableClasses.find((c) => c.id === selectedClass)?.classType.duration} minutos` : "No seleccionada"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Bicicleta:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedBikeId ? `🚲 Bicicleta #${selectedBikeId}` : "No seleccionada"}
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
                  
                  {/* Mostrar clases disponibles del usuario si está autenticado */}
                  {isAuthenticated && (
                    <div className="bg-brand-mint/10 rounded-lg p-3 mt-4">
                      {hasActiveUnlimitedWeek ? (
                        /* Usuario con Semana Ilimitada */
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-700 font-medium">Semana Ilimitada:</span>
                            <span className="font-bold text-xl text-blue-600">
                              ACTIVA
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            🔒 Tus otros paquetes estarán disponibles cuando termine la Semana Ilimitada
                          </p>
                          {date && !isBusinessDay(date) && (
                            <p className="text-sm text-orange-700 mt-1">
                              ⚠️ Solo válida de lunes a viernes
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Usuario sin Semana Ilimitada */
                        <div>
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
                  )}
                </div>

                <Button
                  className="w-full mt-6 bg-brand-mint hover:bg-brand-mint/90 font-bold text-lg py-6 rounded-full text-white"
                  disabled={
                    !date || 
                    !selectedClass || 
                    !selectedTime || 
                    !selectedBikeId ||
                    (selectedClass ? !isClassReservable(availableClasses.find(c => c.id === selectedClass)!) : false) ||
                    (hasActiveUnlimitedWeek && date && !isBusinessDay(date)) || // Bloquear fines de semana
                    (hasActiveUnlimitedWeek && !unlimitedWeekValidation?.canUseUnlimitedWeek) ||
                    isProcessingBooking // Deshabilitar durante el procesamiento
                  }
                  onClick={handleConfirmBooking}
                >
                  <span className="flex items-center gap-2 justify-center">
                    {/* Mostrar spinner cuando está procesando */}
                    {isProcessingBooking && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    )}
                    
                    {isProcessingBooking ? (
                      "PROCESANDO RESERVA..."
                    ) : hasActiveUnlimitedWeek ? (
                      (date && !isBusinessDay(date))
                        ? "SEMANA ILIMITADA NO VÁLIDA EN FINES DE SEMANA"
                        : unlimitedWeekValidation?.canUseUnlimitedWeek
                          ? "RESERVAR CON SEMANA ILIMITADA"
                          : "VALIDANDO SEMANA ILIMITADA..."
                    ) : isAuthenticated && userAvailableClasses > 0 ? (
                      "USAR PAQUETE - RESERVAR" 
                    ) : (
                      "CONFIRMAR RESERVA"
                    )}

                    {/* Solo mostrar flecha cuando NO está procesando */}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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
                 Si una persona reservada no llega antes del inicio de la segunda canción, su lugar se cederá a quienes estén en lista de espera.
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
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Acceso Requerido</DialogTitle>
            <DialogDescription className="text-gray-600">
              Necesitas iniciar sesión o registrarte para completar tu reserva.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Button 
              className="w-full bg-brand-mint hover:bg-brand-mint/90 text-white" 
              onClick={() => {
                router.push("/login?redirect=/reservar");
                setIsAuthModalOpen(false);
              }}
            >
              Iniciar Sesión
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-brand-mint text-brand-mint hover:bg-brand-mint/10"
              onClick={() => {
                router.push("/registro?redirect=/reservar");
                setIsAuthModalOpen(false);
              }}
            >
              Registrarse
            </Button>
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
                proceedWithBooking()
              }}
              onCancel={() => {
                setShowUnlimitedWeekConfirmation(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}