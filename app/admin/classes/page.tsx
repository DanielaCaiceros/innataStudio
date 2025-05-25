"use client"

import { useState } from "react"
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
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PlusCircle, Search, Clock, Users, Edit, Trash2 } from "lucide-react"

// Datos de ejemplo
const classes = [
  {
    id: 1,
    name: "RHYTHM RIDE",
    description:
      "Pedalea al ritmo de la música con esta clase energética que combina intervalos y coreografía. Perfecta para todos los niveles.",
    instructor: "Carlos Mendez",
    duration: "45 min",
    capacity: 10,
    enrolled: 7,
    intensity: "Media",
    category: "ritmo",
  },
  {
    id: 2,
    name: "POWER CYCLE",
    description:
      "Enfocado en potencia y resistencia. Prepárate para un desafío intenso con intervalos de alta intensidad que te llevarán al límite.",
    instructor: "Ana Torres",
    duration: "60 min",
    capacity: 10,
    enrolled: 10,
    intensity: "Alta",
    category: "potencia",
  },
  {
    id: 3,
    name: "ENDURANCE RIDE",
    description:
      "Mejora tu resistencia cardiovascular con esta clase de ritmo constante y desafiante. Ideal para mejorar tu capacidad aeróbica.",
    instructor: "Miguel Ángel",
    duration: "75 min",
    capacity: 10,
    enrolled: 4,
    intensity: "Media-Alta",
    category: "resistencia",
  },
  {
    id: 4,
    name: "HIIT CYCLE",
    description:
      "Entrenamiento de intervalos de alta intensidad para maximizar la quema de calorías en poco tiempo. Alternando esfuerzos máximos y recuperación.",
    instructor: "Laura Gómez",
    duration: "30 min",
    capacity: 10,
    enrolled: 8,
    intensity: "Muy Alta",
    category: "hiit",
  },
  {
    id: 5,
    name: "RECOVERY RIDE",
    description:
      "Sesión de recuperación activa con resistencia ligera y enfoque en técnica. Perfecta para días de descanso activo o principiantes.",
    instructor: "Carlos Mendez",
    duration: "45 min",
    capacity: 10,
    enrolled: 3,
    intensity: "Baja",
    category: "recuperacion",
  },
  {
    id: 6,
    name: "RHYTHM & STRENGTH",
    description:
      "Combina el ciclismo rítmico con segmentos de entrenamiento de fuerza fuera de la bicicleta. Una clase completa para todo el cuerpo.",
    instructor: "Ana Torres",
    duration: "60 min",
    capacity: 10,
    enrolled: 6,
    intensity: "Media-Alta",
    category: "ritmo",
  },
]

