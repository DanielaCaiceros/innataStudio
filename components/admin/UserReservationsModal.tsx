"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogPortal,
  DialogOverlay
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import * as React from "react"

// DialogContent personalizado sin botón X
const CustomDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
CustomDialogContent.displayName = "CustomDialogContent"

interface UserReservation {
  id: number
  className: string
  instructor: string
  date: string
  time: string
  status: string
  package: string
  paymentMethod: string
  bikeNumber: number | null
  checkedIn: boolean
  checkedInAt: string | null
  cancelledAt: string | null
  createdAt: string
  scheduledClassId: number
}

interface UserInfo {
  id: number
  name: string
  email: string
  phone: string
}

interface UserReservationsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  userName: string
}

export default function UserReservationsModal({
  isOpen,
  onOpenChange,
  userId,
  userName
}: UserReservationsModalProps) {
  const [reservations, setReservations] = useState<UserReservation[]>([])
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [statistics, setStatistics] = useState({
    upcoming: 0,
    past: 0,
    cancelled: 0,
    attended: 0,
    total: 0
  })
  const [absoluteStatistics, setAbsoluteStatistics] = useState(statistics)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'>('today')
  
  // States for cancellation
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<UserReservation | null>(null)
  const [isCancellingReservation, setIsCancellingReservation] = useState(false)

  const tabToStatus = {
    all: 'all',
    upcoming: 'upcoming',
    past: 'past',
    cancelled: 'cancelled',
  }

  const loadUserReservations = async (tab: keyof typeof tabToStatus = 'all', page = 1, updateAbsoluteStats = false, currentDateFilter = dateFilter) => {
    if (!userId) return

    setIsLoading(true)
    try {
      const status = tabToStatus[tab]
      const params = new URLSearchParams({
        status,
        page: page.toString(),
        limit: pagination.limit.toString(),
        dateFilter: currentDateFilter
      })

      const response = await fetch(`/api/admin/users/${userId}/reservations?${params}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Error al cargar las reservaciones")
      }

      const data = await response.json()
      
      // Verificar que tenemos datos válidos
      if (!data.reservations) {
        console.warn('No se recibieron reservaciones del servidor')
        setReservations([])
        return
      }
      
      // Ordenar reservaciones por fecha y hora más recientes primero
      const sortedReservations = data.reservations.sort((a: UserReservation, b: UserReservation) => {
        // Primero intentar ordenar por createdAt (cuando se hizo la reservación)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        
        // Si no hay createdAt, ordenar por fecha y hora de la clase
        const dateA = new Date(`${a.date} ${a.time}`)
        const dateB = new Date(`${b.date} ${b.time}`)
        return dateB.getTime() - dateA.getTime()
      })
      
      setReservations(sortedReservations)
      setUserInfo(data.user)
      setStatistics(data.statistics || statistics)
      setPagination(data.pagination || pagination)
      if (updateAbsoluteStats) {
        setAbsoluteStatistics(data.statistics || statistics)
      }
    } catch (error) {
      console.error("Error loading user reservations:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las reservaciones del usuario",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Al abrir el modal o cambiar de usuario, resetear estado inicial y cargar datos
  useEffect(() => {
    if (isOpen && userId) {
      // Resetear todos los estados cuando cambia el usuario
      setUserInfo(null)
      setReservations([])
      setStatistics({
        upcoming: 0,
        past: 0,
        cancelled: 0,
        attended: 0,
        total: 0
      })
      setActiveTab('all')
      setDateFilter('today')
      setPagination(prev => ({ ...prev, page: 1 }))
      
      // Cargar datos inmediatamente
      loadUserReservations('all', 1, true)
    }
    // eslint-disable-next-line
  }, [isOpen, userId])

  // Al cambiar de tab manualmente, los datos se cargan en handleTabChange
  // Este useEffect ya no es necesario pero lo dejamos comentado por si acaso
  /*
  useEffect(() => {
    if (isOpen && userId && activeTab !== 'all') {
      loadUserReservations(activeTab as keyof typeof tabToStatus, 1, false)
      setPagination(prev => ({ ...prev, page: 1 }))
    }
  }, [activeTab])
  */

  const handleTabChange = (value: string) => {
    const newTab = value as 'all' | 'upcoming' | 'past' | 'cancelled'
    setActiveTab(newTab)
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Cargar datos inmediatamente al cambiar tab
    const shouldUpdateAbsoluteStats = newTab === 'all'
    loadUserReservations(newTab, 1, shouldUpdateAbsoluteStats, dateFilter)
  }

  const handleDateFilterChange = (value: string) => {
    const newDateFilter = value as 'all' | 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'
    setDateFilter(newDateFilter)
    setPagination(prev => ({ ...prev, page: 1 }))
    
    // Cargar datos inmediatamente al cambiar filtro de fecha
    const shouldUpdateAbsoluteStats = activeTab === 'all'
    loadUserReservations(activeTab, 1, shouldUpdateAbsoluteStats, newDateFilter)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }))
      loadUserReservations(activeTab, newPage, false, dateFilter)
    }
  }

  // Handle cancellation confirmation
  const handleCancelReservation = (reservation: UserReservation) => {
    // Only allow cancellation of confirmed or pending reservations that haven't passed yet
    const today = new Date();
    const reservationDate = new Date(`${reservation.date} ${reservation.time}`);
    
    if (reservationDate < today) {
      toast({
        title: "No se puede cancelar",
        description: "No se pueden cancelar clases que ya pasaron.",
        variant: "destructive",
      })
      return
    }
    
    if (reservation.status === 'confirmed' || reservation.status === 'pending') {
      setReservationToCancel(reservation)
      setIsCancelConfirmOpen(true)
    } else {
      toast({
        title: "No se puede cancelar",
        description: "Solo se pueden cancelar reservaciones confirmadas o pendientes.",
        variant: "destructive",
      })
    }
  }

  // Process cancellation
  const processCancellation = async () => {
    if (!reservationToCancel) return
    
    setIsCancellingReservation(true)
    try {
      const response = await fetch(`/api/admin/reservations/${reservationToCancel.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Cancelado por administrador",
          sendEmail: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cancelar la reservación")
      }

      // Update the reservation status locally
      setReservations((prevReservations) =>
        prevReservations.map((r) => 
          r.id === reservationToCancel.id 
            ? { ...r, status: "cancelled", cancelledAt: new Date().toISOString() } 
            : r
        )
      )

      // Update statistics
      setStatistics(prev => ({
        ...prev,
        cancelled: prev.cancelled + 1,
        // Decrease from the appropriate count based on the original status
        ...(reservationToCancel.status === 'confirmed' && {
          upcoming: Math.max(0, prev.upcoming - 1)
        })
      }))

      setAbsoluteStatistics(prev => ({
        ...prev,
        cancelled: prev.cancelled + 1
      }))

      toast({
        title: "Reservación cancelada",
        description: "La reservación ha sido cancelada exitosamente.",
      })

    } catch (error) {
      console.error("Error al cancelar la reservación:", error)
      toast({
        title: "Error al cancelar",
        description: error instanceof Error ? error.message : "Error interno del servidor",
        variant: "destructive",
      })
    } finally {
      setIsCancellingReservation(false)
      setIsCancelConfirmOpen(false)
      setReservationToCancel(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <CustomDialogContent className="bg-white border-gray-200 text-zinc-900 max-w-3xl max-h-[85vh] p-4 overflow-hidden">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-[#4A102A] text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Reservaciones de {userName}
          </DialogTitle>
          {userInfo && (
            <DialogDescription className="text-slate-600 text-xs flex flex-wrap gap-4 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {userInfo.email}
              </span>
              {userInfo.phone !== 'No registrado' && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {userInfo.phone}
                </span>
              )}
            </DialogDescription>
          )}
        </DialogHeader>
        {/* Estadísticas */}
        <div className="rounded-lg p-1 mb-2">
          <div className="grid grid-cols-5 gap-2">
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-700">{absoluteStatistics.total}</div>
              <div className="text-[10px] text-slate-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-emerald-600">{absoluteStatistics.upcoming}</div>
              <div className="text-[10px] text-emerald-600">Próximas</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-600">{absoluteStatistics.past}</div>
              <div className="text-[10px] text-slate-500">Pasadas</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-600">{absoluteStatistics.attended}</div>
              <div className="text-[10px] text-blue-600">Asistió</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-semibold text-rose-500">{absoluteStatistics.cancelled}</div>
              <div className="text-[10px] text-rose-500">Canceladas</div>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 rounded-lg p-0.5 h-8">
            <TabsTrigger 
              value="all" 
              className={`text-xs font-medium rounded-md transition-all h-7 ${
                activeTab === 'all' 
                  ? 'bg-slate-100 text-slate-900 ' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todas
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className={`text-xs font-medium rounded-md transition-all h-7 ${
                activeTab === 'upcoming' 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Próximas
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className={`text-xs font-medium rounded-md transition-all h-7 ${
                activeTab === 'past' 
                  ? 'bg-slate-50 text-slate-700 ' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Pasadas
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled" 
              className={`text-xs font-medium rounded-md transition-all h-7 ${
                activeTab === 'cancelled' 
                  ? 'bg-rose-50 text-rose-700 ' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Canceladas
            </TabsTrigger>
          </TabsList>
          
          {/* Filtro de fecha */}
          <div className="flex items-center gap-2 mt-2 mb-2">
            <span className="text-xs text-slate-600 font-medium">Período:</span>
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-32 h-7 text-xs border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today" className="text-xs">Hoy</SelectItem>
                <SelectItem value="all" className="text-xs">Todo</SelectItem>
                <SelectItem value="thisWeek" className="text-xs">Esta Semana</SelectItem>
                <SelectItem value="lastWeek" className="text-xs">Semana Pasada</SelectItem>
                <SelectItem value="thisMonth" className="text-xs">Este Mes</SelectItem>
                <SelectItem value="lastMonth" className="text-xs">Mes Pasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <TabsContent value={activeTab} className="mt-0 flex-1 overflow-hidden">
            {isLoading ? (
              <div className="text-center py-12 text-sm text-slate-500">
                <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto mb-3"></div>
                <div>Cargando reservaciones...</div>
                <div className="text-xs text-slate-400 mt-1">Obteniendo datos del servidor</div>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-500">
                <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <div>No hay reservaciones para este filtro</div>
                <div className="text-xs text-slate-400 mt-1">
                  {activeTab === 'all' ? 'Este usuario no tiene reservaciones' : 
                   activeTab === 'upcoming' ? 'No hay clases próximas' :
                   activeTab === 'past' ? 'No hay clases pasadas' : 'No hay clases canceladas'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
                  <div className="overflow-x-auto overflow-y-auto max-h-[40vh]">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Clase</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Fecha</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Estado</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Paquete</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Pago</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-700">Bici</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-700">Check-in</th>
                          <th className="px-3 py-2 text-center font-medium text-slate-700">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {reservations.map((reservation, index) => (
                          <tr key={reservation.id} className={`hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                            <td className="px-3 py-2">
                              <div className="font-medium text-slate-900 text-xs">{reservation.className}</div>
                              <div className="text-[10px] text-slate-500">{reservation.instructor}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-slate-900 text-xs">{reservation.date}</div>
                              <div className="text-[10px] text-slate-500">{reservation.time}</div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                reservation.status === 'attended' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : reservation.status === 'cancelled' 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : reservation.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-50 text-slate-700 border border-slate-200'
                              }`}>
                                {reservation.status === 'attended' && <CheckCircle className="h-2.5 w-2.5 mr-1" />}
                                {reservation.status === 'cancelled' && <XCircle className="h-2.5 w-2.5 mr-1" />}
                                {reservation.status === 'attended' ? 'Asistió' : 
                                 reservation.status === 'cancelled' ? 'Cancelada' : 
                                 reservation.status === 'confirmed' ? 'Confirmada' : reservation.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-slate-600 text-[10px]">{reservation.package}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-slate-600 text-[10px]">
                                {reservation.paymentMethod === 'online' ? 'Online' : 
                                 reservation.paymentMethod === 'cash' ? 'Efectivo' : 'Paquete'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-slate-700 font-medium text-xs">{reservation.bikeNumber || '-'}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {reservation.checkedIn ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] border border-blue-200">
                                  {reservation.checkedInAt ? new Date(reservation.checkedInAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Sí'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                             <td className="px-3 py-1.6 text-center">
                              {(() => {
                                const today = new Date();
                                const reservationDate = new Date(`${reservation.date} ${reservation.time}`);
                                const isPastReservation = reservationDate < today;
                                const canCancel = (reservation.status === 'confirmed' || reservation.status === 'pending') && !isPastReservation;
                                
                                return canCancel ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelReservation(reservation)}
                                    className="h-4 px-2 text-[10px] border-red-200 text-red-600 hover:bg-red-50"
                                  >                                    Cancelar
                                  </Button>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">-</span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {activeTab === 'upcoming' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                    <span className="text-blue-700 text-xs">
                      Las reservaciones del día de hoy se consideran próximas hasta que termine el día.
                    </span>
                  </div>
                )}
                {/* Paginación */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-600">
                      Página {pagination.page} de {pagination.totalPages} • {pagination.total} reservaciones
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePageChange(pagination.page - 1)} 
                        disabled={pagination.page === 1}
                        className="text-xs h-6 px-2"
                      >
                        <ChevronLeft className="h-3 w-3 mr-0.5" />
                        Anterior
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handlePageChange(pagination.page + 1)} 
                        disabled={pagination.page === pagination.totalPages}
                        className="text-xs h-6 px-2"
                      >
                        Siguiente
                        <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="pt-3 border-t border-slate-200">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="border-slate-200 text-slate-700 hover:bg-slate-50 text-sm h-8"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </CustomDialogContent>

      {/* AlertDialog para cancelación */}
      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar Reservación?</AlertDialogTitle>
            <AlertDialogDescription>
              {reservationToCancel && (
                <div className="space-y-2">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium">{reservationToCancel.className}</div>
                    <div className="text-sm text-gray-600">
                      {reservationToCancel.date} • {reservationToCancel.time}
                    </div>
                    <div className="text-sm text-gray-600">
                      Instructor: {reservationToCancel.instructor}
                    </div>
                  </div>
                  <div className="text-sm">
                    Esta acción:
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Cancelará la reservación inmediatamente</li>
                      <li>Enviará un email de notificación al usuario</li>
                      <li>Liberará el cupo para otros usuarios</li>
                      <li>No se hará el reembolso de clase, en caso de ser necesario, agregarlo desde la sección de reservaciones.</li>
                    </ul>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancellingReservation}>
              No, mantener
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={processCancellation}
              disabled={isCancellingReservation}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancellingReservation ? "Cancelando..." : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
} 