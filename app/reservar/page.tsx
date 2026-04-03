"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronRight, Bike, Star, Lock } from "lucide-react"
import Image from "next/image"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StripeCheckout } from "@/components/stripe-checkout"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/hooks/useAuth"
import { useBranch } from "@/lib/hooks/useBranch"
import { useRouter } from "next/navigation"
import { BikeSelectionInline } from "@/components/bike-selection-inline"
import { WeeklyClassSelector, type WeeklyScheduledClass } from "@/components/weekly-class-selector"
import {
  formatTimeFromDB,
  createClassDateTime
} from "@/lib/utils/date"
import { isBusinessDay } from "@/lib/utils/business-days"

import { useUnlimitedWeek } from '@/lib/hooks/useUnlimitedWeek'
import {
  WeeklyUsageDisplay,
  UnlimitedWeekConfirmation
} from '@/components/ui/unlimited-week-alerts'
import { WhatsAppConfirmationAlert } from '@/components/ui/whatsapp-confirmation-alert'
import { BranchIndicatorBadge } from '@/components/branch-indicator-badge'

interface ClassType {
  id: number
  name: string
  description?: string
  duration: number
}

interface ScheduledClass {
  id: number
  className?: string
  classType: ClassType
  instructor: {
    id: number
    name: string
    profileImage?: string | null
  }
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  enrolledCount: number
  bikeNumber?: number
  isSpecial?: boolean
  specialPrice?: number | null
  specialMessage?: string | null
}

