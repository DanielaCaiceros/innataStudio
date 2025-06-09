"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, X, ChevronRight, Settings, LogOut, Users, Target, Zap, Heart, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  bikeNumber?: number
}

interface UserProfile {
  name: string
  email: string
  avatar?: string
}

/**
 * Formatea la hora de la base de datos para mostrar correctamente
 * @param timeString - Hora en formato de la BD (ej: "12:00" o "1970-01-01T12:00:00.000Z")
 * @returns Hora formateada (ej: "12:00")
 */
function formatDisplayTime(timeString: string): string {
  if (!timeString) return "00:00";
  
  try {
    // Si ya viene en formato HH:mm, devolverlo tal cual
    if (timeString.match(/^\d{2}:\d{2}$/)) {
      return timeString;
    }
    
    // Si viene en formato ISO de la BD, extraer la hora UTC
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    // Fallback
    return timeString.substring(0, 5);
  } catch (error) {
    console.error("Error formateando hora:", error, timeString);
    return "00:00";
  }
}

/**
 * Formatea la fecha para mostrar en formato legible
 * @param dateString - Fecha en formato ISO
 * @returns Fecha formateada
 */
function formatDisplayDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formateando fecha:", error, dateString);
    return dateString;
  }
}

// Función para obtener el ícono según la categoría
const getCategoryIcon = (category: string) => {
  switch (category?.toLowerCase()) {
    case "hiit":
      return <Zap className="h-6 w-6" />
    case "ritmo":
      return <Heart className="h-6 w-6" />
    case "resistencia":
      return <Target className="h-6 w-6" />
    case "recuperacion":
      return <Heart className="h-6 w-6" />
    default:
      return <Flame className="h-6 w-6" />
  }
}

