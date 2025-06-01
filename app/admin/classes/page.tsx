"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format, addDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Search, Clock, Users, Edit, Trash2, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
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
  { key: "monday", label: "Lunes", value: 1 },
  { key: "tuesday", label: "Martes", value: 2 },
  { key: "wednesday", label: "Miércoles", value: 3 },
  { key: "thursday", label: "Jueves", value: 4 },
  { key: "friday", label: "Viernes", value: 5 },
  { key: "saturday", label: "Sábado", value: 6 },
  { key: "sunday", label: "Domingo", value: 0 },
]

export default function ClassesPage() {
  const { toast } = useToast()

  // Estados generales
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [filteredClasses, setFilteredClasses] = useState<ScheduledClass[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [viewMode, setViewMode] = useState<"day" | "week">("day")
  const [showingToday, setShowingToday] = useState(false)

  // Estados para tipos de clase
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClassTypeOpen, setIsNewClassTypeOpen] = useState(false)
  const [newClassTypeForm, setNewClassTypeForm] = useState({
    name: "",
    description: "",
    duration: "45",
    intensity: "",
    category: "",
    capacity: "10",
  })

  // Estados para programación de clases
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    classTypeId: "",
    instructorId: "",
    time: "",
    maxCapacity: "10",
    selectedDays: [] as number[], // 0=domingo, 1=lunes, etc.
  })

  // Fechas para navegación
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Semana comienza el lunes
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Cargar datos iniciales
  useEffect(() => {
    loadClassTypes()
    loadInstructors()
    loadScheduledClasses()
  }, [])

  // Recargar clases cuando cambia la fecha seleccionada
  useEffect(() => {
    loadScheduledClasses()
  }, [selectedDate])

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
      // Cargar clases para la semana de la fecha seleccionada
      const startDate = format(weekStart, "yyyy-MM-dd")
      const endDate = format(weekEnd, "yyyy-MM-dd")

      const response = await fetch(`/api/admin/scheduled-classes?startDate=${startDate}&endDate=${endDate}`)
      if (response.ok) {
        const data = await response.json()
        setScheduledClasses(data)
        setFilteredClasses(data) // Inicialmente, filteredClasses contiene todas las clases
        
        // Si estamos mostrando solo las de hoy, filtramos de nuevo
        if (showingToday) {
          filterTodayClasses()
        }
      }
    } catch (error) {
      console.error("Error loading scheduled classes:", error)
    }
  }
  
  const filterTodayClasses = () => {
    // Obtenemos la fecha de hoy para filtrar
    const today = new Date()
    const todayString = format(today, "yyyy-MM-dd")
    
    // Filtramos las clases para mostrar solo las de hoy
    const todayClasses = scheduledClasses.filter((cls) => {
      try {
        if (!cls.date) return false
        
        // Si la fecha ya tiene el formato yyyy-MM-dd
        if (cls.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return cls.date === todayString
        }
        
        // Si es otro formato, simplemente comparamos los strings de fecha
        const classDate = new Date(cls.date)
        if (!isNaN(classDate.getTime())) {
          return format(classDate, "yyyy-MM-dd") === todayString
        }
        
        return false
      } catch (error) {
        return false
      }
    })
    
    // Actualizamos el estado con las clases de hoy
    setFilteredClasses(todayClasses)
    setShowingToday(true)
    
    // Actualizamos la fecha seleccionada para que coincida con hoy
    setSelectedDate(today)
    
    // También cambiamos a vista de día para una mejor visualización
    setViewMode("day")
    
    toast({
      title: "Clases de hoy",
      description: `Mostrando clases para hoy: ${format(today, "EEEE, d 'de' MMMM", { locale: es })}`,
    })
  }
  
  const resetFilter = () => {
    // Restaurar todas las clases sin filtro
    setFilteredClasses(scheduledClasses)
    setShowingToday(false)
    
    toast({
      title: "Filtro eliminado",
      description: "Mostrando todas las clases programadas"
    })
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
        headers: { "Content-Type": "application/json" },
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

  const handleScheduleClasses = async () => {
    if (
      !scheduleForm.classTypeId ||
      !scheduleForm.instructorId ||
      !scheduleForm.time ||
      scheduleForm.selectedDays.length === 0
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
      // Crear clases para cada día seleccionado
      const promises = scheduleForm.selectedDays.map(async (dayOfWeek) => {
        // Encontrar la próxima fecha que coincida con el día de la semana sin conversiones de zona horaria
        let targetDate = new Date(selectedDate)
        // Calculamos el día de la semana actual (0-6, domingo-sábado)
        const currentDay = targetDate.getDay()
        // Calculamos cuántos días tenemos que agregar para llegar al día seleccionado
        const daysToAdd = (dayOfWeek - currentDay + 7) % 7
        // Ajustamos la fecha según corresponda
        if (daysToAdd === 0 && !isSameDay(targetDate, selectedDate)) {
          targetDate = addDays(targetDate, 7)
        } else {
          targetDate = addDays(targetDate, daysToAdd)
        }

        // Formato como yyyy-MM-dd sin ajustes de zona horaria
        const dateString = format(targetDate, "yyyy-MM-dd")

        return fetch("/api/admin/scheduled-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classTypeId: scheduleForm.classTypeId,
            instructorId: scheduleForm.instructorId,
            date: dateString,
            time: scheduleForm.time,
            maxCapacity: scheduleForm.maxCapacity,
          }),
        })
      })

      const results = await Promise.all(promises)
      const successCount = results.filter((r) => r.ok).length
      const errorCount = results.length - successCount

      if (successCount > 0) {
        // Crear mensaje personalizado para los días programados
        const dayNames = scheduleForm.selectedDays.map(dayValue => {
          const day = weekDays.find(d => d.value === dayValue);
          return day ? day.label.toLowerCase() : '';
        }).filter(Boolean);
        
        let message = '';
        if (dayNames.length === 1) {
          message = `Clase programada exitosamente para el ${dayNames[0].toLowerCase()} ${format(new Date(), "d 'de' MMMM", { locale: es })}`;
        } else if (dayNames.length > 1) {
          const lastDay = dayNames.pop();
          message = `Clases programadas para ${dayNames.join(', ')} y ${lastDay} de esta semana`;
        }
        
        toast({
          title: "Éxito",
          description: message || `${successCount} clase(s) programada(s) exitosamente${errorCount > 0 ? `. ${errorCount} falló(s)` : ""}`,
        })
        setIsScheduleDialogOpen(false)
        setScheduleForm({
          classTypeId: "",
          instructorId: "",
          time: "",
          maxCapacity: "10",
          selectedDays: [],
        })
        loadScheduledClasses()
      } else {
        toast({
          title: "Error",
          description: "No se pudo programar ninguna clase",
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

  const handleDeleteClassType = async (classTypeId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este tipo de clase?")) return

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
    if (!confirm("¿Estás seguro de que quieres eliminar esta clase programada?")) return

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

  const formatTime = (timeString: string): string => {
    if (!timeString) return "Hora no disponible"
    // Si tiene formato ISO con T, extraemos solo la parte de hora:minutos
    if (timeString.includes("T")) {
      const timePartMatch = timeString.match(/T(\d{2}:\d{2})/)
      if (timePartMatch && timePartMatch[1]) {
        return timePartMatch[1] // Devolvemos HH:MM sin ajuste de zona horaria
      }
    }
    // Si ya tiene formato HH:MM:SS o HH:MM, tomamos solo HH:MM
    if (/^[0-2]\d:[0-5]\d/.test(timeString)) {
      return timeString.substring(0, 5)
    }
    return timeString
  }

  const formatDateSafely = (dateString: string, formatStr: string): string => {
    if (!dateString) return "Fecha no disponible"
    try {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Simplemente crear la fecha a partir del string sin conversiones de zona horaria
        const [year, month, day] = dateString.split("-").map(Number)
        const date = new Date(year, month - 1, day)
        if (isNaN(date.getTime())) return "Fecha inválida"
        return format(date, formatStr, { locale: es })
      }
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Fecha inválida"
      return format(date, formatStr, { locale: es })
    } catch (error) {
      return "Error en fecha"
    }
  }

  const getClassesForDate = (date: Date) => {
    // Formato simple de fecha sin ajustes de zona horaria
    const dateString = format(date, "yyyy-MM-dd")
    // Usamos filteredClasses en lugar de scheduledClasses para respetar el filtro
    return filteredClasses
      .filter((cls) => {
        try {
          let classDateString = ""
          if (cls.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Si ya está en formato yyyy-MM-dd, usamos directamente
            classDateString = cls.date
          } else {
            // Simplemente convertimos a Date y luego a formato de cadena
            const classDate = new Date(cls.date)
            if (!isNaN(classDate.getTime())) {
              classDateString = format(classDate, "yyyy-MM-dd")
            }
          }
          return classDateString === dateString
        } catch (error) {
          return false
        }
      })
      .sort((a, b) => formatTime(a.time).localeCompare(formatTime(b.time)))
  }

  const filteredClassTypes = classTypes.filter((classType) => {
    return (
      classType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classType.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classType.intensity.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleDayToggle = (dayValue: number) => {
    setScheduleForm((prev) => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayValue)
        ? prev.selectedDays.filter((d) => d !== dayValue)
        : [...prev.selectedDays, dayValue],
    }))
  }

  const navigateWeek = (direction: number) => {
    setSelectedDate(addDays(selectedDate, direction * 7))
  }

  const navigateDay = (direction: number) => {
    setSelectedDate(addDays(selectedDate, direction))
  }

  const selectDay = (date: Date) => {
    setSelectedDate(date)
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Clases</h1>
          <p className="text-gray-600">Administra los tipos de clases y programa horarios</p>
        </div>
      </div>

      <Tabs defaultValue="class-types" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
          <TabsTrigger
            value="class-types"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Tipos de Clases
          </TabsTrigger>
          <TabsTrigger
            value="calendar-view"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Programar Clases
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
              <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-[#4A102A]">Crear Nuevo Tipo de Clase</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Complete los detalles para crear un nuevo tipo de clase
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre de la Clase *</Label>
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
                      <Label htmlFor="category">Categoría *</Label>
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
                      <Label htmlFor="duration">Duración *</Label>
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
                      <Label htmlFor="intensity">Intensidad *</Label>
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
                      <span>Cap: {classType.capacity}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{classType.category}</span>
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

        {/* TAB 2: PROGRAMAR CLASES */}
        <TabsContent value="calendar-view">
          <Card className="bg-white border-gray-200 mb-6">
            <CardContent className="p-4">
              {/* Selector de vista y filtro de hoy */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={viewMode === "day" ? "default" : "outline"}
                    onClick={() => setViewMode("day")}
                    className={viewMode === "day" ? "bg-[#4A102A] text-white" : ""}
                  >
                    Día
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "default" : "outline"}
                    onClick={() => setViewMode("week")}
                    className={viewMode === "week" ? "bg-[#4A102A] text-white" : ""}
                  >
                    Semana
                  </Button>
                  
                  <Button 
                    variant={showingToday ? "default" : "outline"}
                    className={`ml-2 ${showingToday ? "bg-[#4A102A] text-white" : "border-[#4A102A] text-[#4A102A]"}`}
                    onClick={showingToday ? resetFilter : filterTodayClasses}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {showingToday ? "Ver todas las clases" : "Ir a clases de hoy"}
                  </Button>
                </div>

                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Programar Clases
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-[#4A102A]">Programar Nuevas Clases</DialogTitle>
                      <DialogDescription className="text-gray-600 font-medium">
                        Selecciona la fecha, hora y tipo de clase. Puedes repetirla en varios días si lo deseas.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo de Clase *</Label>
                          <Select
                            value={scheduleForm.classTypeId}
                            onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, classTypeId: value }))}
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
                          <Label>Instructor *</Label>
                          <Select
                            value={scheduleForm.instructorId}
                            onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, instructorId: value }))}
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
                          <Label>Hora *</Label>
                          <Select
                            value={scheduleForm.time}
                            onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, time: value }))}
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
                          <Label>Capacidad</Label>
                          <Input
                            type="number"
                            value={scheduleForm.maxCapacity}
                            onChange={(e) => setScheduleForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
                            className="bg-white border-gray-200 text-zinc-900"
                            min="1"
                            max="20"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>Días de la Semana *</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {weekDays.map((day) => (
                            <div key={day.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={day.key}
                                checked={scheduleForm.selectedDays.includes(day.value)}
                                onCheckedChange={() => handleDayToggle(day.value)}
                              />
                              <Label htmlFor={day.key} className="text-sm font-normal cursor-pointer">
                                {day.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Se programará una clase para cada día seleccionado</p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsScheduleDialogOpen(false)}
                        className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                      >
                        Cancelar
                      </Button>
                      <Button
                        className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                        onClick={handleScheduleClasses}
                        disabled={isLoading}
                      >
                        {isLoading ? "Programando..." : "Programar Clases"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Selector de fecha horizontal */}
              <div className="flex items-center justify-between mb-4">
                {viewMode === "day" ? (
                  <>
                    <Button variant="outline" size="icon" onClick={() => navigateDay(-1)} className="h-8 w-8 p-0">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-[#4A102A]">
                        {formatDateSafely(format(selectedDate, "yyyy-MM-dd"), "EEEE, d 'de' MMMM")}
                      </h3>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => navigateDay(1)} className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)} className="h-8 w-8 p-0">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-[#4A102A]">
                        {formatDateSafely(format(weekStart, "yyyy-MM-dd"), "d 'de' MMMM")} -
                        {formatDateSafely(format(weekEnd, "yyyy-MM-dd"), " d 'de' MMMM")}
                      </h3>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => navigateWeek(1)} className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Días de la semana (solo en vista semanal) */}
              {viewMode === "week" && (
                <div className="flex overflow-x-auto pb-2 mb-4">
                  {daysInWeek.map((day, index) => (
                    <Button
                      key={index}
                      variant={isSameDay(day, selectedDate) ? "default" : "outline"}
                      className={`mr-2 min-w-[100px] ${isSameDay(day, selectedDate) ? "bg-[#4A102A] text-white" : ""}`}
                      onClick={() => selectDay(day)}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs">{format(day, "EEEE", { locale: es })}</span>
                        <span className="font-bold">{format(day, "d")}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de clases */}
          <div className="space-y-4">
            {viewMode === "day" ? (
              // Vista de día
              <>
                <h2 className="text-xl font-bold text-[#4A102A] mb-4">
                  Clases del {formatDateSafely(format(selectedDate, "yyyy-MM-dd"), "d 'de' MMMM")}
                </h2>
                {getClassesForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay clases programadas para este día</p>
                    <p className="text-sm text-gray-400">Usa el botón "Programar Clases" para agregar nuevas clases</p>
                  </div>
                ) : (
                  getClassesForDate(selectedDate).map((cls) => (
                    <Card key={cls.id} className="border border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-[#4A102A] text-lg">{cls.classType.name}</h3>
                              <span className="text-lg font-semibold text-gray-700">{formatTime(cls.time)}</span>
                            </div>

                            <p className="text-gray-600 mb-2">
                              Instructor: {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                            </p>

                            <div className="flex items-center gap-6 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity} inscritos
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {cls.classType.duration} minutos
                              </span>
                              {cls.waitlist.length > 0 && (
                                <span className="text-orange-600">Lista de espera: {cls.waitlist.length}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
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
                      </CardContent>
                    </Card>
                  ))
                )}
              </>
            ) : (
              // Vista de semana
              <>
                <h2 className="text-xl font-bold text-[#4A102A] mb-4">Clases de la semana</h2>
                <div className="space-y-6">
                  {daysInWeek.map((day, index) => {
                    const classesForDay = getClassesForDate(day)
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="font-semibold text-[#4A102A] mb-3 flex items-center">
                          <span className="capitalize">{format(day, "EEEE", { locale: es })}</span>
                          <span className="ml-2 text-gray-600">{format(day, "d 'de' MMMM")}</span>
                        </h3>

                        {classesForDay.length === 0 ? (
                          <p className="text-gray-500 text-center py-2">No hay clases programadas</p>
                        ) : (
                          <div className="space-y-2">
                            {classesForDay.map((cls) => (
                              <div
                                key={cls.id}
                                className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="font-medium text-[#4A102A]">{formatTime(cls.time)}</div>
                                  <div>{cls.classType.name}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-sm text-gray-600">
                                    {cls.instructor.user.firstName} {cls.instructor.user.lastName}
                                  </div>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Users className="h-3 w-3" />
                                    <span>
                                      {cls.maxCapacity - cls.availableSpots}/{cls.maxCapacity}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-gray-400 hover:text-[#4A102A]"
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-gray-400 hover:text-[#C5172E]"
                                      onClick={() => handleDeleteSchedule(cls.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
