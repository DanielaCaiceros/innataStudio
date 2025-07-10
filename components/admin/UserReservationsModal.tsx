"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Bike,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Package,
  CreditCard,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

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
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all')

  const tabToStatus = {
    all: 'all',
    upcoming: 'upcoming',
    past: 'past',
    cancelled: 'cancelled',
  }

  const loadUserReservations = async (tab: keyof typeof tabToStatus = 'all', page = 1, updateAbsoluteStats = false) => {
    if (!userId) return

    setIsLoading(true)
    try {
      const status = tabToStatus[tab]
      const params = new URLSearchParams({
        status,
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      const response = await fetch(`/api/admin/users/${userId}/reservations?${params}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Error al cargar las reservaciones")
      }

      const data = await response.json()
      setReservations(data.reservations)
      setUserInfo(data.user)
      setStatistics(data.statistics)
      setPagination(data.pagination)
      if (updateAbsoluteStats) {
        setAbsoluteStatistics(data.statistics)
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

  // Al abrir el modal o cambiar de usuario, cargar todas y guardar absoluteStatistics
  useEffect(() => {
    if (isOpen && userId) {
      loadUserReservations('all', 1, true)
      setActiveTab('all')
      setPagination(prev => ({ ...prev, page: 1 }))
    }
    // eslint-disable-next-line
  }, [isOpen, userId])

  // Al cambiar de tab, solo cargar reservas y stats filtrados
  useEffect(() => {
    if (isOpen && userId && activeTab !== 'all') {
      loadUserReservations(activeTab as keyof typeof tabToStatus, 1, false)
      setPagination(prev => ({ ...prev, page: 1 }))
    }
    // eslint-disable-next-line
  }, [activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value as any)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }))
      loadUserReservations(activeTab as keyof typeof tabToStatus, newPage)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-3xl p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-[#4A102A] text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Reservaciones de {userName}
          </DialogTitle>
          {userInfo && (
            <DialogDescription className="text-gray-600 text-xs flex gap-4">
              <span><Mail className="h-3 w-3 inline" /> {userInfo.email}</span>
              {userInfo.phone !== 'No registrado' && <span><Phone className="h-3 w-3 inline" /> {userInfo.phone}</span>}
            </DialogDescription>
          )}
        </DialogHeader>
        {/* Estadísticas */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          <div className="text-center">
            <div className="text-base font-bold text-blue-600">{absoluteStatistics.total}</div>
            <div className="text-[10px] text-blue-700">Total</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-green-600">{absoluteStatistics.upcoming}</div>
            <div className="text-[10px] text-green-700">Próximas</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-gray-600">{absoluteStatistics.past}</div>
            <div className="text-[10px] text-gray-700">Pasadas</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-black-600">{absoluteStatistics.attended}</div>
            <div className="text-[10px] text-black-700">Asistió</div>
          </div>
          <div className="text-center">
            <div className="text-base font-bold text-red-600">{absoluteStatistics.cancelled}</div>
            <div className="text-[10px] text-red-700">Canceladas</div>
          </div>
        </div>
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-2">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 h-8 rounded-none p-0 border-b border-gray-200">
            <TabsTrigger value="all" className={"text-xs h-8 font-semibold border-b-2 " + (activeTab === 'all' ? 'border-blue-500 text-blue-700 bg-transparent rounded-none shadow-none' : 'border-transparent text-gray-500 bg-transparent rounded-none shadow-none')}>Todas</TabsTrigger>
            <TabsTrigger value="upcoming" className={"text-xs h-8 font-semibold border-b-2 " + (activeTab === 'upcoming' ? 'border-blue-500 text-blue-700 bg-transparent rounded-none shadow-none' : 'border-transparent text-gray-500 bg-transparent rounded-none shadow-none')}>Próximas</TabsTrigger>
            <TabsTrigger value="past" className={"text-xs h-8 font-semibold border-b-2 " + (activeTab === 'past' ? 'border-blue-500 text-blue-700 bg-transparent rounded-none shadow-none' : 'border-transparent text-gray-500 bg-transparent rounded-none shadow-none')}>Pasadas</TabsTrigger>
            <TabsTrigger value="cancelled" className={"text-xs h-8 font-semibold border-b-2 " + (activeTab === 'cancelled' ? 'border-blue-500 text-blue-700 bg-transparent rounded-none shadow-none' : 'border-transparent text-gray-500 bg-transparent rounded-none shadow-none')}>Canceladas</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-2">
            {isLoading ? (
              <div className="text-center py-8 text-xs text-gray-500">Cargando reservaciones...</div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">No hay reservaciones para este filtro.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-separate border-spacing-0">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Clase</th>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Fecha</th>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Estado</th>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Paquete</th>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Pago</th>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Bici</th>
                        <th className="px-2 py-1 font-semibold text-left text-gray-700">Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((reservation) => (
                        <tr key={reservation.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-1 whitespace-nowrap font-medium text-gray-900">{reservation.className}</td>
                          <td className="px-2 py-1 whitespace-nowrap text-gray-700">{reservation.date} <span className="text-gray-400">{reservation.time}</span></td>
                          <td className="px-2 py-1">
                            <span className={`inline-block border rounded px-2 py-0.5 text-[11px] font-medium ${reservation.status === 'attended' ? 'border-blue-500 text-blue-600' : 'border-gray-300 text-gray-600'}`}>{reservation.status === 'attended' ? <CheckCircle className="inline h-3 w-3 mr-1 -mt-0.5" /> : reservation.status === 'cancelled' ? <XCircle className="inline h-3 w-3 mr-1 -mt-0.5" /> : null}{reservation.status === 'attended' ? 'Asistió' : reservation.status === 'cancelled' ? 'Cancelada' : reservation.status === 'confirmed' ? 'Confirmada' : reservation.status}</span>
                          </td>
                          <td className="px-2 py-1">
                            <span className="inline-block border border-gray-300 text-gray-600 rounded px-2 py-0.5 text-[11px]">{reservation.package}</span>
                          </td>
                          <td className="px-2 py-1">
                            <span className="inline-block border border-gray-300 text-gray-600 rounded px-2 py-0.5 text-[11px]">{reservation.paymentMethod === 'online' ? 'Online' : reservation.paymentMethod === 'cash' ? 'Efectivo' : 'Paquete'}</span>
                          </td>
                          <td className="px-2 py-1 text-center text-gray-700">{reservation.bikeNumber || '-'}</td>
                          <td className="px-2 py-1 text-center">
                            {reservation.checkedIn ? (
                              <span className="inline-block border border-blue-500 text-blue-600 rounded px-2 py-0.5 text-[11px]">{reservation.checkedInAt ? new Date(reservation.checkedInAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : <CheckCircle className="inline h-3 w-3 -mt-0.5" />}</span>
                            ) : reservation.status === 'cancelled' ? (
                              <span className="inline-block border border-gray-200 text-gray-400 rounded px-2 py-0.5 text-[11px]">-</span>
                            ) : (
                              <span className="inline-block border border-gray-200 text-gray-400 rounded px-2 py-0.5 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {activeTab === 'upcoming' && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <span className="relative group">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 cursor-pointer" fill="none" viewBox="0 0 24 24" stroke="currentColor"><title>Información</title><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
                      <span className="absolute left-4 top-1 z-10 hidden group-hover:block bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-700 shadow-md w-64">
                        Todas las reservaciones del día de hoy (sin importar la hora) se consideran próximas hasta que termine el día.
                      </span>
                    </span>
                  </div>
                )}
              </>
            )}
            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-2 text-xs">
                <span>Página {pagination.page} de {pagination.totalPages} ({pagination.total} reservaciones)</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>Siguiente</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-200 text-zinc-900 hover:bg-green-100 text-xs">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 