// Función para obtener el color según la intensidad
const getIntensityColor = (intensity: string) => {
  switch (intensity?.toLowerCase()) {
    case "baja":
      return "bg-green-100 text-green-800 border-green-200"
    case "media":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "media-alta":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "alta":
      return "bg-red-100 text-red-800 border-red-200"
    case "muy alta":
      return "bg-purple-100 text-purple-800 border-purple-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
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

  useEffect(() => {
    // Si no hay usuario y no está cargando, redirige al home
    if (!user && !isLoading) {
      router.push("/")
    }
  }, [user, isLoading, router])

  // Cargar las reservaciones del usuario
  useEffect(() => {
    const loadReservations = async () => {
      if (!user) return;
      
      try {
        setIsLoadingClasses(true);
        
        // Cargar clases próximas
        const upcomingResponse = await fetch("/api/user/reservations?status=upcoming", {
          method: "GET",
          credentials: "include",
        });
        
        if (upcomingResponse.ok) {
          const upcomingData: UserReservation[] = await upcomingResponse.json();
          setUpcomingClasses(upcomingData);
        }
        
        // Cargar historial de clases
        const pastResponse = await fetch("/api/user/reservations?status=past", {
          method: "GET",
          credentials: "include",
        });
        
        if (pastResponse.ok) {
          const pastData: UserReservation[] = await pastResponse.json();
          setPastClasses(pastData);
        }
      } catch (error) {
        console.error("Error al cargar reservaciones:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar tus clases. Por favor, intenta de nuevo.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClasses(false);
      }
    };
    
    loadReservations();
  }, [user, toast]);

  // Cargar paquetes del usuario
  useEffect(() => {
    const loadUserPackages = async () => {
      if (!user) return;
      
      try {
        setIsLoadingPackages(true);
        const response = await fetch("/api/user/packages", {
          method: "GET",
          credentials: "include",
        });
        
        if (response.ok) {
          const data: UserPackage[] = await response.json();
          setUserPackages(data);
        }
      } catch (error) {
        console.error("Error al cargar paquetes:", error);
      } finally {
        setIsLoadingPackages(false);
      }
    };
    
    loadUserPackages();
  }, [user]);

  const handleCancelClass = (classItem: UserReservation) => {
    setSelectedClass(classItem)
    setCancelDialogOpen(true)
  }

  const confirmCancelClass = async () => {
    if (!selectedClass) return;
    
    try {
      const response = await fetch(`/api/user/reservations/${selectedClass.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelado por el usuario" }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al cancelar la reservación");
      }
      
      // Actualizar el estado local para reflejar la cancelación
      setUpcomingClasses(prevClasses => 
        prevClasses.filter(c => c.id !== selectedClass.id)
      );
      
      toast({
        title: "Reservación cancelada",
        description: data.refunded 
          ? "Tu clase ha sido devuelta a tu paquete." 
          : "La clase ha sido cancelada pero no se pudo reembolsar debido a la política de cancelación.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error al cancelar",
        description: error instanceof Error ? error.message : "No se pudo cancelar la reservación",
        variant: "destructive",
      });
    } finally {
      setCancelDialogOpen(false);
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente.",
        variant: "default",
      })
      // Redirigir al home
      router.push('/')
      router.refresh()
    } catch (error) {
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
  const totalAvailableClasses = userPackages.reduce(
    (total, pkg) => total + pkg.classesRemaining, 0
  );

  // Preparar datos del usuario
  const currentUser: UserProfile = {
    name: user?.name || "",
    email: user?.email || ""
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
          {/* Sidebar - Perfil */}
          <div className="lg:col-span-3 mb-6 lg:mb-0">
            <Card className="border-brand-mint/20 shadow-sm">
              <CardHeader className="pb-4">
                  <div className="flex justify-between items-center py-2 border-b border-brand-mint/20">
                    <span className="text-zinc-600 text-sm sm:text-base">Email</span>
                    <span className="font-medium text-brand-burgundy text-base sm:text-sm">{currentUser.email}</span>
                  </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-brand-mint/20">
                    <span className="text-zinc-600 text-sm sm:text-base">Clases disponibles</span>
                    <span className="font-medium text-brand-burgundy text-base sm:text-lg">{isLoadingPackages ? "..." : totalAvailableClasses}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                  disabled={isLoggingOut || isLoading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <Tabs defaultValue="upcoming" className="w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
                <h1 className="text-2xl sm:text-3xl font-bold">Mi Cuenta</h1>
                <TabsList className="bg-brand-mint/10 flex flex-wrap">
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white"
                  >
                    Próximas Clases
                  </TabsTrigger>
                  <TabsTrigger
                    value="packages"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white"
                  >
                    Mis Paquetes
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white"
                  >
                    Historial
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="upcoming" className="mt-0">
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-semibold">Clases Reservadas</h2>
                  <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white rounded-full w-full sm:w-auto">
                    <Link href="/reservar">
                      Reservar Nueva Clase
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {upcomingClasses.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-brand-cream/10 rounded-lg">
                    <p className="text-zinc-600">No tienes clases reservadas actualmente.</p>
                    <Button asChild className="mt-4 bg-brand-sage hover:bg-brand-gray text-white w-full sm:w-auto">
                      <Link href="/reservar">Reservar una clase</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {upcomingClasses.map((classItem) => (
                      <Card 
                        key={classItem.id} 
                        className="bg-white border-gray-100 overflow-hidden rounded-3xl shadow-sm hover:shadow-lg transition-all duration-300 group"
                      >
                        {/* Header visual con ícono */}
                        <div className="relative h-20 sm:h-24 bg-gradient-to-br from-brand-sage/50 via-brand-mint/25 to-brand-sage/20 flex items-center justify-center">
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                            <Badge className="bg-white/90 text-brand-sage border-0 shadow-sm">
                              {classItem.duration}
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-4 sm:p-6">
                          <div className="mb-2 sm:mb-4">
                            <h3 className="text-lg sm:text-xl font-bold text-brand-sage mb-1 sm:mb-2 group-hover:text-brand-mint transition-colors">
                              {classItem.className}
                            </h3>
                            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-1 sm:mb-2">
                              Con {classItem.instructor}
                            </p>
                            {classItem.description && (
                              <p className="text-gray-600 text-xs sm:text-sm leading-relaxed line-clamp-2">
                                {classItem.description}
                              </p>
                            )}
                          </div>
                          {/* Información de la clase */}
                          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                <Calendar className="h-4 w-4 text-brand-sage" />
                                <span>Fecha:</span>
                              </div>
                              {/* Usa dateFormatted si está disponible, si no usa date */}
                              <span className="text-xs font-medium text-black">
                                {classItem.dateFormatted || classItem.date}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                <Clock className="h-4 w-4 text-brand-sage" />
                                <span>Hora:</span>
                              </div>
                              <span className="text-xs font-medium text-black">{classItem.time}</span>
                            </div>
                            {typeof classItem.bikeNumber === 'number' && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                  <Flame className="h-4 w-4 text-brand-sage" />
                                  <span>Bicicleta:</span>
                                </div>
                                <span className="text-xs font-medium text-black">#{classItem.bikeNumber}</span>
                              </div>
                            )}
                            {classItem.intensity && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                  <Target className="h-4 w-4 text-brand-sage" />
                                  <span>Intensidad:</span>
                                </div>
                                <Badge className={`text-xs border ${getIntensityColor(classItem.intensity)}`}>
                                  {classItem.intensity}
                                </Badge>
                              </div>
                            )}
                            {classItem.capacity && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
                                  <Users className="h-4 w-4 text-brand-sage" />
                                  <span>Capacidad:</span>
                                </div>
                                <span className="font-semibold text-brand-sage">{classItem.capacity} personas</span>
                              </div>
                            )}
                          </div>
                          {/* Botón de cancelar o estado cancelado */}
                          {classItem.status === "cancelled" ? (
                            <Button
                              variant="outline"
                              className="w-full text-red-400 bg-red-50 border-red-200 rounded-full cursor-not-allowed opacity-80"
                              disabled
                            >
                              <X className="mr-2 h-4 w-4" />
                              Reserva Cancelada
                            </Button>
                          ) : classItem.canCancel && (
                            <Button
                              variant="outline"
                              className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 rounded-full group-hover:shadow-lg transition-all duration-300 text-xs sm:text-base"
                              onClick={() => handleCancelClass(classItem)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancelar Reserva
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="packages" className="mt-0">
                <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-semibold">Mis Paquetes</h2>
                  <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white rounded-full w-full sm:w-auto">
                    <Link href="/paquetes">
                      Comprar Paquete
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                {isLoadingPackages ? (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-zinc-600">Cargando paquetes...</p>
                  </div>
                ) : userPackages.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 bg-brand-cream/10 rounded-lg">
                    <p className="text-zinc-600 mb-4">No tienes paquetes activos actualmente.</p>
                    <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white w-full sm:w-auto">
                      <Link href="/paquetes">Comprar un paquete</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {userPackages.map((pkg) => (
                      <Card key={pkg.id} className="border-brand-mint/20 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-base sm:text-lg font-semibold text-brand-burgundy">
                            {pkg.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-600 text-sm">Clases restantes</span>
                              <span className="font-bold text-xl sm:text-2xl text-brand-sage">
                                {pkg.classesRemaining}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-600 text-sm">Clases usadas</span>
                              <span className="font-medium text-zinc-700">
                                {pkg.classesUsed}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-600 text-sm">Expira el</span>
                              <span className="font-medium text-zinc-700">
                                {new Date(pkg.expiryDate).toLocaleDateString('es-ES', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  timeZone: 'UTC' // Add this option
                                })}
                              </span>
                            </div>
                            <div className="w-full bg-brand-cream/30 rounded-full h-2">
                              <div className="bg-brand-sage h-2 rounded-full transition-all duration-300 w-1/2" />
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button asChild className="w-full bg-brand-mint hover:bg-brand-sage text-white">
                            <Link href="/reservar">
                              Usar para reservar
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Historial de Clases</h2>
                {pastClasses.map((classItem) => (
                  <Card key={classItem.id} className="overflow-hidden border-brand-mint/20 shadow-sm">
                    <div className="flex flex-col md:flex-row">
                      <div className="flex-1 p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-bold">{classItem.className}</h3>
                        <p className="text-zinc-600 text-sm">Con {classItem.instructor}</p>
                        <div className="mt-1 sm:mt-2 space-y-1">
                          <div className="flex items-center text-zinc-700 text-xs sm:text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-brand-gray" />
                            {/* Usa dateFormatted si está disponible, si no usa date */}
                            <span>{classItem.dateFormatted || classItem.date}</span>
                          </div>
                          <div className="flex items-center text-zinc-700 text-xs sm:text-sm">
                            <Clock className="h-4 w-4 mr-2 text-brand-gray" />
                            <span>
                              {classItem.time} • {classItem.duration}
                            </span>
                          </div>
                          {typeof classItem.bikeNumber === 'number' && (
                            <div className="flex items-center text-zinc-700 text-xs sm:text-sm">
                              <Flame className="h-4 w-4 mr-2 text-brand-gray" />
                              <span>Bicicleta #{classItem.bikeNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-3 sm:p-4 flex items-center">
                        <Button
                          variant="outline"
                          className="bg-brand-mint/10 hover:bg-brand-mint/20 border-brand-mint/20 w-full sm:w-auto text-xs sm:text-base"
                        >
                          Reservar Similar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      {/* Modal de Confirmación de Cancelación */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Reserva</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar tu reserva para la clase de {selectedClass?.className}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedClass && (
              <div className="space-y-2">
                <div className="flex items-center text-zinc-700 text-xs sm:text-base">
                  <Calendar className="h-4 w-4 mr-2 text-brand-gray" />
                  <span>{selectedClass.date}</span>
                </div>
                <div className="flex items-center text-zinc-700 text-xs sm:text-base">
                  <Clock className="h-4 w-4 mr-2 text-brand-gray" />
                  <span>
                    {selectedClass.time} • {selectedClass.duration}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-2">
                  Recuerda que las cancelaciones deben realizarse con al menos 12 horas de anticipación para recuperar tu
                  crédito.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCancelDialogOpen(false)}>
              Mantener Reserva
            </Button>
            <Button className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white" onClick={confirmCancelClass}>
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}