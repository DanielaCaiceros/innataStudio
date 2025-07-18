// app/admin/reservations/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Search, Download, DollarSign, CalendarIcon, X, AlertCircle, CheckCircle, XCircle, Clock, MoreVertical, Edit, Trash, CreditCard, AlertTriangle, Mail } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatAdminDate } from "@/lib/utils/admin-date"
import { useRouter } from "next/navigation"
// Removed: import { sendBookingConfirmationEmail } from "@/lib/email"
import { Checkbox } from "@/components/ui/checkbox"
import { formatTimeFromDB } from '@/lib/utils/date';

// Tipos
interface Reservation {
  id: number
  user: string
  email: string
  phone: string
  class: string
  date: string
  time: string
  status: string
  package: string
  remainingClasses: number | string
  paymentStatus: string
  paymentMethod: string
  checkedIn: boolean
  checkedInAt: string | null
  bikeNumber: number | null
  cancelledAt?: string
}

interface AvailableTime {
  time: string
  classId: number
  className: string
  instructorName: string
  availableSpots: number
  maxCapacity: number
  typeId: number
  scheduledClassId: number // Add this field

}

interface UserPackage {
  id: number // Add this field
  name: string
  classesRemaining: number
  expiryDate: string
}

interface BikeOption {
  id: number
  available: boolean
}

