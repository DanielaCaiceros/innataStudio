"use client"

import { useState, useEffect } from "react"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth" // Asegúrate
import { NextApiRequest, NextApiResponse } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { format, startOfWeek, endOfWeek, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Search, Clock, Users, Edit, Trash2, CalendarIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// Interfaces
interface ClassType {
  id: number
  name: string
  description?: string
  duration: number
  intensity: string
  category: string
  capacity: number
}

interface Instructor {
  id: number
  user: {
    firstName: string
    lastName: string
  }
  specialties: string[]
}

interface ScheduledClass {
  id: number
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  status: string
  classType: ClassType
  instructor: {
    id: number
    user: {
      firstName: string
      lastName: string
    }
  }
  reservations: Array<{
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }>
  waitlist: Array<{
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }>
}

const timeSlots = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
]

const weekDays = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]


export default function ClassesPage() {
  const { toast } = useToast()

  // Estados para tipos de clase
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClassTypeOpen, setIsNewClassTypeOpen] = useState(false)
  const [isEditClassTypeOpen, setIsEditClassTypeOpen] = useState(false)
  const [selectedClassType, setSelectedClassType] = useState<ClassType | null>(null)

  // Estados para horarios
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [isNewScheduleOpen, setIsNewScheduleOpen] = useState(false)
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduledClass | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Formularios
  const [newClassTypeForm, setNewClassTypeForm] = useState({
    name: "",
    description: "",
    duration: "45",
    intensity: "",
    category: "",
    capacity: "10",
  })

  const [newScheduleForm, setNewScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    maxCapacity: "10",
  })

  // Añadir el estado para el formulario de edición
  const [editScheduleForm, setEditScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    date: "",
    time: "",
    maxCapacity: "10",
  })

  // Obtener fechas de la semana seleccionada
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })

  // Cargar datos iniciales
  useEffect(() => {
    loadClassTypes()
    loadInstructors()
  }, [])

  // Cargar clases programadas cuando cambia la semana
  useEffect(() => {
    loadScheduledClasses()
  }, [selectedWeek])

  // Añadir la función para manejar la edición
  const handleEditSchedule = async () => {
    if (!selectedSchedule) return

    if (
      !editScheduleForm.classTypeId ||
      !editScheduleForm.instructorId ||
      !editScheduleForm.date ||
      !editScheduleForm.time
    ) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/scheduled-classes/${selectedSchedule.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(editScheduleForm),
        
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Clase actualizada exitosamente",
        })
        setIsEditScheduleOpen(false)
        await loadScheduledClasses()
        console.log("selectedSchedule after update and reload:", selectedSchedule)
        if (selectedSchedule) {
          console.log("selectedSchedule.time (raw):", selectedSchedule.time)
          console.log("selectedSchedule.time (formatted by formatTime):", formatTime(selectedSchedule.time))
        }
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al actualizar la clase",
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
      setIsLoading(false)
    }
  }

  // Añadir el efecto para cargar los datos de la clase seleccionada
  useEffect(() => {
    if (selectedSchedule) {
      setEditScheduleForm({
        classTypeId: selectedSchedule.classType.id.toString(),
        instructorId: selectedSchedule.instructor.id.toString(),
        date: format(new Date(selectedSchedule.date), "yyyy-MM-dd"),
        time: formatTime(selectedSchedule.time),
        maxCapacity: selectedSchedule.maxCapacity.toString(),
      })
    }
  }, [selectedSchedule])

  // Funciones para tipos de clase
  const loadClassTypes = async () => {
    try {
      const response = await fetch("/api/admin/class-types")
      if (response.ok) {
        const data = await response.json()
        setClassTypes(data)
      }
    } catch (error) {
      console.error("Error loading class types:", error)
    }
  }

  const loadInstructors = async () => {
    try {
      const response = await fetch("/api/admin/instructors")
      if (response.ok) {
        const data = await response.json()
        setInstructors(data)
      }
    } catch (error) {
      console.error("Error loading instructors:", error)
    }
  }

  const loadScheduledClasses = async () => {
    try {
      const startDate = format(weekStart, "yyyy-MM-dd")
      const endDate = format(weekEnd, "yyyy-MM-dd")

      const response = await fetch(`/api/admin/scheduled-classes?startDate=${startDate}&endDate=${endDate}`)

      if (response.ok) {
        const data = await response.json()
        setScheduledClasses(data)
      }
    } catch (error) {
      console.error("Error loading scheduled classes:", error)
    }
  }

  const handleCreateClassType = async () => {
    if (
      !newClassTypeForm.name ||
      !newClassTypeForm.duration ||
      !newClassTypeForm.intensity ||
      !newClassTypeForm.category
    ) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben ser completados",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/class-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClassTypeForm),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Tipo de clase creado exitosamente",
        })
        setIsNewClassTypeOpen(false)
        setNewClassTypeForm({
          name: "",
          description: "",
          duration: "45",
          intensity: "",
          category: "",
          capacity: "10",
        })
        loadClassTypes()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al crear el tipo de clase",
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
      setIsLoading(false)
    }
  }

  const handleCreateSchedule = async () => {
    if (
      !newScheduleForm.classTypeId ||
      !newScheduleForm.instructorId ||
      !newScheduleForm.date ||
      !newScheduleForm.time
    ) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      console.log("Sending schedule data:", newScheduleForm) // Debug log

      const response = await fetch("/api/admin/scheduled-classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newScheduleForm),
      })

      if (response.ok) {
        const createdClass = await response.json()
        console.log("Created class:", createdClass) // Debug log

        toast({
          title: "Éxito",
          description: "Clase programada exitosamente",
        })
        setIsNewScheduleOpen(false)
        setNewScheduleForm({
          classTypeId: "",
          instructorId: "",
          date: "",
          time: "",
          maxCapacity: "10",
        })

        // Recargar las clases
        await loadScheduledClasses()
      } else {
        const error = await response.json()
        console.error("API Error:", error) // Debug log
        toast({
          title: "Error",
          description: error.error || "Error al programar la clase",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Network Error:", error) // Debug log
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClassType = async (classTypeId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este tipo de clase?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/class-types/${classTypeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Tipo de clase eliminado exitosamente",
        })
        loadClassTypes()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al eliminar el tipo de clase",
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

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta clase programada?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/scheduled-classes/${scheduleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Clase eliminada exitosamente",
        })
        loadScheduledClasses()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al eliminar la clase",
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

  // Funciones auxiliares para horarios
  const getClassesForDay = (dayOffset: number) => {
    const targetDate = addDays(weekStart, dayOffset)
    const targetDateString = format(targetDate, "yyyy-MM-dd")

    return scheduledClasses.filter((cls) => {
      const classDateString = format(new Date(cls.date), "yyyy-MM-dd")
      return classDateString === targetDateString
    })
  }

const formatTime = (timeString: string): string => {
  if (!timeString) return 'Hora no disponible';

  // Si es una cadena ISO 8601 (contiene 'T'), extraer la parte HH:mm
  if (typeof timeString === 'string' && timeString.includes('T')) {
    try {
      // Buscar la parte de la hora HH:mm:ss antes de la zona horaria
      const timePartMatch = timeString.match(/T(\d{2}:\d{2})/);
      if (timePartMatch && timePartMatch[1]) {
        return timePartMatch[1]; // Devuelve solo HH:mm
      }
      // Fallback si no coincide, aunque el formato ISO es estándar
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
         // Si por alguna razón necesitamos el objeto Date (e.g., si el formato varía),
         // formatear en UTC para evitar la conversión de zona horaria local accidental.
         // Sin embargo, extraer la cadena es más directo si solo queremos HH:mm tal cual.
         // const hours = date.getUTCHours().toString().padStart(2, '0');
         // const minutes = date.getUTCMinutes().toString().padStart(2, '0');
         // return `${hours}:${minutes}`;
         // O usar date-fns-tz si se necesita manejo explícito de zonas horarias
      }
    } catch (error) {
      console.error("Error parsing ISO time string:", timeString, error);
      return 'Hora no disponible';
    }
  }

  // Si ya es un string en formato HH:mm o similar, intentar devolverlo directamente
  if (typeof timeString === 'string' && /^[0-2]\d:[0-5]\d/.test(timeString)) {
     return timeString.substring(0, 5); // Asegurar HH:mm
  }

  // Fallback para otros casos inesperados
  console.warn("Unexpected time format:", timeString);
  return typeof timeString === 'string' ? timeString : 'Hora no disponible';
};

  // Filtrar tipos de clase
  const filteredClassTypes = classTypes.filter((classType) => {
    return (
      classType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classType.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classType.intensity.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Clases y Horarios</h1>
          <p className="text-gray-600">Administra los tipos de clases y sus horarios semanales</p>
        </div>
      </div>

      <Tabs defaultValue="class-types" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-gray-100">
          <TabsTrigger
            value="class-types"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Tipos de Clases
          </TabsTrigger>
          <TabsTrigger
            value="weekly-schedule"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Horario Semanal
          </TabsTrigger>
          <TabsTrigger
            value="calendar-view"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Vista Calendario
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: TIPOS DE CLASES */}
        <TabsContent value="class-types">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, categoría o intensidad..."
                  className="pl-8 bg-white border-gray-200 text-zinc-900 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Dialog open={isNewClassTypeOpen} onOpenChange={setIsNewClassTypeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                  <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Tipo de Clase
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-zinc-900">
                <DialogHeader>
                  <DialogTitle className="text-[#4A102A]">Crear Nuevo Tipo de Clase</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Complete los detalles para crear un nuevo tipo de clase
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre de la Clase</Label>
                      <Input
                        type="text"
                        id="name"
                        placeholder="Ej: POWER CYCLE"
                        className="bg-white border-gray-200 text-zinc-900"
                        value={newClassTypeForm.name}
                        onChange={(e) => setNewClassTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría</Label>
                      <Select
                        value={newClassTypeForm.category}
                        onValueChange={(value) => setNewClassTypeForm((prev) => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          <SelectItem value="ritmo">Ritmo</SelectItem>
                          <SelectItem value="potencia">Potencia</SelectItem>
                          <SelectItem value="resistencia">Resistencia</SelectItem>
                          <SelectItem value="hiit">HIIT</SelectItem>
                          <SelectItem value="recuperacion">Recuperación</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Duración</Label>
                      <Select
                        value={newClassTypeForm.duration}
                        onValueChange={(value) => setNewClassTypeForm((prev) => ({ ...prev, duration: value }))}
                      >
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar duración" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                          <SelectItem value="75">75 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intensity">Intensidad</Label>
                      <Select
                        value={newClassTypeForm.intensity}
                        onValueChange={(value) => setNewClassTypeForm((prev) => ({ ...prev, intensity: value }))}
                      >
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar intensidad" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          <SelectItem value="baja">Baja</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="media-alta">Media-Alta</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="muy-alta">Muy Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacidad</Label>
                      <Input
                        type="number"
                        id="capacity"
                        placeholder="10"
                        value={newClassTypeForm.capacity}
                        onChange={(e) => setNewClassTypeForm((prev) => ({ ...prev, capacity: e.target.value }))}
                        className="bg-white border-gray-200 text-zinc-900"
                        min="1"
                        max="20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      type="text"
                      id="description"
                      placeholder="Breve descripción de la clase"
                      className="bg-white border-gray-200 text-zinc-900"
                      value={newClassTypeForm.description}
                      onChange={(e) => setNewClassTypeForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsNewClassTypeOpen(false)}
                    className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                    onClick={handleCreateClassType}
                    disabled={isLoading}
                  >
                    {isLoading ? "Creando..." : "Crear Clase"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClassTypes.map((classType) => (
              <Card key={classType.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-[#4A102A]">{classType.name}</h3>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#4A102A]">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-[#C5172E]"
                        onClick={() => handleDeleteClassType(classType.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{classType.description}</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center text-gray-700 text-sm">
                      <Clock className="h-4 w-4 mr-2 text-[#85193C]" />
                      <span>{classType.duration} min</span>
                    </div>
                    <div className="flex items-center text-gray-700 text-sm">
                      <Users className="h-4 w-4 mr-2 text-[#85193C]" />
                      <span>Capacidad: {classType.capacity}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">Categoría: {classType.category}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs capitalize ${
                        classType.intensity === "baja"
                          ? "bg-green-500/20 text-green-700"
                          : classType.intensity === "media"
                            ? "bg-blue-500/20 text-blue-700"
                            : classType.intensity === "media-alta"
                              ? "bg-yellow-500/20 text-yellow-700"
                              : classType.intensity === "alta"
                                ? "bg-orange-500/20 text-orange-700"
                                : "bg-red-500/20 text-red-700"
                      }`}
                    >
                      {classType.intensity}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: HORARIO SEMANAL */}
        <TabsContent value="weekly-schedule">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#4A102A]">
                Semana del {format(weekStart, "d", { locale: es })} al{" "}
                {format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}
              </h2>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
                className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              >
                ← Semana Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              >
                Semana Siguiente →
              </Button>
              <Dialog open={isNewScheduleOpen} onOpenChange={setIsNewScheduleOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                    <CalendarIcon className="h-4 w-4 mr-2" /> Programar Clase
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-gray-200 text-zinc-900">
                  <DialogHeader>
                    <DialogTitle className="text-[#4A102A]">Programar Nueva Clase</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Complete los detalles para programar una nueva clase
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="classType">Tipo de Clase</Label>
                        <Select
                          value={newScheduleForm.classTypeId}
                          onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, classTypeId: value }))}
                        >
                          <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-zinc-900">
                            {classTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id.toString()}>
                                {type.name} ({type.duration} min)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="instructor">Instructor</Label>
                        <Select
                          value={newScheduleForm.instructorId}
                          onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, instructorId: value }))}
                        >
                          <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                            <SelectValue placeholder="Seleccionar instructor" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-zinc-900">
                            {instructors.map((instructor) => (
                              <SelectItem key={instructor.id} value={instructor.id.toString()}>
                                {instructor.user.firstName} {instructor.user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="date">Fecha</Label>
                        <Input
                          type="date"
                          value={newScheduleForm.date}
                          onChange={(e) => setNewScheduleForm((prev) => ({ ...prev, date: e.target.value }))}
                          className="bg-white border-gray-200 text-zinc-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="time">Hora</Label>
                        <Select
                          value={newScheduleForm.time}
                          onValueChange={(value) => setNewScheduleForm((prev) => ({ ...prev, time: value }))}
                        >
                          <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                            <SelectValue placeholder="Seleccionar hora" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-gray-200 text-zinc-900">
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="capacity">Capacidad Máxima</Label>
                        <Input
                          type="number"
                          value={newScheduleForm.maxCapacity}
                          onChange={(e) => setNewScheduleForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
                          className="bg-white border-gray-200 text-zinc-900"
                          min="1"
                          max="20"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsNewScheduleOpen(false)}
                      className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                      onClick={handleCreateSchedule}
                      disabled={isLoading}
                    >
                      {isLoading ? "Programando..." : "Programar Clase"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-8 gap-2 mb-4">
                    <div className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">Hora</div>
                    {weekDays.map((day, index) => (
                      <div key={day.key} className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">
                        <div>{day.label}</div>
                        <div className="text-sm font-normal text-gray-600">
                          {format(addDays(weekStart, index), "d/M")}
                        </div>
                      </div>
                    ))}
                  </div>

                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                      <div className="bg-gray-50 p-4 flex items-center justify-center text-gray-700 rounded-lg">
                        {time}
                      </div>
                      {weekDays.map((day, dayIndex) => {
                        const dayClasses = getClassesForDay(dayIndex).filter((cls) => formatTime(cls.time) === time)

                        return (
                          <div
                            key={`${day.key}-${time}`}
                            className={`p-2 rounded-lg min-h-[80px] ${
                              dayClasses.length > 0 ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-50"
                            }`}
                          >
                            {dayClasses.map((cls) => (
                              <div key={cls.id} className="relative group">
                                <div className="text-center">
                                  <p className="font-bold text-sm text-[#4A102A]">{cls.classType.name}</p>
                                  <p className="text-xs text-gray-600">
                                    {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                                  </p>
                                  <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                                    <Users className="h-3 w-3" />
                                    <span>
                                      {cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity}
                                    </span>
                                    <Clock className="h-3 w-3 ml-1" />
                                    <span>{cls.classType.duration}min</span>
                                  </div>
                                  {cls.waitlist.length > 0 && (
                                    <p className="text-xs text-orange-600 mt-1">
                                      Lista de espera: {cls.waitlist.length}
                                    </p>
                                  )}
                                </div>
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-gray-400 hover:text-[#4A102A]"
                                      onClick={() => {
                                        setSelectedSchedule(cls)
                                        setIsEditScheduleOpen(true)
                                      }}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-gray-400 hover:text-[#C5172E]"
                                      onClick={() => handleDeleteSchedule(cls.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: VISTA CALENDARIO */}
        <TabsContent value="calendar-view">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white border-gray-200 col-span-1">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A102A]">Seleccionar Fecha</CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden flex justify-center px-0">
                <div className="w-full max-w-[280px]">
                  <Calendar
                    mode="single"
                    selected={selectedWeek}
                    onSelect={(date) => date && setSelectedWeek(date)}
                    locale={es}
                    className="bg-white text-zinc-900"
                    classNames={{
                      day_selected: "bg-[#4A102A] text-white",
                      day_today: "bg-gray-100 text-zinc-900",
                      day: "text-zinc-900 hover:bg-gray-100",
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 col-span-1 md:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg text-[#4A102A]">Clases Programadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scheduledClasses.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No hay clases programadas para esta semana</p>
                  ) : (
                    scheduledClasses.map((cls) => (
                      <div key={cls.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-[#4A102A]">{cls.classType.name}</h3>
                            <p className="text-gray-600">
                              {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(cls.date), "EEEE, d 'de' MMMM", { locale: es })} - {formatTime(cls.time)}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity} inscritos
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {cls.classType.duration} minutos
                              </span>
                            </div>
                            {cls.waitlist.length > 0 && (
                              <p className="text-sm text-orange-600 mt-1">
                                Lista de espera: {cls.waitlist.length} personas
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                              onClick={() => {
                                setSelectedSchedule(cls)
                                setIsEditScheduleOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                              onClick={() => handleDeleteSchedule(cls.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Añadir el diálogo de edición después del diálogo de nueva clase */}
      <Dialog open={isEditScheduleOpen} onOpenChange={setIsEditScheduleOpen}>
        <DialogContent className="bg-white border-gray-200 text-zinc-900">
          <DialogHeader>
            <DialogTitle className="text-[#4A102A]">Editar Clase Programada</DialogTitle>
            <DialogDescription className="text-gray-600">
              Modifica los detalles de la clase programada
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editClassType">Tipo de Clase</Label>
                <Select
                  value={editScheduleForm.classTypeId}
                  onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, classTypeId: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {classTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editInstructor">Instructor</Label>
                <Select
                  value={editScheduleForm.instructorId}
                  onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, instructorId: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                    <SelectValue placeholder="Seleccionar instructor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id.toString()}>
                        {instructor.user.firstName} {instructor.user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDate">Fecha</Label>
                <Input
                  type="date"
                  value={editScheduleForm.date}
                  onChange={(e) => setEditScheduleForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="bg-white border-gray-200 text-zinc-900"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editTime">Hora</Label>
                <Select
                  value={editScheduleForm.time}
                  onValueChange={(value) => setEditScheduleForm((prev) => ({ ...prev, time: value }))}
                >
                  <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-zinc-900">
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCapacity">Capacidad Máxima</Label>
                <Input
                  type="number"
                  value={editScheduleForm.maxCapacity}
                  onChange={(e) => setEditScheduleForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
                  className="bg-white border-gray-200 text-zinc-900"
                  min="1"
                  max="20"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditScheduleOpen(false)}
              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
              onClick={handleEditSchedule}
              disabled={isLoading}
            >
              {isLoading ? "Actualizando..." : "Actualizar Clase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
