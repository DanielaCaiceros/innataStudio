"use client"

import { MapPin } from "lucide-react"
import { useBranch } from "@/lib/hooks/useBranch"
import { cn } from "@/lib/utils"

interface BranchIndicatorBadgeProps {
  className?: string
  showIcon?: boolean
}

/**
 * Badge que muestra la sucursal actualmente seleccionada
 * Ideal para colocar en páginas donde es importante mostrar el contexto de sucursal
 * (ej: /reservar, /paquetes, checkout)
 */
export function BranchIndicatorBadge({ 
  className, 
  showIcon = true
}: BranchIndicatorBadgeProps) {
  const { selectedBranch } = useBranch()

  if (!selectedBranch) {
    return null
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-3 px-6 py-3 rounded-full border border-brand-gray bg-gray-50",
      className
    )}>
      {showIcon && <MapPin className="h-4 w-4 text-gray-600" />}
      <span className="font-medium text-gray-900">{selectedBranch.name}</span>
    </div>
  )
}

/**
 * Versión para mostrar advertencia/confirmación en checkout
 */
export function BranchConfirmationBadge({ className }: { className?: string }) {
  const { selectedBranch } = useBranch()

  if (!selectedBranch) {
    return null
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-3 rounded-full border border-brand-gray bg-gray-50 px-4 py-2",
        className
      )}
    >
      <div className="flex-1">
        <p className="text-base font-semibold text-brand-gray">
          {selectedBranch.name}
        </p>
      </div>
      <div className="text-xs text-brand-gray bg-red-50 rounded-full px-3 py-1 border border-red-100">
        Recuerda que las clases que compras en una sucursal son instransferibles y solo podrán ser usadas en la sucursal seleccionada
      </div>
    </div>
  )
}
