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
import { BikeSelectionDialog } from "@/components/bike-selection-dialog"
import { 
  formatTimeFromDB, 
  isClassOnSelectedDate, 
  getUniqueTimeSlotsFromClasses, 
  filterClassesByDateAndTime,
  createClassDateTime
} from "@/lib/utils/date"

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
  const [isBikeDialogOpen, setIsBikeDialogOpen] = useState(false)
  
  // Estados para modales
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  
  // Estado para datos de la API
  const [availableClasses, setAvailableClasses] = useState<ScheduledClass[]>([])
  const [userAvailableClasses, setUserAvailableClasses] = useState<number>(0)
  const [isLoadingUserClasses, setIsLoadingUserClasses] = useState(false)
  const [showBikeSelection, setShowBikeSelection] = useState(false)
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
    
    if (hasActiveUnlimitedWeek === true) {
      setIsValidatingUnlimitedWeek(true)
      const validation = await validateUnlimitedWeek(classId)
      setUnlimitedWeekValidation(validation)
      setIsValidatingUnlimitedWeek(false)
    }
  }

  const handleUnlimitedWeekToggle = async (enabled: boolean) => {
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
    console.log("isUsingUnlimitedWeek:", isUsingUnlimitedWeek)
    console.log("selectedBikeId:", selectedBikeId)
    if (!selectedClass) {
      console.log("No class selected, returning")
      return
    }

    const classToBook = availableClasses.find(c => c.id === selectedClass)
    if (!classToBook) {
      console.log("Class not found in availableClasses, returning")
      return
    }

    setSelectedScheduledClassForBooking(classToBook)

    // 1. Handle Unlimited Week reservation first
    if (isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek) {
      console.log("Using Unlimited Week, showing confirmation")
      setShowUnlimitedWeekConfirmation(true)
      return
    }

    // 2. For regular bookings (package or payment), check if bike selection is needed
    if (!selectedBikeId) {
      console.log("No bike selected, showing bike selection dialog")
      setShowBikeSelection(true)
      return
    }

    // 3. If a bike is already selected, proceed with booking/payment decision
    console.log("Bike already selected. User available classes:", userAvailableClasses)
    if (userAvailableClasses > 0) {
      console.log("User has available classes, proceeding with booking")
      await proceedWithBooking()
    } else {
      console.log("User has no available classes, opening payment dialog")
      setIsPaymentOpen(true)
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
        setIsUsingUnlimitedWeek(false)
        setUnlimitedWeekValidation(null)
        setShowUnlimitedWeekConfirmation(false)
        setIsBikeDialogOpen(false)
        
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

  const handleBikeSelected = async (bikeId: number) => {
    console.log("handleBikeSelected called with bikeId:", bikeId)
    setSelectedBikeId(bikeId)
    
    if (isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek) {
      console.log("Using Unlimited Week, showing confirmation from handleBikeSelected")
      setShowUnlimitedWeekConfirmation(true)
      return
    }

    console.log("Bike selected. User available classes:", userAvailableClasses)
    if (userAvailableClasses > 0) {
      console.log("User has available classes, proceeding with booking from handleBikeSelected")
      await proceedWithBooking()
    } else {
      console.log("User has no available classes, opening payment dialog from handleBikeSelected")
      setShowBikeSelection(false)
      setIsPaymentOpen(true)
    }
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

  // Reset isUsingUnlimitedWeek if hasActiveUnlimitedWeek becomes false
  useEffect(() => {
    if (!hasActiveUnlimitedWeek) {
      setIsUsingUnlimitedWeek(false)
    }
  }, [hasActiveUnlimitedWeek])

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
                            setSelectedClass(null);
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
                            className={`cursor-pointer transition-all ${
                              selectedClass === cls.id ? 'ring-2 ring-[#4A102A] bg-gray-50' : 'hover:shadow-md'
                            }`}
                            onClick={() => handleClassSelection(cls.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">{cls.classType.name}</h4>
                                  <p className="text-sm text-gray-500">{cls.instructor.name}</p>
                                </div>
                                <span className="text-sm text-gray-500">{cls.classType.duration} min</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {/* Opciones de reserva */}
                        {selectedClass && (
                          <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
                            <CardContent className="p-6">
                              <h3 className="font-semibold mb-4">Opciones de Reserva</h3>
                              
                              {/* Toggle para Semana Ilimitada */}
                              {hasActiveUnlimitedWeek && (
                                <div className="space-y-3 mb-4">
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      id="unlimited-week-toggle"
                                      checked={isUsingUnlimitedWeek}
                                      onChange={(e) => handleUnlimitedWeekToggle(e.target.checked)}
                                      className="w-4 h-4 text-[#4A102A] bg-gray-100 border-gray-300 rounded focus:ring-[#4A102A] focus:ring-2"
                                      disabled={isValidatingUnlimitedWeek}
                                    />
                                    <label htmlFor="unlimited-week-toggle" className="font-medium">
                                      Usar Semana Ilimitada
                                    </label>
                                    {isValidatingUnlimitedWeek && (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4A102A]"></div>
                                    )}
                                  </div>
                                  
                                  {/* Mostrar validación de Semana Ilimitada */}
                                  {isUsingUnlimitedWeek && unlimitedWeekValidation && (
                                    <UnlimitedWeekAlert 
                                      validation={unlimitedWeekValidation}
                                      className="mt-3"
                                    />
                                  )}
                                </div>
                              )}

                              {/* Información de paquetes normales */}
                              {!isUsingUnlimitedWeek && isAuthenticated && userAvailableClasses > 0 && (
                                <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-4">
                                  <p className="text-sm text-green-800">
                                    ✅ Tienes {userAvailableClasses} clase(s) disponible(s) en tus paquetes
                                  </p>
                                </div>
                              )}

                              {/* Botón de reserva */}
                              <Button
                                className="w-full bg-[#4A102A] hover:bg-[#85193C] text-white font-semibold py-3"
                                disabled={
                                  isLoading || 
                                  !selectedClass || 
                                  (isUsingUnlimitedWeek && !unlimitedWeekValidation?.canUseUnlimitedWeek) ||
                                  !isClassReservable(availableClasses.find(c => c.id === selectedClass)!)
                                }
                                onClick={handleConfirmBooking}
                              >
                                <span className="flex items-center gap-1">
                                  {isUsingUnlimitedWeek && unlimitedWeekValidation?.canUseUnlimitedWeek
                                    ? "RESERVAR CON SEMANA ILIMITADA"
                                    : isAuthenticated && userAvailableClasses > 0 
                                    ? "USAR PAQUETE - RESERVAR" 
                                    : "CONFIRMAR RESERVA"
                                  } 
                                  <ChevronRight className="h-4 w-4" />
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
                  disabled={!date || !selectedClass || !selectedTime || (selectedClass ? !isClassReservable(availableClasses.find(c => c.id === selectedClass)!) : false)}
                  onClick={handleConfirmBooking}
                >
                  <span className="flex items-center gap-1">
                    {isAuthenticated && userAvailableClasses > 0 
                      ? "USAR PAQUETE - RESERVAR" 
                      : "CONFIRMAR RESERVA"
                    } 
                    <ChevronRight className="h-4 w-4" />
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

      {/* Bike Selection Dialog */}
      <BikeSelectionDialog
        open={showBikeSelection}
        onOpenChange={setShowBikeSelection}
        selectedBikeId={selectedBikeId}
        onBikeSelected={setSelectedBikeId}
        onConfirm={() => handleBikeSelected(selectedBikeId || 0)}
        scheduledClassId={scheduledClassId || 0}
        
      />

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
                if (!selectedBikeId) {
                  setShowBikeSelection(true)
                } else {
                  proceedWithBooking()
                }
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