export default function BookingPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { selectedBranch, isLoading: isBranchLoading } = useBranch()
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
    isLoading: isLoadingWeekly,
  } = useUnlimitedWeek(selectedBranch?.id)

  // Auto-activar Semana Ilimitada si el usuario tiene paquete activo
  const isUsingUnlimitedWeek = hasActiveUnlimitedWeek && Boolean(weeklyUsage)

  // Refresh key para forzar recarga del selector semanal tras una reserva
  const [weekRefreshKey, setWeekRefreshKey] = useState(0)

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
  const [isRiskConfirmationOpen, setIsRiskConfirmationOpen] = useState(false)

  // Estado para datos de la API
  const [availableClasses, setAvailableClasses] = useState<ScheduledClass[]>([])
  const [userAvailableClasses, setUserAvailableClasses] = useState<number>(0)
  const [isLoadingUserClasses, setIsLoadingUserClasses] = useState(false)
  const [selectedScheduledClassForBooking, setSelectedScheduledClassForBooking] = useState<ScheduledClass | null>(null)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const [lastBranchChangeAt, setLastBranchChangeAt] = useState<number | null>(null)
  const [cameFromBranchSelection, setCameFromBranchSelection] = useState(false)
  const previousBranchIdRef = useRef<number | null>(null)

  // Nuevo estado para mostrar mensaje informativo en la sección de resumen
  const [
    showWeekendInfoMessage,
    setShowWeekendInfoMessage
  ] = useState(false)

  // Estado para alerta contextual
  const [bookingAlert, setBookingAlert] = useState<{ type: 'unlimited' | 'normal' | 'individual' | 'out-of-unlimited' | null, message: string } | null>(null);

  // Estados para modal de compra inline
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [purchasePackages, setPurchasePackages] = useState<any[]>([])
  const [selectedPurchasePackageId, setSelectedPurchasePackageId] = useState<number>(2)
  const [isLoadingPurchasePackages, setIsLoadingPurchasePackages] = useState(false)

  // Lock branch selector only when user is at the final confirmation step.
  const isAtFinalConfirmationStep = Boolean(selectedClass && selectedBikeId && !isProcessingBooking)

  // Obtener clases disponibles del usuario
  useEffect(() => {
    const loadUserAvailableClasses = async () => {
      if (!isAuthenticated || !user || !selectedBranch?.id) return

      setIsLoadingUserClasses(true)
      try {
        const response = await fetch(`/api/user/packages?branchId=${selectedBranch.id}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          setUserAvailableClasses(data.totalAvailableClasses || 0)
        }
      } catch (error) {
        console.error('Error al cargar clases disponibles del usuario:', error)
      } finally {
        setIsLoadingUserClasses(false)
      }
    }

    loadUserAvailableClasses()
  }, [isAuthenticated, user, selectedBranch?.id])

  useEffect(() => {
    if (!isBranchLoading && !selectedBranch) {
      router.push('/seleccionar-sucursal?redirect=/reservar')
    }
  }, [isBranchLoading, selectedBranch, router])

  useEffect(() => {
    if (typeof document !== "undefined") {
      setCameFromBranchSelection(document.referrer.includes('/seleccionar-sucursal'))
    }
  }, [])

  useEffect(() => {
    if (!selectedBranch?.id) return

    if (previousBranchIdRef.current === null) {
      previousBranchIdRef.current = selectedBranch.id
      return
    }

    if (previousBranchIdRef.current !== selectedBranch.id) {
      setLastBranchChangeAt(Date.now())
      setHasUserInteracted(false)
      previousBranchIdRef.current = selectedBranch.id
    }
  }, [selectedBranch?.id])

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
          specialPrice: selectedScheduledClassForBooking?.isSpecial ? selectedScheduledClassForBooking.specialPrice : undefined,
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
      setWeekRefreshKey((k) => k + 1)

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

  const openPurchaseModal = async () => {
    if (!selectedBranch?.id) return
    setIsLoadingPurchasePackages(true)
    setIsPurchaseModalOpen(true)
    try {
      const res = await fetch(`/api/packages/by-branch/${selectedBranch.id}`)
      if (res.ok) {
        const packages = await res.json()
        // Excluir Semana Ilimitada (id=3) y Primera Vez (id=1) de este flujo
        const buyable = packages.filter((p: any) => p.id !== 3 && p.id !== 1)
        setPurchasePackages(buyable)
        if (buyable.some((p: any) => p.id === 2)) {
          setSelectedPurchasePackageId(2)
        } else if (buyable.length > 0) {
          setSelectedPurchasePackageId(buyable[0].id)
        }
      }
    } catch (e) {
      console.error('Error cargando paquetes:', e)
    } finally {
      setIsLoadingPurchasePackages(false)
    }
  }

  const handlePurchaseAndBookSuccess = async (paymentId: string) => {
    try {
      if (!selectedBranch?.id) throw new Error('Sin sucursal seleccionada')

      // 1. Registrar el paquete comprado
      const registerRes = await fetch('/api/user/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPurchasePackageId,
          paymentId,
          branchId: selectedBranch.id,
        }),
      })

      if (!registerRes.ok) {
        const data = await registerRes.json()
        throw new Error(data.error || 'Error al registrar el paquete')
      }

      // 2. Refrescar créditos disponibles
      const packagesRes = await fetch(`/api/user/packages?branchId=${selectedBranch.id}`, {
        credentials: 'include',
      })
      if (packagesRes.ok) {
        const data = await packagesRes.json()
        setUserAvailableClasses(data.totalAvailableClasses || 0)
      }

      setIsPurchaseModalOpen(false)

      toast({
        title: '¡Paquete comprado!',
        description: 'Procesando tu reserva automáticamente...',
      })

      // 3. Proceder con la reserva usando los créditos recién comprados
      await proceedWithBooking()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar la compra',
        variant: 'destructive',
      })
    }
  }

  const handleClassSelection = async (scheduledClass: ScheduledClass) => {
    setSelectedClass(scheduledClass.id)
    setScheduledClassId(scheduledClass.id)
    setSelectedScheduledClassForBooking(scheduledClass)
    setSelectedBikeId(null)
    setCanUseUnlimitedForSelectedClass(false)
    setUnlimitedWeekValidation(null)
    setShowWeekendInfoMessage(false)
    const hasAnyUnlimitedPackages = weeklyUsage?.allUnlimitedPackages && weeklyUsage.allUnlimitedPackages.length > 0;

    if (hasAnyUnlimitedPackages && !scheduledClass.isSpecial) {
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
        console.error('Error validando Semana Ilimitada:', error)
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
    setTimeout(() => {
      reservationSummaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
  }

  const continueBookingFlow = async () => {
    // Flujo para clases especiales: siempre pagar directamente
    if (selectedScheduledClassForBooking?.isSpecial && selectedScheduledClassForBooking?.specialPrice) {
      setIsPaymentOpen(true)
      return
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
      await openPurchaseModal()
    }
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

    const branchChangedRecently = lastBranchChangeAt !== null && Date.now() - lastBranchChangeAt <= 10000
    const redirectedWithoutInteraction = cameFromBranchSelection && !hasUserInteracted
    const requiresRiskCheckpoint = branchChangedRecently || redirectedWithoutInteraction

    if (requiresRiskCheckpoint) {
      setIsRiskConfirmationOpen(true)
      return
    }

    await continueBookingFlow()
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
      setSelectedScheduledClassForBooking(null)
      setCanUseUnlimitedForSelectedClass(false)

      // Refrescar selector semanal
      setWeekRefreshKey((k) => k + 1)

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

  // Verificar si una clase es reservable (solo true/false, sin toast)
  const isClassReservable = (cls: ScheduledClass | undefined) => {
    if (!cls) return false;
    try {
      const now = new Date();
      const classDateTime = createClassDateTime(cls.date, cls.time);
      const timeDiff = classDateTime.getTime() - now.getTime();
      const ONE_MINUTE = 1 * 60 * 1000;

      if (canUseUnlimitedForSelectedClass) {
        return timeDiff > ONE_MINUTE;
      }
      return timeDiff > ONE_MINUTE;
    } catch (error) {
      console.error("Error verificando disponibilidad:", error);
      return false;
    }
  }

  const selectedClassDetails = selectedScheduledClassForBooking ?? undefined
  const showWhatsappAlert = isUsingUnlimitedWeek && unlimitedWeekValidation?.isValid;

  // Actualizar alerta contextual según selección
  useEffect(() => {
    if (selectedScheduledClassForBooking?.isSpecial && selectedScheduledClassForBooking?.specialPrice) {
      setBookingAlert({
        type: 'individual',
        message: `Esta es una clase especial. El costo es $${selectedScheduledClassForBooking.specialPrice} MXN y se cobra aparte, independientemente de tus créditos o paquetes activos.`
      });
    } else if (canUseUnlimitedForSelectedClass) {
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
  }, [canUseUnlimitedForSelectedClass, selectedClass, userAvailableClasses, selectedScheduledClassForBooking]);

  useEffect(() => {
    if (typeof window === 'undefined') return

    const lockValue = isAtFinalConfirmationStep ? '1' : '0'
    localStorage.setItem('innata_branch_selector_lock', lockValue)
    window.dispatchEvent(
      new CustomEvent('innata:branch-selector-lock', {
        detail: { locked: isAtFinalConfirmationStep },
      })
    )
  }, [isAtFinalConfirmationStep])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      localStorage.setItem('innata_branch_selector_lock', '0')
      window.dispatchEvent(
        new CustomEvent('innata:branch-selector-lock', {
          detail: { locked: false },
        })
      )
    }
  }, [])

  if (isBranchLoading || !selectedBranch) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Cargando sucursal...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}
      <section className="py-12 pt-14 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-5xl md:text-5xl font-bold tracking-tight mb-3 anim-slide-in-up">
            RESERVA TU <span className="text-brand-cream">CLASE</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-zinc-700 mb-3">
            Selecciona fecha, clase y horario para asegurar tu lugar
          </p>
          <div className="flex justify-center">
            <BranchIndicatorBadge />
          </div>
        </div>
      </section>

      {/* Coach Legend */}
      <section className="pb-6 bg-white">
        <div className="container px-4 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 text-center mb-4">Coaches</p>
          <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap">
            {[
              { name: "Inés",   image: "/coach3.jpeg" },
              { name: "Dani",   image: "/dani_m.jpeg" },
              { name: "Alo",    image: "/alondra_m.jpeg" },
              { name: "Kevin",  image: "/kevin.jpeg" },
              { name: "Óscar",  image: "/oscar_f.jpeg" },
              { name: "Ximena", image: "/ximena_c.jpeg" },
              { name: "Danny",  image: "/danny_f.jpeg" },
              { name: "Tanis",  image: "/tanis_g.jpeg" },
            ].map((coach) => (
              <div key={coach.name} className="flex flex-col items-center gap-1.5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-brand-cream/30 shadow-sm">
                  <Image
                    src={coach.image}
                    alt={coach.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">{coach.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Información de Semana Ilimitada */}
      {isUsingUnlimitedWeek && weeklyUsage && (
        <section className="py-1">
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
      <section className="py-1 bg-white">
        <div className="container px-4 md:px-6">
          <div className="space-y-6">
            {/* ── Weekly class selector ── */}
            <Card className="bg-white border-gray-100 rounded-3xl shadow-sm overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <WeeklyClassSelector
                  branchId={selectedBranch.id}
                  selectedClassId={selectedClass}
                  onSelectClass={(cls: WeeklyScheduledClass) => {
                    setHasUserInteracted(true)
                    handleClassSelection(cls as unknown as ScheduledClass)
                  }}
                  refreshKey={weekRefreshKey}
                />
              </CardContent>
            </Card>

            {/* ── Bike + Summary row ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bike selection */}
              <Card className="bg-white border-gray-100 rounded-3xl shadow-sm">
                <CardContent className="p-0">
                  <div className="p-6 border-b border-gray-100 flex items-center">
                    <Bike className="mr-2 h-5 w-5 text-brand-gray" />
                    <h3 className="text-xl font-bold text-black">Selecciona Bicicleta</h3>
                  </div>
                  <div className="p-4">
                    {selectedClass ? (
                      <BikeSelectionInline
                        scheduledClassId={selectedClass}
                        selectedBikeId={selectedBikeId}
                        onBikeSelected={(bikeId) => {
                          setHasUserInteracted(true)
                          handleBikeSelection(bikeId)
                        }}
                      />
                    ) : (
                      <div className="text-center py-10 text-gray-400 text-sm">
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
                      {selectedClassDetails
                        ? format(new Date(selectedClassDetails.date.slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
                        : "No seleccionada"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Horario:</span>
                    <span className="font-medium text-black">
                      {selectedClassDetails
                        ? `${formatTimeFromDB(selectedClassDetails.time)} hrs`
                        : "No seleccionado"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Clase:</span>
                    <span className="font-medium text-black">
                      {selectedClassDetails?.classType.name ?? "No seleccionada"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Instructor:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedClassDetails?.instructor.name ?? "No seleccionado"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                    <span className="text-zinc-700">Duración:</span>
                    <span className="font-medium text-brand-burgundy">
                      {selectedClassDetails ? `${selectedClassDetails.classType.duration} minutos` : ""}
                    </span>
                  </div>

                  {selectedBikeId && (
                    <div className="flex justify-between items-center pb-2 border-b border-brand-red/10">
                      <span className="text-zinc-700">Bicicleta:</span>
                      <span className="font-medium text-brand-burgundy">
                       Bicicleta #{selectedBikeId}
                      </span>
                    </div>
                  )}

                  {/* Mostrar precio de clase especial */}
                  {selectedClassDetails?.isSpecial && selectedClassDetails?.specialPrice && (
                    <div className="flex justify-between items-center pb-2 border-b border-amber-200">
                      <span className="text-amber-800 font-semibold">⭐ Clase Especial:</span>
                      <span className="font-bold text-amber-700">
                        ${selectedClassDetails.specialPrice} MXN
                      </span>
                    </div>
                  )}

                  {selectedClassDetails?.isSpecial && selectedClassDetails?.specialMessage && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                      <span className="font-semibold">Nota:</span> {selectedClassDetails.specialMessage}
                    </div>
                  )}

                  {/* Mostrar clases disponibles solo si NO se está usando Semana Ilimitada y NO es clase especial */}
                  {!canUseUnlimitedForSelectedClass && !isUsingUnlimitedWeek && !selectedClassDetails?.isSpecial && (
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

                {showWhatsappAlert && (
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
                        ? 'mb-4 p-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-lg text-sm'
                        : 'mb-4 p-4 bg-yellow-50 border border-yellow-300 text-yellow-900 rounded-lg text-sm'
                    }
                  >
                    {bookingAlert.message}
                  </div>
                )}

                <div ref={reservationSummaryRef} className="mt-6 md:mt-0">

                  <div className="mt-2 rounded-xl border border-brand-sage/30 bg-brand-sage/10 p-3">
                    <p className="text-sm text-zinc-700">
                      Vas a reservar en <span className="font-semibold text-brand-burgundy">{selectedBranch.name}</span>
                    </p>
                    <div className="mt-2 inline-flex">
                      <BranchIndicatorBadge className="px-3 py-1 text-sm" />
                    </div>
                  </div>

                  <Button
                    onClick={handleConfirmBooking}
                    disabled={
                      !selectedBikeId ||
                      isProcessingBooking ||
                      isCheckingUnlimitedWeek
                    }
                    className="w-full mt-6 bg-brand-cream/90 hover:bg-brand-cream/100 font-bold text-lg py-6 rounded-full text-white"
                  >
                    <span className="flex items-center justify-center gap-1">
                      {isProcessingBooking ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>PROCESANDO...</span>
                        </>
                      ) : isCheckingUnlimitedWeek ? (
                        <span>VALIDANDO OPCIONES...</span>
                      ) : selectedScheduledClassForBooking?.isSpecial && selectedScheduledClassForBooking?.specialPrice ? (
                        `PAGAR CLASE ESPECIAL $${selectedScheduledClassForBooking.specialPrice} MXN`
                      ) : canUseUnlimitedForSelectedClass ? (
                        `RESERVAR CON SEMANA ILIMITADA EN ${selectedBranch.name.toUpperCase()}`
                      ) : userAvailableClasses > 0 ? (
                        `CONFIRMAR RESERVA EN ${selectedBranch.name.toUpperCase()}`
                      ) : (
                        `COMPRAR CLASE EN ${selectedBranch.name.toUpperCase()}`
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

      {/* Risk Confirmation Dialog */}
      <Dialog open={isRiskConfirmationOpen} onOpenChange={setIsRiskConfirmationOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Confirma tu sucursal</DialogTitle>
            <DialogDescription className="text-gray-600">
              Vas a reservar en <span className="font-semibold text-brand-burgundy">{selectedBranch.name}</span>. Confirma para continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <BranchIndicatorBadge className="w-full justify-center" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRiskConfirmationOpen(false)}>
              Revisar
            </Button>
            <Button
              className="bg-brand-sage hover:bg-brand-sage/90 text-white"
              onClick={async () => {
                setIsRiskConfirmationOpen(false)
                setHasUserInteracted(true)
                setLastBranchChangeAt(null)
                setCameFromBranchSelection(false)
                await continueBookingFlow()
              }}
            >
              Confirmar en {selectedBranch.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Modal - Compra de créditos inline */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Compra un paquete para continuar</DialogTitle>
            <DialogDescription className="text-gray-600">
              No tienes créditos disponibles. Compra un paquete para completar tu reserva en{' '}
              <span className="font-semibold">{selectedBranch?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {/* Resumen de la reserva pendiente */}
            {selectedScheduledClassForBooking && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
                <p className="font-semibold text-[#4A102A] mb-1">Tu reserva pendiente:</p>
                <div className="grid grid-cols-2 gap-y-1">
                  <span className="text-gray-500">Clase</span>
                  <span className="font-medium text-right">{selectedScheduledClassForBooking.classType.name}</span>
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-right capitalize">
                    {format(new Date(selectedScheduledClassForBooking.date.slice(0, 10) + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                  <span className="text-gray-500">Hora</span>
                  <span className="font-medium text-right">{formatTimeFromDB(selectedScheduledClassForBooking.time)} hrs</span>
                  {selectedBikeId && (
                    <>
                      <span className="text-gray-500">Bicicleta</span>
                      <span className="font-medium text-right">#{selectedBikeId}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Selector de paquete */}
            {isLoadingPurchasePackages ? (
              <div className="text-center py-4 text-gray-500 text-sm">Cargando paquetes disponibles...</div>
            ) : purchasePackages.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">No hay paquetes disponibles para esta sucursal.</div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Selecciona un paquete:</p>
                <div className="grid gap-2">
                  {purchasePackages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPurchasePackageId(pkg.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                        selectedPurchasePackageId === pkg.id
                          ? 'border-[#4A102A] bg-[#4A102A]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-sm">{pkg.name}</p>
                          {pkg.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                          )}
                        </div>
                        <span className="font-bold text-[#4A102A] ml-4 shrink-0">${pkg.price} MXN</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario de pago Stripe */}
            {!isLoadingPurchasePackages && purchasePackages.length > 0 && (
              <StripeCheckout
                amount={purchasePackages.find((p) => p.id === selectedPurchasePackageId)?.price ?? 0}
                description={`Paquete: ${purchasePackages.find((p) => p.id === selectedPurchasePackageId)?.name ?? ''} - ${selectedBranch?.name}`}
                onSuccess={handlePurchaseAndBookSuccess}
                onCancel={() => setIsPurchaseModalOpen(false)}
                email={user?.email}
                firstName={user?.firstName}
                lastName={user?.lastName}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Confirmar pago</DialogTitle>
            <DialogDescription className="text-gray-600">
              Revisa el resumen y completa tu pago de forma segura
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-4">
            {/* Resumen de la clase */}
            {selectedScheduledClassForBooking && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600 fill-amber-600" />
                  <span className="font-semibold text-[#4A102A]">
                    Clase Especial: {selectedScheduledClassForBooking.classType.name}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-right capitalize">
                    {format(new Date(selectedScheduledClassForBooking.date.slice(0, 10) + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
                  </span>
                  <span className="text-gray-500">Hora</span>
                  <span className="font-medium text-right">{formatTimeFromDB(selectedScheduledClassForBooking.time)} hrs</span>
                  {selectedBikeId && (
                    <>
                      <span className="text-gray-500">Bicicleta</span>
                      <span className="font-medium text-right">#{selectedBikeId}</span>
                    </>
                  )}
                  <span className="text-gray-500 pt-2 border-t border-amber-200 mt-1">Total a pagar</span>
                  <span className="font-bold text-[#4A102A] text-right pt-2 border-t border-amber-200 mt-1">
                    ${selectedScheduledClassForBooking.specialPrice} MXN
                  </span>
                </div>
                {selectedScheduledClassForBooking.specialMessage && (
                  <p className="text-xs text-amber-700 italic border-t border-amber-200 pt-2">
                    "{selectedScheduledClassForBooking.specialMessage}"
                  </p>
                )}
                {/* Política de cancelación */}
                <div className="flex items-start gap-2 border-t border-amber-200 pt-3 mt-1">
                  <Lock className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Política de cancelación:</span> Las clases especiales se pueden cancelar, pero el pago <span className="font-semibold">no es reembolsable</span>.
                  </p>
                </div>
              </div>
            )}

            <StripeCheckout
              amount={selectedScheduledClassForBooking?.isSpecial && selectedScheduledClassForBooking?.specialPrice
                ? selectedScheduledClassForBooking.specialPrice
                : 69}
              description={
                selectedScheduledClassForBooking?.isSpecial
                  ? `Clase Especial: ${selectedScheduledClassForBooking?.classType?.name ?? ""} - $${selectedScheduledClassForBooking?.specialPrice} MXN`
                  : `Reserva: ${selectedClassDetails?.classType?.name ?? ""}`
              }
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
              email={user?.email}
              firstName={user?.firstName}
              lastName={user?.lastName}
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
                    `Hola! Soy ${user?.firstName || ""}. Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. Fecha: ${selectedClassDetails ? format(new Date(selectedClassDetails.date.slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""} Hora: ${selectedClassDetails ? formatTimeFromDB(selectedClassDetails.time) : ""} Clase: ${selectedClassDetails?.classType?.name ?? ""} Bicicleta: #${selectedBikeId}`
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
                        `Hola! Soy ${user?.firstName || ""}. Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. Fecha: ${selectedClassDetails ? format(new Date(selectedClassDetails.date.slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""} Hora: ${selectedClassDetails ? formatTimeFromDB(selectedClassDetails.time) : ""} Clase: ${selectedClassDetails?.classType?.name ?? ""} Bicicleta: #${selectedBikeId}`
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
                  Clase: {selectedClassDetails?.classType?.name ?? ""}
                  {selectedClassDetails?.isSpecial && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">⭐ Especial</span>
                  )}
                </p>
                <p className="font-medium">
                  Fecha: {selectedClassDetails ? format(new Date(selectedClassDetails.date.slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }) : ""}
                </p>
                <p className="font-medium">Horario: {selectedClassDetails ? formatTimeFromDB(selectedClassDetails.time) : ""}</p>
                <p className="font-medium">
                  Instructor: {selectedClassDetails?.instructor?.name ?? ""}
                </p>
                <p className="font-medium">
                  Duración: {selectedClassDetails ? `${selectedClassDetails.classType.duration} minutos` : ""}
                </p>
                {selectedBikeId && (
                  <p className="font-medium text-brand-burgundy">
                    Bicicleta #{selectedBikeId}
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
            {selectedClass && selectedClassDetails && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-semibold text-brand-burgundy mb-2">Tu selección:</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Clase:</strong> {selectedClassDetails.classType.name}</p>
                  <p><strong>Fecha:</strong> {format(new Date(selectedClassDetails.date.slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: es })}</p>
                  <p><strong>Hora:</strong> {formatTimeFromDB(selectedClassDetails.time)}</p>
                  <p><strong>Instructor:</strong> {selectedClassDetails.instructor.name}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full bg-brand-mint hover:bg-brand-mint/90 text-white font-semibold py-3"
                onClick={() => {
                  router.push(`/login?redirect=${encodeURIComponent('/reservar')}`);
                  setIsAuthModalOpen(false);
                }}
              >
                Iniciar Sesión
              </Button>
              <Button
                variant="outline"
                className="w-full border-brand-mint text-brand-mint hover:bg-brand-mint/10 font-semibold py-3"
                onClick={() => {
                  router.push(`/registro?redirect=${encodeURIComponent('/reservar')}`);
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

            {selectedBikeId && (
              <div className="text-center mt-6 space-y-3">
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Confirma tu asistencia por WhatsApp:
                  </p>
                  <a
                    href={`https://wa.me/527753571894?text=${encodeURIComponent(
                      `Hola! Soy ${user?.firstName || ""}. Acabo de hacer una reserva con Semana Ilimitada para confirmar mi asistencia. ` +
                      `Fecha: ${selectedClassDetails ? format(new Date(selectedClassDetails.date.slice(0, 10) + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: es }) : ""} ` +
                      `Hora: ${selectedClassDetails ? formatTimeFromDB(selectedClassDetails.time) : ""} ` +
                      `Clase: ${selectedClassDetails?.classType?.name ?? ""} ` +
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
