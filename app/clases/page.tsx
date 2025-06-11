"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Clock, Users, ChevronRight, Zap, Heart, Target, Flame, Filter } from "lucide-react"

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


// Componente de skeleton para las tarjetas
const ClassCardSkeleton = () => (
  <Card className="bg-white border-gray-50 overflow-hidden rounded-3xl shadow-sm">
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-16 w-full mb-4" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </CardContent>
  </Card>
)

export default function ClassesPage() {
  const [classTypes, setClassTypes] = useState<ClassType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")

  useEffect(() => {
    loadClassTypes()
  }, [])

  const loadClassTypes = async () => {
    try {
      const response = await fetch("/api/admin/class-types")
      if (response.ok) {
        const data = await response.json()
        setClassTypes(data)
      }
    } catch (error) {
      console.error("Error loading class types:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar clases
  const filteredClasses = classTypes.filter((classType) => filter === "all" || classType.category === filter)

  // Obtener categorías únicas
  const categories = ["all", ...Array.from(new Set(classTypes.map((c) => c.category)))]

  return (
    <div className="flex flex-col min-h-screen bg-gray-10 text-zinc-900">
      {/* Hero Section */}
      <section className="py-4 pt-14 bg-white">
        <div className="container px-4 md:px-6 text-center">
          <h1 className="text-5xl md:text-5xl font-bold tracking-tight mb-4 anim-slide-in-up">
            NUESTRAS <span className="text-brand-sage">CLASES</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto text-gray-600 mb-2 leading-relaxed">
            Descubre nuestra variedad de clases diseñadas para desafiarte y motivarte, sin importar tu nivel de
            experiencia.
          </p>
        </div>
      </section>

      {/* Classes Section */}
      <section className="py-2 bg-white">
        <div className="container px-4 md:px-6">
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 p-5 bg-white rounded-3xl shadow-sm border border-gray-100 anim-fade-in">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filtrar por categoría</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={filter === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(category)}
                    className={`rounded-full ${
                      filter === category
                        ? "bg-brand-sage hover:bg-brand-mint text-white"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {category === "all" ? "Todas" : category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Contador de resultados */}
          {!isLoading && (
            <div className="mb-4">
              <p className="text-gray-600">
                Mostrando <span className="font-semibold text-brand-sage">{filteredClasses.length}</span>
                {filteredClasses.length === 1 ? " clase" : " clases"}
                {filter !== "all" && (
                  <span>
                    {" "}
                    en la categoría <span className="font-semibold">{filter}</span>
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Grid de clases */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 anim-fade-in">
            {isLoading ? (
              // Skeleton loaders
              Array.from({ length: 6 }).map((_, index) => <ClassCardSkeleton key={index} />)
            ) : filteredClasses.length > 0 ? (
              filteredClasses.map((classType) => (
                <Card
                  key={classType.id}
                  className="relative overflow-hidden rounded-3xl shadow-md transition-all duration-300 group border-0"
                >
                  {/* Fondo con gradiente y blur */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-cream/90 via-white/60 to-brand-mint/70 backdrop-blur-xl"></div>

                  {/* Overlay para mejorar legibilidad */}
                  <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>

                  {/* Header visual con ícono */}
                  <div className="relative h-4 flex items-center justify-center">
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-brand-sage/60 text-white border border-brand-cream/30 backdrop-blur-sm shadow-sm">
                        {classType.duration} min
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="relative p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-brand-gray mb-2 drop-shadow-md ">{classType.name}</h3>
                      <p className="text-brand-gray/90 text-sm leading-relaxed line-clamp-3 drop-shadow-sm">
                        {classType.description}
                      </p>
                    </div>

                    {/* Información de la clase */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between bg-brand-cream/10 backdrop-blur-sm rounded-xl p-3 border border-brand-cream/70">
                        <div className="flex items-center gap-2 text-sm text-brand-gray/90">
                          <span>Intensidad:</span>
                        </div>
                        <div className="bg-brand-cream/20 backdrop-blur-sm px-2 py-1 rounded-full border border-brand-cream/70">
                          <span className="text-xs font-medium text-brand-gray">{classType.intensity}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-brand-cream/10 backdrop-blur-sm rounded-xl p-3 border border-brand-cream/70">
                        <div className="flex items-center gap-2 text-sm text-brand-gray/90">
                          <span>Capacidad:</span>
                        </div>
                        <span className="text-sm font-medium text-brand-gray">{classType.capacity} personas</span>
                      </div>

                      <div className="flex items-center justify-between bg-brand-cream/10 backdrop-blur-sm rounded-xl p-3 border border-brand-cream/70">
                        <div className="flex items-center gap-2 text-sm text-brand-gray/90">
                          <span>Categoría:</span>
                        </div>
                        <span className="text-sm font-medium text-brand-gray capitalize">{classType.category}</span>
                      </div>
                    </div>

                    {/* Botón de reserva directo */}
                    <Button
                      asChild
                      className="w-full bg-brand-sage/20 hover:bg-brand-sage/30 text-brand-gray border border-brand-cream/30 backdrop-blur-sm rounded-2xl transition-all duration-300"
                    >
                      <Link
                        href={`/reservar?classTypeId=${classType.id}`}
                        className="flex items-center justify-center gap-2 font-semibold"
                      >
                        Reservar Clase
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Estado vacío
              <div className="col-span-full text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Filter className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron clases</h3>
                  <p className="text-gray-600 mb-4">No hay clases disponibles con los filtros seleccionados.</p>
                  <Button
                    variant="outline"
                    onClick={() => setFilter("all")}
                    className="border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Ver todas las clases
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-brand-sage/5 via-white to-brand-sage/5">
        <div className="container px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-brand-sage">¿LISTO PARA EMPEZAR?</h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Reserva tu primera clase hoy y experimenta la diferencia de nuestro estudio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-brand-sage hover:bg-brand-mint text-white font-bold px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href="/reservar" className="flex items-center gap-2">
                  RESERVA AHORA
                  <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-brand-sage text-brand-sage hover:bg-brand-sage/5 font-bold px-8 py-6 text-lg rounded-full"
              >
                <Link href="/paquetes">VER PAQUETES</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
