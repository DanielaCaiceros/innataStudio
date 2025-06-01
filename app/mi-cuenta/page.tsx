"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, X, ChevronRight, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
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
}

interface UserProfile {
  name: string
  email: string
  memberSince: string
  avatar?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { logout, user, isLoading } = useAuth()
  const { toast } = useToast()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<UserReservation | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [upcomingClasses, setUpcomingClasses] = useState<UserReservation[]>([])
  const [pastClasses, setpastClasses] = useState<UserReservation[]>([])
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
          setpastClasses(pastData);
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
    email: user?.email || "",
    memberSince: user?.joinDate 
      ? new Date(user.joinDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
      : ""
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar - Perfil */}
          <div className="lg:col-span-3">
            <Card className="border-brand-mint/20 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-col items-center">
                
                  <CardTitle className="text-xl font-bold text-center">{currentUser.name}</CardTitle>
                  <CardDescription className="text-center">{currentUser.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-brand-mint/20">
                    <span className="text-zinc-600">Miembro desde</span>
                    <span className="font-medium text-brand-burgundy">{currentUser.memberSince}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-brand-mint/20">
                    <span className="text-zinc-600">Clases disponibles</span>
                    <span className="font-medium text-brand-burgundy">{isLoadingPackages ? "..." : totalAvailableClasses}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/mi-cuenta/ajustes">
                    <Settings className="mr-2 h-4 w-4" />
                    Ajustes de cuenta
                  </Link>
                </Button>
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
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Mi Cuenta</h1>
                <TabsList className="bg-brand-mint/10">
                  <TabsTrigger
                    value="upcoming"
                    className="data-[state=active]:bg-brand-sage data-[state=active]:text-white"
                  >
                    Próximas Clases
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
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Clases Reservadas</h2>
                  <Button asChild className="bg-brand-sage hover:bg-brand-gray text-white rounded-full">
                    <Link href="/reservar">
                      Reservar Nueva Clase
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                {upcomingClasses.length === 0 ? (
                  <div className="text-center py-12 bg-brand-cream/10 rounded-lg">
                    <p className="text-zinc-600">No tienes clases reservadas actualmente.</p>
                    <Button asChild className="mt-4 bg-brand-sage hover:bg-brand-gray text-white">
                      <Link href="/reservar">Reservar una clase</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingClasses.map((classItem) => (
                      <Card key={classItem.id} className="overflow-hidden border-brand-mint/20 shadow-sm">
                        <div className="relative h-40">
                          <Image
                            src={classItem.image || "/placeholder.svg"}
                            alt={classItem.className}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-xl font-bold text-white">{classItem.className}</h3>
                            <p className="text-white/90">Con {classItem.instructor}</p>
                          </div>
                        </div>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center text-zinc-700">
                              <Calendar className="h-4 w-4 mr-2 text-brand-gray" />
                              <span>{classItem.date}</span>
                            </div>
                            <div className="flex items-center text-zinc-700">
                              <Clock className="h-4 w-4 mr-2 text-brand-gray" />
                              <span>
                                {classItem.time} • {classItem.duration}
                              </span>
                            </div>
                            <div className="flex items-center text-zinc-700">
                              <MapPin className="h-4 w-4 mr-2 text-brand-gray" />
                              <span>{classItem.location}</span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                          <Button
                            variant="outline"
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
                            onClick={() => handleCancelClass(classItem)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar Reserva
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <h2 className="text-xl font-semibold mb-6">Historial de Clases</h2>

                {pastClasses.length === 0 ? (
                  <div className="text-center py-12 bg-brand-cream/10 rounded-lg">
                    <p className="text-zinc-600">No tienes historial de clases.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastClasses.map((classItem) => (
                      <Card key={classItem.id} className="overflow-hidden border-brand-mint/20 shadow-sm">
                        <div className="flex flex-col md:flex-row">
                          <div className="relative w-full md:w-48 h-32 md:h-auto">
                            <Image
                              src={classItem.image || "/placeholder.svg"}
                              alt={classItem.className}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 p-4">
                            <h3 className="text-lg font-bold">{classItem.className}</h3>
                            <p className="text-zinc-600">Con {classItem.instructor}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center text-zinc-700 text-sm">
                                <Calendar className="h-4 w-4 mr-2 text-brand-gray" />
                                <span>{classItem.date}</span>
                              </div>
                              <div className="flex items-center text-zinc-700 text-sm">
                                <Clock className="h-4 w-4 mr-2 text-brand-gray" />
                                <span>
                                  {classItem.time} • {classItem.duration}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 flex items-center">
                            <Button
                              variant="outline"
                              className="bg-brand-mint/10 hover:bg-brand-mint/20 border-brand-mint/20"
                            >
                              Reservar Similar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
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
                <div className="flex items-center text-zinc-700">
                  <Calendar className="h-4 w-4 mr-2 text-brand-gray" />
                  <span>{selectedClass.date}</span>
                </div>
                <div className="flex items-center text-zinc-700">
                  <Clock className="h-4 w-4 mr-2 text-brand-gray" />
                  <span>
                    {selectedClass.time} • {selectedClass.duration}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mt-2">
                  Recuerda que las cancelaciones deben realizarse con al menos 4 horas de anticipación para recuperar tu
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