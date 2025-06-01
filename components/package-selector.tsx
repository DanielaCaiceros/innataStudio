import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface UserPackage {
  id: number
  name: string
  classesRemaining: number
  classesUsed: number
  expiryDate: string
  isActive: boolean
}

interface PackageSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (packageId: number) => void
  userPackages: UserPackage[]
  isLoading: boolean
}

export function PackageSelector({ isOpen, onClose, onSelect, userPackages, isLoading }: PackageSelectorProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)

  const handleSelect = () => {
    if (selectedPackageId) {
      onSelect(selectedPackageId)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-brand-burgundy">Selecciona tu paquete</DialogTitle>
          <DialogDescription>
            Selecciona el paquete que quieres utilizar para esta reserva
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-6 text-center">
            Cargando tus paquetes...
          </div>
        ) : userPackages.length === 0 ? (
          <div className="py-6 text-center">
            <p className="mb-4">No tienes paquetes disponibles.</p>
            <Button 
              onClick={() => window.location.href = '/paquetes'}
              className="bg-brand-burgundy hover:bg-brand-burgundy/90 text-white"
            >
              Comprar paquete
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {userPackages.map((pkg) => (
              <div 
                key={pkg.id} 
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPackageId === pkg.id 
                    ? 'border-brand-burgundy bg-brand-burgundy/10' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedPackageId(pkg.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{pkg.name}</h3>
                    <p className="text-sm text-gray-600">
                      {pkg.classesRemaining} {pkg.classesRemaining === 1 ? 'clase' : 'clases'} disponible{pkg.classesRemaining !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expira: {format(new Date(pkg.expiryDate), 'PPP', { locale: es })}
                    </p>
                  </div>
                  <Badge variant={selectedPackageId === pkg.id ? "default" : "outline"}>
                    {selectedPackageId === pkg.id ? "Seleccionado" : "Seleccionar"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSelect}
            disabled={!selectedPackageId || isLoading}
            className="bg-brand-burgundy hover:bg-brand-burgundy/90 text-white"
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
