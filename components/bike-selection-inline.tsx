"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Bike } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface BikeSelectionInlineProps {
  scheduledClassId: number | null
  selectedBikeId: number | null
  onBikeSelected: (bikeId: number) => void
  className?: string
}

interface BikeData {
  id: number
  available: boolean
  reservedByUser: boolean
}

interface BikeResponseData {
  bikes: BikeData[]
  userHasReservation: boolean
  userHasUnlimitedPackage: boolean
  canMakeMultipleReservations: boolean
}

// Usar exactamente las mismas posiciones que en tu componente original
const bikePositions: { [key: number]: { x: number; y: number } } = {
  // Fila superior (2 bicis en las columnas 1 y 3)
  // Fila superior (2 bicis en las columnas 1 y 3)
  6: { x: 26, y: 23 },
  1: { x: 73, y: 28 },

  // Fila media (4 bicis en las columnas 1, 2, 3, 4)
  5: { x: 26, y: 49 },
  4: { x: 43, y: 52 },
  3: { x: 58, y: 52 },
  2: { x: 73, y: 55 },

  // Fila inferior (4 bicis en las columnas 1, 2, 3, 4)
  7: { x: 26, y: 74 },
  8: { x: 37, y: 80 },
  9: { x: 50, y: 80 },
  10: { x: 63, y: 80 },
}

export function BikeSelectionInline({
  scheduledClassId,
  selectedBikeId,
  onBikeSelected,
  className = ""
}: BikeSelectionInlineProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [bikeData, setBikeData] = useState<BikeResponseData>({
    bikes: [],
    userHasReservation: false,
    userHasUnlimitedPackage: false,
    canMakeMultipleReservations: false
  })

  useEffect(() => {
    const fetchAvailableBikes = async () => {
      if (!scheduledClassId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(`/api/reservations/available-bikes?scheduledClassId=${scheduledClassId}`, {
          credentials: 'include'
        })
        
        if (!response.ok) {
          throw new Error("Error al obtener bicicletas disponibles")
        }

        const data = await response.json()
        setBikeData(data)
      } catch (error) {
        console.error("Error:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las bicicletas disponibles",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAvailableBikes()
  }, [scheduledClassId])

  const handleBikeSelection = (bikeId: number) => {
    const bike = bikeData.bikes.find(b => b.id === bikeId)
    if (bike?.available && !bike.reservedByUser) {
      onBikeSelected(bikeId)
    }
  }

  if (!scheduledClassId) {
    return null
  }

  return (
    <>
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">
          Cargando bicicletas disponibles...
        </div>
      ) : (
        <>
          {/* Información especial para usuarios con reservas existentes */}
          {bikeData.userHasReservation && (
            <div className="mb-4">
              {bikeData.userHasUnlimitedPackage ? (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Con el paquete de semana ilimitada no puedes hacer múltiples reservas para la misma clase.
                  </p>
                </div>
              ) : bikeData.canMakeMultipleReservations ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Reserva adicional:</strong> Ya tienes una reserva para esta clase. Puedes hacer otra reserva eligiendo una bicicleta diferente.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Mapa de bicicletas */}
          <div className="relative w-full h-[160px] rounded-lg bg-gradient-to-b from-brand-cream to-brand-mint  text-white overflow-hidden">
            {/* COACH en el centro */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: "50%",
                top: "25%",
              }}
            >
              <div className="w-8 h-8 bg-brand-sage rounded-full flex items-center justify-center text-black text-xs font-bold">
                C
              </div>
            </div>

            {/* Bicicletas */}
            {bikeData.bikes.map((bike) => {
              const position = bikePositions[bike.id]
              if (!position) return null

              const isSelected = selectedBikeId === bike.id
              const isReservedByUser = bike.reservedByUser

              return (
                <button
                  key={bike.id}
                  className={`
                    absolute w-6 h-6 rounded-full text-xs font-bold transition-all duration-300 border transform -translate-x-1/2 -translate-y-1/2
                    ${
                      isReservedByUser
                        ? "bg-green-500 border-green-600 text-white cursor-not-allowed"
                        : !bike.available
                          ? "bg-gray-500 border-gray-600 text-gray-300 cursor-not-allowed opacity-60"
                          : isSelected
                            ? "bg-brand-mint border-brand-burgundy text-white ring-2 ring-brand-burgundy/40 scale-110"
                            : "bg-white border-brand-sage text-black hover:bg-brand-sage hover:text-white hover:scale-105"
                    }
                  `}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  }}
                  onClick={() => bike.available && !isReservedByUser && handleBikeSelection(bike.id)}
                  disabled={!bike.available || isReservedByUser}
                  title={
                    isReservedByUser 
                      ? "Ya tienes esta bicicleta reservada" 
                      : !bike.available 
                        ? "Bicicleta no disponible" 
                        : `Bicicleta ${bike.id}`
                  }
                >
                  {isReservedByUser ? "✓" : bike.id}
                </button>
              )
            })}

          </div>

          {/* Leyenda */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-white border border-brand-sage"></div>
              <span>Disponible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-500 opacity-60"></div>
              <span>Ocupada</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-brand-mint ring-1 ring-brand-burgundy"></div>
              <span>Seleccionada</span>
            </div>
          </div>

          {/* Información de selección */}
          {selectedBikeId && (
            <div className="mt-3 p-3 bg-brand-mint/10 rounded-lg border border-brand-burgundy/20">
              <p className="text-sm text-brand-burgundy font-medium text-center">
                ✓ Bicicleta #{selectedBikeId} seleccionada
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}
