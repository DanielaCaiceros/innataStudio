"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { MapPin, Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useBranch } from "@/lib/hooks/useBranch"
import { cn } from "@/lib/utils"

export function BranchSelector() {
  const pathname = usePathname()
  const router = useRouter()
  const { selectedBranch, branches, changeBranch, isBranchSelected } = useBranch()
  const [open, setOpen] = useState(false)
  const [branchSelectorLocked, setBranchSelectorLocked] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    const readLockState = () => {
      setBranchSelectorLocked(localStorage.getItem("innata_branch_selector_lock") === "1")
    }

    const handleCustomLockEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ locked?: boolean }>
      if (typeof customEvent.detail?.locked === "boolean") {
        setBranchSelectorLocked(customEvent.detail.locked)
      } else {
        readLockState()
      }
    }

    readLockState()
    window.addEventListener("innata:branch-selector-lock", handleCustomLockEvent as EventListener)
    window.addEventListener("storage", readLockState)

    return () => {
      window.removeEventListener("innata:branch-selector-lock", handleCustomLockEvent as EventListener)
      window.removeEventListener("storage", readLockState)
    }
  }, [])

  const shouldLockInThisPage = pathname === "/reservar" && branchSelectorLocked

  if (!selectedBranch) {
    return null // No mostrar si no hay sucursal seleccionada (debe manejarse por el modal)
  }

  const handleChangeBranch = (branchId: number) => {
    if (shouldLockInThisPage) {
      return
    }

    const branch = branches.find(b => b.id === branchId)
    if (branch) {
      changeBranch(branch)
      setOpen(false)
    }
  }

  const handleViewAll = () => {
    if (shouldLockInThisPage) {
      return
    }

    setOpen(false)
    router.push("/seleccionar-sucursal")
  }

  return (
    <DropdownMenu open={open} onOpenChange={(nextOpen) => setOpen(shouldLockInThisPage ? false : nextOpen)}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={shouldLockInThisPage}
          title={shouldLockInThisPage ? "Finaliza o ajusta tu reserva actual antes de cambiar de sucursal" : undefined}
          className={cn(
            "gap-2 rounded-full px-3 py-1 h-auto border border-brand-gray bg-gray-30 hover:bg-gray-100 hover:border-gray-300 transition-all",
            shouldLockInThisPage && "opacity-60 cursor-not-allowed"
          )}
        >
          <span className="font-medium text-base text-brand-gray">{selectedBranch.name}</span>
          <ChevronDown className="h-4 w-4 text-brand-gray" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Estas reservando para: </p>
            <p className="text-xs leading-none text-muted-foreground">
              Cambiar ubicación
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleChangeBranch(branch.id)}
            className={cn(
              "cursor-pointer py-3",
              isBranchSelected(branch.id) && "bg-gray-50"
            )}
          >
            <div className="flex items-start justify-between w-full gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div
                  className="h-2 w-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: branch.color }}
                />
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm">{branch.name}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {branch.address}
                  </span>
                </div>
              </div>
              {isBranchSelected(branch.id) && (
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: branch.color }} />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
