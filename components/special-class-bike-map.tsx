"use client"

import { SPECIAL_CLASS_BIKE_LAYOUT } from "@/lib/config/branch-bike-layouts"

interface SpecialClassBikeMapProps {
  selectedBikes?: number[]
  onBikeClick?: (bikeId: number) => void
  disabledBikes?: number[]
  className?: string
}

export function SpecialClassBikeMap({
  selectedBikes = [],
  onBikeClick,
  disabledBikes = [],
  className = "",
}: SpecialClassBikeMapProps) {
  const { positions } = SPECIAL_CLASS_BIKE_LAYOUT

  const getBikeStyle = (bikeId: number) => {
    const isSelected = selectedBikes.includes(bikeId)
    const isDisabled = disabledBikes.includes(bikeId)

    if (isDisabled) {
      return "bg-gray-500 border-gray-600 text-gray-300 cursor-not-allowed opacity-60"
    }
    if (isSelected) {
      return "bg-brand-mint border-brand-burgundy text-white ring-2 ring-brand-burgundy/40 scale-110"
    }
    return "bg-white border-brand-sage text-black hover:bg-brand-sage hover:text-white hover:scale-105"
  }

  return (
    <div className={className}>
      <div className="relative w-full h-[160px] rounded-lg bg-gradient-to-b from-brand-sage/50 to-brand-sage/70 text-white overflow-hidden">
        {/* Coach position */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: "50%", top: "25%" }}
        >
          <div className="w-8 h-8 bg-brand-mint rounded-full flex items-center justify-center text-black text-xs font-bold">
            C
          </div>
        </div>

        {/* Bikes */}
        {Array.from({ length: 24 }, (_, i) => i + 1).map((bikeId) => {
          const position = positions[bikeId]
          if (!position) return null

          return (
            <button
              key={bikeId}
              className={`
                absolute w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[9px] font-normal sm:text-xs sm:font-bold transition-all duration-300 border transform -translate-x-1/2 -translate-y-1/2
                ${getBikeStyle(bikeId)}
              `}
              style={{ left: `${position.x}%`, top: `${position.y}%` }}
              onClick={() => !disabledBikes.includes(bikeId) && onBikeClick?.(bikeId)}
              disabled={disabledBikes.includes(bikeId)}
              title={`Bicicleta ${bikeId}`}
            >
              {bikeId}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-white border border-brand-sage" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-500 opacity-60" />
          <span>Ocupada</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-brand-mint ring-1 ring-brand-burgundy" />
          <span>Seleccionada</span>
        </div>
      </div>
    </div>
  )
}
