"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, startOfWeek, endOfWeek, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Edit, Trash2, Users, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ClassType {
  id: number
  name: string
  duration: number
  description?: string
}

interface Instructor {
  id: number
  user: {
    firstName: string
    lastName: string
  }
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

export default function SchedulePage() {
  const { toast } = useToast()
  const [selectedWeek, setSelectedWeek] = useState<Date>(new Date())
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [isNewClassOpen, setIsNewClassOpen] = useState(false)
  const [isEditClassOpen, setIsEditClassOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [newClassForm, setNewClassForm] = useState({
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

  // Cargar clases cuando cambia la semana
  useEffect(() => {
    loadScheduledClasses()
  }, [selectedWeek])

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

  const handleCreateClass = async () => {
    if (!newClassForm.classTypeId || !newClassForm.instructorId || !newClassForm.date || !newClassForm.time) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/scheduled-classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newClassForm),
      })

      if (response.ok) {
        toast({
          title: "Éxito",
          description: "Clase programada exitosamente",
        })
        setIsNewClassOpen(false)
        setNewClassForm({
          classTypeId: "",
          instructorId: "",
          date: "",
          time: "",
          maxCapacity: "10",
        })
        loadScheduledClasses()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al programar la clase",
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

  const handleDeleteClass = async (classId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta clase?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/scheduled-classes/${classId}`, {
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

  const getClassesForDay = (dayOffset: number) => {
    const targetDate = addDays(weekStart, dayOffset)
    return scheduledClasses.filter(
      (cls) => format(new Date(cls.date), "yyyy-MM-dd") === format(targetDate, "yyyy-MM-dd"),
    )
  }

  const formatTime = (timeString: string) => {
    const time = new Date(`1970-01-01T${timeString}`)
    return format(time, "HH:mm")
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Horarios</h1>
          <p className="text-gray-600">Administra los horarios de clases semanales</p>
        </div>

        <Dialog open={isNewClassOpen} onOpenChange={setIsNewClassOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
              <PlusCircle className="h-4 w-4 mr-2" /> Nueva Clase
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
                    value={newClassForm.classTypeId}
                    onValueChange={(value) => setNewClassForm((prev) => ({ ...prev, classTypeId: value }))}
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
                    value={newClassForm.instructorId}
                    onValueChange={(value) => setNewClassForm((prev) => ({ ...prev, instructorId: value }))}
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
                    value={newClassForm.date}
                    onChange={(e) => setNewClassForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="bg-white border-gray-200 text-zinc-900"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Select
                    value={newClassForm.time}
                    onValueChange={(value) => setNewClassForm((prev) => ({ ...prev, time: value }))}
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
                    value={newClassForm.maxCapacity}
                    onChange={(e) => setNewClassForm((prev) => ({ ...prev, maxCapacity: e.target.value }))}
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
                onClick={() => setIsNewClassOpen(false)}
                className="border-gray-200 text-zinc-900 hover:bg-gray-100"
              >
                Cancelar
              </Button>
              <Button
                className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                onClick={handleCreateClass}
                disabled={isLoading}
              >
                {isLoading ? "Programando..." : "Programar Clase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
          <TabsTrigger
            value="weekly"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Vista Semanal
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
          >
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg text-[#4A102A]">
                  Semana del {format(weekStart, "d", { locale: es })} al{" "}
                  {format(weekEnd, "d 'de' MMMM yyyy", { locale: es })}
                </CardTitle>
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
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-2 mb-4">
                <div className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">Hora</div>
                {weekDays.map((day, index) => (
                  <div key={day.key} className="bg-gray-100 p-4 font-bold text-center text-[#4A102A] rounded-lg">
                    <div>{day.label}</div>
                    <div className="text-sm font-normal text-gray-600">{format(addDays(weekStart, index), "d/M")}</div>
                  </div>
                ))}
              </div>

              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                  <div className="bg-gray-50 p-4 flex items-center justify-center text-gray-700 rounded-lg">{time}</div>
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
                                <p className="text-xs text-orange-600 mt-1">Lista de espera: {cls.waitlist.length}</p>
                              )}
                            </div>
                            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-[#4A102A]"
                                  onClick={() => {
                                    setSelectedClass(cls)
                                    setIsEditClassOpen(true)
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-gray-400 hover:text-[#C5172E]"
                                  onClick={() => handleDeleteClass(cls.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
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
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                              onClick={() => {
                                setSelectedClass(cls)
                                setIsEditClassOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                              onClick={() => handleDeleteClass(cls.id)}
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
    </div>
  )
}
