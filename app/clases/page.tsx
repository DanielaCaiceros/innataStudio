"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Interfaces
interface ClassType {
  id: number
  name: string
  description: string
  duration: number
  intensity: string
  category: string
  capacity: number
}

interface ScheduledClass {
  id: number
  classType: ClassType
  instructor: {
    id: number
    name: string
  }
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  enrolledCount: number
}

export default function ClassesPage() {
  const [filter, setFilter] = useState("all")
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadScheduledClasses()
  }, [])

  const loadScheduledClasses = async () => {
    try {
      const response = await fetch("/api/scheduled-clases")
      if (response.ok) {
        const data = await response.json()
        setScheduledClasses(data)
      }
    } catch (error) {
      console.error("Error loading scheduled classes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Agrupar clases por día
  const classesByDay = scheduledClasses.reduce((acc, cls) => {
    const date = new Date(cls.date)
    const dayKey = format(date, "EEEE", { locale: es })
    
    if (!acc[dayKey]) {
      acc[dayKey] = []
    }
    
    acc[dayKey].push(cls)
    return acc
  }, {} as Record<string, ScheduledClass[]>)

  // Ordenar los días de la semana
  const weekDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
  const sortedWeekDays = weekDays.filter(day => classesByDay[day])

  // Obtener todos los horarios únicos
  const allTimeSlots = Array.from(
    new Set(scheduledClasses.map(cls => format(new Date(cls.time), "HH:mm")))
  ).sort()

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}
      <section className="py-10 pt-32 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            NUESTRAS <span className="text-brand-burgundy">CLASES</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-zinc-700 mb-8">
            Descubre nuestra variedad de clases diseñadas para desafiarte y motivarte, sin importar tu nivel de
            experiencia.
          </p>
        </div>
      </section>

      {/* Classes Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 md:px-6">
          <Tabs defaultValue="classes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100">
              <TabsTrigger
                value="classes"
                className="text-lg data-[state=active]:bg-brand-mint data-[state=active]:text-white"
              >
                Clases
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="text-lg data-[state=active]:bg-brand-mint data-[state=active]:text-white"
              >
                Horario Semanal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {scheduledClasses.map((classItem) => (
                  <Card key={classItem.id} className="bg-white border-gray-100 overflow-hidden rounded-3xl shadow-sm">
                    <div className="relative h-48">
                      <Image
                        src="/innataAsset1.png"
                        alt={classItem.classType.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-brand-burgundy-dark">{classItem.classType.name}</h3>
                        <div className="flex gap-2 items-center">
                          <Badge className="bg-brand-sage text-white">{classItem.classType.duration} min</Badge>
                        </div>
                      </div>
                      <p className="text-zinc-600 text-sm mb-4">{classItem.classType.description}</p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="flex items-center text-mint-700 text-sm">
                          <Clock className="h-4 w-4 mr-2 text-brand-burgundy" />
                          <span>Intensidad: {classItem.classType.intensity}</span>
                        </div>
                        <div className="flex items-center text-zinc-700 text-sm">
                          <Users className="h-4 w-4 mr-2 text-brand-burgundy" />
                          <span>Disponibles: {classItem.availableSpots}/{classItem.maxCapacity}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-600">Instructor: {classItem.instructor.name}</span>
                        <Button
                          asChild
                          className="bg-brand-burgundy text-white rounded-full"
                        >
                          <Link href={`/reservar?classId=${classItem.id}`} className="flex items-center gap-1">
                            Reservar <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="schedule">
              <div className="overflow-x-auto bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
                <div className="min-w-[800px]">
                  <div className="grid grid-cols-8 gap-2 mb-4">
                    <div className="bg-gray-100 p-4 font-bold text-center rounded-xl">Hora</div>
                    {sortedWeekDays.map((day) => (
                      <div key={day} className="bg-gray-100 p-4 font-bold text-center rounded-xl">
                        {day}
                      </div>
                    ))}
                  </div>

                  {allTimeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-2 mb-2">
                      <div className="bg-gray-100 p-4 flex items-center justify-center rounded-xl">{time}</div>
                      {sortedWeekDays.map((day) => {
                        const classForTimeSlot = classesByDay[day]?.find(
                          (cls) => format(new Date(cls.time), "HH:mm") === time
                        )
                        return (
                          <div
                            key={`${day}-${time}`}
                            className={`p-2 rounded-xl ${
                              classForTimeSlot ? "bg-brand-yellow/20 border border-brand-yellow" : "bg-gray-100"
                            }`}
                          >
                            {classForTimeSlot ? (
                              <div className="text-center">
                                <p className="font-bold text-sm">{classForTimeSlot.classType.name}</p>
                                <p className="text-xs text-zinc-600">{classForTimeSlot.instructor.name}</p>
                                <p className="text-xs text-zinc-600">{classForTimeSlot.classType.duration} min</p>
                                <Button
                                  asChild
                                  variant="link"
                                  className="text-brand-burgundy p-0 h-auto text-xs mt-1"
                                  size="sm"
                                >
                                  <Link href={`/reservar?classId=${classForTimeSlot.id}`}>Reservar</Link>
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-brand-yellow/10">
        <div className="container px-4 md:px-6 text-center">
          <h2 className="text-3xl font-bold mb-4 text-brand-burgundy-dark">¿LISTO PARA EMPEZAR?</h2>
          <p className="text-xl max-w-2xl mx-auto mb-8 text-brand-burgundy">
            Reserva tu primera clase hoy y experimenta la diferencia de nuestro estudio.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-brand-sage hover:bg-brand-sage/90 text-white font-bold px-8 py-6 text-lg rounded-full"
            >
              <Link href="/reservar" className="flex items-center gap-1">
                RESERVA AHORA <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-brand-mint text-brand-burgundy hover:bg-mint-50 font-bold px-8 py-6 text-lg rounded-full"
            >
              <Link href="/paquetes">VER PAQUETES</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}