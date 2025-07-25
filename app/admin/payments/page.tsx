"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  PlusCircle,
  Search,
  Download,
  CreditCard,
  DollarSign,
  Receipt,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  MoreVertical,
  ExternalLink,
  Copy,
  Clock,
  User,
  Mail,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { getAvailableWeekOptions } from '@/lib/utils/unlimited-week'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
// Removed: import { sendPackagePurchaseConfirmationEmail } from "@/lib/email"
import { Checkbox } from "@/components/ui/checkbox"

interface Payment {
  id: number
  user: string
  email: string
  package: string
  amount: number
  date: string
  method: "Pago en efectivo" | "Pago en línea"
  status: "Completado" | "Pendiente" | "Fallido"
  invoice: string
  stripePaymentIntentId?: string
  userPackageId?: number
  userId: number
  // Datos adicionales para el menú de detalles
  createdAt: string
  paymentDate: string
  metadata: any
  transactionId?: string
}

interface User {
  id: number
  name: string
  email: string
}

interface Package {
  id: number
  name: string
  price: number
  classCount: number
}

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  
  // Estados para detección de contexto de reservación
  const [isFromReservation, setIsFromReservation] = useState(false)
  const [showReservationBanner, setShowReservationBanner] = useState(false)
  const [reservationContext, setReservationContext] = useState<{
    userId: string
    userInfo?: any
    pendingReservation?: any
  } | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  // Estados del formulario de nuevo pago
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"efectivo" | "en linea">("efectivo")

  // Estados para búsqueda y registro de usuarios
  const [userSearchEmail, setUserSearchEmail] = useState("")
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [searchedUsers, setSearchedUsers] = useState<User[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [newUserData, setNewUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  })

  // 1. Add state for unlimited week selection
  const [selectedUnlimitedWeek, setSelectedUnlimitedWeek] = useState<{ start: string, end: string } | null>(null)
  const [sendPackageEmail, setSendPackageEmail] = useState(true) // State for sending package email

  // Nuevo estado para el id del UserPackage
  const [selectedUserPackageId, setSelectedUserPackageId] = useState<string | null>(null)

  // Función para manejar apertura del modal de nuevo pago
  const handleNewPaymentClick = () => {
    // Si viene desde reservaciones, ocultar el banner para distinguir entre acceso directo y click manual
    if (isFromReservation) {
      setShowReservationBanner(false)
    }
    setIsNewPaymentOpen(true)
  }

  // Función para validar email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Función para limpiar el formulario
  const resetForm = () => {
    setSelectedUserId("")
    setSelectedPackageId("")
    setSelectedUserPackageId(null)
    setPaymentAmount("")
    setPaymentNotes("")
    setPaymentMethod("efectivo")
    setUserSearchEmail("")
    setSearchedUsers([])
    setNewUserData({
      firstName: "",
      lastName: "",
      email: "",
      phone: ""
    })
  }

  // Función para asignar un nuevo paquete a un usuario
  const handleAssignPackage = async (userId: string, packageId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/packages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: parseInt(packageId),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Paquete asignado",
          description: `Paquete ${data.userPackage.packageName} asignado correctamente`,
        })
        setPaymentAmount(data.userPackage.packagePrice.toString())
        setSelectedUserPackageId(data.userPackage.id.toString())
        setSelectedPackageId(packageId)
        return data.userPackage
      } else {
        throw new Error(data.error || "Error al asignar el paquete")
      }
    } catch (error) {
      console.error("Error assigning package:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al asignar el paquete",
        variant: "destructive",
      })
      return null
    }
  }

  // Función para seleccionar usuario
  const handleSelectUser = async (user: User) => {
    setSelectedUserId(user.id.toString())
    setUserSearchEmail(user.email)
    setSearchedUsers([])
    
    // Limpiar selección de paquete y monto
    setSelectedPackageId("")
    setPaymentAmount("")
  }

  // Función para crear un nuevo usuario
  const handleCreateUser = async () => {
    if (!newUserData.firstName || !newUserData.lastName || !newUserData.email) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    if (!isValidEmail(newUserData.email)) {
      toast({
        title: "Error",
        description: "Por favor ingrese un email válido",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: newUserData.firstName.trim(),
          lastName: newUserData.lastName.trim(),
          email: newUserData.email.trim().toLowerCase(),
          phone: newUserData.phone.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Cliente creado",
          description: `Cliente ${data.user.firstName} ${data.user.lastName} creado exitosamente`,
        })
        
        // Seleccionar automáticamente el nuevo usuario
        const newUser = {
          id: data.user.user_id,
          name: `${data.user.firstName} ${data.user.lastName}`,
          email: data.user.email
        }
        
        setSelectedUserId(newUser.id.toString())
        setUserSearchEmail(newUser.email)
        
        // Agregar a la lista de usuarios
        setUsers(prev => [...prev, newUser])
        
        // Cerrar modal y limpiar formulario
        setIsUserModalOpen(false)
        setNewUserData({
          firstName: "",
          lastName: "",
          email: "",
          phone: ""
        })
        
      } else {
        throw new Error(data.error || "Error al crear el usuario")
      }
    } catch (error) {
      console.error("Error creating user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el usuario",
        variant: "destructive",
      })
    }
  }

  const loadPayments = async () => {
    try {
      const response = await fetch("/api/admin/payments")
      if (response.ok) {
        const data = await response.json()
        // Transformar los datos para que coincidan con la interfaz Payment
        const transformedPayments = data.map((payment: any) => ({
          id: payment.payment_id,
          user: `${payment.user.firstName} ${payment.user.lastName}`,
          email: payment.user.email,
          package: payment.package || "N/A",
          amount: payment.amount,
          date: new Date(payment.created_at).toLocaleDateString('es-MX'),
          method: payment.payment_method === "cash" ? "Pago en efectivo" : "Pago en línea",
          status: payment.payment_status === "completed" ? "Completado" : 
                 payment.payment_status === "pending" ? "Pendiente" : "Fallido",
          invoice: `INV-${payment.payment_id}`,
          stripePaymentIntentId: payment.stripe_payment_intent_id,
          userPackageId: payment.userPackageId,
          userId: payment.user_id,
          // Datos adicionales para detalles
          createdAt: payment.created_at,
          paymentDate: payment.payment_date,
          metadata: payment.metadata || {},
          transactionId: payment.transaction_id
        }))
        setPayments(transformedPayments)
      }
    } catch (error) {
      console.error("Error loading payments:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(
          data.map((user: any) => ({
            id: user.user_id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
          })),
        )
      }
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const loadPackages = async () => {
    try {
      console.log("Cargando paquetes...")
      const response = await fetch("/api/packages")
      console.log("Respuesta de paquetes:", response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Datos de paquetes recibidos:", data)
        setPackages(data)
      } else {
        console.error("Error en respuesta de paquetes:", response.status, response.statusText)
        const errorText = await response.text()
        console.error("Texto de error:", errorText)
      }
    } catch (error) {
      console.error("Error loading packages:", error)
    }
  }

  const handleCreatePayment = async () => {
    if (!selectedUserId || !paymentAmount) {
      toast({
        title: "Error",
        description: "Por favor seleccione un usuario y especifique el monto",
        variant: "destructive",
      })
      return
    }
    // Validar que el monto sea válido
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "El monto debe ser un número válido mayor a 0",
        variant: "destructive",
      })
      return
    }
    // Si es semana ilimitada, debe seleccionar semana
    if (selectedPackage && selectedPackage.name.toLowerCase().includes("ilimitada") && !selectedUnlimitedWeek) {
      toast({
        title: "Error",
        description: "Debes seleccionar la semana para el paquete ilimitado",
        variant: "destructive",
      })
      return
    }
    setIsProcessingPayment(true)
    try {
      // Log current state values before building the request body
      console.log('[ADMIN_PAYMENTS_FRONTEND_LOG] States before building request body:');
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   selectedUserId: ${selectedUserId}`);
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   paymentAmount (raw string): ${paymentAmount}`);
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   paymentNotes: ${paymentNotes}`);
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   selectedPackageId: ${selectedPackageId}`);
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   selectedUserPackageId: ${selectedUserPackageId}`);
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   selectedUnlimitedWeek: ${JSON.stringify(selectedUnlimitedWeek)}`);
      // The `amount` variable is already parsed parseFloat(paymentAmount), log it too for clarity
      const parsedAmount = parseFloat(paymentAmount); // Re-parse for logging consistency if `amount` isn't used above this log
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   amount (parsed for API): ${parsedAmount}`);


      const packageIdToSend = selectedPackageId ? parseInt(selectedPackageId) : null;
      const userPackageIdToSend = selectedUserPackageId ? parseInt(selectedUserPackageId) : null;
      
      // selectedPackage is a derived state variable, let's log its perceived ID too
      // const currentSelectedPackageDetails = packages.find(p => p.id.toString() === selectedPackageId); // This line is already present
      console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   Derived selectedPackage?.id: ${selectedPackage?.id}`);


      const selectedWeekToSend = (selectedPackage?.id.toString() === "3" && selectedUnlimitedWeek) 
                                 ? selectedUnlimitedWeek.start 
                                 : null;

      const apiRequestBody = {
        user_id: parseInt(selectedUserId),
        amount: parsedAmount, // Use the consistently parsed amount
        notes: paymentNotes.trim() || null,
        packageId: packageIdToSend, 
        userPackageId: userPackageIdToSend, 
        selectedWeek: selectedWeekToSend,
      };

      console.log('[ADMIN_PAYMENTS_FRONTEND_LOG] Creating payment with request body:', JSON.stringify(apiRequestBody, null, 2));

      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiRequestBody),
      })
      const data = await response.json()
      if (response.ok) {
        // Email sending logic
        if (sendPackageEmail && selectedPackageId) {
          const userForEmail = users.find(u => u.id.toString() === selectedUserId);
          const packageForEmail = packages.find(p => p.id.toString() === selectedPackageId);

          if (userForEmail && packageForEmail) {
            let emailPurchaseDate: Date;
            let emailExpiryDate: Date;
            let isUnlimited = packageForEmail.name.toLowerCase().includes("ilimitada");

            if (isUnlimited && selectedUnlimitedWeek?.start && selectedUnlimitedWeek?.end) {
              // For unlimited week, use the selected start and end dates.
              // These are "YYYY-MM-DD" strings representing local calendar dates.
              // Parse them into Date objects representing midnight local time for that calendar date.
              const [pYear, pMonth, pDay] = selectedUnlimitedWeek.start.split('-').map(Number);
              emailPurchaseDate = new Date(pYear, pMonth - 1, pDay); // Month is 0-indexed for Date constructor

              const [eYear, eMonth, eDay] = selectedUnlimitedWeek.end.split('-').map(Number);
              emailExpiryDate = new Date(eYear, eMonth - 1, eDay); 
            } else {
              // For other packages, default to current date as purchase date
              emailPurchaseDate = new Date();
              emailExpiryDate = new Date(emailPurchaseDate); // Start with purchase date for expiry calculation

              if (packageForEmail.name.toLowerCase().includes("10 clases")) {
                emailExpiryDate.setMonth(emailExpiryDate.getMonth() + 3); // Example: 3 months validity
              } else if (packageForEmail.name.toLowerCase().includes("primera vez") || packageForEmail.name.toLowerCase().includes("pase individual")) {
                emailExpiryDate.setMonth(emailExpiryDate.getMonth() + 1); // Example: 1 month validity
              }
              // Add more specific expiry logic if needed for other non-unlimited packages
            }

            const emailDetails = {
              packageName: packageForEmail.name,
              classCount: typeof packageForEmail.classCount === 'number' ? packageForEmail.classCount : 0,
              expiryDate: format(emailExpiryDate, "dd/MM/yyyy", { locale: es }),
              purchaseDate: format(emailPurchaseDate, "dd/MM/yyyy", { locale: es }),
              price: parseFloat(packageForEmail.price as any),
              isUnlimitedWeek: isUnlimited,
            };

            // Log the prepared emailDetails to verify types before sending
            console.log('[ADMIN_PAYMENTS_FRONTEND_LOG] Prepared emailDetails:', JSON.stringify(emailDetails, null, 2));
            console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   typeof emailDetails.price: ${typeof emailDetails.price}`);
            console.log(`[ADMIN_PAYMENTS_FRONTEND_LOG]   typeof emailDetails.classCount: ${typeof emailDetails.classCount}`);

            try {
              // Call the new API endpoint for sending package email
              const emailResponse = await fetch('/api/admin/send-package-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userEmail: userForEmail.email,
                  userName: userForEmail.name,
                  packageDetails: emailDetails,
                }),
              });

              if (emailResponse.ok) {
                toast({
                  title: "Pago registrado y correo enviado",
                  description: `Pago de $${amount} y confirmación de paquete para ${userForEmail.name} procesados.`,
                });
              } else {
                const emailErrorData = await emailResponse.json();
                throw new Error(emailErrorData.error || "Error al enviar correo de paquete desde API");
              }
            } catch (emailError) {
              console.error("Error during package email sending process:", emailError);
              toast({
                title: "Pago registrado, error en correo",
                description: `El pago se registró, pero falló el proceso de envío del correo de paquete: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Pago registrado, correo no enviado",
              description: "El pago se registró, pero faltaron datos para enviar el correo de confirmación del paquete (usuario o paquete no encontrados localmente).",
              variant: "default",
            });
          }
        } else {
          toast({
            title: "Pago registrado",
            description: `Pago en efectivo de $${amount} registrado correctamente para ${data.payment.user}. Correo no enviado (opción desactivada o sin paquete).`,
          });
        }
        
        setIsNewPaymentOpen(false)
        resetForm()
        loadPayments()

        if (isFromReservation) {
          toast({
            title: "¡Pago completado!",
            description: "Ahora puedes finalizar la reservación del usuario desde el panel de reservaciones.",
          })
          setTimeout(() => {
            if (confirm("¿Deseas ir al panel de reservaciones para completar la reservación?")) {
              handleCompleteReservationAfterPayment()
            }
          }, 2000)
        }
      } else {
        throw new Error(data.error || "Error al registrar el pago")
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el pago",
        variant: "destructive",
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // Buscar usuarios por email (simplificado)
  const searchUsersByEmail = async (email: string) => {
    if (!email.trim()) {
      setSearchedUsers([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        const data = await response.json()
        const formattedUsers = data.map((user: any) => ({
          id: user.user_id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
        }))
        setSearchedUsers(formattedUsers)
      } else {
        setSearchedUsers([])
      }
    } catch (error) {
      console.error("Error searching users:", error)
      setSearchedUsers([])
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/admin/payments/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `pagos-${new Date().toISOString().split("T")[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting payments:", error)
      toast({
        title: "Error",
        description: "Error al exportar los pagos",
        variant: "destructive",
      })
    }
  }

  // Funciones para manejar el contexto de reservación
  const handleReturnToReservations = () => {
    // Mantener la información de la reservación pendiente
    window.location.href = '/admin/reservations'
  }

  const handleCompleteReservationAfterPayment = async () => {
    if (!reservationContext?.pendingReservation) {
      toast({
        title: "Error",
        description: "No se encontraron datos de la reservación pendiente",
        variant: "destructive"
      })
      return
    }

    try {
      toast({
        title: "Redirigiendo...",
        description: "Te llevamos al panel de reservaciones para completar la reservación",
      })
      
      // Redirigir con parámetro para indicar que viene desde pagos
      setTimeout(() => {
        window.location.href = '/admin/reservations?fromPayments=true'
      }, 1000)
    } catch (error) {
      console.error('Error completing reservation:', error)
      toast({
        title: "Error",
        description: "Error al completar la reservación",
        variant: "destructive"
      })
    }
  }

  // TODOS LOS useEffect DEBEN IR AQUÍ, ANTES DEL RETURN
  
  // Cargar datos al montar el componente
  useEffect(() => {
    loadPayments()
    loadUsers()
    loadPackages()
  }, [])

  // Debug para verificar el estado de packages
  useEffect(() => {
    console.log("Estado actual de packages:", packages)
  }, [packages])

  // Detectar contexto de reservación al cargar
  useEffect(() => {
    const userId = searchParams.get('userId')
    const context = searchParams.get('context')
    
    if (userId && context === 'reservation') {
      setIsFromReservation(true)
      setShowReservationBanner(true) // Mostrar banner solo al cargar la página
      setReservationContext({ userId })
      
      // Pre-seleccionar el usuario
      setSelectedUserId(userId)
      
      // Cargar datos de la reservación pendiente desde localStorage
      try {
        const pendingReservation = localStorage.getItem('pendingReservation')
        if (pendingReservation) {
          const reservationData = JSON.parse(pendingReservation)
          setReservationContext(prev => ({
            ...prev!,
            userId,
            userInfo: reservationData.userInfo,
            pendingReservation: reservationData
          }))
          
          // Pre-cargar el email del usuario para facilitar la búsqueda
          if (reservationData.userInfo?.email) {
            setUserSearchEmail(reservationData.userInfo.email)
          }
        }
      } catch (error) {
        console.error('Error parsing pending reservation:', error)
      }
    }
  }, [searchParams])

  // Actualizar el monto cuando cambie el paquete seleccionado
  useEffect(() => {
    if (selectedPackageId) {
      const pkg = packages.find((p) => p.id && p.id.toString() === selectedPackageId)
      if (pkg && pkg.price) {
        setPaymentAmount(pkg.price.toString())
      }
    }
  }, [selectedPackageId, packages])

  // Efecto para búsqueda de usuarios con debounce
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (userSearchEmail.trim().length >= 2) {
        searchUsersByEmail(userSearchEmail)
      } else {
        setSearchedUsers([])
      }
    }, 300)
    return () => clearTimeout(delayedSearch)
  }, [userSearchEmail])

  // Filtrar pagos
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.package.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || payment.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const selectedUser = users.find((u) => u.id && u.id.toString() === selectedUserId)
  const selectedPackage = packages.find((p) => p.id && p.id.toString() === selectedPackageId)

  // Componente para mostrar detalles del pago
  const PaymentDetailsMenu = ({ payment }: { payment: Payment }) => {
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
      toast({
        title: "Copiado",
        description: "Texto copiado al portapapeles",
      })
    }

    const formatDateTime = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const isStripePayment = payment.method === "Pago en línea"
    const metadata = payment.metadata || {}

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-4">
          <div className="space-y-3">
            <div className="border-b pb-2">
              <h4 className="font-semibold text-sm text-gray-900">Detalles del Pago</h4>
              <p className="text-xs text-gray-500">ID: {payment.id}</p>
            </div>

            {/* Información básica */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Creado:</span>
                <span className="font-medium">{formatDateTime(payment.createdAt)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <User className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{payment.user}</span>
              </div>
            </div>

            {/* Detalles específicos según el método de pago */}
            {isStripePayment ? (
              <div className="space-y-2 p-3 bg-blue-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-blue-800">Pago Stripe</span>
                  <span className="text-xs text-blue-600">ID: {payment.stripePaymentIntentId}</span>
                </div>
                
                {payment.stripePaymentIntentId && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => copyToClipboard(payment.stripePaymentIntentId!)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar ID
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => window.open(`https://dashboard.stripe.com/payments/${payment.stripePaymentIntentId}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Ver en Stripe
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-blue-600 italic">
                  Para detalles completos, consulta el Dashboard de Stripe
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-3 bg-green-50 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-800">Pago en Efectivo</span>
                </div>

                {/* Notas del administrador */}
                {metadata.notes && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-gray-700">Notas:</span>
                    <p className="text-xs text-gray-600 bg-white p-2 rounded border">
                      {metadata.notes}
                    </p>
                  </div>
                )}

                {/* Unlimited week if present in metadata */}
                {metadata.unlimitedWeek && metadata.unlimitedWeek.start && metadata.unlimitedWeek.end && (
                  <div className="text-xs text-blue-700 mt-2 pt-2 border-t border-gray-200">
                    <span className="font-medium text-gray-700 block mb-0.5">Detalles Semana Ilimitada:</span>
                    <span className="text-blue-700">
                      {(() => {
                        try {
                          const startDate = new Date(metadata.unlimitedWeek.start + 'T00:00:00Z'); // Ensure UTC parsing
                          const endDate = new Date(metadata.unlimitedWeek.end + 'T00:00:00Z');   // Ensure UTC parsing
                          
                          const formattedStart = startDate.toLocaleDateString('es-ES', {
                            day: 'numeric', month: 'short', timeZone: 'UTC'
                          });
                          const formattedEnd = endDate.toLocaleDateString('es-ES', {
                            day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
                          });
                          return `Válida del ${formattedStart} al ${formattedEnd} (UTC)`;
                        } catch (e) {
                          console.error("Error formatting metadata unlimitedWeek dates:", e);
                          // Fallback to raw display if formatting fails
                          return `Semana: ${metadata.unlimitedWeek.start} al ${metadata.unlimitedWeek.end}`;
                        }
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Limpia selectedUnlimitedWeek si se selecciona otro paquete
  useEffect(() => {
    if (selectedPackageId && Number(selectedPackageId) !== 3) {
      setSelectedUnlimitedWeek(null)
    }
  }, [selectedPackageId])

  if (loading) {
    return (
      <div className="p-6 bg-white-50 min-h-screen">
        <div className="text-center text-zinc-900">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white-50 min-h-screen">
      {/* Banner de contexto de reservación */}
      {showReservationBanner && reservationContext && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-800">
                    Redirección desde Reservaciones
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReturnToReservations}
                    className="text-blue-700 hover:text-blue-800 hover:bg-blue-100"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Volver a Reservaciones
                  </Button>
                </div>
                <div className="text-blue-700 space-y-1">

                  <p className="text-sm">
                    <strong>Situación:</strong> El usuario no tiene paquetes disponibles para completar su reservación.
                  </p>
                  <p className="text-sm">
                    <strong>Acción requerida:</strong> Registra o procesa un pago para que el usuario pueda completar su reservación.
                  </p>
                  {reservationContext.pendingReservation && (
                    <div className="bg-blue-100 p-3 rounded-md mt-3">
                      <p className="text-sm font-medium text-blue-800 mb-1">Detalles de la reservación pendiente:</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>• Fecha: {reservationContext.pendingReservation.date}</p>
                        <p>• Hora: {reservationContext.pendingReservation.time}</p>
                        <p>• Paquete solicitado: {reservationContext.pendingReservation.package}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowReservationBanner(false)
                      setIsNewPaymentOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    Registrar Pago
                  </Button>
                 
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Pagos</h1>
          <p className="text-gray-600">Administra todos los pagos y transacciones</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <AlertDialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                className="bg-[#4A102A] hover:bg-[#5A1A3A]"
                onClick={handleNewPaymentClick}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Pago
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isFromReservation ? "Registrar Pago para Reservación" : "Registrar Pago en Efectivo"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {isFromReservation 
                    ? "Complete el pago para que el usuario pueda finalizar su reservación pendiente."
                    : "Complete la información para registrar un pago en efectivo realizado por un cliente."
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              {/* Información del contexto de reservación */}
              {isFromReservation && reservationContext && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-amber-800 mb-2">Contexto de Reservación</h4>
                      <div className="space-y-1 text-sm text-amber-700">

                        {reservationContext.userInfo?.email && (
                          <p><strong>Email:</strong> {reservationContext.userInfo.email}</p>
                        )}
                        {reservationContext.pendingReservation && (
                          <>
                            <p><strong>Reservación pendiente:</strong></p>
                            <div className="ml-4 space-y-1">
                              <p>• Fecha: {reservationContext.pendingReservation.date}</p>
                              <p>• Hora: {reservationContext.pendingReservation.time}</p>
                              <p>• Paquete solicitado: {reservationContext.pendingReservation.package}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-6 py-4">
                {/* Búsqueda de usuario */}
                <div className="space-y-2">
                  <Label htmlFor="user-search">Buscar Cliente por Email</Label>
                  <div className="relative">
                    <Input
                      id="user-search"
                      type="email"
                      placeholder="ejemplo@email.com"
                      value={userSearchEmail}
                      onChange={(e) => setUserSearchEmail(e.target.value)}
                      className="pr-10"
                    />
                    {isSearchingUsers && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4A102A]"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Resultados de búsqueda */}
                  {searchedUsers.length > 0 && (
                    <div className="border rounded-md max-h-32 overflow-y-auto">
                      {searchedUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Usuario seleccionado */}
                  {selectedUserId && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="text-sm font-medium text-green-800">Cliente seleccionado:</div>
                      <div className="text-sm text-green-700">
                        {searchedUsers.find(u => u.id.toString() === selectedUserId)?.name || 
                         users.find(u => u.id.toString() === selectedUserId)?.name}
                      </div>
                      <div className="text-xs text-green-600">
                        {searchedUsers.find(u => u.id.toString() === selectedUserId)?.email || 
                         users.find(u => u.id.toString() === selectedUserId)?.email}
                      </div>
                    </div>
                  )}

                  {/* En la UI, reemplaza el botón de crear usuario por uno que redirige a /admin/users */}
                  {userSearchEmail && searchedUsers.length === 0 && !isSearchingUsers && userSearchEmail.trim().length >= 3 && !selectedUserId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="text-sm text-blue-800 mb-2">
                        No se encontró ningún cliente con ese email.<br />
                        Puedes crear uno en la página de usuarios y regresar para completar el pago.
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = '/admin/users'}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Ir a crear cliente
                      </Button>
                    </div>
                  )}
                </div>

                {/* Selección de paquete */}
                {selectedUserId && (
                  <div className="space-y-2">
                    <Label htmlFor="package-select">Paquete</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={(value) => handleAssignPackage(selectedUserId, value)}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Asignar paquete..." />
                        </SelectTrigger>
                        <SelectContent>
                          {packages.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                              {pkg.name} - ${pkg.price} ({pkg.classCount} clases)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Mostrar paquete seleccionado */}
                    {selectedPackageId && selectedPackageId !== "none" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="text-sm font-medium text-blue-800">Paquete seleccionado:</div>
                        <div className="text-sm text-blue-700">
                          {packages.find(p => p.id.toString() === selectedPackageId)?.name} - 
                          ${packages.find(p => p.id.toString() === selectedPackageId)?.price}
                        </div>
                      </div>
                    )}
                    {/* Semana ilimitada: picker obligatorio */}
                    {selectedPackage && selectedPackage.name.toLowerCase().includes("ilimitada") && (
                      <div className="space-y-2">
                        <Label htmlFor="unlimited-week-select">Semana Ilimitada *</Label>
                        <Select value={selectedUnlimitedWeek?.start || ''} onValueChange={value => {
                          const option = getAvailableWeekOptions().find(opt => opt.value === value)
                          console.log('Selected week value:', value, 'Label:', option?.label, 'Start:', option?.startDate)

                          if (option) {
                            setSelectedUnlimitedWeek({ start: option.startDate.toISOString().slice(0, 10), end: option.endDate.toISOString().slice(0, 10) })
                          }
                        }}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecciona la semana..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableWeekOptions().map((week, idx) => (
                              <SelectItem key={idx} value={week.value}>
                                {week.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!selectedUnlimitedWeek && (
                          <div className="text-xs text-red-600 mt-1">Debes seleccionar una semana para continuar.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Monto del pago */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Monto del Pago *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Notas adicionales */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Información adicional sobre el pago..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Información del pago */}
                <div className="bg-gray-50 rounded-md p-3 text-sm">
                  <div className="font-medium mb-1">Resumen del pago:</div>
                  <div>• Método: Efectivo</div>
                  <div>• Estado: Se marcará como completado</div>
                  {selectedPackageId && (
                    <div>• Se activará el paquete seleccionado</div>
                  )}
                </div>

                {/* Opción para enviar correo */}
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="send-package-email-checkbox"
                    checked={sendPackageEmail}
                    onCheckedChange={(checked) => setSendPackageEmail(checked as boolean)}
                    className="border-gray-300"
                  />
                  <Label
                    htmlFor="send-package-email-checkbox"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enviar correo de confirmación de paquete al cliente
                  </Label>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={resetForm}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCreatePayment}
                  disabled={isProcessingPayment || !selectedUserId || !paymentAmount || (selectedPackage && selectedPackage.name.toLowerCase().includes("ilimitada") && !selectedUnlimitedWeek)}
                  className="bg-[#4A102A] hover:bg-[#5A1A3A]"
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    "Registrar Pago"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Modal para crear nuevo usuario */}
          <AlertDialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Crear Nuevo Cliente</AlertDialogTitle>
                <AlertDialogDescription>
                  Complete la información del nuevo cliente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre *</Label>
                    <Input
                      id="firstName"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido *</Label>
                    <Input
                      id="lastName"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Apellido"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="ejemplo@email.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+52 81 1234 5678"
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsUserModalOpen(false)}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCreateUser}
                  disabled={!newUserData.firstName || !newUserData.lastName || !newUserData.email}
                  className="bg-[#4A102A] hover:bg-[#5A1A3A]"
                >
                  Crear Cliente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>


        </div>
      </div>

      {/* Título del historial de pagos */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#4A102A]">Historial de Pagos</h2>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar por cliente, paquete o factura..."
            className="pl-8 bg-white border-gray-200 text-zinc-900 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white border-gray-200 text-zinc-900 w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-zinc-900">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Completado">Completados</SelectItem>
            <SelectItem value="Pendiente">Pendientes</SelectItem>
            <SelectItem value="Fallido">Fallidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de pagos */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-0">

          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[120px]">ID. del Pago</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[200px]">Cliente</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[150px]">Paquete</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[100px]">Monto</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[110px]">Fecha</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[120px]">Método</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[100px]">Estado</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[80px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="py-2.5 px-3">
                        <div className="text-sm text-gray-600 font-mono">{payment.invoice}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="max-w-[190px]">
                          <div className="font-medium text-gray-900 truncate text-sm">{payment.user}</div>
                          <div className="text-xs text-gray-500 truncate">{payment.email}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-sm text-gray-900 truncate font-medium max-w-[140px]">{payment.package}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-sm font-medium text-gray-900">
                          ${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-sm text-gray-900">{payment.date}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {payment.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          payment.status === "Completado" ? "bg-green-100 text-green-800" :
                          payment.status === "Pendiente" ? "bg-orange-100 text-orange-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex justify-center">
                          <PaymentDetailsMenu payment={payment} />
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
    </div>
  )
}