export default function ReservationsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewReservationOpen, setIsNewReservationOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [editFormData, setEditFormData] = useState({
    class: "",
    date: "",
    time: "",
    status: "",
  })
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([])
  const [selectedUser, setSelectedUser] = useState<string>("")
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [selectedPackage, setSelectedPackage] = useState<string>("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("pending")
  const [selectedBike, setSelectedBike] = useState<number | null>(null)
  const [selectedUserPackageId, setSelectedUserPackageId] = useState<string>("")
  const [sendEmail, setSendEmail] = useState(true) // State for sending email
  const [userSearchTerm, setUserSearchTerm] = useState("") // State for user search

  // Estados para horarios disponibles dinámicos
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([])
  const [availableBikes, setAvailableBikes] = useState<BikeOption[]>([])
  const [isLoadingTimes, setIsLoadingTimes] = useState(false)
  const [isLoadingBikes, setIsLoadingBikes] = useState(false)

  // Estados para validación de clases del usuario
  const [userHasClasses, setUserHasClasses] = useState<boolean | null>(null)
  const [userClassesInfo, setUserClassesInfo] = useState<{
    totalAvailableClasses: number
    activePackages: UserPackage[]
  } | null>(null)
  const [isCheckingUserClasses, setIsCheckingUserClasses] = useState(false)
  const [isCreatingReservation, setIsCreatingReservation] = useState(false) // State for reservation creation loading

  // States for cancellation confirmation modal
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState<number | null>(null)
  const [sendCancelEmail, setSendCancelEmail] = useState(true)
  const [isCancellingReservation, setIsCancellingReservation] = useState(false)

  // Router para redirecciones
  const router = useRouter()

  // Función para verificar paquetes del usuario
  const checkUserPackages = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/check-packages`)
      if (response.ok) {
        const data = await response.json()
        return data
      }
      throw new Error("Error al verificar paquetes")
    } catch (error) {
      console.error("Error checking user packages:", error)
      return null
    }
  }

  // Función para verificar clases disponibles del usuario seleccionado
  const checkSelectedUserClasses = async (userId: string) => {
    if (!userId) {
      setUserHasClasses(null)
      setUserClassesInfo(null)
      return
    }

    setIsCheckingUserClasses(true)
    try {
      const packageData = await checkUserPackages(Number(userId))
      
      if (packageData) {
        setUserHasClasses(packageData.hasAvailableClasses)
        
        // Guardar información detallada de las clases
        setUserClassesInfo({
          totalAvailableClasses: packageData.totalAvailableClasses || 0,
          activePackages: (packageData.activePackages || []).map((pkg: any, idx: number) => ({
            ...pkg,
            id: pkg.id ?? pkg.userPackageId ?? idx // asegurar que cada paquete tiene id único
          }))
        })
      } else {
        setUserHasClasses(false)
        setUserClassesInfo(null)
      }
    } catch (error) {
      console.error("Error checking user classes:", error)
      setUserHasClasses(false)
      setUserClassesInfo(null)
    } finally {
      setIsCheckingUserClasses(false)
    }
  }

  // Función mejorada para crear reservación con verificación de paquetes
  const createReservationWithPackageCheck = async (reservationData: any) => {
    try {
      const packageCheck = await checkUserPackages(Number(reservationData.userId))
      if (!packageCheck) {
        alert("Error al verificar los paquetes del usuario")
        return
      }
      if (!packageCheck.hasAvailableClasses) {
        localStorage.setItem('pendingReservation', JSON.stringify({
          ...reservationData,
          userInfo: packageCheck.user,
          redirectFrom: 'reservations'
        }))
        router.push(`/admin/payments?userId=${reservationData.userId}&context=reservation`)
        return
      }
      // Si hay más de un paquete y el admin seleccionó uno, incluirlo
      const dataToSend = { ...reservationData };
      if (selectedUserPackageId) {
        dataToSend.userPackageId = selectedUserPackageId;
      }
      await createReservationDirectly(dataToSend)
    } catch (error) {
      console.error("Error in reservation creation process:", error)
      alert(`Error al crear la reservación: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Función para crear reservación directamente
  const createReservationDirectly = async (reservationData: any) => {
    const response = await fetch("/api/admin/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reservationData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al crear la reservación")
    }

    const createdReservation = await response.json()

    if (sendEmail) {
      try {
        const user = users.find(u => u.id.toString() === reservationData.userId.toString());
        const availableTime = availableTimes.find(t => t.time === reservationData.time);

        if (user && availableTime && date) {
          // Ensure reservationData.date is a Date object before formatting
          const reservationDateObject = typeof reservationData.date === 'string' ? new Date(reservationData.date.replace(/-/g, '\/')) : reservationData.date;
          
          const emailDetails = {
            className: availableTime.className,
            date: format(reservationDateObject, "PPP", { locale: es }), // Format date for email
            time: availableTime.time, // Time is already formatted as HH:mm by the API
            instructor: availableTime.instructorName,
            confirmationCode: createdReservation.id.toString(),
            bikeNumber: reservationData.bikeNumber || undefined,
            // isUnlimitedWeek and graceTimeHours can be omitted if not applicable for admin manual bookings
            // or set to default values if necessary by the email template.
          };

          // Call the new API endpoint
          const emailResponse = await fetch('/api/admin/send-booking-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userEmail: user.email,
              userName: user.name,
              details: emailDetails,
            }),
          });

          if (emailResponse.ok) {
            alert("Nueva reservación creada con éxito y correo de confirmación enviado.");
          } else {
            const emailErrorData = await emailResponse.json();
            throw new Error(emailErrorData.error || "Error al enviar correo de confirmación desde API");
          }
        } else {
          // This case should ideally not happen if form validation is robust
          alert("Nueva reservación creada con éxito, pero faltaron datos cruciales (usuario/horario) para el correo.");
        }
      } catch (emailError) {
        console.error("Error during email sending process:", emailError);
        alert(`Nueva reservación creada con éxito, pero falló el proceso de envío del correo: ${emailError instanceof Error ? emailError.message : String(emailError)}`);
      }
    } else {
      alert("Nueva reservación creada con éxito (correo no solicitado).");
    }

    // Limpiar el formulario
    setSelectedUser("")
    setSelectedTime("")
    setSelectedPackage("")
    setSelectedPaymentMethod("pending")
    setSelectedBike(null)
    setIsNewReservationOpen(false)
    
    // Refrescar la lista de reservaciones
    await refreshReservations()
  }

  // Función para refrescar reservaciones
  const refreshReservations = async () => {
    setIsLoading(true)
    try {
      let url = "/api/admin/reservations"
      const params = new URLSearchParams()

      if (date) {
        params.append("date", format(date, "yyyy-MM-dd"))
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setReservations(data)
      }
    } catch (error) {
      console.error("Error al refrescar reservaciones:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Callback cuando se completa un pago y hay que crear la reservación pendiente
  const handleReturnFromPayments = () => {
    // Verificar si hay una reservación pendiente en localStorage
    const pendingReservation = localStorage.getItem('pendingReservation')
    if (pendingReservation) {
      try {
        const reservationData = JSON.parse(pendingReservation)
        if (reservationData.redirectFrom === 'reservations') {
          // Proceder con la creación de la reservación
          createReservationDirectly(reservationData)
          // Limpiar el localStorage
          localStorage.removeItem('pendingReservation')
        }
      } catch (error) {
        console.error('Error processing pending reservation:', error)
      }
    }
  }

  // Verificar al cargar si venimos de pagos
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('fromPayments') === 'true') {
      handleReturnFromPayments()
    }
  }, [])

  // Cargar reservaciones con mejor debugging
  useEffect(() => {
    const fetchReservations = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        let url = "/api/admin/reservations"
        const params = new URLSearchParams()

        if (date) {
          params.append("date", format(date, "yyyy-MM-dd"))
        }

        if (statusFilter !== "all") {
          params.append("status", statusFilter)
        }

        if (params.toString()) {
          url += `?${params.toString()}`
        }

        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        setReservations(data)
        
      } catch (error) {
        setError(error instanceof Error ? error.message : "Error desconocido")
        setReservations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [date, statusFilter])

  // Filtrar reservaciones localmente para búsqueda
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.class.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const handlePayment = (reservationId: number) => {
    setSelectedReservation(reservationId)
    setIsPaymentDialogOpen(true)
  }

  const processPayment = async () => {
    const reservation = reservations.find((r) => r.id === selectedReservation)

    if (!reservation) {
      alert("Error: No se encontró la reservación")
      return
    }

    try {
      const response = await fetch(`/api/admin/reservations/${selectedReservation}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentMethod,
          amount:
            reservation.package === "PASE INDIVIDUAL"
              ? 69
              : reservation.package === "PRIMERA VEZ"
                ? 49
                : reservation.package === "SEMANA ILIMITADA"
                  ? 299
                  : reservation.package === "PAQUETE 10 CLASES"
                    ? 599
                    : 69, // default
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar el pago")
      }

      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === selectedReservation ? { ...r, paymentStatus: "paid", paymentMethod: paymentMethod } : r,
        ),
      )

      alert(
        `Pago registrado con éxito para ${reservation.user} - Método: ${paymentMethod === "cash" ? "Efectivo" : "Pago en línea"}`,
      )
    } catch (error) {
      console.error("Error al procesar el pago:", error)
      alert(`Error al procesar el pago: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsPaymentDialogOpen(false)
      setSelectedReservation(null)
    }
  }

  const handleCancelReservation = (reservationId: number) => {
    // Find the reservation to ensure it exists, though the primary logic is in the modal
    const reservation = reservations.find((r) => r.id === reservationId)
    if (reservation) {
      setReservationToCancel(reservationId)
      // It's good practice to reset the checkbox to its default when opening the modal
      setSendCancelEmail(true) 
      setIsCancelConfirmOpen(true)
    } else {
      alert("Error: No se encontró la reservación para cancelar.")
    }
  }

  // This new function will handle the actual cancellation after modal confirmation
  const processCancellation = async (reservationId: number) => {
    setIsCancellingReservation(true)
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Cancelado por administrador",
          sendEmail: sendCancelEmail, // Pass the state of the checkbox
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cancelar la reservación")
      }

      setReservations((prevReservations) =>
        prevReservations.map((r) => (r.id === reservationId ? { ...r, status: "cancelled" } : r)),
      )

      alert("Reservación cancelada con éxito")
    } catch (error) {
      console.error("Error al cancelar la reservación:", error)
      alert(`Error al cancelar la reservación: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsCancellingReservation(false)
      setIsCancelConfirmOpen(false)
      setReservationToCancel(null)
    }
  }

  const handleEditReservation = (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)

    if (reservation) {
      let formattedDate = reservation.date

      if (reservation.date && !reservation.date.includes("-")) {
        const dateObj = new Date(reservation.date)
        formattedDate = format(dateObj, "yyyy-MM-dd")
      }

      setEditFormData({
        class: reservation.class,
        date: formattedDate,
        time: reservation.time,
        status: reservation.status,
      })

      setSelectedReservation(reservationId)
      setIsEditDialogOpen(true)
    }
  }

  const saveEditedReservation = async () => {
    const reservation = reservations.find((r) => r.id === selectedReservation)

    if (reservation) {
      try {
        const response = await fetch(`/api/admin/reservations/${selectedReservation}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            class: editFormData.class,
            date: editFormData.date,
            time: editFormData.time,
            status: editFormData.status,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Error al actualizar la reservación")
        }

        setReservations((prevReservations) =>
          prevReservations.map((r) =>
            r.id === selectedReservation
              ? {
                  ...r,
                  class: editFormData.class,
                  date: editFormData.date,
                  time: editFormData.time,
                  status: editFormData.status,
                }
              : r,
          ),
        )

        alert("Reservación actualizada con éxito")
      } catch (error) {
        console.error("Error al actualizar la reservación:", error)
        alert(`Error al actualizar la reservación: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setIsEditDialogOpen(false)
        setSelectedReservation(null)
      }
    }
  }

  // Función para validar si se puede hacer check-in
  const canCheckIn = (reservation: Reservation) => {
    if (reservation.status !== 'confirmed') return false
    
    const now = new Date()
    const classDateTime = new Date(`${reservation.date}T${reservation.time}:00`)
    
    // Permitir check-in desde 20 minutos antes hasta 2 horas después del inicio de la clase
    const twentyMinutesBefore = new Date(classDateTime.getTime() - 20 * 60 * 1000)
    const oneHourAfter = new Date(classDateTime.getTime() + 1 * 60 * 60 * 1000)
    
    return now >= twentyMinutesBefore && now <= oneHourAfter
  }
  
  // Función para hacer check-in
  const handleCheckIn = async (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)
    
    if (!reservation) {
      alert("Error: No se encontró la reservación")
      return
    }
    
    if (!canCheckIn(reservation)) {
      alert("No se puede hacer check-in fuera del horario permitido (20 minutos antes hasta 2 horas después del inicio de la clase)")
      return
    }
    
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al hacer check-in")
      }
      
      const data = await response.json()
      
      // Actualizar la reservación local
      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === reservationId 
            ? { 
                ...r, 
                checkedIn: true, 
                checkedInAt: data.checkedInAt || new Date().toISOString()
              } 
            : r
        )
      )
      
      alert(`Check-in exitoso para ${reservation.user}`)
    } catch (error) {
      console.error("Error al hacer check-in:", error)
      alert(`Error al hacer check-in: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // Función para deshacer check-in
  const handleUndoCheckIn = async (reservationId: number) => {
    const reservation = reservations.find((r) => r.id === reservationId)
    
    if (!reservation) {
      alert("Error: No se encontró la reservación")
      return
    }
    
    if (!confirm(`¿Estás seguro de que deseas deshacer el check-in de ${reservation.user}?`)) {
      return
    }
    
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}/checkin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al deshacer check-in")
      }
      
      // Actualizar la reservación local
      setReservations((prevReservations) =>
        prevReservations.map((r) =>
          r.id === reservationId 
            ? { 
                ...r, 
                checkedIn: false, 
                checkedInAt: null 
              } 
            : r
        )
      )
      
      alert(`Check-in deshecho para ${reservation.user}`)
    } catch (error) {
      console.error("Error al deshacer check-in:", error)
      alert(`Error al deshacer check-in: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Función para exportar a CSV
  const exportToCSV = () => {
    const dataToExport = filteredReservations.length > 0 ? filteredReservations : reservations
    
    if (dataToExport.length === 0) {
      alert("No hay datos para exportar")
      return
    }

    // Crear encabezados del CSV
    const headers = [
      "ID",
      "Cliente", 
      "Email",
      "Teléfono",
      "Clase",
      "Fecha", 
      "Hora",
      "Estado",
      "Paquete",
      "Clases Restantes",
      "Estado de Pago",
      "Método de Pago"
    ]

    // Convertir datos a formato CSV
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(reservation => [
        reservation.id,
        `"${reservation.user}"`,
        `"${reservation.email}"`,
        `"${reservation.phone || ''}"`,
        `"${reservation.class}"`,
        reservation.date,
        reservation.time,
        reservation.status === "confirmed" ? "Confirmada" : 
        reservation.status === "pending" ? "Pendiente" : "Cancelada",
        `"${reservation.package}"`,
        reservation.remainingClasses,
        reservation.paymentStatus === "paid" ? "Pagado" : 
        reservation.paymentStatus === "pending" ? "Pendiente" : "Reembolsado",
        reservation.paymentMethod === "online" ? "Stripe" : "Efectivo"
      ].join(","))
    ].join("\n")

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      
      const today = format(new Date(), "yyyy-MM-dd")
      const dateFilter = date ? format(date, "yyyy-MM-dd") : "todas-fechas"
      link.setAttribute("download", `reservaciones-${dateFilter}-${today}.csv`)
      
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Cargar usuarios para el selector
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/reservations/clients")
        if (response.ok) {
          const data = await response.json()
          setUsers(data)
        }
      } catch (error) {
        console.error("Error al cargar usuarios:", error)
      }
    }

    if (isNewReservationOpen) {
      fetchUsers()
    }
  }, [isNewReservationOpen])

  // Filtrar usuarios basado en el término de búsqueda
  const filteredUsers = users.filter((user) => {
    if (!userSearchTerm) return true
    
    const searchLower = userSearchTerm.toLowerCase()
    return (
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    )
  })

  // Cargar horarios disponibles cuando cambia la fecha
  useEffect(() => {
    const loadAvailableTimes = async () => {
      if (!date) {
        setAvailableTimes([])
        return
      }

      setIsLoadingTimes(true)
      try {
        const formattedDate = formatAdminDate(date)
        const response = await fetch(
          `/api/admin/reservations/available-times?date=${formattedDate}`
        )
        
        if (response.ok) {
          const data = await response.json()
          setAvailableTimes(data)
        } else {
          console.error("Error al cargar horarios disponibles")
          setAvailableTimes([])
        }
      } catch (error) {
        console.error("Error al cargar horarios disponibles:", error)
        setAvailableTimes([])
      } finally {
        setIsLoadingTimes(false)
      }
    }

    if (isNewReservationOpen) {
      loadAvailableTimes()
    }
  }, [date, isNewReservationOpen])

  // Cargar bicicletas disponibles cuando cambia la hora seleccionada
  useEffect(() => {
    const loadAvailableBikes = async () => {
      if (!selectedTime || !date) {
        setAvailableBikes([])
        setSelectedBike(null)
        return
      }

      // Encontrar la clase programada específica
      const selectedAvailableTime = availableTimes.find(time => time.time === selectedTime)
      if (!selectedAvailableTime) {
        setAvailableBikes([])
        setSelectedBike(null)
        return
      }

      setIsLoadingBikes(true)
      try {
        const response = await fetch(
          `/api/reservations/available-bikes?scheduledClassId=${selectedAvailableTime.scheduledClassId}`
        )
        
        if (response.ok) {
          const data = await response.json()
          // Generar opciones de bicicleta (1-10)
          const bikeOptions: BikeOption[] = Array.from({length: 10}, (_, i) => {
            const bikeId = i + 1
            const bikeInfo = data.bikes?.find((b: any) => b.id === bikeId)
            return {
              id: bikeId,
              available: bikeInfo ? bikeInfo.available : true
            }
          })
          setAvailableBikes(bikeOptions)
        } else {
          console.error("Error al cargar bicicletas disponibles")
          setAvailableBikes([])
        }
      } catch (error) {
        console.error("Error al cargar bicicletas disponibles:", error)
        setAvailableBikes([])
      } finally {
        setIsLoadingBikes(false)
      }
    }

    if (isNewReservationOpen && selectedTime) {
      loadAvailableBikes()
    }
  }, [selectedTime, availableTimes, date, isNewReservationOpen])

  // Verificar clases disponibles cuando cambia el usuario seleccionado
  useEffect(() => {
    if (selectedUser && isNewReservationOpen) {
      checkSelectedUserClasses(selectedUser)
    } else {
      setUserHasClasses(null)
      setUserClassesInfo(null)
      setSelectedPackage("") // Reset package when user is cleared
      setSelectedUserPackageId("") // Reset package ID when user is cleared
    }
  }, [selectedUser, isNewReservationOpen])

  // Map package names to the backend's expected packageType strings
  const packageNameToType = (packageName: string): string => {
    switch (packageName?.toUpperCase()) {
      case "PASE INDIVIDUAL":
        return "individual";
      case "PRIMERA VEZ":
        return "primera-vez";
      case "SEMANA ILIMITADA":
        return "semana-ilimitada";
      case "PAQUETE 10 CLASES":
        return "10classes";
      default:
        return ""; // Or handle as an error/unknown package
    }
  };

  // Efecto para actualizar selectedPackage cuando cambia la información de clases del usuario o el paquete seleccionado
  useEffect(() => {
    if (userHasClasses && userClassesInfo && userClassesInfo.activePackages.length > 0) {
      if (userClassesInfo.activePackages.length === 1) {
        // Si solo hay un paquete activo, usar ese
        const singlePackage = userClassesInfo.activePackages[0];
        setSelectedPackage(packageNameToType(singlePackage.name));
        setSelectedUserPackageId(singlePackage.id.toString()); // Auto-select this package
      } else {
        // Si hay múltiples paquetes y uno está seleccionado en el dropdown
        if (selectedUserPackageId) {
          const chosenPackage = userClassesInfo.activePackages.find(
            (pkg) => pkg.id.toString() === selectedUserPackageId
          );
          if (chosenPackage) {
            setSelectedPackage(packageNameToType(chosenPackage.name));
          } else {
            setSelectedPackage(""); // Reset if selected package ID is somehow invalid
          }
        } else {
          setSelectedPackage(""); // No package selected from multiple options yet
        }
      }
    } else if (userHasClasses === false) {
      // Si el usuario no tiene clases, podría ser un 'pase individual' si proceden a pago.
      // Sin embargo, el flujo actual redirige a pagos, y el botón cambia.
      // Para la lógica del botón de "Crear Reservación", si no hay clases, no debería llegarse a necesitar selectedPackage.
      // Pero si se quisiera permitir crear una reserva "pendiente de pago" directamente, aquí se podría setear "individual".
      // Por ahora, lo dejamos así ya que el botón "Crear Reservación" se deshabilita si userHasClasses === false.
      setSelectedPackage(""); // No specific package context if no classes and not creating individual
    } else {
      // No user selected or still loading
      setSelectedPackage("");
    }
  }, [userHasClasses, userClassesInfo, selectedUserPackageId]);


  // Adicional: Reset selectedPackage si se deselecciona un paquete del dropdown (cuando hay multiples)
  useEffect(() => {
    if (userHasClasses && userClassesInfo && userClassesInfo.activePackages.length > 1 && !selectedUserPackageId) {
      setSelectedPackage("");
    }
  }, [selectedUserPackageId, userHasClasses, userClassesInfo]);


  // Estado para la información de la semana ilimitada activa del usuario
  const [activeUnlimitedWeekInfo, setActiveUnlimitedWeekInfo] = useState<{ start: Date; end: Date; label: string } | null>(null);

  // Efecto para extraer información de la semana ilimitada si está activa y seleccionada
  useEffect(() => {
    if (selectedPackage === "semana-ilimitada" && userClassesInfo?.activePackages) {
      const unlimitedPkg = userClassesInfo.activePackages.find(pkg => packageNameToType(pkg.name) === "semana-ilimitada" && pkg.id.toString() === selectedUserPackageId);
      if (unlimitedPkg) {
        // Asumimos que expiryDate es el viernes. Necesitamos calcular el inicio (Lunes).
        // La API de check-packages debería idealmente devolver el inicio y fin normalizado de la semana.
        // Por ahora, si tenemos expiryDate (viernes), podemos inferir el lunes.
        // Esto es una simplificación. La información exacta del periodo de la semana ilimitada debería venir del backend.
        try {
          const expiry = new Date(unlimitedPkg.expiryDate);
          // Adjust to ensure it's the end of the day for comparison purposes if needed.
          // For now, assuming expiryDate is the Friday.
          const dayOfWeek = expiry.getUTCDay(); // Sunday = 0, Monday = 1, ..., Friday = 5, Saturday = 6
          
          let startDate = new Date(expiry);
          if (dayOfWeek === 5) { // If expiry is Friday
            startDate.setUTCDate(expiry.getUTCDate() - 4); // Go back 4 days to get Monday
          } else {
            // If expiryDate is not a Friday, this logic might be flawed.
            // This indicates a need for clearer start/end dates from the API for unlimited packages.
            // For now, we'll try to make a best guess or show a broader message.
            // This part needs robust handling of how the package's active week is defined from userClassesInfo.
            // Let's assume for now userClassesInfo provides a correctly bounded expiryDate (e.g. Friday).
            // Fallback: if not Friday, perhaps we cannot accurately determine the week for UI.
             setActiveUnlimitedWeekInfo(null); // Or show a generic message
             console.warn("Unlimited week expiry date is not a Friday, cannot accurately determine week range for UI display.");
             return;
          }
          
          // Ensure startDate is set to the beginning of the day in UTC
          startDate.setUTCHours(0, 0, 0, 0);
          
          const endDate = new Date(expiry);
          endDate.setUTCHours(23,59,59,999); // End of Friday

          setActiveUnlimitedWeekInfo({
            start: startDate,
            end: endDate,
            label: `Semana activa: ${format(startDate, "dd MMM yyyy", { locale: es })} - ${format(endDate, "dd MMM yyyy", { locale: es })}`
          });
        } catch (e) {
          console.error("Error parsing unlimited week dates", e);
          setActiveUnlimitedWeekInfo(null);
        }
      } else {
        setActiveUnlimitedWeekInfo(null);
      }
    } else {
      setActiveUnlimitedWeekInfo(null);
    }
  }, [selectedPackage, selectedUserPackageId, userClassesInfo]);


  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Reservaciones</h1>
          <p className="text-gray-600">Administra todas las reservaciones de clases</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={isNewReservationOpen} onOpenChange={setIsNewReservationOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                <PlusCircle className="h-4 w-4 mr-2" /> Nueva Reserva
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#4A102A]">Crear Nueva Reservación</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Complete los detalles para crear una nueva reservación
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="user">Cliente</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900 max-h-[500px]">
                        {/* Input de búsqueda */}
                        <div className="p-2 border-b border-gray-200">
                          <Input
                            placeholder="Buscar cliente..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        
                        {/* Lista de usuarios filtrados */}
                        {users.length > 0 ? (
                          filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.name} - {user.email}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-results" disabled>
                              No se encontraron clientes con "{userSearchTerm}"
                            </SelectItem>
                          )
                        ) : (
                          <SelectItem value="loading" disabled>
                            Cargando clientes...
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      type="date"
                      id="date"
                      className="bg-white border-gray-200 text-zinc-900"
                      value={date ? format(date, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Crear fecha local sin conversión de zona horaria
                          const [year, month, day] = e.target.value.split("-").map(Number)
                          const localDate = new Date(year, month - 1, day)
                          setDate(localDate)
                          // Limpiar horario seleccionado cuando cambia la fecha
                          setSelectedTime("")
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        {isLoadingTimes ? (
                          <SelectItem value="loading" disabled>
                            Cargando horarios...
                          </SelectItem>
                        ) : availableTimes.length > 0 ? (
                          availableTimes.map((availableTime) => (
                            <SelectItem key={availableTime.time} value={availableTime.time}>
                              {availableTime.time} - {availableTime.className} ({availableTime.instructorName}) - {availableTime.availableSpots} cupos
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-classes" disabled>
                            No hay clases programadas para esta fecha
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  

                  {/* Validación de clases disponibles */}
                  {selectedUser && (
                    <div className="space-y-2">
                      <Label>Estado del Usuario</Label>
                      {isCheckingUserClasses ? (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4A102A]"></div>
                          <span className="text-sm text-gray-600">Verificando clases disponibles...</span>
                        </div>
                      ) : userHasClasses === true ? (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <div className="flex-1">
                            <span className="text-sm text-green-700 font-medium">
                              ✓ El usuario tiene {userClassesInfo?.totalAvailableClasses || 0} clases disponibles
                            </span>
                            {userClassesInfo && userClassesInfo.activePackages.length > 0 && (
                              <div className="text-xs text-green-600 mt-1">
                                Paquetes activos: {userClassesInfo.activePackages.map(pkg => 
                                  `${pkg.name} (${pkg.classesRemaining} clases)`
                                ).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : userHasClasses === false ? (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <div className="flex items-start gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-amber-800">
                                El usuario no tiene clases registradas
                              </p>
                              <p className="text-xs text-amber-700 mt-1">
                                Solo podrás hacer esta reservación si el usuario tiene clases registradas a su nombre.
                                Debes ir a la sección de Pagos para registrar un pago y asignar clases primero.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Selector de paquete activo si hay más de uno */}
                  {userHasClasses && userClassesInfo && userClassesInfo.activePackages.length > 1 && (
                    <div className="space-y-2">
                      <Label>Seleccionar paquete a usar</Label>
                      <Select value={selectedUserPackageId} onValueChange={setSelectedUserPackageId}>
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar paquete activo" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          {userClassesInfo.activePackages.map(pkg => (
                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                              {pkg.name} - {pkg.classesRemaining} clases (expira {pkg.expiryDate})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Información de Semana Ilimitada y validación de fecha */}
                  {selectedPackage === "semana-ilimitada" && activeUnlimitedWeekInfo && (
                    <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                      <p className="font-medium text-blue-700">Paquete Semana Ilimitada Activo</p>
                      <p className="text-xs text-blue-600">{activeUnlimitedWeekInfo.label}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Las reservaciones solo se pueden hacer de Lunes a Viernes dentro de esta semana.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bike">Bicicleta (Opcional)</Label>
                    <Select 
                      value={selectedBike?.toString() || "none"} 
                      onValueChange={(value) => setSelectedBike(value === "none" ? null : Number(value))}
                    >
                      <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                        <SelectValue placeholder="Seleccionar bicicleta" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-zinc-900">
                        <SelectItem value="none">Sin bicicleta específica</SelectItem>
                        {isLoadingBikes ? (
                          <SelectItem value="loading" disabled>
                            Cargando bicicletas...
                          </SelectItem>
                        ) : availableBikes.length > 0 ? (
                          availableBikes.map((bike) => (
                            <SelectItem 
                              key={bike.id} 
                              value={bike.id.toString()}
                              disabled={!bike.available}
                            >
                              Bicicleta {bike.id} {!bike.available ? "(Ocupada)" : ""}
                            </SelectItem>
                          ))
                        ) : selectedTime ? (
                          <SelectItem value="no-bikes" disabled>
                            No se pueden cargar las bicicletas
                          </SelectItem>
                        ) : (
                          <SelectItem value="select-time" disabled>
                            Selecciona primero una hora
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedTime && (
                      <p className="text-xs text-gray-500">
                        Las bicicletas se cargan después de seleccionar la hora de clase
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-center space-x-2 mt-4">
                    <Checkbox
                      id="send-email-checkbox"
                      checked={sendEmail}
                      onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                      className="border-gray-300"
                    />
                    <Label
                      htmlFor="send-email-checkbox"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Enviar correo de confirmación al cliente
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsNewReservationOpen(false)
                    // Limpiar estado de validación de usuario
                    setUserHasClasses(null)
                    setUserClassesInfo(null)
                    setSelectedUser("")
                    setSelectedTime("")
                    setSelectedPackage("")
                    setSelectedBike(null)
                                          setSelectedUserPackageId("")
                      setActiveUnlimitedWeekInfo(null)
                      setUserSearchTerm("") // Limpiar búsqueda de usuario
                    }}
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                >
                  Cancelar
                </Button>
                
                {/* Botón dinámico según el estado del usuario */}
                {selectedUser && userHasClasses === false ? (
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      // Redirigir a pagos con el usuario seleccionado
                      const userData = users.find(u => u.id.toString() === selectedUser)
                      if (userData) {
                        window.location.href = `/admin/payments?userId=${selectedUser}&context=reservation`
                      }
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ir a Pagos
                  </Button>
                ) : (
                  <Button
                    className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                    disabled={
                      !selectedUser || 
                      !date || 
                      !selectedTime || 
                      !selectedPackage ||
                      userHasClasses === false ||
                      (userHasClasses && userClassesInfo && userClassesInfo.activePackages.length > 1 && !selectedUserPackageId) ||
                      isCheckingUserClasses || isCreatingReservation // Disable while creating
                    }
                    onClick={async () => {
                      setIsCreatingReservation(true); // Set loading true
                      try {
                        if (!selectedUser || !date || !selectedTime || !selectedPackage) {
                          const camposFaltantes = []
                          if (!selectedUser) camposFaltantes.push("Cliente")
                          if (!date) camposFaltantes.push("Fecha")
                          if (!selectedTime) camposFaltantes.push("Hora")
                          if (!selectedPackage) camposFaltantes.push("Paquete")

                          alert(
                            `Por favor complete todos los campos requeridos. Campos faltantes: ${camposFaltantes.join(", ")}`,
                          )
                          return
                        }

                        // Validations for Unlimited Week package
                        if (selectedPackage === "semana-ilimitada" && activeUnlimitedWeekInfo && date) {
                          const localDate = new Date(date); // date state is already a local Date object
                          const selectedDateUtc = new Date(Date.UTC(localDate.getFullYear(), localDate.getMonth(), localDate.getDate()));
                          const dayOfWeek = selectedDateUtc.getUTCDay(); 

                          if (dayOfWeek === 0 || dayOfWeek === 6) {
                            alert("Las reservaciones con Semana Ilimitada solo son válidas de Lunes a Viernes.");
                            return;
                          }
                          if (selectedDateUtc < activeUnlimitedWeekInfo.start || selectedDateUtc > activeUnlimitedWeekInfo.end) {
                            alert(`La fecha seleccionada (${format(selectedDateUtc, "dd/MM/yyyy")}) está fuera de la semana ilimitada activa (${activeUnlimitedWeekInfo.label}).`);
                            return;
                          }
                        } else if (selectedPackage === "semana-ilimitada" && !activeUnlimitedWeekInfo && date) {
                            alert("No se pudo verificar la información de la semana ilimitada. Intente seleccionar el usuario y paquete de nuevo.");
                            return;
                        }

                        const selectedAvailableTime = availableTimes.find(time => time.time === selectedTime)
                        
                        if (!selectedAvailableTime) {
                          alert("Por favor seleccione un horario válido")
                          return
                        }

                        const newReservationData = {
                          userId: Number.parseInt(selectedUser),
                          classId: selectedAvailableTime.typeId, 
                          date: date ? formatAdminDate(date) : formatAdminDate(new Date()),
                          time: selectedTime,
                          package: selectedPackage,
                          paymentMethod: "paid", 
                          bikeNumber: selectedBike, 
                          userPackageId: (userHasClasses && selectedUserPackageId && selectedUserPackageId !== "") ? Number(selectedUserPackageId) : undefined,
                        }

                        await createReservationWithPackageCheck(newReservationData)
                        
                        setSelectedUser("")
                        setSelectedTime("")
                        setSelectedPackage("")
                        setSelectedBike(null)
                        setSelectedUserPackageId("")
                        setUserHasClasses(null)
                        setUserClassesInfo(null)
                        setIsNewReservationOpen(false)
                        setActiveUnlimitedWeekInfo(null)
                        setUserSearchTerm("") // Limpiar búsqueda de usuario
                      } catch (error) {
                        console.error("Error al crear la reservación:", error)
                        alert(`Error al crear la reservación: ${error instanceof Error ? error.message : String(error)}`)
                      } finally {
                        setIsCreatingReservation(false); // Set loading false
                      }
                    }}
                  >
                    {isCreatingReservation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creando...
                      </>
                    ) : isCheckingUserClasses ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Verificando...
                      </>
                    ) : userHasClasses === false ? (
                      "Usuario sin clases" // This case is for the other button "Ir a Pagos"
                    ) : (
                      "Crear Reservación"
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="space-y-2">
          <Label>Buscar</Label>
          <Input
            placeholder="Nombre, email o clase..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmadas</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>



      </div>
      <div className="flex items-center gap-4 text-sm py-2">
                <span className="text-gray-500">
                  Mostrando {filteredReservations.length} de {reservations.length}
                </span>
                {date && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                    {format(date, "dd MMM yyyy", { locale: es })}
                  </span>
                )}
              </div>

      {/* Error Display */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Error al cargar reservaciones</p>
                <p className="text-sm mt-1">{error}</p>
                <p className="text-xs mt-2 text-red-600">
                  Revisa la consola del navegador (F12) para más detalles técnicos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">Cargando reservaciones...</div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredReservations.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-gray-500">
              {reservations.length === 0 
                ? "No hay reservaciones en el sistema" 
                : "No se encontraron reservaciones con los filtros aplicados"
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reservations Table */}
      {!isLoading && !error && filteredReservations.length > 0 && (
        
        <Card>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[180px]">Cliente</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[120px]">Clase</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[115px]">Fecha & Hora</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[110px]">Paquete</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[70px]">Bici</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[130px]">Check-in</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[90px]">Estado</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[80px]">Pago</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[50px]">Ops</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="py-2.5 px-3">
                        <div className="max-w-[170px]">
                          <div className="font-medium text-gray-900 truncate text-sm">{reservation.user}</div>
                          <div className="text-xs text-gray-500 truncate">{reservation.email}</div>
                          {reservation.phone && (
                            <div className="text-xs text-gray-400">{reservation.phone}</div>
                          )}
                          {/* Penalización Semana Ilimitada */}
                          {(reservation.package === 'SEMANA ILIMITADA') &&
                           (reservation.status === 'cancelled_late_unlimited' || reservation.status === 'no_show') && (
                            <div className="mt-1 p-2 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 text-xs rounded">
                              <AlertTriangle className="inline h-4 w-4 mr-1 text-yellow-700" />
                              {reservation.status === 'cancelled_late_unlimited' && (
                                "Advertencia (Cancelación Tardía): Usuario canceló con <12h. Considere aplicar penalización."
                              )}
                              {reservation.status === 'no_show' && (
                                "Advertencia (No Asistencia): Usuario no se presentó. Considere aplicar penalización."
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-gray-900 truncate max-w-[110px] text-sm">{reservation.class}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="max-w-[120px]">
                          <div className="text-sm font-medium text-gray-900">{reservation.date}</div>
                          <div className="text-xs text-gray-500">{reservation.time}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="max-w-[100px]">
                          <div className="text-sm text-gray-900 truncate font-medium">{reservation.package}</div>
                          {/* {typeof reservation.remainingClasses === 'number' && (
                            <div className="text-xs text-gray-500">
                              {reservation.remainingClasses} restantes
                            </div>
                          )} */}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-sm">
                          {reservation.bikeNumber ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              #{reservation.bikeNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center">
                          {reservation.checkedIn ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-green-700">Presente</div>
                                  <div className="text-xs text-gray-500">
                                    {reservation.checkedInAt ? new Date(reservation.checkedInAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-3 px-2 text-xs text-gray-600 hover:bg-gray-100 w-fit"
                                onClick={() => handleUndoCheckIn(reservation.id)}
                              >
                                Deshacer
                              </Button>
                            </div>
                          ) : canCheckIn(reservation) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                              onClick={() => handleCheckIn(reservation.id)}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Check-in
                            </Button>
                          ) : reservation.status === 'confirmed' ? (
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs">Fuera de horario</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400">
                              <XCircle className="h-3 w-3" />
                              <span className="text-xs">No disponible</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                              reservation.status === "confirmed" && "bg-green-100 text-green-800",
                              reservation.status === "pending" && "bg-yellow-100 text-yellow-800",
                              reservation.status === "cancelled" && "bg-red-100 text-red-800",
                            )}
                          >
                            {reservation.status === "confirmed" && "Confirmada"}
                            {reservation.status === "pending" && "Pendiente"}
                            {reservation.status === "cancelled" && "Cancelada"}
                          </span>
                          {reservation.status === "cancelled" && reservation.cancelledAt && (
                            <div className="text-xs text-gray-500 mt-1">
                              {format(new Date(reservation.cancelledAt), "dd/MM/yyyy - HH:mm", { locale: es })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit",
                              reservation.paymentStatus === "paid" && "bg-green-100 text-green-800",
                              reservation.paymentStatus === "pending" && "bg-orange-100 text-orange-800",
                            )}
                          >
                            {reservation.paymentStatus === "paid" && "Pagado"}
                            {reservation.paymentStatus === "pending" && "Pendiente"}
                          </span>
                          {reservation.paymentStatus === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-3 px-2 text-xs border-gray-300 text-gray-600 hover:bg-gray-100 w-fit"
                              onClick={() => handlePayment(reservation.id)}
                              title="Registrar pago"
                            >
                           
                             Añadir pago
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:bg-gray-100"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => handleEditReservation(reservation.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              {reservation.status !== "cancelled" && (
                                <DropdownMenuItem
                                  onClick={() => handleCancelReservation(reservation.id)}
                                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash className="h-4 w-4" />
                                  Cancelar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Registrar Pago</DialogTitle>
            <DialogDescription className="text-gray-600">
              Seleccione el método de pago y complete la transacción
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue placeholder="Seleccionar método" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="online">Pago en línea (Stripe)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "cash" && (
              <div className="space-y-2">
                <Label htmlFor="amount">Monto Recibido</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    id="amount"
                    placeholder="0.00"
                    className="pl-8 bg-white border-gray-200 text-zinc-900"
                  />
                </div>
              </div>
            )}

            {paymentMethod === "online" && (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-4">
                  Al procesar el pago en línea, se enviará un enlace de pago al cliente a través de Stripe.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentDialogOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={processPayment}
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
            >
              {paymentMethod === "cash" ? "Registrar Pago en Efectivo" : "Enviar Enlace de Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Reservación</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modifica los detalles de la reservación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-class">Clase</Label>
              <Input
                id="edit-class"
                value={editFormData.class}
                onChange={(e) => setEditFormData({ ...editFormData, class: e.target.value })}
                className="bg-white border-gray-200 text-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormData.date}
                onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                className="bg-white border-gray-200 text-zinc-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-time">Hora</Label>
              <Input
                type="time"
                id="edit-time"
                value={editFormData.time}
                onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                className="bg-white border-gray-200 text-zinc-900"
              />
              <p className="text-xs text-gray-500">
                Nota: Asegúrate de que la hora corresponda a una clase programada
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select
                value={editFormData.status}
                onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
              >
                <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-zinc-900">
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveEditedReservation}
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Confirmation Modal */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Confirmar Cancelación</DialogTitle>
            <DialogDescription className="text-gray-600">
              ¿Estás seguro de que deseas cancelar esta reservación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          {/* Important Notes Section */}
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-amber-800 mb-2">Notas Importantes sobre la Cancelación por parte del Administrador:</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li className="flex items-start">
                  <span className="font-medium mr-1">•</span>
                  <span><strong>Acción Permanente:</strong> La cancelación elimina la clase del paquete del usuario. Esta acción es definitiva.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-1">•</span>
                  <span><strong>Reembolsos Manuales:</strong> Esta cancelación NO emite un reembolso automáticamente. Si corresponde un reembolso, por favor procésalo manualmente.</span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-1">•</span>
                  <span><strong>Omite las Reglas:</strong> Las cancelaciones realizadas por el administrador omiten las reglas de reserva estándar (por ejemplo, ventanas de cancelación).</span>
                </li>
                <li className="flex items-start">
                  <span className="font-medium mr-1">•</span>
                  <span><strong>Sin Penalizaciones Automáticas:</strong> Esta acción no activa el sistema de penalizaciones de "Semana Ilimitada".</span>
                </li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-cancel-email-checkbox"
                checked={sendCancelEmail}
                onCheckedChange={(checked) => setSendCancelEmail(checked as boolean)}
                className="border-gray-300"
              />
              <Label
                htmlFor="send-cancel-email-checkbox"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Enviar correo de cancelación al cliente
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCancelConfirmOpen(false)
                setReservationToCancel(null)
              }}
              disabled={isCancellingReservation}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Volver
            </Button>
            <Button
              onClick={() => reservationToCancel && processCancellation(reservationToCancel)}
              disabled={isCancellingReservation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCancellingReservation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cancelando...
                </>
              ) : (
                "Confirmar Cancelación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}