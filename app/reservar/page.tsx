"use client"

import { useState, useEffect, useRef } from "react"
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
import { isWithinInterval } from 'date-fns'

import { useUnlimitedWeek } from '@/lib/hooks/useUnlimitedWeek'
import { 
  UnlimitedWeekAlert, 
  WeeklyUsageDisplay, 
  UnlimitedWeekConfirmation 
} from '@/components/ui/unlimited-week-alerts'
import { WhatsAppConfirmationAlert } from '@/components/ui/whatsapp-confirmation-alert'

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
  const reservationSummaryRef = useRef<HTMLDivElement>(null)

  // Estados para Semana Ilimitada - Lógica de validación por clase
  const [unlimitedWeekValidation, setUnlimitedWeekValidation] = useState<any>(null)
  const [
    showUnlimitedWeekConfirmation,
    setShowUnlimitedWeekConfirmation,
  ] = useState(false)
  const [isCheckingUnlimitedWeek, setIsCheckingUnlimitedWeek] = useState(false)
  const [
    canUseUnlimitedForSelectedClass,
    setCanUseUnlimitedForSelectedClass,
  ] = useState(false)

  const {
    weeklyUsage,
    validateUnlimitedWeek,
    hasActiveUnlimitedWeek,
    getWeeklyUsageMessage,
    isLoading: isLoadingWeekly,
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

  // Nuevo estado para mostrar mensaje informativo en la sección de resumen
  const [
    showWeekendInfoMessage,
    setShowWeekendInfoMessage
  ] = useState(false)

  // Define the modifier for unlimited week days
  const unlimitedWeekDays = weeklyUsage?.allUnlimitedPackages.flatMap(pkg => {
    const dates = [];
    let currentDate = new Date(pkg.purchaseDate);
    const endDate = new Date(pkg.expiryDate);
    while (currentDate <= endDate) {
      // Always use UTC noon to avoid timezone shift
      const utcDate = new Date(Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        12, 0, 0, 0 // noon UTC
      ));
      if (isBusinessDay(utcDate)) { // Only include business days
        dates.push(utcDate);
      }
      currentDate.setUTCDate(currentDate.getUTCDate() +1 );
    }
    return dates;
  }) || [];

  // Estado para alerta contextual
  const [bookingAlert, setBookingAlert] = useState<{ type: 'unlimited' | 'normal' | 'individual' | 'out-of-unlimited' | null, message: string } | null>(null);

  // Obtener clases disponibles del usuario
  useEffect(() => {
    const loadUserAvailableClasses = async () => {
      if (!isAuthenticated || !user) return

      setIsLoadingUserClasses(true)
      try {
        const response = await fetch('/api/user/packages', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          // Usar el conteo pre-calculado del backend
          setUserAvailableClasses(data.totalAvailableClasses || 0)
        }
      } catch (error) {
        console.error('Error al cargar clases disponibles del usuario:', error)
      } finally {
        setIsLoadingUserClasses(false)
      }
    }

    loadUserAvailableClasses()
  }, [isAuthenticated, user])
  
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

  // When the date changes, auto-select the first available class and trigger validation
  useEffect(() => {
    if (!date) return;
    const classesForDate = getClassesForSelectedDate();
    if (classesForDate.length > 0) {
      handleClassSelection(classesForDate[0]);
    } else {
      setSelectedClass(null);
      setScheduledClassId(null);
      setSelectedScheduledClassForBooking(null);
      setCanUseUnlimitedForSelectedClass(false);
      setUnlimitedWeekValidation(null);
    }
  }, [date]);

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      if (!scheduledClassId || !selectedBikeId) {
        throw new Error('Falta información para completar la reserva')
      }

      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledClassId,
          paymentId,
          bikeNumber: selectedBikeId,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        setIsPaymentOpen(false)
        throw new Error(data.error || 'Error al crear la reserva')
      }

      setIsPaymentOpen(false)
      setIsConfirmationOpen(true)

      toast({
        title: 'Reserva confirmada',
        description: 'Se ha enviado un correo de confirmación a tu email.',
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: 'Error al confirmar la reserva',
        description:
          error instanceof Error ? error.message : 'No se pudo procesar la reserva',
        variant: 'destructive',
      })
      setIsPaymentOpen(false)
    }
  }

  const handlePaymentCancel = () => {
    setIsPaymentOpen(false)
    toast({
      title: 'Pago cancelado',
      description: 'Puedes intentar de nuevo cuando quieras.',
    })
  }

  const handleClassSelection = async (scheduledClass: ScheduledClass) => {
    setSelectedClass(scheduledClass.id)
    setScheduledClassId(scheduledClass.id)
    setSelectedScheduledClassForBooking(scheduledClass)
    setSelectedBikeId(null) // Reset bike selection
    setCanUseUnlimitedForSelectedClass(false) // Reset
    setUnlimitedWeekValidation(null) // Reset
    setShowWeekendInfoMessage(false) // Reset del nuevo estado
    const hasAnyUnlimitedPackages = weeklyUsage?.allUnlimitedPackages && weeklyUsage.allUnlimitedPackages.length > 0;

    if (hasAnyUnlimitedPackages) { // Check if user has ANY unlimited packages
      setIsCheckingUnlimitedWeek(true)
      try {
        const validation = await validateUnlimitedWeek(scheduledClass.id)
        setUnlimitedWeekValidation(validation)

        const classDate = new Date(scheduledClass.date)
        if (validation.canUseUnlimitedWeek) {
          setCanUseUnlimitedForSelectedClass(true)
        } else if (!isBusinessDay(classDate)) {
          setShowWeekendInfoMessage(true)
        }
      } catch (error) {
        console.error('Error validating unlimited week', error)
        toast({
          title: 'Error de validación',
          description: 'No se pudo validar el uso de Semana Ilimitada.',
          variant: 'destructive',
        })
      } finally {
        setIsCheckingUnlimitedWeek(false)
      }
    }
  }

  const handleBikeSelection = (bikeId: number) => {
    setSelectedBikeId(bikeId)
    // Smooth scroll to summary
    setTimeout(() => {
      reservationSummaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
  }

  const handleConfirmBooking = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true)
      return
    }

    if (!selectedClass || !selectedBikeId) {
      toast({
        title: 'Información incompleta',
        description: 'Por favor, selecciona una clase y una bicicleta.',
        variant: 'destructive',
      })
      return
    }

    // Validar anticipación antes de reservar
    if (!isClassReservable(selectedClassDetails)) {
      if (canUseUnlimitedForSelectedClass) {
        toast({
          title: 'Anticipación insuficiente',
          description: 'Las reservas con Semana Ilimitada deben hacerse con al menos 12 horas y media de anticipación para poder confirmar tu lugar por WhatsApp.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Anticipación insuficiente',
          description: 'Las reservas normales deben hacerse con al menos 1 minuto de anticipación.',
          variant: 'destructive',
        });
      }
      return;
    }

    // Flujo para Semana Ilimitada
    if (canUseUnlimitedForSelectedClass) {
      if (unlimitedWeekValidation?.canUseUnlimitedWeek) {
        setShowUnlimitedWeekConfirmation(true)
      } else {
        toast({
          title: 'Error de validación',
          description:
            'Parece que ya no puedes usar Semana Ilimitada para esta clase.',
          variant: 'destructive',
        })
      }
      return
    }

    // Flujo para clases normales
    if (userAvailableClasses > 0) {
      await proceedWithBooking()
    } else {
      // Si no tiene créditos, redirigir a la página de compra del paquete individual (ID 2)
      router.push('/paquetes/checkout?packageId=2');
      // const classToBook = availableClasses.find(c => c.id === selectedClass)
      // if (classToBook) {
      //   setSelectedScheduledClassForBooking(classToBook)
      //   // setIsPaymentOpen(true) // Original logic: opens modal
      // } else {
      //   toast({ title: 'Error', description: 'No se encontró la clase seleccionada.'})
      // }
    }
  }

  const proceedWithBooking = async () => {
    if (!scheduledClassId || !selectedBikeId) {
      toast({
        title: 'Error',
        description: 'Falta información de la clase o bicicleta.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessingBooking(true)
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledClassId,
          bikeNumber: selectedBikeId,
          useUnlimitedWeek: canUseUnlimitedForSelectedClass,
        }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la reserva')
      }

      // Reset states
      setSelectedClass(null)
      setSelectedTime(null)
      setSelectedBikeId(null)
      setCanUseUnlimitedForSelectedClass(false)

      // Reload data
      loadAvailableClasses()

      toast({
        title: 'Reserva confirmada',
        description: '¡Nos vemos en clase! Se ha enviado un correo de confirmación.',
      })
    } catch (error) {
      console.error('Error en proceedWithBooking:', error)
      toast({
        title: 'Error al reservar',
        description:
          error instanceof Error ? error.message : 'No se pudo procesar la reserva',
        variant: 'destructive',
      })
    } finally {
      setIsProcessingBooking(false)
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

  // Verificar si una clase es reservable (solo true/false, sin toast)
  const isClassReservable = (cls: ScheduledClass | undefined) => {
    if (!cls) return false;
    try {
      const now = new Date();
      const classDateTime = createClassDateTime(cls.date, cls.time);
      const timeDiff = classDateTime.getTime() - now.getTime();
      const TWELVE_AND_HALF_HOURS = (12 * 60 + 30) * 60 * 1000; // 12.5 horas en ms
      const FIVE_MINUTES = 5 * 60 * 1000;

      if (canUseUnlimitedForSelectedClass) {
        return timeDiff > TWELVE_AND_HALF_HOURS;
      }
      return timeDiff > FIVE_MINUTES;
    } catch (error) {
      console.error("Error verificando disponibilidad:", error);
      return false;
    }
  }

  // Verificar si una fecha tiene clases disponibles
  const hasAvailableClassesOnDate = (checkDate: Date) => {
    const classesForDate = availableClasses.filter(cls => 
      isClassOnSelectedDate(cls.date, checkDate)
    )
    return classesForDate.some(cls => cls.availableSpots > 0 && isClassReservable(cls))
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

  // Function to check if a date is within the blocked week (June 30, 2025 - July 6, 2025, Mexico timezone)
  const isBlockedDate = (checkDate: Date) => {
    // Define the blocked period: June 30, 2025 to July 6, 2025 (inclusive)
    // Using simple date comparison for Mexico timezone
    const blockedStartDate = new Date(2025, 5, 30) // June 30, 2025 (month is 0-indexed)
    const blockedEndDate = new Date(2025, 6, 6)   // July 6, 2025 (Sunday)
    
    // Normalize checkDate to compare only dates (not time)
    const checkDateOnly = new Date(
      checkDate.getFullYear(),
      checkDate.getMonth(),
      checkDate.getDate()
    )
    
    // Check if the date falls within the blocked range (inclusive)
    return checkDateOnly >= blockedStartDate && checkDateOnly <= blockedEndDate;
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

  const selectedClassDetails = availableClasses.find(c => c.id === selectedClass);
  const showWhatsappAlert = isUsingUnlimitedWeek && unlimitedWeekValidation?.isValid;

  // Actualizar alerta contextual según selección
  useEffect(() => {
    if (canUseUnlimitedForSelectedClass) {
      setBookingAlert({
        type: 'unlimited',
        message: 'Estás reservando con tu paquete de Semana Ilimitada. Recuerda: debes confirmar tu asistencia por WhatsApp con al menos 12 horas y media de anticipación. Solo puedes reservar clases de lunes a viernes de la semana seleccionada.'
      });
    } else if (selectedClass && userAvailableClasses > 0) {
      setBookingAlert({
        type: 'normal',
        message: 'Estás reservando usando tus créditos de paquete normal. Puedes reservar hasta 1 minuto antes del inicio de la clase.'
      });
    } else if (selectedClass && userAvailableClasses === 0) {
      setBookingAlert({
        type: 'individual',
        message: 'No tienes créditos disponibles. Deberás comprar una clase individual para completar la reserva.'
      });
    } else {
      setBookingAlert(null);
    }
  }, [canUseUnlimitedForSelectedClass, selectedClass, userAvailableClasses]);

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
        <section className="py-2">
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
                      ¡Tú Semana Ilimitada esta activada!
                    </h3>
                    <p className="text-blue-800 mb-3">
                      Todas tus reservas se realizarán automáticamente con tu paquete Semana Ilimitada. 
                      Solo puedes reservar de <strong>lunes a viernes</strong>.
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <WeeklyUsageDisplay 
                        usage={{
                          ...weeklyUsage,
                          activePackageInfo: weeklyUsage.activePackageInfo && {
                            ...weeklyUsage.activePackageInfo,
                            expiryDate:
                              typeof weeklyUsage.activePackageInfo.expiryDate === 'string'
                                ? new Date(weeklyUsage.activePackageInfo.expiryDate)
                                : weeklyUsage.activePackageInfo.expiryDate,
                          }
                        }}
                        className="flex-1 min-w-64"
                      />
                    
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
              usage={{
                ...weeklyUsage,
                activePackageInfo: weeklyUsage.activePackageInfo && {
                  ...weeklyUsage.activePackageInfo,
                  expiryDate:
                    typeof weeklyUsage.activePackageInfo.expiryDate === 'string'
                      ? new Date(weeklyUsage.activePackageInfo.expiryDate)
                      : weeklyUsage.activePackageInfo.expiryDate,
                }
              }}
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
                    <CalendarIcon className="mr-2 h-5 w-5 text-brand-sage" />
                    <h3 className="text-xl font-bold text-black">Selecciona Fecha</h3>
                  </div>
                  <div className="flex justify-center items-center py-6">
                    <div className="w-full max-w-[280px]">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(selectedDate) => {
                          // Bloquear fechas pasadas o la semana especificada
                          if (selectedDate && (isPastDate(selectedDate) || isBlockedDate(selectedDate))) {
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
                          past: isPastDate,
                          full: hasClassesButAllFull,
                          unlimited: unlimitedWeekDays,
                          blocked: isBlockedDate, // Added modifier for blocked dates
                        }}
                        modifiersClassNames={{
                          past: 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50',
                          full: 'bg-red-200 text-red-800 font-bold cursor-pointer border border-red-300 hover:bg-red-300',
                          unlimited: 'bg-blue-100 border-2 border-blue-300 rounded-lg',
                          blocked: 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50', // Added style for blocked dates
                        }}
                        disabled={(date) => isPastDate(date) || isBlockedDate(date)} // Updated disabled prop
                      />
                      
                      {/* Leyenda del calendario */}
                      <div className="mt-2 text-xs text-gray-500 px-2">
                        <ul className="flex flex-wrap gap-x-4 gap-y-1">
                          <li className="flex items-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-200 mr-1.5"></span>
                            Lleno
                          </li>
                          <li className="flex items-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 opacity-50 mr-1.5"></span>
                            Pasado
                          </li>
                          <li className="flex items-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-300 mr-1.5"></span>
                            Tu Semana Ilimitada
                          </li>
                        </ul>
                        <p className="mt-2 text-brand-sage-dark">
                          Semana ilimitada: Válida solo de lunes a viernes.
                        </p>
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
                    <Clock className="mr-2 h-5 w-5 text-brand-sage" />
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
                              onClick={() => canReserve && handleClassSelection(cls)}
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
                                        ? 'Reservas cerradas (Ya terminó o faltan menos de 1 minuto para su inicio)'
                                        : `Aún hay espacios disponibles`
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
                    <Bike className="mr-2 h-5 w-5 text-brand-sage" />
                    <h3 className="text-xl font-bold text-black">Selecciona Bicicleta</h3>
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
                    <span className="font-medium text-black">
                      {date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : "No seleccionada"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Horario:</span>
                    <span className="font-medium text-black">
                      {selectedTime ? `${selectedTime} hrs` : "No seleccionado"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Clase:</span>
                    <span className="font-medium text-black">
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
                  
                  {/* Mostrar clases disponibles solo si NO se está usando Semana Ilimitada */}
                  {!canUseUnlimitedForSelectedClass && !isUsingUnlimitedWeek && (
                    <div className="flex justify-between">
                      <span className="font-semibold">Tus clases disponibles:</span>
                      <span
                        className={`font-bold ${
                          userAvailableClasses > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {userAvailableClasses}
                      </span>
                    </div>
                  )}

                  {canUseUnlimitedForSelectedClass && (
                    <div className="text-green-600 font-semibold border-t pt-2 mt-2">
                      ✓ Estas reservando con tu paquete de Semana Ilimitada.
                    </div>
                  )}
                </div>

                {isUsingUnlimitedWeek && unlimitedWeekValidation?.isValid && (
                  <div className="mb-4">
                    <WhatsAppConfirmationAlert
                      date={selectedClassDetails?.date || ''}
                      time={selectedClassDetails?.time || ''}
                      userName={user?.firstName || ''}
                    />
                  </div>
                )}

                {showWeekendInfoMessage && (
                  <div className="mt-4 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p>
                      <span className="font-bold">ℹ️ Nota:</span> Tu Semana Ilimitada es
                      válida solo de lunes a viernes. Para esta clase se usará un crédito
                      normal.
                    </p>
                  </div>
                )}

                {/* Alerta contextual de reserva */}
                {bookingAlert && (
                  <div
                    className={
                      bookingAlert.type === 'unlimited'
                        ? 'mb-4 p-4 bg-blue-50 border border-blue-300 text-blue-900 rounded-lg text-sm'
                        : bookingAlert.type === 'normal'
                        ? 'mb-4 p-4 bg-green-50 border border-green-300 text-green-900 rounded-lg text-sm'
                        : bookingAlert.type === 'individual'
                        ? 'mb-4 p-4 bg-red-50 border border-red-300 text-red-900 rounded-lg text-sm'
                        : 'mb-4 p-4 bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-lg text-sm'
                    }
                  >
                    {bookingAlert.message}
                  </div>
                )}

                <div ref={reservationSummaryRef} className="mt-6 md:mt-0">

                  <Button
                    onClick={handleConfirmBooking}
                    disabled={
                      !selectedBikeId ||
                      isProcessingBooking ||
                      isCheckingUnlimitedWeek
                    }
                    className="w-full mt-6 bg-brand-sage/90 hover:bg-brand-sage/100 font-bold text-lg py-6 rounded-full text-white"
                  >
                    <span className="flex items-center justify-center gap-1">
                      {isProcessingBooking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>PROCESANDO...</span>
                        </>
                      ) : isCheckingUnlimitedWeek ? (
                        <span>VALIDANDO OPCIONES...</span>
                      ) : canUseUnlimitedForSelectedClass ? (
                        'RESERVAR CON SEMANA ILIMITADA'
                      ) : userAvailableClasses > 0 ? (
                        `RESERVAR (CLASES: ${userAvailableClasses})`
                      ) : (
                        'COMPRAR CLASE PARA RESERVAR'
                      )}
                      {!isProcessingBooking && !isCheckingUnlimitedWeek && (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  </Button>
                  {!selectedBikeId && selectedClass && (
                    <div className="text-center mt-2">
                      <p className="text-sm text-gray-500">
                        Selecciona una bicicleta para continuar
                      </p>
                    </div>
                  )}
                </div>
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
            <DialogTitle className="text-[#4A102A]">
              {isUsingUnlimitedWeek && unlimitedWeekValidation?.isValid ? '¡Reserva con Semana Ilimitada!' : '¡Reserva Confirmada!'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {isUsingUnlimitedWeek && unlimitedWeekValidation?.isValid
                ? 'Recuerda que para garantizar tu lugar debes confirmar tu asistencia por WhatsApp.'
                : 'Tu reserva ha sido confirmada exitosamente'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {isUsingUnlimitedWeek && unlimitedWeekValidation?.isValid && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 text-center">
                <p className="font-semibold text-amber-800 mb-2">¡Acción requerida!</p>
                <p className="text-amber-900 text-sm">Para garantizar tu lugar, confirma tu asistencia por WhatsApp con al menos 12 horas de anticipación.</p>
                <a
                  href={`https://wa.me/527753571894?text=${encodeURIComponent(
                    `Hola! Soy ${user} Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. Fecha: ${date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""} Hora: ${selectedTime || ""} Clase: ${selectedClass ? availableClasses.find((c) => c.id === selectedClass)?.classType.name : ""} Bicicleta: #${selectedBikeId}`
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
                
                <div className="mt-2 flex flex-col items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Hola! Soy ${user?.firstName || ""}. Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. Fecha: ${date ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""} Hora: ${selectedTime || ""} Clase: ${selectedClass ? availableClasses.find((c) => c.id === selectedClass)?.classType.name : ""} Bicicleta: #${selectedBikeId}`
                      );
                      toast({
                        title: 'Mensaje copiado',
                        description: 'El mensaje de confirmación ha sido copiado al portapapeles.',
                      });
                    }}
                  >
                    Copiar mensaje de WhatsApp
                  </Button>
                  <span className="text-xs text-amber-700">Si el botón no funciona, envía el mensaje manualmente al <b>+52 77 5357 1894</b></span>
                </div>
              </div>
            )}
            {/* Detalles de la reserva */}
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
                      `Hola! Soy ${user?.firstName || ""}. Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. ` + 
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