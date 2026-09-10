"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
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
import { User, Plus, Edit, Trash2, Users, Loader2, Search, Mail, Phone, Building2, ChevronDown } from "lucide-react"

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

// Datos fijos del estudio. Se muestran como información de solo lectura:
// todavía no hay endpoint para editarlos desde el panel.
const STUDIO_INFO = [
  { icon: User, label: "Administradora", value: "Ghana Inés Miroslava Chávez García" },
  { icon: Mail, label: "Correo electrónico", value: "miroslavacg1@gmail.com" },
  { icon: Phone, label: "Teléfono", value: "+52 775 357 1894" },
  { icon: Building2, label: "Estudio", value: "Innata Indoor Cycling Studio" },
]

export default function SettingsPage() {
  const [isAddInstructorOpen, setIsAddInstructorOpen] = useState(false)
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Filtrado por nombre, email o especialidad
  const term = search.trim().toLowerCase()
  const filteredInstructors = term
    ? instructors.filter((i) =>
        [`${i.user.firstName} ${i.user.lastName}`, i.user.email, ...i.specialties]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : instructors

  // Indica si quedan instructores fuera de la vista para mostrar el degradado
  // y el aviso de "desplázate": solo cuando la lista realmente puede scrollear.
  const listRef = useRef<HTMLDivElement>(null)
  const [canScrollMore, setCanScrollMore] = useState(false)

  const updateScrollHint = useCallback(() => {
    const el = listRef.current
    if (!el) return
    setCanScrollMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])

  // Recalcular al filtrar, al cargar y al cambiar el tamaño de la ventana
  useEffect(() => {
    updateScrollHint()
    window.addEventListener("resize", updateScrollHint)
    return () => window.removeEventListener("resize", updateScrollHint)
  }, [updateScrollHint, filteredInstructors.length, loading])

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

  const handleDeleteInstructor = async (instructor: Instructor) => {
    const fullName = `${instructor.user.firstName} ${instructor.user.lastName}`

    if (
      !confirm(
        `¿Eliminar a ${fullName}?\n\nDejará de aparecer en el selector de instructores al programar clases. Sus clases pasadas se conservan en el historial.`,
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/admin/instructors/${instructor.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Instructor eliminado",
          description: result.archived
            ? `${fullName} ya no aparecerá en el selector. Sus ${result.scheduledClasses} clases se conservan en el historial.`
            : `${fullName} se eliminó correctamente.`,
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
    <div className="p-4 md:p-6">
      <div className="pb-6 mb-8 border-b">
        <h1 className="text-xl sm:text-2xl font-bold">Configuración</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gestiona los instructores y consulta los datos del estudio
        </p>
      </div>

      <div>
        {/* Gestión de Instructores (tarea principal, siempre primero) */}
        <section className="mb-12">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#4A102A]" />
                <h2 className="text-base sm:text-lg font-semibold">Instructores</h2>
                {!loading && instructors.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {instructors.length}
                  </Badge>
                )}
              </div>
              <Dialog open={isAddInstructorOpen} onOpenChange={setIsAddInstructorOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-[#4A102A] hover:bg-[#4A102A]/90 w-full sm:w-auto"
                    onClick={() => setEditingInstructor(null)}
                  >
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
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Al eliminar un instructor deja de aparecer en el selector al programar clases
            </p>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Cargando instructores...</span>
              </div>
            ) : instructors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay instructores registrados</p>
                <p className="text-sm">Añade tu primer instructor para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, email o especialidad..."
                    className="pl-9 border-gray-300"
                  />
                </div>

                {filteredInstructors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No se encontraron instructores para "{search}"
                  </div>
                ) : (
                  <div>
                    <div className="relative border-t border-gray-100">
                      <div
                        ref={listRef}
                        onScroll={updateScrollHint}
                        className="max-h-[24rem] lg:max-h-[32rem] overflow-y-auto divide-y divide-gray-100"
                      >
                        {filteredInstructors.map((instructor) => (
                          <div
                            key={instructor.id}
                            title={instructor.bio || undefined}
                            className="flex items-center gap-2.5 sm:gap-3 px-2 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="hidden sm:flex h-9 w-9 shrink-0 rounded-full bg-[#4A102A]/10 text-[#4A102A] items-center justify-center text-sm font-semibold">
                              {instructor.user.firstName.charAt(0)}
                              {instructor.user.lastName.charAt(0)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className="text-sm sm:text-base font-medium truncate">
                                  {instructor.user.firstName} {instructor.user.lastName}
                                </span>
                                {instructor.isFeatured && (
                                  <Badge variant="default" className="bg-[#4A102A] text-[10px] sm:text-xs">
                                    Destacado
                                  </Badge>
                                )}
                                {instructor.specialties.slice(0, 2).map((specialty, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-[10px] sm:text-xs font-normal"
                                  >
                                    {specialty}
                                  </Badge>
                                ))}
                                {instructor.specialties.length > 2 && (
                                  <span className="text-[10px] sm:text-xs text-gray-400">
                                    +{instructor.specialties.length - 2}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                                {instructor.user.email}
                              </p>
                            </div>

                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Editar instructor"
                                onClick={() => handleEditInstructor(instructor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar instructor"
                                onClick={() => handleDeleteInstructor(instructor)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Degradado que insinúa que la lista continúa */}
                      {canScrollMore && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/85 to-transparent" />
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-2 pt-2 text-[11px] sm:text-xs text-gray-500">
                      <span>
                        {term
                          ? `Mostrando ${filteredInstructors.length} de ${instructors.length}`
                          : `${instructors.length} instructores`}
                      </span>
                      {canScrollMore && (
                        <span className="flex items-center gap-1 text-gray-400">
                          Desplázate para ver más
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Datos del estudio: franja horizontal de solo lectura */}
        <section className="border-t pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Building2 className="h-5 w-5 text-[#4A102A]" />
            <h2 className="text-base sm:text-lg font-semibold">Datos del estudio</h2>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Contacta a soporte para modificarlos</p>

          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
            {STUDIO_INFO.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <dt className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-wide text-gray-500">
                  <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                  {label}
                </dt>
                <dd className="mt-1 text-xs sm:text-sm font-medium text-gray-900 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
