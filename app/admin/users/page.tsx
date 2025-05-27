"use client"

import { useState } from "react"
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
import { Search, Download, UserPlus, Mail, Phone, Package, Calendar, Edit } from "lucide-react"

// Datos de ejemplo
const users = [
  {
    id: 1,
    name: "María García",
    email: "maria@example.com",
    phone: "123-456-7890",
    package: "PAQUETE 10 CLASES",
    remainingClasses: 8,
    joinDate: "2023-01-15",
    lastVisit: "2023-04-20",
    status: "active",
  },
  {
    id: 2,
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "123-456-7891",
    package: "MEMBRESÍA MENSUAL",
    remainingClasses: "Ilimitado",
    joinDate: "2022-11-05",
    lastVisit: "2023-04-22",
    status: "active",
  },
  {
    id: 3,
    name: "Ana Rodríguez",
    email: "ana@example.com",
    phone: "123-456-7892",
    package: "PASE INDIVIDUAL",
    remainingClasses: 0,
    joinDate: "2023-04-10",
    lastVisit: "2023-04-10",
    status: "inactive",
  },
  {
    id: 4,
    name: "Carlos López",
    email: "carlos@example.com",
    phone: "123-456-7893",
    package: "PAQUETE 5 CLASES",
    remainingClasses: 3,
    joinDate: "2023-02-20",
    lastVisit: "2023-04-15",
    status: "active",
  },
  {
    id: 5,
    name: "Laura Martínez",
    email: "laura@example.com",
    phone: "123-456-7894",
    package: "PASE INDIVIDUAL",
    remainingClasses: 0,
    joinDate: "2023-03-30",
    lastVisit: "2023-03-30",
    status: "inactive",
  },
  {
    id: 6,
    name: "Roberto Sánchez",
    email: "roberto@example.com",
    phone: "123-456-7895",
    package: "PAQUETE 10 CLASES",
    remainingClasses: 5,
    joinDate: "2022-12-10",
    lastVisit: "2023-04-18",
    status: "active",
   
  },
  {
    id: 7,
    name: "Patricia Gómez",
    email: "patricia@example.com",
    phone: "123-456-7896",
    package: "MEMBRESÍA MENSUAL",
    remainingClasses: "Ilimitado",
    joinDate: "2023-01-05",
    lastVisit: "2023-04-21",
    status: "active",
    
  },
  {
    id: 8,
    name: "Miguel Torres",
    email: "miguel@example.com",
    phone: "123-456-7897",
    package: "PAQUETE 5 CLASES",
    remainingClasses: 2,
    joinDate: "2023-03-15",
    lastVisit: "2023-04-19",
    status: "active",
  
    
  },
]

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isNewUserOpen, setIsNewUserOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
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
              <DialogContent className="bg-white border-gray-200 text-gray-900">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  <DialogDescription className="text-gray-500">
                    Complete los detalles para crear un nuevo usuario
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input
                        type="text"
                        id="name"
                        placeholder="Nombre y apellido"
                        className="border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input
                        type="email"
                        id="email"
                        placeholder="correo@ejemplo.com"
                        className="border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input
                        type="tel"
                        id="phone"
                        placeholder="123-456-7890"
                        className="border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="package">Paquete</Label>
                      <Select>
                        <SelectTrigger className="border-gray-300 focus:ring-[#4A102A]">
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
                        placeholder="********"
                        className="border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
                      <Input
                        type="password"
                        id="confirm-password"
                        placeholder="********"
                        className="border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Input
                      type="text"
                      id="notes"
                      placeholder="Notas adicionales"
                      className="border-gray-300 focus:border-[#4A102A] focus:ring-[#4A102A]"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewUserOpen(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button className="bg-[#4A102A] hover:bg-[#85193C]" onClick={() => setIsNewUserOpen(false)}>
                    Crear Usuario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              <Download className="h-4 w-4 mr-2" /> Exportar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100">
            <TabsTrigger
              value="all"
              onClick={() => setStatusFilter("all")}
              className="data-[state=active]:bg-white data-[state=active]:text-[#4A102A]"
            >
              Todos los Usuarios
            </TabsTrigger>
            <TabsTrigger
              value="active"
              onClick={() => setStatusFilter("active")}
              className="data-[state=active]:bg-white data-[state=active]:text-[#4A102A]"
            >
              Usuarios Activos
            </TabsTrigger>
            <TabsTrigger
              value="inactive"
              onClick={() => setStatusFilter("inactive")}
              className="data-[state=active]:bg-white data-[state=active]:text-[#4A102A]"
            >
              Usuarios Inactivos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <CardTitle className="text-lg text-gray-900">Usuarios</CardTitle>
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-4 font-medium text-gray-500">Usuario</th>
                        <th className="text-left p-4 font-medium text-gray-500">Contacto</th>
                        <th className="text-left p-4 font-medium text-gray-500">Paquete</th>
                        <th className="text-left p-4 font-medium text-gray-500">Fecha de Registro</th>
                        <th className="text-left p-4 font-medium text-gray-500">Última Visita</th>
                        <th className="text-left p-4 font-medium text-gray-500">Estado</th>
                        <th className="text-left p-4 font-medium text-gray-500">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="p-4">
                              <div className="flex items-center">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3">

                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{user.name}</div>
                                  <div className="text-sm text-gray-500">ID: #{user.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-700">
                                  <Mail className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{user.email}</span>
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                  <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                  <span>{user.phone}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center text-gray-700">
                                  <Package className="h-4 w-4 mr-2 text-[#4A102A]" />
                                  <span>{user.package}</span>
                                </div>
                                <div className="text-sm text-gray-500">Clases restantes: {user.remainingClasses}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center text-gray-700">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span>{user.joinDate}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center text-gray-700">
                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                <span>{user.lastVisit}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  user.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
                                  onClick={() => setSelectedUser(user.id)}
                                >
                                  Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-gray-300 text-gray-700 hover:bg-gray-100"
                                >
                                  Editar
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-gray-500">
                            No se encontraron usuarios con los filtros aplicados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
              <CardContent>{/* El contenido se muestra a través del filtro en la pestaña "all" */}</CardContent>
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
              <CardContent>{/* El contenido se muestra a través del filtro en la pestaña "all" */}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedUser && (
          <Dialog open={selectedUser !== null} onOpenChange={() => setSelectedUser(null)}>
            <DialogContent className="bg-white border-gray-200 text-gray-900">
              <DialogHeader>
                <DialogTitle>Detalles del Usuario</DialogTitle>
              </DialogHeader>

              {(() => {
                const user = users.find((u) => u.id === selectedUser)
                if (!user) return null

                return (
                  <div className="py-4">
                    <div className="flex flex-col items-center mb-6">

                      <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs mt-2 ${
                          user.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-500">ID de Usuario</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">#{user.id}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500">Correo Electrónico</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">{user.email}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500">Teléfono</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">{user.phone}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500">Paquete Actual</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">{user.package}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500">Clases Restantes</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">{user.remainingClasses}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500">Fecha de Registro</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">{user.joinDate}</div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-500">Última Visita</Label>
                        <div className="bg-gray-50 p-2 rounded-md text-gray-900">{user.lastVisit}</div>
                      </div>
                    </div>

                    <div className="flex justify-between mt-6">
                      <Button
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-100"
                        onClick={() => setSelectedUser(null)}
                      >
                        Cerrar
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        <Button className="bg-[#4A102A] hover:bg-[#85193C]">Ver Reservaciones</Button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </DialogContent>
          </Dialog>
        )}
      </div>
  )
}
