"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { useToast } from "@/hooks/use-toast"
import { User, Phone, Mail, Plus, Edit, Trash2, Users, Loader2 } from "lucide-react"

interface Instructor {
  id: number
  userId: number
  bio: string | null
  specialties: string[]
  isFeatured: boolean
  user: {
    firstName: string
    lastName: string
    email: string
    profileImage: string | null
  }
}

export default function SettingsPage() {
  const [isAddInstructorOpen, setIsAddInstructorOpen] = useState(false)
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Cargar instructores
  useEffect(() => {
    fetchInstructors()
  }, [])

  const fetchInstructors = async () => {
    try {
      const response = await fetch("/api/admin/instructors")
      if (response.ok) {
        const data = await response.json()
        setInstructors(data)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los instructores",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddInstructor = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const formData = new FormData(e.target as HTMLFormElement)
    const specialtiesString = formData.get("specialties") as string
    const specialties = specialtiesString
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const instructorData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      bio: formData.get("bio") as string,
      specialties,
      isFeatured: formData.get("isFeatured") === "on",
    }

    try {
      const url = editingInstructor ? `/api/admin/instructors/${editingInstructor.id}` : "/api/admin/instructors"

      const method = editingInstructor ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(instructorData),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: editingInstructor ? "Instructor actualizado correctamente" : "Instructor agregado correctamente",
        })
        setIsAddInstructorOpen(false)
        setEditingInstructor(null)
        fetchInstructors()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al guardar instructor",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditInstructor = (instructor: Instructor) => {
    setEditingInstructor(instructor)
    setIsAddInstructorOpen(true)
  }

  const handleDeleteInstructor = async (id: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este instructor?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/instructors/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Instructor eliminado correctamente",
        })
        fetchInstructors()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al eliminar instructor",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    }
  }

  const closeDialog = () => {
    setIsAddInstructorOpen(false)
    setEditingInstructor(null)
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-gray-600">Gestiona la configuración básica del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del Administrador */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#4A102A]" />
              <CardTitle className="text-lg">Información del Administrador</CardTitle>
            </div>
            <CardDescription>Actualiza tu información personal</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Nombre Completo</Label>
                <Input id="admin-name" defaultValue="Ghana Inés Miroslava Chávez García" className="border-gray-300" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email">Correo Electrónico</Label>
                <Input id="admin-email" type="email" defaultValue="miroslavacg1@gmail.com" className="border-gray-300" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-phone">Teléfono</Label>
                <Input id="admin-phone" defaultValue="+527753571894" className="border-gray-300" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studio-name">Nombre del Estudio</Label>
                <Input id="studio-name" defaultValue="Innata Indoor Cycling Studio "className="border-gray-300" />
              </div>

              <Button className="bg-[#4A102A] hover:bg-[#4A102A]/90 w-full">Guardar Cambios</Button>
            </form>
          </CardContent>
        </Card>

        {/* Contacto de Soporte */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-[#4A102A]" />
              <CardTitle className="text-lg">Soporte Técnico</CardTitle>
            </div>
            <CardDescription>Información de contacto para soporte</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-[#4A102A]" />
                  <span className="font-medium">Email de Soporte</span>
                </div>
                <p className="text-sm text-gray-600">soporte@cyclestudio.com</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-[#4A102A]" />
                  <span className="font-medium">Teléfono de Soporte</span>
                </div>
                <p className="text-sm text-gray-600">+52 (55) 1234-5678</p>
                <p className="text-xs text-gray-500 mt-1">Lunes a Viernes, 9:00 AM - 6:00 PM</p>
              </div>

             
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Nota:</strong> Para emergencias técnicas fuera del horario de soporte, envía un email con
                  "URGENTE" en el asunto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gestión de Instructores */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#4A102A]" />
                <CardTitle className="text-lg">Gestión de Instructores</CardTitle>
              </div>
              <Dialog open={isAddInstructorOpen} onOpenChange={setIsAddInstructorOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#4A102A] hover:bg-[#4A102A]/90" onClick={() => setEditingInstructor(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Instructor
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingInstructor ? "Editar Instructor" : "Añadir Nuevo Instructor"}</DialogTitle>
                    <DialogDescription>
                      {editingInstructor
                        ? "Modifica la información del instructor"
                        : "Completa la información del nuevo instructor"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddInstructor}>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">Nombre</Label>
                          <Input
                            id="firstName"
                            name="firstName"
                            defaultValue={editingInstructor?.user.firstName || ""}
                            placeholder="Ana"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Apellido</Label>
                          <Input
                            id="lastName"
                            name="lastName"
                            defaultValue={editingInstructor?.user.lastName || ""}
                            placeholder="García"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={editingInstructor?.user.email || ""}
                          placeholder="ana@cyclestudio.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialties">Especialidades</Label>
                        <Input
                          id="specialties"
                          name="specialties"
                          defaultValue={editingInstructor?.specialties?.join(", ") || ""}
                          placeholder="Ej: Spinning, HIIT, Resistencia"
                        />
                        <p className="text-xs text-gray-500">Separa las especialidades con comas</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Biografía</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          defaultValue={editingInstructor?.bio || ""}
                          placeholder="Breve descripción del instructor..."
                          rows={3}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isFeatured"
                          name="isFeatured"
                          defaultChecked={editingInstructor?.isFeatured || false}
                          className="rounded"
                        />
                        <Label htmlFor="isFeatured" className="text-sm">
                          Instructor destacado
                        </Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={closeDialog}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="bg-[#4A102A] hover:bg-[#4A102A]/90" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingInstructor ? "Actualizar" : "Añadir"} Instructor
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>Gestiona los instructores de tu estudio</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando instructores...</span>
              </div>
            ) : (
              <div className="grid gap-4">
                {instructors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay instructores registrados</p>
                    <p className="text-sm">Añade tu primer instructor para comenzar</p>
                  </div>
                ) : (
                  instructors.map((instructor) => (
                    <div key={instructor.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">
                            {instructor.user.firstName} {instructor.user.lastName}
                          </h3>
                          {instructor.isFeatured && (
                            <Badge variant="default" className="bg-[#4A102A] text-xs">
                              Destacado
                            </Badge>
                          )}
                          <div className="flex gap-1">
                            {instructor.specialties.map((specialty, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {instructor.user.email}
                          </div>
                          {instructor.bio && <p className="mt-2">{instructor.bio}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditInstructor(instructor)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInstructor(instructor.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
