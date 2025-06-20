"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, Clock, LogOut, Target, ChevronRight, User, Package, Bike } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"

// Interfaces para los datos de API
interface UserPackage {
  id: number
  name: string
  classesRemaining: number
  classesUsed: number
  expiryDate: string
  isActive: boolean
}

interface UserReservation {
  dateFormatted: string
  id: number
  className: string
  instructor: string
  date: string
  time: string
  duration: string
  location: string
  status: string
  canCancel: boolean
  package: string
  category?: string
  intensity?: string
  capacity?: number
  description?: string
  bikeNumber?: number | null
  cancelledAt?: string
}

interface UserProfile {
  name: string
  email: string
  avatar?: string
}

// Función para obtener el color según la intensidad
const getIntensityColor = (intensity: string | undefined) => {
  switch (intensity?.toLowerCase()) {
    case "baja":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "media":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "media-alta":
      return "bg-orange-50 text-orange-700 border-orange-200"
    case "alta":
      return "bg-red-50 text-red-700 border-red-200"
    case "muy alta":
      return "bg-purple-50 text-purple-700 border-purple-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

// Add new functions for grouping reservations
const groupReservationsByClass = (reservations: UserReservation[]) => {
  const grouped = reservations.reduce((acc, reservation) => {
    const classKey = `${reservation.date}-${reservation.time}-${reservation.className}`
    
    if (!acc[classKey]) {
      acc[classKey] = {
        classInfo: {
          className: reservation.className,
          instructor: reservation.instructor,
          date: reservation.date,
          dateFormatted: reservation.dateFormatted,
          time: reservation.time,
          duration: reservation.duration,
          location: reservation.location,
          category: reservation.category,
          intensity: reservation.intensity,
          capacity: reservation.capacity,
          description: reservation.description,
        },
        reservations: []
      }
    }
    
    acc[classKey].reservations.push(reservation)
    return acc
  }, {} as Record<string, any>)

  return Object.values(grouped)
}

// Componente para mostrar una tarjeta de clase con múltiples reservas
const ClassReservationCard = ({ 
  classGroup, 
  onCancelClass 
}: { 
  classGroup: any
  onCancelClass: (reservation: UserReservation) => void 
}) => {
  const { classInfo, reservations } = classGroup
  const canCancelAny = reservations.some((r: UserReservation) => r.canCancel)
  const allCancelled = reservations.every((r: UserReservation) => r.status === 'cancelled')

  return (
    <Card className="mb-4">
      <CardContent className="p-4 sm:p-6">
        <div className="flex justify-between items-start sm:flex-row sm:justify-between sm:items-start gap 2 sm:gap-0 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{classInfo.className}</h3>
            <p className="text-sm text-gray-600">Instructor: {classInfo.instructor}</p>
            <p className="text-sm text-gray-600">
              {classInfo.dateFormatted} • {classInfo.time} • {classInfo.duration}
            </p>
          </div>
          <Badge variant={allCancelled ? "secondary" : "default"}className="self-start sm:self-auto bg-white border-gray-200 text-gray-800 hover:bg-gray-50"> 
            {reservations.length} reserva{reservations.length > 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Mostrar información de cada reserva */}
        <div className="space-y-3 mb-4">
          {reservations.map((reservation: UserReservation) => (
            <div 
              key={reservation.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg gap-3"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  {reservation.bikeNumber && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Bike className="h-4 w-4" /> <span>Bicicleta #{reservation.bikeNumber}</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  {reservation.package}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Badge 
                  variant={
                    reservation.status === 'confirmed' ? 'default' :
                    reservation.status === 'cancelled' ? 'secondary' : 'outline'
                  }
                  className="text-xs bg-brand-sage"
                >
                  {reservation.status === 'confirmed' ? 'Confirmada' :
                   reservation.status === 'cancelled' ? 'Cancelada' : reservation.status}
                </Badge>
                
                {reservation.canCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onCancelClass(reservation)}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Información adicional de la clase */}
        {classInfo.description && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{classInfo.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Función principal para renderizar las reservas agrupadas
const renderGroupedReservations = (reservations: UserReservation[], onCancelClass: (reservation: UserReservation) => void) => {
  const groupedReservations = groupReservationsByClass(reservations)
  
  return (
    <div className="space-y-4">
      {groupedReservations.map((classGroup, index) => (
        <ClassReservationCard 
          key={index} 
          classGroup={classGroup} 
          onCancelClass={onCancelClass}
        />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { logout, user, isLoading } = useAuth()
  const { toast } = useToast()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<UserReservation | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [upcomingClasses, setUpcomingClasses] = useState<UserReservation[]>([])
  const [pastClasses, setPastClasses] = useState<UserReservation[]>([])
  const [userPackages, setUserPackages] = useState<UserPackage[]>([])
  const [isLoadingClasses, setIsLoadingClasses] = useState(true)
  const [isLoadingPackages, setIsLoadingPackages] = useState(true)
  const [currentPackagePage, setCurrentPackagePage] = useState(1)
  const packagesPerPage = 6
  const [isCancelling, setIsCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState<null | 'success' | 'error'>(null)

  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/")
    }
  }, [user, isLoading, router])

  // Cargar las reservaciones del usuario
  useEffect(() => {
    const loadReservations = async () => {
      if (!user) return

      try {
        setIsLoadingClasses(true)

        const upcomingResponse = await fetch("/api/user/reservations?status=upcoming", {
          method: "GET",
          credentials: "include",
        })

        if (upcomingResponse.ok) {
          const upcomingData: UserReservation[] = await upcomingResponse.json()
          setUpcomingClasses(upcomingData)
        }

        const pastResponse = await fetch("/api/user/reservations?status=past", {
          method: "GET",
          credentials: "include",
        })

        if (pastResponse.ok) {
          const pastData: UserReservation[] = await pastResponse.json()
          setPastClasses(pastData)
        }
      } catch (error) {
        console.error("Error al cargar reservaciones:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar tus clases. Por favor, intenta de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingClasses(false)
      }
    }

    loadReservations()
  }, [user, toast])

  // Cargar paquetes del usuario
  useEffect(() => {
    const loadUserPackages = async () => {
      if (!user) return

      try {
        setIsLoadingPackages(true)
        const response = await fetch("/api/user/packages", {
          method: "GET",
          credentials: "include",
        })

        if (response.ok) {
          const data: UserPackage[] = await response.json()
          setUserPackages(data)
        }
      } catch (error) {
        console.error("Error al cargar paquetes:", error)
      } finally {
        setIsLoadingPackages(false)
      }
    }

    loadUserPackages()
  }, [user])

  const handleCancelClass = (classItem: UserReservation) => {
    setSelectedClass(classItem)
    setCancelDialogOpen(true)
  }

  const confirmCancelClass = async () => {
    if (!selectedClass) return
    setIsCancelling(true)
    setCancelResult(null)
    try {
      const response = await fetch(`/api/user/reservations/${selectedClass.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelado por el usuario" }),
        credentials: "include",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Error al cancelar la reservación")
      }
      setUpcomingClasses((prevClasses) => prevClasses.filter((c) => c.id !== selectedClass.id))
      setCancelResult('success')
      toast({
        title: "Reservación cancelada",
        description: data.refunded
          ? "Tu clase ha sido devuelta a tu paquete."
          : "La clase ha sido cancelada pero no se pudo reembolsar debido a la política de cancelación.",
      })
    } catch (error) {
      setCancelResult('error')
      console.error("Error:", error)
      toast({
        title: "Error al cancelar",
        description: error instanceof Error ? error.message : "No se pudo cancelar la reservación",
        variant: "destructive",
      })
    } finally {
      setIsCancelling(false)
      setTimeout(() => {
        setCancelDialogOpen(false)
        setCancelResult(null)
      }, 1500)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      toast({
        title: "Cerrando sesión...",
        description: "Por favor espera.",
        variant: "default",
      })
      await logout()
      // No necesitamos redirección manual, el hook ya lo maneja
    } catch (error) {
      console.error("Error durante logout:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al cerrar sesión.",
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  // Calcular total de clases disponibles de todos los paquetes
  const totalAvailableClasses = userPackages.reduce((total, pkg) => total + pkg.classesRemaining, 0)

  // Paginación para paquetes
  const totalPackagePages = Math.ceil(userPackages.length / packagesPerPage)
  const startPackageIndex = (currentPackagePage - 1) * packagesPerPage
  const endPackageIndex = startPackageIndex + packagesPerPage
  const currentPackages = userPackages.slice(startPackageIndex, endPackageIndex)

  const handlePackagePageChange = (page: number) => {
    setCurrentPackagePage(page)
  }

  // Preparar datos del usuario
  const currentUser: UserProfile = {
    name: user?.firstName || "",
    email: user?.email || "",
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Header mejorado */}
      <div className=" border-gray-100 ">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 mb-1 mt-1">¡Hola, {currentUser.name || "Usuario"}!</h1>
              <p className="text-zinc-600">Gestiona tus clases y paquetes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar mejorado */}
          <div className="lg:col-span-3">
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl">
              <CardHeader className="bg-gradient-to-r from-brand-sage/5 to-brand-mint/5">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-sage/10 p-2 rounded-full">
                    <User className="h-5 w-5 text-brand-sage" />
                  </div>
                  <CardTitle className="text-lg">Mi Perfil</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="bg-white  p-2 border-b border-brand-gray/30">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600 text-sm">Email</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium text-xs text-zinc-800">{currentUser.email}</span>
                      </div>
                  </div>
                  <div className="bg-white p-2 border-b border-brand-gray/30">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-600 text-sm">Clases disponibles</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium text-md text-zinc-800">{isLoadingPackages ? "..." : totalAvailableClasses}</span>
                      </div>
                  </div>
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleLogout}
                    disabled={isLoggingOut || isLoading}
                  >
                    <LogOut className="mr-1 h-4 w-4" />
                    {isLoggingOut ? "Cerrando..." : "Salir"}
              </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-9">
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                <TabsList className="bg-white border border-gray-200 shadow-sm p-1 rounded-2xl">
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-xs sm:text-sm flex-1 sm:flex-auto"
                  >
                    Próximas Clases
                  </TabsTrigger>
                  <TabsTrigger
                    value="packages"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-xs sm:text-sm flex-1 sm:flex-auto"
                  >
                    Mis Paquetes
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white data-[state=active]:shadow-sm rounded-xl text-xs sm:text-sm flex-1 sm:flex-auto"
                  >
                    Historial
                  </TabsTrigger>
                </TabsList>

                <Button
                  asChild
                  className="bg-brand-sage hover:bg-brand-gray text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl"
                >
                  <Link href="/reservar">
                    <Calendar className="mr-2 h-4 w-4" />
                    Reservar Nueva Clase
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <TabsContent value="upcoming">
                {upcomingClasses.length === 0 ? (
                  <Card className="text-center py-16 bg-gradient-to-br from-brand-cream/20 to-brand-mint/10 border-dashed border-2 border-brand-sage/20">
                    <CardContent>
                      <div className="max-w-md mx-auto">
                        <div className="bg-brand-sage/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Calendar className="h-8 w-8 text-brand-sage" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-zinc-800">No tienes clases reservadas</h3>
                        <p className="text-zinc-600 mb-6">¡Es hora de reservar tu próxima sesión!</p>
                        <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white shadow-sm">
                          <Link href="/reservar">
                            Reservar una clase
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (renderGroupedReservations(upcomingClasses, handleCancelClass)
                )}
              </TabsContent>

              <TabsContent value="packages">
                {isLoadingPackages ? (
                  <div className="text-center py-16">
                    <div className="animate-pulse">
                      <div className="bg-gray-200 rounded-lg h-8 w-48 mx-auto mb-4"></div>
                      <div className="bg-gray-200 rounded-lg h-4 w-32 mx-auto"></div>
                    </div>
                  </div>
                ) : userPackages.length === 0 ? (
                  <Card className="text-center py-16 bg-gradient-to-br from-brand-cream/20 to-brand-mint/10 border-dashed border-2 border-brand-sage/20">
                    <CardContent>
                      <div className="max-w-md mx-auto">
                        <div className="bg-brand-mint/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Package className="h-8 w-8 text-brand-mint" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-zinc-800">No tienes paquetes activos</h3>
                        <p className="text-zinc-600 mb-6">Compra un paquete para comenza</p>
                        <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white shadow-sm">
                          <Link href="/paquetes">
                            Comprar un paquete
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentPackages.map((pkg) => (
                        <Card
                          key={pkg.id}
                          className="border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                        >
                          <div className="bg-gradient-to-r from-brand-sage/10 to-brand-mint/10 p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-xl font-bold text-brand-sage">{pkg.name}</h3>
                              <div className="bg-brand-sage/20 p-2 rounded-full">
                                <Package className="h-5 w-5 text-brand-sage" />
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-brand-sage mb-1">{pkg.classesRemaining}</div>
                              <p className="text-sm text-zinc-600">clases restantes</p>
                            </div>
                          </div>

                          <CardContent className="p-6">
                            <div className="space-y-4 mb-6">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-600">Clases usadas</span>
                                <span className="font-medium text-zinc-800">{pkg.classesUsed}</span>
                              </div>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-600">Expira el</span>
                                <span className="font-medium text-zinc-800">
                                  {new Date(pkg.expiryDate).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-brand-sage to-brand-mint h-2 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${(pkg.classesUsed / (pkg.classesUsed + pkg.classesRemaining)) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <Button
                              asChild
                              className="w-full bg-brand-mint hover:bg-brand-sage text-white shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              <Link href="/reservar">
                                <Calendar className="mr-2 h-4 w-4" />
                                Usar para reservar
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Paginador para paquetes */}
                    {totalPackagePages > 1 && (
                      <div className="flex justify-center items-center space-x-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePackagePageChange(currentPackagePage - 1)}
                          disabled={currentPackagePage === 1}
                          className="h-9 px-3"
                        >
                          Anterior
                        </Button>
                        
                        <div className="flex space-x-1">
                          {Array.from({ length: totalPackagePages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={currentPackagePage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePackagePageChange(page)}
                              className={`h-9 w-9 ${
                                currentPackagePage === page 
                                  ? "bg-brand-sage hover:bg-brand-gray text-white" 
                                  : "hover:bg-brand-sage/10"
                              }`}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePackagePageChange(currentPackagePage + 1)}
                          disabled={currentPackagePage === totalPackagePages}
                          className="h-9 px-3"
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history">
                {pastClasses.length === 0 ? (
                  <Card className="text-center py-16 bg-gradient-to-br from-brand-cream/20 to-brand-mint/10 border-dashed border-2 border-brand-sage/20">
                    <CardContent>
                      <div className="max-w-md mx-auto">
                        <div className="bg-brand-cream/20 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <Target className="h-8 w-8 text-brand-sage" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-zinc-800">Aún no tienes historial</h3>
                        <p className="text-zinc-600">¡Completa tu primera clase para ver tu progreso aquí!</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {pastClasses.map((classItem) => {
                      let penaltyBadge = null
                      if (
                        classItem.package === 'SEMANA ILIMITADA' &&
                        classItem.status === 'cancelled' &&
                        classItem.cancelledAt
                      ) {
                        const classDateTime = new Date(`${classItem.date}T${classItem.time}:00`)
                        const cancelledAt = new Date(classItem.cancelledAt)
                        const diffMs = classDateTime.getTime() - cancelledAt.getTime()
                        const diffHours = diffMs / (1000 * 60 * 60)
                        if (diffHours < 12) {
                          penaltyBadge = (
                            <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                              Cancelada fuera de tiempo (penalización aplicada)
                            </span>
                          )
                        }
                      }
                      return (
                        <Card
                          key={classItem.id}
                          className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                          <div className="flex flex-col md:flex-row">
                            <div className="flex-1 p-6">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="text-lg font-bold text-brand-sage mb-1">{classItem.className}</h3>
                                  <p className="text-zinc-600 text-sm">Con {classItem.instructor}</p>
                                </div>
                                <Badge className="bg-brand-sage/10 text-brand-sage border-brand-sage/20">
                                  Completada
                                </Badge>
                                {penaltyBadge}
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center text-zinc-700 text-sm">
                                  <Calendar className="h-4 w-4 mr-3 text-brand-sage" />
                                  <span>{classItem.dateFormatted || classItem.date}</span>
                                </div>
                                <div className="flex items-center text-zinc-700 text-sm">
                                  <Clock className="h-4 w-4 mr-3 text-brand-sage" />
                                  <span>
                                    {classItem.time} • {classItem.duration}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Cancelación mejorado */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-900">Cancelar Reserva</DialogTitle>
            <DialogDescription className="text-zinc-600">
              ¿Estás seguro de que deseas cancelar tu reserva para la clase de{" "}
              <span className="font-semibold text-brand-sage">{selectedClass?.className}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedClass && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
                <div className="flex items-center text-zinc-700">
                  <Calendar className="h-4 w-4 mr-3 text-brand-sage" />
                  <span className="font-medium">{selectedClass.date}</span>
                </div>
                <div className="flex items-center text-zinc-700">
                  <Clock className="h-4 w-4 mr-3 text-brand-sage" />
                  <span className="font-medium">
                    {selectedClass.time} • {selectedClass.duration}
                  </span>
                </div>
                {/* Mensaje especial para Semana Ilimitada */}
                {selectedClass.package === 'SEMANA ILIMITADA' ? (() => {
                  const classDateTime = new Date(`${selectedClass.date}T${selectedClass.time}:00`)
                  const now = new Date()
                  const diffMs = classDateTime.getTime() - now.getTime()
                  const diffHours = diffMs / (1000 * 60 * 60)
                  if (diffHours < 12) {
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                        <p className="text-sm text-red-800">
                          <strong>Importante:</strong> Cancelar con menos de 12 horas de anticipación implica perder esta clase y se aplicará una penalización (se cancelará tu siguiente clase de la semana).
                        </p>
                      </div>
                    )
                  } else {
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                        <p className="text-sm text-amber-800">
                          <strong>Política Semana Ilimitada:</strong> Si cancelas con más de 12 horas de anticipación, no hay penalización, pero tampoco reposición de clase.
                        </p>
                      </div>
                    )
                  }
                })() : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-amber-800">
                      <strong>Política de cancelación:</strong> Las cancelaciones deben realizarse con al menos 12 horas de anticipación para recuperar tu crédito.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="w-full sm:w-auto order-2 sm:order-1"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Mantener Reserva
            </Button>
            <Button
              className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white order-1 sm:order-2 shadow-sm"
              onClick={confirmCancelClass}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></span>
                  Cancelando...
                </>
              ) : (
                cancelResult === 'success' ? 'Cancelada' : cancelResult === 'error' ? 'Error' : 'Confirmar Cancelación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
