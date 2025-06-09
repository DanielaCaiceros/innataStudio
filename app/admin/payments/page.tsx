"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  Eye,
  FileText,
  Loader2,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Payment {
  id: number
  user: string
  email: string
  package: string
  amount: number
  date: string
  method: "cash" | "online"
  status: "completed" | "pending" | "failed"
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
  const [isMarkingAsPaid, setIsMarkingAsPaid] = useState(false)

  // Estados del formulario de nuevo pago
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedPackageId, setSelectedPackageId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash")

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
          date: new Date(payment.created_at).toLocaleDateString(),
          method: payment.payment_method === "cash" ? "cash" : "online",
          status: payment.payment_status,
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

  // Registrar nuevo usuario
  const handleCreateUser = async () => {
    if (!newUserData.firstName || !newUserData.lastName || !newUserData.email) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
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
        body: JSON.stringify(newUserData),
      })

      if (response.ok) {
        const newUser = await response.json()
        toast({
          title: "Usuario creado",
          description: `Usuario ${newUserData.firstName} ${newUserData.lastName} creado correctamente`,
        })
        
        // Agregar el nuevo usuario a la lista
        const formattedUser = {
          id: newUser.user_id,
          name: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
        }
        setUsers(prev => [...prev, formattedUser])
        setSearchedUsers([formattedUser])
        
        // Seleccionar automáticamente el nuevo usuario
        setSelectedUserId(newUser.user_id.toString())
        setUserSearchEmail(newUser.email)
        
        // Resetear el modal
        setIsUserModalOpen(false)
        setNewUserData({
          firstName: "",
          lastName: "",
          email: "",
          phone: ""
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al crear el usuario")
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

  const handleCreatePayment = async () => {
    if (!selectedUserId || !selectedPackageId || !paymentAmount) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setIsProcessingPayment(true)

    try {
      // Solo procesamiento de pago en efectivo desde el admin
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: Number.parseInt(selectedUserId),
          userPackageId: Number.parseInt(selectedPackageId),
          amount: Number.parseFloat(paymentAmount),
          notes: paymentNotes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Pago registrado",
          description: `Pago en efectivo de $${paymentAmount} registrado correctamente`,
        })
        setIsNewPaymentOpen(false)
        loadPayments()
        resetForm()
      } else {
        throw new Error("Error al registrar el pago")
      }
    } catch (error) {
      console.error("Error creating payment:", error)
      toast({
        title: "Error",
        description: "Error al procesar el pago",
        variant: "destructive",
      })
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const resetForm = () => {
    setSelectedUserId("")
    setSelectedPackageId("")
    setPaymentAmount("")
    setPaymentNotes("")
    setPaymentMethod("cash")
    setUserSearchEmail("")
    setSearchedUsers([])
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

  const handleMarkAsPaid = async (paymentId: number) => {
    setIsMarkingAsPaid(true)
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast({
          title: "Pago completado",
          description: "El pago ha sido marcado como completado",
        })
        // Recargar los pagos
        loadPayments()
      } else {
        throw new Error("Error al marcar el pago como completado")
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar el pago como completado",
        variant: "destructive",
      })
    } finally {
      setIsMarkingAsPaid(false)
    }
  }

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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Pagos</h1>
          <p className="text-gray-600">Administra todos los pagos y transacciones</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                <PlusCircle className="h-4 w-4 mr-2" /> Registrar Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#4A102A]">Registrar Nuevo Pago</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Complete los detalles para registrar un nuevo pago
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Búsqueda de usuario por email */}
                <div className="space-y-2">
                  <Label htmlFor="userSearch" className="text-zinc-900">
                    Buscar Cliente por Email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      id="userSearch"
                      placeholder="Ingrese el email del cliente"
                      value={userSearchEmail}
                      onChange={(e) => {
                        setUserSearchEmail(e.target.value)
                        searchUsersByEmail(e.target.value)
                      }}
                      className="bg-white border-gray-200 text-zinc-900 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUserModalOpen(true)}
                      className="border-[#4A102A] text-[#4A102A] hover:bg-[#4A102A] hover:text-white"
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Resultados de búsqueda */}
                  {isSearchingUsers && (
                    <div className="text-sm text-gray-500">Buscando usuarios...</div>
                  )}
                  
                  {userSearchEmail && searchedUsers.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-md bg-white">
                      {searchedUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => {
                            setSelectedUserId(user.id.toString())
                            setUserSearchEmail(user.email)
                            setSearchedUsers([])
                          }}
                          className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{user.name}</div>
                          <div className="text-gray-500">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {userSearchEmail && searchedUsers.length === 0 && !isSearchingUsers && (
                    <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                      No se encontró ningún usuario con ese email. 
                      <Button
                        variant="link"
                        className="p-0 h-auto text-[#4A102A] underline ml-1"
                        onClick={() => {
                          setNewUserData(prev => ({ ...prev, email: userSearchEmail }))
                          setIsUserModalOpen(true)
                        }}
                      >
                        ¿Crear nuevo usuario?
                      </Button>
                    </div>
                  )}
                </div>

                {/* Información del usuario seleccionado */}
                {selectedUserId && (
                  <div className="space-y-2">
                    <Label className="text-zinc-900">Cliente Seleccionado</Label>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="text-sm font-medium text-green-800">
                        {users.find(u => u.id.toString() === selectedUserId)?.name}
                      </div>
                      <div className="text-sm text-green-600">
                        {users.find(u => u.id.toString() === selectedUserId)?.email}
                      </div>
                    </div>
                  </div>
                )}

                {/* Información básica */}
                <div className="space-y-2">
                  <Label htmlFor="package" className="text-zinc-900">
                    Paquete
                  </Label>
                  <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                    <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                      <SelectValue placeholder="Seleccionar paquete" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-zinc-900">
                      {packages
                        .filter((pkg) => pkg.id)
                        .map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id.toString()}>
                            {pkg.name} - ${pkg.price}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monto y notas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-zinc-900">
                      Monto
                    </Label>
                    <Input
                      type="number"
                      id="amount"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="bg-white border-gray-200 text-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-zinc-900">
                      Notas
                    </Label>
                    <Input
                      type="text"
                      id="notes"
                      placeholder="Notas adicionales (opcional)"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      className="bg-white border-gray-200 text-zinc-900"
                    />
                  </div>
                </div>

                {/* Resumen del pago */}
                {selectedUser && selectedPackage && paymentAmount && (
                  <Card className="bg-gray-50 border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-[#4A102A]">Resumen del Pago</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-zinc-900">
                        <div className="flex justify-between">
                          <span>Cliente:</span>
                          <span className="font-medium">{selectedUser.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Paquete:</span>
                          <span className="font-medium">{selectedPackage.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monto:</span>
                          <span className="font-semibold text-[#4A102A]">${paymentAmount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Método:</span>
                          <span className="font-medium">Efectivo</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsNewPaymentOpen(false)
                    resetForm()
                  }}
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                  onClick={handleCreatePayment}
                  disabled={isProcessingPayment || !selectedUserId || !selectedPackageId || !paymentAmount}
                >
                  {isProcessingPayment ? "Procesando..." : "Registrar Pago en Efectivo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal para crear nuevo usuario */}
          <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
            <DialogContent className="bg-white border-gray-200 text-zinc-900">
              <DialogHeader>
                <DialogTitle className="text-[#4A102A]">Crear Nuevo Usuario</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Complete la información para crear un nuevo usuario
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-zinc-900">
                      Nombre *
                    </Label>
                    <Input
                      type="text"
                      id="firstName"
                      placeholder="Nombre"
                      value={newUserData.firstName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="bg-white border-gray-200 text-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-zinc-900">
                      Apellido *
                    </Label>
                    <Input
                      type="text"
                      id="lastName"
                      placeholder="Apellido"
                      value={newUserData.lastName}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="bg-white border-gray-200 text-zinc-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-900">
                    Email *
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    placeholder="email@ejemplo.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-white border-gray-200 text-zinc-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-zinc-900">
                    Teléfono
                  </Label>
                  <Input
                    type="tel"
                    id="phone"
                    placeholder="(opcional)"
                    value={newUserData.phone}
                    onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-white border-gray-200 text-zinc-900"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUserModalOpen(false)
                    setNewUserData({
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: ""
                    })
                  }}
                  className="border-gray-200 text-zinc-900 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={!newUserData.firstName || !newUserData.lastName || !newUserData.email}
                  className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                >
                  Crear Usuario
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-gray-200 text-zinc-900 hover:bg-gray-100" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
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
                  <th className="text-left p-4 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-zinc-900">#{payment.id}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-zinc-900">{payment.user}</div>
                          <div className="text-sm text-gray-500">{payment.email}</div>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-900">{payment.package}</td>
                      <td className="p-4 font-medium text-[#4A102A]">${payment.amount}</td>
                      <td className="p-4 text-zinc-900">{payment.date}</td>
                      <td className="p-4">
                        <Badge
                          variant={payment.method === "online" ? "default" : "secondary"}
                          className={
                            payment.method === "online"
                              ? "bg-[#4A102A] text-white hover:bg-[#85193C]"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }
                        >
                          {payment.method === "online" ? "Online" : "Efectivo"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            payment.status === "completed"
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : payment.status === "pending"
                                ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                          }
                        >
                          {payment.status === "completed"
                            ? "Completado"
                            : payment.status === "pending"
                              ? "Pendiente"
                              : "Fallido"}
                        </Badge>
                      </td>
                      <td className="p-4 text-zinc-900">{payment.invoice}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-zinc-900 hover:bg-gray-100"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-zinc-900 hover:bg-gray-100"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                          {payment.status === "pending" && payment.method === "cash" && (
                            <Button
                              size="sm"
                              className="h-8 border-gray-200 text-zinc-900 hover:bg-gray-100"
                              onClick={() => handleMarkAsPaid(payment.id)}
                              disabled={isMarkingAsPaid}
                            >
                              {isMarkingAsPaid ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Procesando...
                                </>
                              ) : (
                                "Marcar como pagado"
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">
                      No se encontraron pagos con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
