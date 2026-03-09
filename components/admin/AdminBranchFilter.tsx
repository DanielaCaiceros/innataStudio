"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Loader2 } from "lucide-react"

interface Branch {
  id: number
  name: string
  address: string | null
}

interface AdminBranchFilterProps {
  selectedBranchId: string // "all" | "1" | "2"
  onBranchChange: (branchId: string) => void
  className?: string
}

export function AdminBranchFilter({ 
  selectedBranchId, 
  onBranchChange,
  className 
}: AdminBranchFilterProps) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch("/api/branches")
        
        if (!response.ok) {
          throw new Error("Error al cargar sucursales")
        }
        
        const data = await response.json()
        setBranches(data)
      } catch (err) {
        console.error("Error fetching branches:", err)
        setError("No se pudieron cargar las sucursales")
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranches()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Cargando sucursales...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 px-3 py-2">
        {error}
      </div>
    )
  }

  return (
    <Select value={selectedBranchId} onValueChange={onBranchChange}>
      <SelectTrigger className={className || "w-[220px]"}>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Seleccionar sucursal" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="font-medium">Todas las sucursales</span>
          </div>
        </SelectItem>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id.toString()}>
            <div className="flex flex-col">
              <span className="font-medium">{branch.name}</span>
              {branch.address && (
                <span className="text-xs text-muted-foreground">{branch.address}</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
