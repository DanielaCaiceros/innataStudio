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
import { Search, Download, UserPlus, Mail, Phone, Calendar, Edit, Trash2, MoreVertical, AlertTriangle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useToast } from "@/components/ui/use-toast"

// Interfaces
interface ApiUser {
  user_id: number
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  createdAt: string
  status: string
}

interface User {
  id: number
  name: string
  email: string
  phone: string
  package: string
  remainingClasses: number
  joinDate: string
  lastVisit: string
  status: string
}

interface UserDetail {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string
  joinDate: string
  lastVisitDate: string | null
  status: string
  role: string
  balance: {
    totalClassesPurchased: number
    classesUsed: number
    classesAvailable: number
  }
  activePackages: Array<{
    id: number
    name: string
    classesRemaining: number
    expiryDate: string
    paymentStatus: string
  }>
  recentReservations: Array<{
    id: number
    className: string
    date: string
    status: string
  }>
}

export default function UsersPage() {
  const { toast } = useToast()
  
  // Estados
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewUserOpen, setIsNewUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [isViewUserOpen, setIsViewUserOpen] = useState(false)
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states simplificados
  const [newUserForm, setNewUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  })

  const [emailValidation, setEmailValidation] = useState({
    isValid: true,
    message: ""
  })

  const [editUserForm, setEditUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "",
    password: ""
  })

  // Cargar usuarios - optimizado para filtros
  const loadUsers = async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setIsLoading(true)
    } else {
      setIsFiltering(true)
    }
    
    try {
      const response = await fetch(`/api/admin/users`)
      
      if (!response.ok) {
        throw new Error("Error al cargar usuarios")
      }

      // Transformar los datos del API al formato que espera la UI
      const apiUsers: ApiUser[] = await response.json()
      const transformedUsers: User[] = apiUsers.map(apiUser => ({
        id: apiUser.user_id,
        name: `${apiUser.firstName} ${apiUser.lastName}`,
        email: apiUser.email,
        phone: apiUser.phone || "No registrado",
        package: "Paquete por defecto", // Valor por defecto hasta tener la info real
        remainingClasses: 0, // Valor por defecto hasta tener la info real
        joinDate: new Date(apiUser.createdAt).toLocaleDateString(),
        lastVisit: "No disponible", // Valor por defecto hasta tener la info real
        status: apiUser.status
      }))
      
      setUsers(transformedUsers)
    } catch (error) {
      console.error("Error loading users:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsFiltering(false)
    }
  }

  // Cargar detalles de usuario específico
  const loadUserDetails = async (userId: number) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`)
      
      if (!response.ok) {
        throw new Error("Error al cargar detalles del usuario")
      }

      const data = await response.json()
      
      // Asegurarse de que los datos estén en el formato esperado
      const userDetail: UserDetail = {
        id: data.user_id || userId,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        joinDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '',
        lastVisitDate: data.lastVisit ? new Date(data.lastVisit).toLocaleDateString() : null,
        status: data.status || 'inactive',
        role: data.role || 'client',
        // Si no hay datos de balance, usar valores por defecto
        balance: data.balance || {
          totalClassesPurchased: 0,
          classesUsed: 0,
          classesAvailable: 0
        },
        // Si no hay paquetes activos, usar un array vacío
        activePackages: data.packages || [],
        // Si no hay reservaciones recientes, usar un array vacío
        recentReservations: data.reservations || []
      }
      
      setSelectedUser(userDetail)
      
      // Poblar form de edición
      setEditUserForm({
        firstName: userDetail.firstName,
        lastName: userDetail.lastName,
        email: userDetail.email,
        phone: userDetail.phone || "",
        status: userDetail.status,
        password: ""
      })
    } catch (error) {
      console.error("Error loading user details:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles del usuario",
        variant: "destructive",
      })
    }
  }

  // Crear nuevo usuario - simplificado
  const handleCreateUser = async () => {
    if (!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email) {
      toast({
        title: "Error",
        description: "Nombre, apellido y email son obligatorios",
        variant: "destructive",
      })
      return
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUserForm.email)) {
      toast({
        title: "Error",
        description: "El formato del email no es válido",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Preparar los datos para enviar al API
      const userData = {
        firstName: newUserForm.firstName.trim(),
        lastName: newUserForm.lastName.trim(),
        email: newUserForm.email.toLowerCase().trim(),
        phone: newUserForm.phone?.trim() || null
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Manejar específicamente el error de email duplicado
        if (response.status === 409) {
          toast({
            title: "Email ya existe",
            description: "Ya existe un usuario registrado con este correo electrónico. Por favor, usa un email diferente.",
            variant: "destructive",
          })
        } else {
          throw new Error(responseData.error || "Error al crear usuario")
        }
        return
      }

      toast({
        title: "Usuario creado",
        description: "Se ha enviado un email al usuario para que establezca su contraseña. Una vez que la configure, podrá iniciar sesión normalmente.",
        duration: 5000,
      })

      setIsNewUserOpen(false)
      setNewUserForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
      })
      setEmailValidation({ isValid: true, message: "" })
      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error interno del servidor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editUserForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al actualizar usuario")
      }

      toast({
        title: "Usuario actualizado",
        description: "Los datos del usuario han sido actualizados",
      })

      setIsEditUserOpen(false)
      await loadUsers()
      await loadUserDetails(selectedUser.id) // Refrescar detalles
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar usuario")
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      })

      setIsDeleteUserOpen(false)
      setUserToDelete(null)
      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Validar email en tiempo real
  const validateEmail = (email: string) => {
    if (!email) {
      setEmailValidation({ isValid: true, message: "" })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailValidation({ 
        isValid: false, 
        message: "Formato de email inválido" 
      })
    } else {
      setEmailValidation({ isValid: true, message: "" })
    }
  }

  // Effects optimizados
  useEffect(() => {
    loadUsers(true) // Carga inicial
  }, [])

  // Effects optimizados
  useEffect(() => {
    loadUsers(true) // Carga inicial
  }, [])

  // Filtrado local optimizado - sin delay
  const filteredUsers = users.filter((user) => {
    const matchesSearch = searchTerm === "" || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || user.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Componente para mostrar detalles del usuario
  const UserDetailsMenu = ({ user }: { user: User }) => {
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
              <h4 className="font-semibold text-sm text-gray-900">Detalles del Usuario</h4>
              <p className="text-xs text-gray-500">ID: {user.id}</p>
            </div>

            {/* Información básica */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Mail className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <Phone className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Teléfono:</span>
                <span className="font-medium">{user.phone}</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Registro:</span>
                <span className="font-medium">{user.joinDate}</span>
              </div>
            </div>

            {/* Estado del usuario */}
            <div className="space-y-2 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-800">Estado</span>
                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                  {user.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white-50 min-h-screen">
        <div className="text-center text-zinc-900">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra todos los usuarios del sistema</p>
        </div>

        <div className="flex gap-4">

          <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#4A102A] hover:bg-[#85193C] text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Complete los datos básicos. El usuario recibirá un email para establecer su contraseña.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre *</Label>
                    <Input
                      id="firstName"
                      value={newUserForm.firstName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Nombre"
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido *</Label>
                    <Input
                      id="lastName"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Apellido"
                      className="bg-white border-gray-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico *</Label>
                    <Input
                      type="email"
                      id="email"
                      value={newUserForm.email}
                      onChange={(e) => {
                        const email = e.target.value
                        setNewUserForm(prev => ({ ...prev, email }))
                        validateEmail(email)
                      }}
                      placeholder="correo@ejemplo.com"
                      className={`bg-white border-gray-200 ${
                        !emailValidation.isValid ? 'border-red-300 focus:border-red-500' : ''
                      }`}
                    />
                    {!emailValidation.isValid && (
                      <p className="text-sm text-red-600">{emailValidation.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono (opcional)</Label>
                    <Input
                      type="tel"
                      id="phone"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="123-456-7890"
                      className="bg-white border-gray-200"
                    />
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Se enviará automáticamente un email al usuario con un enlace para establecer su contraseña. Los paquetes se pueden adquirir desde la sección de Pagos.
                    <strong>Es recomendable avisar sobre este correo a tu cliente.</strong>
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNewUserOpen(false)}
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  className="bg-[#4A102A] hover:bg-[#85193C] text-white" 
                  onClick={handleCreateUser}
                  disabled={isSubmitting || !emailValidation.isValid || !newUserForm.firstName || !newUserForm.lastName || !newUserForm.email}
                >
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Título del historial de usuarios */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[#4A102A]">Lista de Usuarios</h2>
      </div>

      {/* Barra de búsqueda y filtros optimizada */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar por nombre, email o teléfono..."
            className="pl-8 bg-white border-gray-200 text-zinc-900 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isFiltering && (
            <div className="absolute right-2.5 top-2.5">
              <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-[#4A102A] rounded-full"></div>
            </div>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="bg-white border-gray-200 text-zinc-900 w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-zinc-900">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="pending_verification">Pendientes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de usuarios */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[250px]">Usuario</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[180px]">Contacto</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[130px]">Registro</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[100px]">Estado</th>
                    <th className="text-center py-3 px-3 text-xs font-semibold text-gray-800 uppercase tracking-wider w-[80px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/60 transition-colors duration-150">
                      <td className="py-2.5 px-3">
                        <div className="max-w-[240px]">
                          <div className="font-medium text-gray-900 truncate text-sm">{user.name}</div>
                          <div className="text-xs text-gray-500">ID: {user.id}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="max-w-[170px]">
                          <div className="text-sm text-gray-900 truncate">{user.email}</div>
                          <div className="text-xs text-gray-500 truncate">{user.phone}</div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-sm text-gray-900">{user.joinDate}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.status === "active" ? "bg-green-100 text-green-800" :
                          user.status === "inactive" ? "bg-red-100 text-red-800" :
                          user.status === "pending_verification" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {user.status === "active" ? "Activo" : 
                           user.status === "inactive" ? "Inactivo" : 
                           user.status === "pending_verification" ? "Pendiente" : "Desconocido"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-gray-200 text-gray-600 hover:bg-gray-100"
                            onClick={async () => {
                              await loadUserDetails(user.id)
                              setIsViewUserOpen(true)
                            }}
                          >
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-gray-200 text-gray-600 hover:bg-gray-100"
                            onClick={async () => {
                              await loadUserDetails(user.id)
                              setIsEditUserOpen(true)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setUserToDelete(user)
                              setIsDeleteUserOpen(true)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <UserDetailsMenu user={user} />
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

      {/* Modal para ver detalles del usuario */}
      <Dialog open={isViewUserOpen} onOpenChange={setIsViewUserOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4A102A]">Información Personal</h3>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-500">Nombre Completo</Label>
                    <div className="bg-gray-50 p-2 rounded-md text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-500">Email</Label>
                    <div className="bg-gray-50 p-2 rounded-md text-gray-900">{selectedUser.email}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-500">Teléfono</Label>
                    <div className="bg-gray-50 p-2 rounded-md text-gray-900">
                      {selectedUser.phone || "No registrado"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-500">Estado</Label>
                    <div className="bg-gray-50 p-2 rounded-md">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedUser.status === "active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }`}>
                        {selectedUser.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Balance y paquetes */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4A102A]">Balance de Clases</h3>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedUser.balance.totalClassesPurchased}
                        </div>
                        <div className="text-xs text-gray-600">Compradas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {selectedUser.balance.classesAvailable}
                        </div>
                        <div className="text-xs text-gray-600">Disponibles</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {selectedUser.balance.classesUsed}
                        </div>
                        <div className="text-xs text-gray-600">Usadas</div>
                      </div>
                    </div>
                  </div>

                  {/* Paquetes activos */}
                  <div>
                    <h4 className="font-semibold mb-2">Paquetes Activos</h4>
                    {selectedUser.activePackages.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.activePackages.map((pkg) => (
                          <div key={pkg.id} className="bg-gray-50 p-3 rounded-md">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{pkg.name}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                pkg.paymentStatus === "paid" 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {pkg.paymentStatus === "paid" ? "Pagado" : "Pendiente"}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Clases restantes: {pkg.classesRemaining} | Expira: {pkg.expiryDate}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No tiene paquetes activos</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reservaciones recientes */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-[#4A102A] mb-4">Reservaciones Recientes</h3>
                {selectedUser.recentReservations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Clase</th>
                          <th className="text-left p-2">Fecha</th>
                          <th className="text-left p-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedUser.recentReservations.map((reservation) => (
                          <tr key={reservation.id} className="border-b">
                            <td className="p-2">{reservation.className}</td>
                            <td className="p-2">{reservation.date}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                reservation.status === "confirmed" 
                                  ? "bg-green-100 text-green-800" 
                                  : reservation.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}>
                                {reservation.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No tiene reservaciones recientes</p>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                  onClick={() => setIsViewUserOpen(false)}
                >
                  Cerrar
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                    onClick={() => {
                      setIsViewUserOpen(false)
                      setIsEditUserOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Editar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal para editar usuario */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">Nombre</Label>
                  <Input
                    id="edit-firstName"
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Apellido</Label>
                  <Input
                    id="edit-lastName"
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    type="email"
                    id="edit-email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input
                    type="tel"
                    id="edit-phone"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-white border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Estado</Label>
                  <Select value={editUserForm.status} onValueChange={(value) => setEditUserForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="pending_verification">Pendiente verificación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-[#4A102A] hover:bg-[#85193C] text-white" 
              onClick={handleUpdateUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Actualizando..." : "Actualizar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog para confirmar eliminación */}
      <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
        <AlertDialogContent className="bg-white border-gray-200 text-gray-900">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle>Eliminar Usuario</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Estás seguro de que deseas eliminar a{" "}
                  <span className="font-semibold">{userToDelete?.name}</span>?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          <div className="my-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Esta acción:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Desactivará la cuenta del usuario</li>
                  <li>Modificará su email para evitar conflictos</li>
                  <li>No elimina el historial de reservaciones</li>
                  <li>No se puede deshacer fácilmente</li>
                </ul>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isSubmitting}
              className="border-gray-200 text-gray-900 hover:bg-gray-100"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar Usuario"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