// Datos para el horario semanal
const weeklySchedule = [
  {
    day: "Lunes",
    classes: [
      {
        time: "07:00",
        name: "RHYTHM RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 7,
      },
      { time: "12:00", name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min", capacity: 10, enrolled: 8 },
      { time: "18:00", name: "POWER CYCLE", instructor: "Ana Torres", duration: "60 min", capacity: 10, enrolled: 10 },
      {
        time: "19:30",
        name: "RHYTHM RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 5,
      },
    ],
  },
  {
    day: "Martes",
    classes: [
      { time: "07:00", name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min", capacity: 10, enrolled: 6 },
      {
        time: "12:00",
        name: "RECOVERY RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 3,
      },
      {
        time: "18:00",
        name: "ENDURANCE RIDE",
        instructor: "Miguel Ángel",
        duration: "75 min",
        capacity: 10,
        enrolled: 4,
      },
      {
        time: "20:00",
        name: "RHYTHM & STRENGTH",
        instructor: "Ana Torres",
        duration: "60 min",
        capacity: 10,
        enrolled: 6,
      },
    ],
  },
  {
    day: "Miércoles",
    classes: [
      { time: "07:00", name: "POWER CYCLE", instructor: "Ana Torres", duration: "60 min", capacity: 10, enrolled: 9 },
      {
        time: "12:00",
        name: "RHYTHM RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 7,
      },
      { time: "18:00", name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min", capacity: 10, enrolled: 8 },
      {
        time: "19:00",
        name: "ENDURANCE RIDE",
        instructor: "Miguel Ángel",
        duration: "75 min",
        capacity: 10,
        enrolled: 4,
      },
    ],
  },
  {
    day: "Jueves",
    classes: [
      {
        time: "07:00",
        name: "RHYTHM & STRENGTH",
        instructor: "Ana Torres",
        duration: "60 min",
        capacity: 10,
        enrolled: 6,
      },
      { time: "12:00", name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min", capacity: 10, enrolled: 8 },
      {
        time: "18:00",
        name: "RECOVERY RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 3,
      },
      { time: "19:30", name: "POWER CYCLE", instructor: "Ana Torres", duration: "60 min", capacity: 10, enrolled: 9 },
    ],
  },
  {
    day: "Viernes",
    classes: [
      {
        time: "07:00",
        name: "ENDURANCE RIDE",
        instructor: "Miguel Ángel",
        duration: "75 min",
        capacity: 10,
        enrolled: 4,
      },
      {
        time: "12:00",
        name: "RHYTHM RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 7,
      },
      { time: "18:00", name: "HIIT CYCLE", instructor: "Laura Gómez", duration: "30 min", capacity: 10, enrolled: 8 },
      {
        time: "19:00",
        name: "RHYTHM & STRENGTH",
        instructor: "Ana Torres",
        duration: "60 min",
        capacity: 10,
        enrolled: 6,
      },
    ],
  },
  {
    day: "Sábado",
    classes: [
      { time: "09:00", name: "POWER CYCLE", instructor: "Ana Torres", duration: "60 min", capacity: 10, enrolled: 9 },
      {
        time: "11:00",
        name: "RHYTHM RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 7,
      },
      {
        time: "16:00",
        name: "ENDURANCE RIDE",
        instructor: "Miguel Ángel",
        duration: "75 min",
        capacity: 10,
        enrolled: 4,
      },
    ],
  },
  {
    day: "Domingo",
    classes: [
      {
        time: "10:00",
        name: "RHYTHM & STRENGTH",
        instructor: "Ana Torres",
        duration: "60 min",
        capacity: 10,
        enrolled: 6,
      },
      {
        time: "12:00",
        name: "RECOVERY RIDE",
        instructor: "Carlos Mendez",
        duration: "45 min",
        capacity: 10,
        enrolled: 3,
      },
    ],
  },
]

const instructors = [
  { id: 1, name: "Carlos Mendez", specialties: ["Rhythm Ride", "Recovery Ride"] },
  { id: 2, name: "Ana Torres", specialties: ["Power Cycle", "Rhythm & Strength"] },
  { id: 3, name: "Miguel Ángel", specialties: ["Endurance Ride"] },
  { id: 4, name: "Laura Gómez", specialties: ["HIIT Cycle"] },
]

const timeSlots = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "19:30",
  "20:00",
]

export default function ClassesPage() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [isNewClassOpen, setIsNewClassOpen] = useState(false)
  const [isScheduleClassOpen, setIsScheduleClassOpen] = useState(false)

  // Filtrar clases
  const filteredClasses = classes.filter((classItem) => {
    return (
      classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classItem.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  return (
    
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#4A102A]">Gestión de Clases</h1>
            <p className="text-gray-600">Administra los tipos de clases y horarios</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Dialog open={isNewClassOpen} onOpenChange={setIsNewClassOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#4A102A] hover:bg-[#85193C] text-white">
                  <PlusCircle className="h-4 w-4 mr-2" /> Nueva Clase
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
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría</Label>
                      <Select>
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
                      <Select>
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
                      <Select>
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
                        value="10"
                        readOnly
                        className="bg-white border-gray-200 text-zinc-900"
                      />
                      <p className="text-xs text-gray-500">Todas las clases tienen un límite de 10 personas</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      type="text"
                      id="description"
                      placeholder="Breve descripción de la clase"
                      className="bg-white border-gray-200 text-zinc-900"
                    />
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
                    onClick={() => setIsNewClassOpen(false)}
                  >
                    Crear Clase
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isScheduleClassOpen} onOpenChange={setIsScheduleClassOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-[#4A102A] text-[#4A102A] hover:bg-[#FCF259]/10">
                  <Clock className="h-4 w-4 mr-2" /> Programar Clase
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-zinc-900">
                <DialogHeader>
                  <DialogTitle className="text-[#4A102A]">Programar Clase en el Horario</DialogTitle>
                  <DialogDescription className="text-gray-600">
                    Seleccione los detalles para programar una clase
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="class-type">Tipo de Clase</Label>
                      <Select>
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar clase" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          {classes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id.toString()}>
                              {classItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructor">Instructor</Label>
                      <Select>
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar instructor" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          {instructors.map((instructor) => (
                            <SelectItem key={instructor.id} value={instructor.id.toString()}>
                              {instructor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        type="date"
                        id="date"
                        className="bg-white border-gray-200 text-zinc-900"
                        value={date ? format(date, "yyyy-MM-dd") : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time">Hora</Label>
                      <Select>
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
                      <Label htmlFor="repeat">Repetir</Label>
                      <Select>
                        <SelectTrigger className="bg-white border-gray-200 text-zinc-900">
                          <SelectValue placeholder="Seleccionar frecuencia" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-zinc-900">
                          <SelectItem value="once">Una vez</SelectItem>
                          <SelectItem value="daily">Diariamente</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                          <SelectItem value="monthly">Mensualmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacidad</Label>
                      <Input
                        type="number"
                        id="capacity"
                        placeholder="10"
                        value="10"
                        readOnly
                        className="bg-white border-gray-200 text-zinc-900"
                      />
                      <p className="text-xs text-gray-500">Todas las clases tienen un límite de 10 personas</p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsScheduleClassOpen(false)}
                    className="border-gray-200 text-zinc-900 hover:bg-gray-100"
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-[#4A102A] hover:bg-[#85193C] text-white"
                    onClick={() => setIsScheduleClassOpen(false)}
                  >
                    Programar Clase
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
            <TabsTrigger
              value="classes"
              className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
            >
              Tipos de Clases
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="text-lg data-[state=active]:bg-[#4A102A] data-[state=active]:text-white"
            >
              Horario Semanal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Buscar por nombre, instructor o categoría..."
                  className="pl-8 bg-white border-gray-200 text-zinc-900 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((classItem) => (
                <Card key={classItem.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-[#4A102A]">{classItem.name}</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#4A102A]">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#C5172E]">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{classItem.description}</p>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="flex items-center text-gray-700 text-sm">
                        <Clock className="h-4 w-4 mr-2 text-[#85193C]" />
                        <span>{classItem.duration}</span>
                      </div>
                      <div className="flex items-center text-gray-700 text-sm">
                        <Users className="h-4 w-4 mr-2 text-[#85193C]" />
                        <span>
                          Capacidad: {classItem.enrolled}/{classItem.capacity}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Instructor: {classItem.instructor}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          classItem.intensity === "Baja"
                            ? "bg-green-500/20 text-green-700"
                            : classItem.intensity === "Media"
                              ? "bg-blue-500/20 text-blue-700"
                              : classItem.intensity === "Media-Alta"
                                ? "bg-yellow-500/20 text-yellow-700"
                                : classItem.intensity === "Alta"
                                  ? "bg-orange-500/20 text-orange-700"
                                  : "bg-red-500/20 text-red-700"
                        }`}
                      >
                        {classItem.intensity}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="bg-white border-gray-200 col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg text-[#4A102A]">Calendario</CardTitle>
                </CardHeader>
                <CardContent className="overflow-hidden flex justify-center px-0">
                  <div className="w-full max-w-[280px]">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
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
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      <div className="grid grid-cols-8 gap-2 mb-4">
                        <div className="bg-gray-100 p-4 font-bold text-center text-[#4A102A]">Hora</div>
                        {weeklySchedule.map((day) => (
                          <div key={day.day} className="bg-gray-100 p-4 font-bold text-center text-[#4A102A]">
                            {day.day}
                          </div>
                        ))}
                      </div>

                      {["07:00", "09:00", "10:00", "11:00", "12:00", "16:00", "18:00", "19:00", "19:30", "20:00"].map(
                        (time) => (
                          <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                            <div className="bg-gray-50 p-4 flex items-center justify-center text-gray-700">{time}</div>
                            {weeklySchedule.map((day) => {
                              const classForTimeSlot = day.classes.find((c) => c.time === time)
                              return (
                                <div
                                  key={`${day.day}-${time}`}
                                  className={`p-2 ${
                                    classForTimeSlot ? "bg-white border border-gray-200 shadow-sm" : "bg-gray-50"
                                  }`}
                                >
                                  {classForTimeSlot ? (
                                    <div className="text-center relative group">
                                      <p className="font-bold text-sm text-[#4A102A]">{classForTimeSlot.name}</p>
                                      <p className="text-xs text-gray-600">{classForTimeSlot.instructor}</p>
                                      <p className="text-xs text-gray-600">
                                        {classForTimeSlot.enrolled}/{classForTimeSlot.capacity} alumnos
                                      </p>
                                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-gray-400 hover:text-[#4A102A]"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  )
}
