"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Download, UserPlus, Mail, Phone, Package, Calendar, Edit, Trash2 } from "lucide-react"
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    package: "",
    password: "",
    confirmPassword: "",
    notes: ""
  })

  const [editUserForm, setEditUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "",
    password: ""
  })

  // Cargar usuarios
  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("search", searchTerm)
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      
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

  // Crear nuevo usuario
  const handleCreateUser = async () => {
    if (!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email || !newUserForm.password) {
      toast({
        title: "Error",
        description: "Nombre, apellido, email y contraseña son obligatorios",
        variant: "destructive",
      })
      return
    }

    if (newUserForm.password !== newUserForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Preparar los datos para enviar al API
      const userData = {
        firstName: newUserForm.firstName,
        lastName: newUserForm.lastName,
        email: newUserForm.email,
        phone: newUserForm.phone || null,
        password: newUserForm.password,
        package: newUserForm.package,
        notes: newUserForm.notes
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al crear usuario")
      }

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      })

      setIsNewUserOpen(false)
      setNewUserForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        package: "",
        password: "",
        confirmPassword: "",
        notes: ""
      })
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
  const handleDeleteUser = async (userId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar usuario")
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      })

      await loadUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Effects
  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadUsers()
    }, 500)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, statusFilter])

  // Filtrar usuarios localmente (backup del filtro del servidor)
  const filteredUsers = users.filter((user) => {
    const matchesSearch = searchTerm === "" || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || user.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500">Administra todos los usuarios del sistema</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#4A102A] hover:bg-[#85193C]">
                <UserPlus className="h-4 w-4 mr-2" /> Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-2xl">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Complete los detalles para crear un nuevo usuario
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={newUserForm.firstName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Nombre"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={newUserForm.lastName}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Apellido"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      type="email"
                      id="email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="correo@ejemplo.com"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      type="tel"
                      id="phone"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="123-456-7890"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="package">Paquete Inicial</Label>
                    <Select value={newUserForm.package} onValueChange={(value) => setNewUserForm(prev => ({ ...prev, package: value }))}>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Seleccionar paquete" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">PASE INDIVIDUAL</SelectItem>
                        <SelectItem value="5classes">PAQUETE 5 CLASES</SelectItem>
                        <SelectItem value="10classes">PAQUETE 10 CLASES</SelectItem>
                        <SelectItem value="monthly">MEMBRESÍA MENSUAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      type="password"
                      id="password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="********"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                    <Input
                      type="password"
                      id="confirm-password"
                      value={newUserForm.confirmPassword}
                      onChange={(e) => setNewUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="********"
                      className="border-gray-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Input
                    id="notes"
                    value={newUserForm.notes}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notas adicionales"
                    className="border-gray-300"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsNewUserOpen(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  className="bg-[#4A102A] hover:bg-[#85193C]" 
                  onClick={handleCreateUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        
        <TabsContent value="all">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-2">
                <CardTitle className="text-xl text-gray-900">Usuarios</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar usuarios..."
                    className="pl-8 border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A] w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Cargando usuarios...</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-medium text-gray-500">Contacto</th>
                        <th className="text-left p-4 font-medium text-gray-500">Fecha de Registro</th>
                        <th className="text-left p-4 font-medium text-gray-500">Estado</th>
                        <th className="text-left p-4 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                            
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{user.email}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{user.phone || "No registrado"}</span>
                                </div>
                              </div>
                            </td>
                            
                            <td className="p-4">
                              <div className="flex items-center text-gray-700">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span>{user.joinDate}</span>
                              </div>
                            </td>
                           
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  user.status === "active" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {user.status === "active" ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-gray-300 text-gray-700 hover:bg-gray-100"
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
                                  className="h-8 border-gray-300 text-gray-700 hover:bg-gray-100"
                                  onClick={async () => {
                                    await loadUserDetails(user.id)
                                    setIsEditUserOpen(true)
                                  }}
                                >
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-500">
                            {isLoading ? "Cargando..." : "No se encontraron usuarios con los filtros aplicados"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg text-gray-900">Usuarios Activos</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar usuarios..."
                    className="pl-8 border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A] w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                Mostrando solo usuarios activos - {filteredUsers.filter(u => u.status === 'active').length} usuarios
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg text-gray-900">Usuarios Inactivos</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Buscar usuarios..."
                    className="pl-8 border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A] w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                Mostrando solo usuarios inactivos - {filteredUsers.filter(u => u.status === 'inactive').length} usuarios
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsViewUserOpen(false)}
                >
                  Cerrar
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
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
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Apellido</Label>
                  <Input
                    id="edit-lastName"
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    type="email"
                    id="edit-email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Teléfono</Label>
                  <Input
                    type="tel"
                    id="edit-phone"
                    value={editUserForm.phone}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Estado</Label>
                  <Select value={editUserForm.status} onValueChange={(value) => setEditUserForm(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="pending_verification">Pendiente verificación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
                  <Input
                    type="password"
                    id="edit-password"
                    value={editUserForm.password}
                    onChange={(e) => setEditUserForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Dejar vacío para mantener actual"
                    className="border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              className="bg-[#4A102A] hover:bg-[#85193C]" 
              onClick={handleUpdateUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Actualizando..." : "Actualizar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}