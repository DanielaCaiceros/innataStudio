"use client"

import { useState, useEffect } from "react"
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
  PlusCircle,
  Search,
  Download,
  CreditCard,
  DollarSign,
  Receipt,
  ArrowUpRight,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"

interface Payment {
  id: number
  user: string
  email: string
  package: string
  amount: number
  date: string
  method: "efectivo" | "en linea"
  status: "completado" | "pendiente" | "fallido"
  invoice: string
  stripePaymentIntentId?: string
  userPackageId?: number
  userId: number
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

  // Función para validar email
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Función para limpiar el formulario
  const resetForm = () => {
    setSelectedUserId("")
    setSelectedPackageId("")
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
        
        // Actualizar el monto del pago con el precio del paquete
        setPaymentAmount(data.userPackage.packagePrice.toString())
        setSelectedPackageId(data.userPackage.id.toString())
        
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
          userId: payment.user_id
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
      const response = await fetch("/api/packages")
      if (response.ok) {
        const data = await response.json()
        setPackages(data)
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

    setIsProcessingPayment(true)

    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: parseInt(selectedUserId),
          userPackageId: selectedPackageId ? parseInt(selectedPackageId) : null,
          amount: amount,
          notes: paymentNotes.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Pago registrado",
          description: `Pago en efectivo de $${amount} registrado correctamente para ${data.payment.user}`,
        })
        
        // Cerrar modal y resetear formulario
        setIsNewPaymentOpen(false)
        resetForm()
        
        // Recargar la lista de pagos
        loadPayments()
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

  // Buscar usuarios por email
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

  // TODOS LOS useEffect DEBEN IR AQUÍ, ANTES DEL RETURN
  
  // Cargar datos al montar el componente
  useEffect(() => {
    loadPayments()
    loadUsers()
    loadPackages()
  }, [])

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
      if (userSearchEmail.trim() && isValidEmail(userSearchEmail)) {
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

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="text-center text-zinc-900">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Pagos</h1>
          <p className="text-gray-600">Administra todos los pagos y transacciones</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <AlertDialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
            <AlertDialogTrigger asChild>
              <Button className="bg-[#4A102A] hover:bg-[#5A1A3A]">
                <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Pago
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <AlertDialogHeader>
                <AlertDialogTitle>Registrar Pago en Efectivo</AlertDialogTitle>
                <AlertDialogDescription>
                  Complete la información para registrar un pago en efectivo realizado por un cliente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
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

                  {/* Botón para crear nuevo usuario si no se encuentra */}
                  {userSearchEmail && searchedUsers.length === 0 && !isSearchingUsers && isValidEmail(userSearchEmail) && !selectedUserId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="text-sm text-blue-800 mb-2">
                        No se encontró ningún usuario con ese email.
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewUserData(prev => ({ ...prev, email: userSearchEmail }))
                          setIsUserModalOpen(true)
                        }}
                        className="text-blue-700 border-blue-300 hover:bg-blue-100"
                      >
                        Crear nuevo cliente
                      </Button>
                    </div>
                  )}
                </div>

                {/* Selección de paquete */}
                {selectedUserId && (
                  <div className="space-y-2">
                    <Label htmlFor="package-select">Paquete</Label>
                    
                    {/* Botón para asignar nuevo paquete - ahora es el principal */}
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
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={resetForm}>
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCreatePayment}
                  disabled={isProcessingPayment || !selectedUserId || !paymentAmount}
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

      {/* Tabla de pagos */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-[#4A102A]">Historial de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
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
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left p-4 font-medium text-gray-600">ID</th>
                  <th className="text-left p-4 font-medium text-gray-600">Cliente</th>
                  <th className="text-left p-4 font-medium text-gray-600">Paquete</th>
                  <th className="text-left p-4 font-medium text-gray-600">Monto</th>
                  <th className="text-left p-4 font-medium text-gray-600">Fecha</th>
                  <th className="text-left p-4 font-medium text-gray-600">Método</th>
                  <th className="text-left p-4 font-medium text-gray-600">Estado</th>
                  <th className="text-left p-4 font-medium text-gray-600">Factura</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-200">
                    <td className="text-left p-4 font-medium text-gray-600">{payment.id}</td>
                    <td className="text-left p-4 font-medium text-gray-600">{payment.user}</td>
                    <td className="text-left p-4 font-medium text-gray-600">{payment.package}</td>
                    <td className="text-left p-4 font-medium text-gray-600">${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="text-left p-4 font-medium text-gray-600">{payment.date}</td>
                    <td className="text-left p-4 font-medium text-gray-600">{payment.method}</td>
                    <td className="text-left p-4 font-medium text-gray-600">{payment.status}</td>
                    <td className="text-left p-4 font-medium text-gray-600">{payment.invoice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}