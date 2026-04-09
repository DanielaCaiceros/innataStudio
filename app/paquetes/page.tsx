"use client"
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Link from "next/link"
import { Check, ChevronRight, LogIn, UserPlus, ShoppingCart, AlertTriangle, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { useAuth } from "@/lib/hooks/useAuth"
import { useState } from "react"
import { BranchIndicatorBadge } from "@/components/branch-indicator-badge"
import { useBranch } from "@/lib/hooks/useBranch"
import { useCart, getMaxQuantity } from "@/lib/context/CartContext"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
// Datos de UI únicamente — precios y nombres vienen de la API por sucursal
const PACKAGES_UI_CONFIG = [
  {
    id: 1,
    description: "Perfecto para probar nuestras clases",
    features: [
      "1 clase de indoor cycling de 45 minutos",
      "Válido solo para nuevos clientes",
    ],
    popular: false,
    expiracion: "Válido por 30 días",
    buttonText: "COMPRAR PASE",
    type: "clase",
    gradient: "from-brand-gray to-brand-gray/90",
  },
  {
    id: 2,
    description: "Una clase cuando la necesites",
    features: ["1 clase de indoor cycling"],
    popular: false,
    expiracion: "Válido por 30 días",
    buttonText: "COMPRAR PASE",
    type: "clase",
    gradient: "from-brand-gray to-brand-mint/90",
  },
  {
    id: 3,
    description: "Tiempo limitado, Lunes a Viernes",
    features: ["Hasta 25 clases de indoor cycling", "Si no te presentas o cancelas la clase, se descontará de tu paquete"],
    popular: true,
    expiracion: "Válido por 5 días de Lunes a Viernes",
    buttonText: "COMPRAR PAQUETE",
    type: "paquete",
    gradient: "from-brand-cream to-brand-cream/90",
  },
  {
    id: 4,
    description: "La opción más popular",
    features: ["10 clases de indoor cycling"],
    popular: false,
    expiracion: "Válido por 30 días",
    buttonText: "COMPRAR PAQUETE",
    type: "paquete",
    gradient: "from-brand-neutral to-brand-mint",
  },
  {
    id: 5,
    description: "Ahorra más con este paquete",
    features: ["20 clases de indoor cycling"],
    popular: false,
    expiracion: "Válido por 60 días",
    buttonText: "COMPRAR PAQUETE",
    type: "paquete",
    gradient: "from-brand-mint to-brand-gray",
  },
  {
    id: 6,
    description: "La mejor opción para practicantes frecuentes",
    features: ["Hasta 90 clases de indoor cycling", "Clases ilimitadas durante el mes"],
    popular: false,
    expiracion: "Válido por 30 días",
    buttonText: "COMPRAR PAQUETE",
    type: "paquete",
    gradient: "from-brand-mint to-brand-mint/90",
  },
]

export default function PackagesPage() {
   const router = useRouter();
   const { isAuthenticated } = useAuth()
  const { selectedBranch, isLoading: isBranchLoading } = useBranch()
  const { addItem, isInCart, removeItem, incrementItem, decrementItem, getQuantity, replaceCartWithItem, totalItems } = useCart()
   const [showAuthModal, setShowAuthModal] = useState(false)
   const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null)
   const [hasFirstTimePackage, setHasFirstTimePackage] = useState(false)
   const [isLoading, setIsLoading] = useState(true)
   const [filteredPackages, setFilteredPackages] = useState<any[]>([])
   const [conflictDialog, setConflictDialog] = useState<{ open: boolean; conflictBranch: string; pendingPkg: any | null }>({
     open: false, conflictBranch: "", pendingPkg: null,
   })

   useEffect(() => {
     if (!isBranchLoading && !selectedBranch) {
       router.push("/seleccionar-sucursal?redirect=/paquetes")
     }
   }, [isBranchLoading, selectedBranch, router])

   // Cargar paquetes desde la API según la sucursal seleccionada
   useEffect(() => {
     const fetchPackages = async () => {
       if (!selectedBranch) return
       setIsLoading(true)
       try {
         const response = await fetch(`/api/packages/by-branch/${selectedBranch.id}`)
         if (!response.ok) throw new Error("Error al cargar paquetes")
         const apiData = await response.json()

         // Combinar datos de API (precio, nombre) con configuración de UI (gradientes, features)
         const merged = PACKAGES_UI_CONFIG.map(uiPkg => {
           const apiPkg = apiData.find((a: any) => a.id === uiPkg.id)
           if (!apiPkg) return null
           return {
             ...uiPkg,
             name: apiPkg.name,
             price: `$${Number(apiPkg.price).toFixed(2)}`,
             classCount: apiPkg.classCount,
             validityDays: apiPkg.validityDays,
             isFirstTimeOnly: apiPkg.isFirstTimeOnly,
           }
         }).filter(Boolean)

         setFilteredPackages(merged)
       } catch (error) {
         console.error("Error al cargar paquetes por sucursal:", error)
         setFilteredPackages([])
       } finally {
         setIsLoading(false)
       }
     }
     fetchPackages()
   }, [selectedBranch])

   // Verificar si el usuario ha comprado el paquete primera vez
   useEffect(() => {
     const checkFirstTimePackage = async () => {
       if (isAuthenticated) {
         try {
           const response = await fetch("/api/user/has-purchased-first-time-package")
           const data = await response.json()
           setHasFirstTimePackage(data.hasPurchased)
         } catch (error) {
           console.error("Error al verificar el paquete primera vez:", error)
         }
       }
     }
     checkFirstTimePackage()
   }, [isAuthenticated]);
  
   const handleAddToCart = (pkg: any) => {
    if (!isAuthenticated) {
      setSelectedPackageId(pkg.id)
      setShowAuthModal(true)
      return
    }

    if (pkg.id === 1 && hasFirstTimePackage) {
      return
    }

    const cartItem = {
      packageId: pkg.id,
      name: pkg.name,
      price: Number(pkg.price.replace("$", "")),
      branchId: selectedBranch!.id,
      branchName: selectedBranch!.name,
      gradient: pkg.gradient,
      isFirstTimeOnly: pkg.isFirstTimeOnly ?? false,
      classCount: pkg.classCount ?? null,
      validityDays: pkg.validityDays,
      type: pkg.type,
    }

    const result = addItem(cartItem)

    if (!result.success && result.conflictBranch) {
      setConflictDialog({ open: true, conflictBranch: result.conflictBranch, pendingPkg: cartItem })
    }
  }

  const handleConflictReplace = () => {
    if (conflictDialog.pendingPkg) {
      replaceCartWithItem(conflictDialog.pendingPkg)
    }
    setConflictDialog({ open: false, conflictBranch: "", pendingPkg: null })
  }
  
  if (isBranchLoading || !selectedBranch) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Cargando sucursal...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-900">
      {/* Hero Section */}

      <section className="py-5 pt-14 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-5xl md:text-5xl font-bold tracking-tight mb-2 anim-slide-in-up">
                NUESTROS PAQUETES
              </h1>
              <p className="text-xl text-zinc-700">
                Flexibilidad para adaptarse a tu estilo de vida. Elige el paquete que mejor se ajuste a tus objetivos.
              </p>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm md:text-base text-brand-cream font-medium">
                Recuerda: los precios mostrados corresponden a la sucursal {selectedBranch?.name}. Si cambias de sucursal, los precios pueden variar.
              </p>
            </div>
          </div>
          {/* Indicador de sucursal */}
          <div className="flex justify-center mt-4">
            <BranchIndicatorBadge />
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-3 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 anim-fade-in">

            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} className="bg-white border-gray-100 overflow-hidden rounded-3xl shadow-sm flex flex-col h-full">
                {/* Gradient Header */}
                <div className={`bg-gradient-to-r ${pkg.gradient} h-14 flex items-center justify-center`}>
                  <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                </div>

                <CardHeader className="pb-4 pt-6">
                  <div className="text-center mb-2">
                    <span className="text-5xl font-medium text-black">{pkg.price}</span>
                    {pkg.id !== 1 && pkg.id !== 2 && <span className="text-zinc-600 ml-1">/ paquete</span>}
                  </div>
                  <CardDescription className="text-zinc-600 text-center">{pkg.description}</CardDescription>
                </CardHeader>

                <CardContent className="pb-4 flex-grow">
                  <ul className="space-y-2">
                    {pkg.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-brand-cream mr-2 shrink-0" />
                        <span className="text-zinc-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-sm text-zinc-500">
                    <span className="font-semibold">Expiración:</span> {pkg.expiracion}
                  </div>
                </CardContent>

<CardFooter className="mt-auto pt-4 flex flex-col gap-2">
                  {pkg.id === 1 && hasFirstTimePackage ? (
                    <>
                      <Button
                        disabled
                        className="w-full bg-gray-300 text-gray-600 font-bold rounded-full cursor-not-allowed"
                      >
                        Ya adquirido
                      </Button>
                      <p className="text-xs text-amber-600 text-center">
                        Este paquete solo puede adquirirse una vez por usuario
                      </p>
                    </>
                  ) : isInCart(pkg.id) ? (
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full border-gray-300 flex-shrink-0"
                          onClick={() => decrementItem(pkg.id)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="flex-1 text-center font-semibold text-lg">{getQuantity(pkg.id)}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full border-gray-300 flex-shrink-0"
                          onClick={() => incrementItem(pkg.id)}
                          disabled={getQuantity(pkg.id) >= getMaxQuantity(pkg.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <button
                        className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => removeItem(pkg.id)}
                      >
                        Quitar del carrito
                      </button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleAddToCart(pkg)}
                      className={`w-full bg-gradient-to-r ${pkg.gradient} hover:opacity-90 text-white font-bold rounded-full transition-all duration-300`}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Agregar al carrito
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-brand-neutral/20">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl font-bold text-center mb-12 anim-fade-in">
            PREGUNTAS <span className="text-brand-cream">FRECUENTES</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto anim-fade-in">
            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-black">¿Cuánto tiempo duran las clases?</h3>
              <p className="text-zinc-600">
Nuestras clases tienen duraciones de 45 y 60 minutos              </p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-black">¿Necesito experiencia previa?</h3>
              <p className="text-zinc-600">
                No, tenemos clases para todos los niveles. Nuestros instructores te guiarán durante toda la sesión.
              </p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-black">¿Qué debo llevar a clase?</h3>
  <p className="text-zinc-600">
  Te recomendamos llegar 15 minutos antes de la clase. Debes traer agua, toalla y zapatos de deporte cómodos. 
</p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-black">¿Puedo cancelar mi reserva?</h3>
              <p className="text-zinc-600">
                Para paquetes regulares: puedes cancelar hasta 12 horas antes y recibes tu crédito de vuelta. Para Semana Ilimitada: si cancelas con +12 horas no hay penalización, pero con -12 horas o no asistes sí hay penalización.
              </p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-black">¿Los paquetes tienen fecha de expiración?</h3>
              <p className="text-zinc-600">
Sí, algunos paquetes tienen validez de 30 días y otros 60 días desde la compra              </p>
            </div>

            <div className="space-y-2 bg-white p-6 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-black">¿Hay lista de espera?</h3>
              <p className="text-zinc-600">
                Sí, si una persona reservada no llega antes del inicio de la segunda canción, su lugar se liberará en la plataforma.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Floating cart bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-[#4A102A] text-white px-6 py-3 rounded-full shadow-xl">
          <span className="text-sm font-medium">
            {totalItems} {totalItems === 1 ? "paquete" : "paquetes"} en tu carrito
          </span>
          <Button
            size="sm"
            className="bg-white text-[#4A102A] hover:bg-gray-100 rounded-full font-semibold h-8 px-4 text-xs"
            onClick={() => router.push("/carrito/checkout")}
          >
            Pagar ahora <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Branch conflict dialog */}
      <AlertDialog open={conflictDialog.open} onOpenChange={(open) => !open && setConflictDialog(prev => ({ ...prev, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Paquetes de diferente sucursal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tu carrito tiene paquetes de la sucursal <strong>{conflictDialog.conflictBranch}</strong>. No puedes mezclar paquetes de diferentes sucursales.
              <br /><br />
              ¿Deseas vaciar el carrito y agregar este paquete de <strong>{selectedBranch?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#4A102A] hover:bg-[#85193C] text-white"
              onClick={handleConflictReplace}
            >
              Vaciar y agregar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

        <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-red-800">Iniciar Sesión Requerido</DialogTitle>
            <DialogDescription className="text-center">
              Para comprar un paquete, necesitas iniciar sesión o crear una cuenta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-5 py-6">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-sm text-blue-900 text-center">
              Tu compra se registrará en la sucursal: <span className="font-semibold">{selectedBranch?.name}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-sm text-zinc-700">
              <p>
                Los paquetes se agregarán a tu cuenta y podrás utilizarlos para reservar
                clases cuando lo desees. ¡Tu primera clase te está esperando!
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                asChild
                className="bg-brand-mint hover:bg-brand-mint/90 text-white flex gap-2"
              >
                <Link href={`/login?redirect=${encodeURIComponent("/paquetes")}`}>
                  <LogIn className="h-4 w-4" /> Iniciar Sesión
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-[#4A102A] text-[#4A102A] hover:bg-[#4A102A]/10 flex gap-2"
              >
                <Link href={`/registro?redirect=${encodeURIComponent("/paquetes")}`}>
                  <UserPlus className="h-4 w-4" /> Registrarse
                </Link>
              </Button>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-center">
            <Button 
              variant="ghost" 
              onClick={() => setShowAuthModal(false)}
              className="text-zinc-600"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}