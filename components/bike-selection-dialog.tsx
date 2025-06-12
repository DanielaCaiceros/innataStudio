"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"

interface BikeSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedBikeId: number | null
  onBikeSelected: (bikeId: number) => void
  onConfirm: () => void
  scheduledClassId: number
}

interface Bike {
  id: number
  x: number
  y: number
  available: boolean
}

// Posiciones de las bicicletas en el grid (versión de main)
const bikePositions: { [key: number]: { x: number; y: number } } = {
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

export function BikeSelectionDialog({
  open,
  onOpenChange,
  selectedBikeId,
  onBikeSelected,
  onConfirm,
  scheduledClassId
}: BikeSelectionDialogProps) {
  const [localSelectedBikeId, setLocalSelectedBikeId] = useState<number | null>(selectedBikeId)
  const [bikes, setBikes] = useState<Bike[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [bikeData, setBikeData] = useState({
    bikes: [],
    userHasReservation: false,
    userHasUnlimitedPackage: false,
    canMakeMultipleReservations: false
  })
  
  useEffect(() => {
    const fetchAvailableBikes = async () => {
      if (!scheduledClassId) return

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
        
        const bikesWithPositions = data.bikes.map((bike: { id: number; available: boolean; reservedByUser: boolean }) => ({
          ...bike,
          ...bikePositions[bike.id]
        }))
        setBikes(bikesWithPositions)
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

    if (open) {
      fetchAvailableBikes()
    }
  }, [scheduledClassId, open])

  const handleBikeSelected = (bikeId: number) => {
    setLocalSelectedBikeId(bikeId)
    onBikeSelected(bikeId)
  }

  // Función para mostrar información adicional en el diálogo
  const BikeSelectionInfo = () => {
    if (!bikeData.userHasReservation) {
      return null
    }

    if (bikeData.userHasUnlimitedPackage) {
      return (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> Con el paquete de semana ilimitada no puedes hacer múltiples reservas para la misma clase.
          </p>
        </div>
      )
    }

    if (bikeData.canMakeMultipleReservations) {
      return (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Reserva adicional:</strong> Ya tienes una reserva para esta clase. Puedes hacer otra reserva eligiendo una bicicleta diferente.
          </p>
        </div>
      )
    }

    return null
  }

  // Modificar la renderización de cada bicicleta para mostrar información adicional
  const renderBikeButton = (bike: any) => {
    const isReservedByUser = bike.reservedByUser
    const isAvailable = bike.available
    
    let buttonClass = "w-12 h-12 rounded-lg border-2 font-semibold transition-all duration-200 "
    let buttonText = bike.id.toString()
    let disabled = false
    
    if (isReservedByUser) {
      buttonClass += "bg-green-100 border-green-500 text-green-700 cursor-not-allowed"
      buttonText = "✓"
      disabled = true
    } else if (!isAvailable) {
      buttonClass += "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
      disabled = true
    } else if (localSelectedBikeId === bike.id) {
      buttonClass += "bg-brand-burgundy border-brand-burgundy text-white"
    } else {
      buttonClass += "bg-white border-gray-300 text-gray-700 hover:border-brand-burgundy hover:text-brand-burgundy"
    }
    
    return (
      <button
        key={bike.id}
        onClick={() => !disabled && handleBikeSelected(bike.id)}
        disabled={disabled}
        className={buttonClass}
        title={
          isReservedByUser 
            ? "Ya tienes esta bicicleta reservada" 
            : !isAvailable 
              ? "Bicicleta no disponible" 
              : `Bicicleta ${bike.id}`
        }
      >
        {buttonText}
      </button>
    )
  }

  // Leyenda para explicar los íconos
  const BikeLegend = () => (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <h4 className="font-medium text-sm text-gray-900 mb-2">Leyenda:</h4>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border-2 border-gray-300 rounded"></div>
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
          <span>Ocupada</span>
        </div>
        {bikeData.userHasReservation && !bikeData.userHasUnlimitedPackage && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded flex items-center justify-center text-green-700 font-bold">✓</div>
            <span>Ya la tienes reservada</span>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-zinc-900 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-brand-sage text-center text-xl font-bold">Selecciona tu bicicleta</DialogTitle>
          <DialogDescription className="text-gray-600 text-center">
            Elige el número de la bicicleta que prefieres para tu clase
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {/* Mapa de bicicletas con distribución exacta */}
          <div className="relative w-full h-[200px] rounded-xl bg-gradient-to-b from-gray-900 to-black text-white overflow-hidden shadow-lg border border-gray-200">
            {/* Posición del COACH - centrado en el grid */}
            <div
              className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
              style={{
                left: "50%",
                top: "24%",
              }}
            >
              <div className="w-11 h-11 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center text-black font-bold text-sm border-2 border-brand-cream shadow-lg">
                <div className="text-center">
                  <div className="text-xs font-medium">COACH</div>
                </div>
              </div>
            </div>

            {/* Bicicletas con posiciones exactas según el grid ajustado */}
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white">Cargando bicicletas...</div>
              </div>
            ) : (
              bikes.map((bike) => {
                const isSelected = localSelectedBikeId === bike.id

                return (
                  <button
                    key={bike.id}
                    className={`
                      absolute w-8 h-8 rounded-full text-sm font-bold transition-all duration-300 border-2 shadow-lg transform -translate-x-1/2 -translate-y-1/2
                      ${
                        !bike.available
                          ? "bg-gray-500 border-gray-600 opacity-60 cursor-not-allowed text-gray-300"
                          : isSelected
                            ? "bg-brand-mint border-brand-burgundy text-white ring-4 ring-brand-burgundy/40 scale-110 shadow-xl z-20"
                            : "bg-white border-brand-sage text-black hover:bg-brand-sage hover:border-brand-sage hover:text-white hover:scale-105"
                      }
                    `}
                    style={{
                      left: `${bike.x}%`,
                      top: `${bike.y}%`,
                    }}
                    onClick={() => bike.available && handleBikeSelected(bike.id)}
                    disabled={!bike.available}
                  >
                    {bike.id}
                  </button>
                )
              })
            )}

            {/* Indicador de entrada - centrado en el grid */}
            <div
              className="absolute transform -translate-x-1/2 z-10"
              style={{
                left: "42.5%", // Centrado entre las columnas 2 y 3
                bottom: "8%",
              }}
            >
            </div>

            {/* Efectos de ambiente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
          </div>

          {/* Leyenda */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border-2 border-brand-sage shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500 border-2 border-gray-600 opacity-60"></div>
              <span className="text-sm font-medium text-gray-700">Reservada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-mint border-2 border-brand-burgundy ring-2 ring-brand-burgundy/30 shadow-sm"></div>
              <span className="text-sm font-medium text-gray-700">Seleccionada</span>
            </div>
          </div>

          {/* Información de selección */}
          {localSelectedBikeId && (
            <div className="p-3 bg-gradient-to-r from-brand-cream to-brand-mint/10 rounded-lg border border-brand-burgundy/20">
              <div className="text-center">
                <p className="text-brand-burgundy font-bold">✓ Bicicleta #{localSelectedBikeId} seleccionada</p>
                <p className="text-sm text-brand-burgundy/80 mt-1">
                  Confirma tu selección para continuar con la reserva
                </p>
              </div>
            </div>
          )}

          <BikeSelectionInfo />

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-brand-burgundy text-brand-burgundy hover:bg-brand-burgundy/10"
            >
              Cancelar
            </Button>
            <Button
              className="bg-brand-mint hover:bg-brand-mint/90 text-white"
              disabled={!localSelectedBikeId}
              onClick={onConfirm}
            >
              Confirmar Selección
            </Button>
          </div>
        </div>
        <BikeLegend />
      </DialogContent>
    </Dialog>
  )
}