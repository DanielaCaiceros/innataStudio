"use client"

import { useState, useEffect } from "react"
import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlusCircle, Star, Trash2, Edit, Users, Clock, CalendarDays, ChevronRight, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { ClassType, Instructor, ScheduledClass, timeSlots, convertUtcToLocalDateForDisplay, formatTime } from "../typesAndConstants"
import { SPECIAL_CLASS_BIKE_LAYOUT } from "@/lib/config/branch-bike-layouts"

type ViewMode = "week" | "upcoming"

const STRIPE_MIN_MXN = 10

interface SpecialClassesTabProps {
  classTypes: ClassType[]
  instructors: Instructor[]
  selectedBranchId: string
  selectedWeek: Date
}

export default function SpecialClassesTab({
  classTypes,
  instructors,
  selectedBranchId,
  selectedWeek,
}: SpecialClassesTabProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [classes, setClasses] = useState<ScheduledClass[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<ScheduledClass | null>(null)

  const emptyForm = {
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    branchId: selectedBranchId !== "all" ? selectedBranchId : "",
    specialPrice: "",
    specialMessage: "",
    maxCapacity: "",
  }

  const [createForm, setCreateForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)

  const loadClasses = async (mode: ViewMode) => {
    setIsFetching(true)
    try {
      const params = new URLSearchParams({ isSpecial: "true" })
      if (selectedBranchId !== "all") {
        params.append("branchId", selectedBranchId)
      }
      if (mode === "week") {
        const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })
        params.append("startDate", format(weekStart, "yyyy-MM-dd"))
        params.append("endDate", format(weekEnd, "yyyy-MM-dd"))
      } else {
        params.append("startDate", format(new Date(), "yyyy-MM-dd"))
      }
      const response = await fetch(`/api/admin/scheduled-classes?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setClasses(data)
      }
    } catch (error) {
      console.error("Error loading special classes:", error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    loadClasses(viewMode)
  }, [viewMode, selectedBranchId, selectedWeek])

  const getBranchName = (branchId: string | number) => {
    if (String(branchId) === "1") return "SAHAGÚN"
    if (String(branchId) === "2") return "APAN"
    return `ID ${branchId}`
  }

const openCreate = () => {
    setCreateForm({ ...emptyForm, branchId: selectedBranchId !== "all" ? selectedBranchId : "" })
    setIsCreateOpen(true)
  }

  const openEdit = (cls: ScheduledClass) => {
    setSelectedClass(cls)
    setEditForm({
      classTypeId: cls.classType.id.toString(),
      instructorId: cls.instructor.id.toString(),
      date: (() => {
        const d = convertUtcToLocalDateForDisplay(cls.date)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      })(),
      time: formatTime(cls.time),
      branchId: cls.branch_id?.toString() || "",
      specialPrice: cls.specialPrice?.toString() || "",
      specialMessage: cls.specialMessage || "",
      maxCapacity: cls.maxCapacity?.toString() || "",
    })
    setIsEditOpen(true)
  }

  const handleCreate = async () => {
    const { classTypeId, instructorId, date, time, branchId, specialPrice } = createForm
    if (!classTypeId || !instructorId || !date || !time || !branchId || !specialPrice) {
      toast({ title: "Error", description: "Todos los campos son obligatorios, incluyendo el precio de la clase", variant: "destructive" })
      return
    }
    const cost = parseFloat(specialPrice)
    if (isNaN(cost) || cost < STRIPE_MIN_MXN) {
      toast({ title: "Precio inválido", description: `El precio mínimo es $${STRIPE_MIN_MXN} MXN (mínimo aceptado por Stripe).`, variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/scheduled-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classTypeId,
          instructorId,
          date,
          time,
          branchId: parseInt(branchId),
          isSpecial: true,
          specialPrice: cost,
          specialMessage: createForm.specialMessage || null,
          maxCapacity: createForm.maxCapacity ? parseInt(createForm.maxCapacity) : undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error al crear la clase especial")
      }
      toast({ title: "Éxito", description: `Clase especial creada en ${getBranchName(branchId)}` })
      setIsCreateOpen(false)
      setCreateForm(emptyForm)
      // Si la clase creada no está en la semana actual, cambiar a "Próximas" para verla
      const createdDate = new Date(date)
      const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })
      if (createdDate < weekStart || createdDate > weekEnd) {
        setViewMode("upcoming")
      } else {
        await loadClasses(viewMode)
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error de conexión", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedClass) return
    const { classTypeId, instructorId, date, time, branchId, specialPrice } = editForm
    if (!classTypeId || !instructorId || !date || !time || !branchId || !specialPrice) {
      toast({ title: "Error", description: "Todos los campos son obligatorios", variant: "destructive" })
      return
    }
    const cost = parseFloat(specialPrice)
    if (isNaN(cost) || cost < STRIPE_MIN_MXN) {
      toast({ title: "Precio inválido", description: `El precio mínimo es $${STRIPE_MIN_MXN} MXN (mínimo aceptado por Stripe).`, variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${selectedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classTypeId,
          instructorId,
          date,
          time,
          branchId: parseInt(branchId),
          isSpecial: true,
          specialPrice: cost,
          specialMessage: editForm.specialMessage || null,
          maxCapacity: editForm.maxCapacity ? parseInt(editForm.maxCapacity) : undefined,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error al actualizar la clase especial")
      }
      toast({ title: "Éxito", description: "Clase especial actualizada" })
      setIsEditOpen(false)
      setSelectedClass(null)
      await loadClasses(viewMode)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error de conexión", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const openDelete = (cls: ScheduledClass) => {
    setClassToDelete(cls)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!classToDelete) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${classToDelete.id}`, { method: "DELETE" })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Error al eliminar")
      }
      toast({ title: "Clase eliminada", description: `"${classToDelete.classType.name}" fue eliminada correctamente.` })
      setIsDeleteOpen(false)
      setClassToDelete(null)
      await loadClasses(viewMode)
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Error de conexión", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const classFormFields = (
    form: typeof createForm,
    setForm: Dispatch<SetStateAction<typeof createForm>>
  ) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Tipo de Clase</Label>
        <Select value={form.classTypeId} onValueChange={(v) => setForm((p) => ({ ...p, classTypeId: v }))}>
          <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-zinc-900">
            {classTypes.map((t) => <SelectItem key={t.id} value={t.id.toString()}>{t.name} ({t.duration} min)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Instructor</Label>
        <Select value={form.instructorId} onValueChange={(v) => setForm((p) => ({ ...p, instructorId: v }))}>
          <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar instructor" /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-zinc-900">
            {instructors.map((i) => <SelectItem key={i.id} value={i.id.toString()}>{i.user.firstName} {i.user.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Fecha</Label>
        <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="bg-white border-gray-200 text-zinc-900" />
      </div>
      <div className="space-y-2">
        <Label>Hora</Label>
        <Select value={form.time} onValueChange={(v) => setForm((p) => ({ ...p, time: v }))}>
          <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar hora" /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-zinc-900">
            {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Sucursal</Label>
        <Select value={form.branchId} onValueChange={(v) => setForm((p) => ({ ...p, branchId: v }))}>
          <SelectTrigger className="bg-white border-gray-200 text-zinc-900"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-zinc-900">
            <SelectItem value="1">SAHAGÚN</SelectItem>
            <SelectItem value="2">APAN</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Precio de la Clase (MXN)</Label>
        <Input
          type="number"
          min={STRIPE_MIN_MXN}
          step="1"
          placeholder={`Mín. $${STRIPE_MIN_MXN} MXN`}
          value={form.specialPrice}
          onChange={(e) => setForm((p) => ({ ...p, specialPrice: e.target.value }))}
          className={`bg-white border-gray-200 text-zinc-900 ${
            form.specialPrice && parseFloat(form.specialPrice) < STRIPE_MIN_MXN
              ? "border-red-400 focus-visible:ring-red-400"
              : ""
          }`}
        />
        {form.specialPrice && parseFloat(form.specialPrice) < STRIPE_MIN_MXN && (
          <p className="text-xs text-red-500">El mínimo aceptado por Stripe es ${STRIPE_MIN_MXN} MXN</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Número de Bicis</Label>
        <Input
          type="number"
          min={1}
          step="1"
          placeholder={`Default: ${SPECIAL_CLASS_BIKE_LAYOUT.bikeCount}`}
          value={form.maxCapacity}
          onChange={(e) => setForm((p) => ({ ...p, maxCapacity: e.target.value }))}
          className="bg-white border-gray-200 text-zinc-900"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Mensaje para clientes <span className="text-gray-400 font-normal">(opcional)</span></Label>
        <Input
          type="text"
          maxLength={255}
          placeholder="Ej: Clase de ciclismo con DJ en vivo, cupo limitado"
          value={form.specialMessage}
          onChange={(e) => setForm((p) => ({ ...p, specialMessage: e.target.value }))}
          className="bg-white border-gray-200 text-zinc-900"
        />
      </div>
    </div>
  )

  const weekLabel = (() => {
    const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })
    return `${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM")}`
  })()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#4A102A]">Clases Especiales</h2>
          <p className="text-sm text-gray-500">Clases con costo variable en créditos especiales</p>
        </div>
        <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={openCreate}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Clase Especial
        </Button>
      </div>

      {/* Toggle de vista */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setViewMode("week")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "week"
              ? "bg-white text-[#4A102A] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          Esta semana
          <span className="text-xs text-gray-400">{weekLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("upcoming")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "upcoming"
              ? "bg-white text-[#4A102A] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
          Próximas
        </button>
      </div>

      {isFetching ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Loader2 className="h-8 w-8 text-[#4A102A] animate-spin" />
            <p className="text-gray-500 text-sm">Cargando clases especiales...</p>
          </CardContent>
        </Card>
      ) : classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {viewMode === "week"
                ? "No hay clases especiales esta semana"
                : "No hay clases especiales próximas"}
            </p>
            <p className="text-gray-400 text-sm mt-1">Crea la primera clase especial con el botón de arriba</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {classes.map((cls) => {
            const displayDate = convertUtcToLocalDateForDisplay(cls.date)
            const dateStr = displayDate.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
            return (
              <Card key={cls.id} className="border-l-4 border-l-[#4A102A]">
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-[#4A102A] text-lg">{cls.classType.name}</h3>
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          <Star className="h-3 w-3 mr-1" />
                          Especial
                        </Badge>
                        <Badge variant="outline" className="border-[#4A102A] text-[#4A102A]">
                          ${cls.specialPrice} MXN
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium capitalize">{dateStr}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(cls.time)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {cls.totalReservations}/{cls.maxCapacity} lugares
                        </div>
                        <div>
                          {cls.branch_id ? getBranchName(cls.branch_id) : "Sin sucursal"}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Instructor: {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                      </div>
                      {cls.specialMessage && (
                        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-1">
                          "{cls.specialMessage}"
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 items-start">
                      <Button variant="outline" size="sm" className="border-gray-200" onClick={() => openEdit(cls)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => openDelete(cls)} disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Nueva Clase Especial</DialogTitle>
            <DialogDescription className="text-gray-600">
              Las clases especiales tienen un costo en créditos especiales de costo variable.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {classFormFields(createForm, setCreateForm)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-gray-200 text-zinc-900">Cancelar</Button>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={handleCreate} disabled={isLoading}>
              {isLoading ? "Creando..." : "Crear Clase Especial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setSelectedClass(null) }}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Clase Especial</DialogTitle>
            <DialogDescription className="text-gray-600">Modifica los detalles de la clase especial</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {classFormFields(editForm, setEditForm)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedClass(null) }} className="border-gray-200 text-zinc-900">Cancelar</Button>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white" onClick={handleEdit} disabled={isLoading}>
              {isLoading ? "Actualizando..." : "Actualizar Clase Especial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => { setIsDeleteOpen(open); if (!open) setClassToDelete(null) }}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar clase especial</DialogTitle>
            <DialogDescription className="text-gray-600">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {classToDelete && (
            <div className="py-2 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-red-500 fill-red-500" />
                  <span className="font-semibold text-red-700">{classToDelete.classType.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-gray-600">
                  <span>Fecha</span>
                  <span className="font-medium text-right capitalize">
                    {convertUtcToLocalDateForDisplay(classToDelete.date).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span>Hora</span>
                  <span className="font-medium text-right">{formatTime(classToDelete.time)}</span>
                  <span>Precio</span>
                  <span className="font-medium text-right">${classToDelete.specialPrice} MXN</span>
                  <span>Sucursal</span>
                  <span className="font-medium text-right">{getBranchName(classToDelete.branch_id ?? "")}</span>
                  {classToDelete.totalReservations > 0 && (
                    <>
                      <span className="text-red-600 font-medium">Reservas activas</span>
                      <span className="font-bold text-red-600 text-right">{classToDelete.totalReservations}</span>
                    </>
                  )}
                </div>
                {classToDelete.totalReservations > 0 && (
                  <p className="text-xs text-red-600 bg-red-100 rounded-lg px-3 py-2 mt-1">
                    Hay {classToDelete.totalReservations} {classToDelete.totalReservations === 1 ? "alumno reservado" : "alumnos reservados"}. Al eliminar, sus reservas quedarán canceladas.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsDeleteOpen(false); setClassToDelete(null) }}
              disabled={isLoading}
              className="border-gray-200 text-zinc-900"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
