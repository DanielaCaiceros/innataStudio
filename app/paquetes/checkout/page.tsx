"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { StripeCheckout } from "@/components/stripe-checkout"
import { ArrowLeft, Package, Clock, Users, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/hooks/useAuth"
import { getAvailableWeekOptions } from "@/lib/utils/unlimited-week"
import type { WeekOption } from "@/lib/utils/unlimited-week"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PackageCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const packageId = searchParams.get("packageId")
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const [packageData, setPackageData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUnlimitedWeek, setSelectedUnlimitedWeek] = useState<WeekOption | null>(null)

  // Convert packageId to a number, handling cases where it might be null or malformed
  const numericPackageId = packageId ? Number.parseInt(packageId, 10) : null

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
        if (numericPackageId === 1) {
          const response = await fetch("/api/user/has-purchased-first-time-package")
          const data = await response.json()

          if (data.hasPurchased) {
            toast({
              title: "Paquete no disponible",
              description: "El paquete PRIMERA VEZ solo puede ser adquirido una vez por usuario.",
              variant: "destructive",
            })
            router.push("/paquetes")
            return
          }
        }

        // Cargar los datos del paquete desde la API
        const response = await fetch(`/api/packages/${numericPackageId}`)
        if (!response.ok) {
          throw new Error("Error al cargar los datos del paquete")
        }

        const packageData = await response.json()
        setPackageData(packageData)
        setIsLoading(false)
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
      if (numericPackageId === 3 && !selectedUnlimitedWeek) {
        alert("Debes seleccionar una semana para tu paquete ilimitado.")
        return
      }

      const body: any = {
        packageId: Number(numericPackageId),
        paymentId,
        unlimitedWeek:
          numericPackageId === 3 && selectedUnlimitedWeek
            ? {
                start: selectedUnlimitedWeek.startDate,
                end: selectedUnlimitedWeek.endDate,
              }
            : undefined,
      }
      if (numericPackageId === 3 && selectedUnlimitedWeek) {
        body.selectedWeekStartDate = selectedUnlimitedWeek.startDate.toISOString()
      }
      const response = await fetch("/api/user/packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast({
          title: "¡Compra exitosa!",
          description: "Tu paquete ha sido registrado correctamente",
        })

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del paquete...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 min-h-screen">
          {/* Left Side - Order Summary */}
          <div className="bg-white-50 p-8 lg:p-12 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="sm" asChild className="p-2">
                <Link href="/paquetes">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Pay Title */}
            <div className="mb-8">
              <h1 className="text-lg text-gray-600 mb-2">Checkout</h1>
              <div className="text-4xl font-bold text-gray-900">${Number.parseFloat(packageData.price).toFixed(2)}</div>
            </div>

            {/* Package Details */}
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-sage to-brand-mint rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{packageData.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{packageData.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {packageData.classCount} clases
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {packageData.validityDays} días
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">${Number.parseFloat(packageData.price).toFixed(2)}</div>
                </div>
              </div>

              {/* Unlimited Week Selection */}
              {numericPackageId === 3 && (
                <div className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Selecciona tu semana ilimitada</h4>
                  <select
                    aria-label="Selecciona tu semana ilimitada"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedUnlimitedWeek?.value || ""}
                    onChange={(e) => {
                      const option = getAvailableWeekOptions().find((opt) => opt.value === e.target.value)
                      setSelectedUnlimitedWeek(option || null)
                    }}
                  >
                    <option value="">Selecciona una semana...</option>
                    {getAvailableWeekOptions().map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {selectedUnlimitedWeek && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            Semana seleccionada: {selectedUnlimitedWeek.label}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Tu paquete será válido únicamente durante esta semana.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Summary */}
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">${Number.parseFloat(packageData.price).toFixed(2)}</span>
                </div>

                <div className="border-t border-gray-300 pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">${Number.parseFloat(packageData.price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Side - Payment Form */}
          <div className="bg-white p-8 lg:p-12">
            <StripeCheckout
              amount={Number.parseFloat(packageData.price)}
              description={`Paquete ${packageData.name} - ${packageData.classCount} clases`}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
              name={user?.name}
              email={user?.email || ""}
              firstName={user?.firstName}
              lastName={user?.lastName}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
