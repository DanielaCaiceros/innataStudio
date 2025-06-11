"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StripeCheckout } from "@/components/stripe-checkout"
import { CreditCard, Banknote } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/hooks/useAuth"

export default function PackageCheckoutPage() {
    
  const router = useRouter()
  const searchParams = useSearchParams()
  const packageId = searchParams.get("packageId")
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card")
  const [packageData, setPackageData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Convert packageId to a number, handling cases where it might be null or malformed
  const numericPackageId = packageId ? parseInt(packageId, 10) : null

  // Redireccionar si no hay usuario autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/paquetes")
    }
  }, [isAuthenticated, router])
  
  // Cargar los datos del paquete seleccionado
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verificar si el usuario ya ha comprado el paquete PRIMERA VEZ
        if (numericPackageId === 1) {  // ID del paquete "PRIMERA VEZ"
          const response = await fetch("/api/user/has-purchased-first-time-package");
          const data = await response.json();
          
          if (data.hasPurchased) {
            toast({
              title: "Paquete no disponible",
              description: "El paquete PRIMERA VEZ solo puede ser adquirido una vez por usuario.",
              variant: "destructive"
            });
            router.push("/paquetes");
            return;
          }
        }

        // Cargar los datos del paquete desde la API
        const response = await fetch(`/api/packages/${numericPackageId}`);
        if (!response.ok) {
          throw new Error("Error al cargar los datos del paquete");
        }
        
        const packageData = await response.json();
        setPackageData(packageData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar los datos del paquete:", error)
        toast({
          title: "Error",
          description: "Error de conexión al cargar los datos del paquete",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [numericPackageId, router, toast])

  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      // Aquí implementaremos la lógica para registrar el paquete comprado
      const response = await fetch("/api/user/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageId: Number(numericPackageId),
          paymentId,
        }),
      })
      
      if (response.ok) {
        toast({
          title: "¡Compra exitosa!",
          description: "Tu paquete ha sido registrado correctamente",
        })
        
        // Redireccionar a la página de confirmación con los parámetros necesarios
        router.push(`/paquetes/confirmacion?session_id=${paymentId}&package_id=${numericPackageId}`)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Hubo un problema al registrar tu compra",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al procesar la compra:", error)
      toast({
        title: "Error",
        description: "Error de conexión al procesar tu compra",
        variant: "destructive",
      })
    }
  }

  const handlePaymentCancel = () => {
    toast({
      title: "Pago cancelado",
      description: "El proceso de pago ha sido cancelado",
      variant: "destructive",
    })
  }

  // Si está cargando o no hay datos del paquete
  if (isLoading || !packageData) {
    return <div className="container mx-auto py-12 text-center">Cargando información del paquete...</div>
  }

  return (
    <div className="container mx-auto py-12">
      <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-sage">Detalles del Paquete</CardTitle>
              <CardDescription>Revisa la información de tu paquete</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Paquete:</span>
                  <span className="font-xs">{packageData.name}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Descripción:</span>
                  <span className="font-xs">{packageData.description}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Clases incluidas:</span>
                  <span>{packageData.classCount}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Vigencia:</span>
                  <span>{packageData.validityDays} días</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="font-medium">Precio base:</span>
                  <span>${parseFloat(packageData.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-lg font-bold">
                  <span>Total:</span>
                  <span>${parseFloat(packageData.price).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-brand-sage">Método de Pago</CardTitle>
              <CardDescription>Elige cómo quieres pagar</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "card" | "transfer")}>
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="card" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Tarjeta
                  </TabsTrigger>

                </TabsList>
                <TabsContent value="card" className="mt-4">
                  <StripeCheckout
                    amount={parseFloat(packageData.price)}
                    description={`Paquete ${packageData.name} - ${packageData.classCount} clases`}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                    name={user?.name}
                    email={user?.email || ''}
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                  />
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}