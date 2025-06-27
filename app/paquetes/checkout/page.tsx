"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { StripeCheckout } from "@/components/stripe-checkout"
import { ArrowLeft, Package, Clock, Users, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/hooks/useAuth"
import { getAvailableWeekOptions } from "@/lib/utils/unlimited-week"
import type { WeekOption, ExistingUserUnlimitedPackage } from "@/lib/utils/unlimited-week" // Import ExistingUserUnlimitedPackage
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Define a simplified type for what we expect from /api/user/packages GET endpoint
interface UserPackageAPIResponse {
  id: number;
  packageId: number;
  name: string;
  classesRemaining: number | null;
  expiryDate: string;
  purchaseDate: string | null; // This will be key for unlimited weeks (Monday of the week)
  isActive: boolean;
}

export default function PackageCheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const packageId = searchParams.get("packageId")
  const { toast } = useToast()
  const { user, isAuthenticated } = useAuth()
  const [packageData, setPackageData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUnlimitedWeek, setSelectedUnlimitedWeek] = useState<WeekOption | null>(null)
  const [waitingConfirmation, setWaitingConfirmation] = useState(false)
  const [userExistingUnlimitedWeeks, setUserExistingUnlimitedWeeks] = useState<ExistingUserUnlimitedPackage[]>([])
  const [availableWeekOptions, setAvailableWeekOptions] = useState<WeekOption[]>([])

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
      setIsLoading(true) // Start loading
      try {
        // Fetch package details first
        if (numericPackageId) {
          const packageDetailsResponse = await fetch(`/api/packages/${numericPackageId}`)
          if (!packageDetailsResponse.ok) {
            throw new Error("Error al cargar los datos del paquete")
          }
          const fetchedPackageData = await packageDetailsResponse.json()
          setPackageData(fetchedPackageData)

          // If it's an unlimited week package, fetch user's existing unlimited weeks
          if (numericPackageId === 3 && isAuthenticated) {
            try {
              const userPackagesResponse = await fetch("/api/user/packages")
              if (userPackagesResponse.ok) {
                const userPackagesData: { packages: UserPackageAPIResponse[] } = await userPackagesResponse.json()
                const unlimitedWeeks = userPackagesData.packages
                  .filter(pkg => pkg.packageId === 3 && pkg.purchaseDate)
                  .map(pkg => ({
                    purchaseDate: pkg.purchaseDate!, // purchaseDate is 'YYYY-MM-DD' string for start of week
                    packageId: pkg.packageId,
                  }))
                setUserExistingUnlimitedWeeks(unlimitedWeeks)
                // Generate available week options after fetching existing ones
                setAvailableWeekOptions(getAvailableWeekOptions(unlimitedWeeks))
              } else {
                console.error("Error fetching user's unlimited weeks")
                // Fallback to default options if fetch fails
                setAvailableWeekOptions(getAvailableWeekOptions()) 
              }
            } catch (e) {
                console.error("Error fetching user's unlimited weeks:", e)
                setAvailableWeekOptions(getAvailableWeekOptions())
            }
          } else if (numericPackageId === 3) {
            // Not authenticated but viewing unlimited week, show default options
            setAvailableWeekOptions(getAvailableWeekOptions())
          }

          // Verification for "PRIMERA VEZ" package
          if (numericPackageId === 1) {
            const firstTimeCheckResponse = await fetch("/api/user/has-purchased-first-time-package")
            const firstTimeData = await firstTimeCheckResponse.json()
            if (firstTimeData.hasPurchased) {
              toast({
                title: "Paquete no disponible",
                description: "El paquete PRIMERA VEZ solo puede ser adquirido una vez por usuario.",
                variant: "destructive",
              })
              router.push("/paquetes")
              return // Stop further processing
            }
          }
        }
      } catch (error) {
        console.error("Error al cargar los datos del paquete:", error)
        toast({
          title: "Error",
          description: "Error de conexión al cargar los datos del paquete",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false) // End loading
      }
    }

    if (isAuthenticated === null) return; // Wait until auth status is known

    if (isAuthenticated === false && numericPackageId ) { // if not authenticated but trying to checkout
       // For unlimited week, we can still show default week options
       if (numericPackageId === 3) {
        setAvailableWeekOptions(getAvailableWeekOptions());
      }
      // Fetch general package data even if not authenticated
       const fetchPackageDataOnly = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/packages/${numericPackageId}`);
            if (!response.ok) throw new Error("Error al cargar los datos del paquete");
            const pkgData = await response.json();
            setPackageData(pkgData);
        } catch (error) {
            console.error("Error al cargar los datos del paquete:", error);
            toast({ title: "Error", description: "Error de conexión.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
       };
       fetchPackageDataOnly();
       // Redirect to login will be handled by the other useEffect
    } else if (isAuthenticated) { // if authenticated
        fetchData()
    }


  }, [numericPackageId, router, toast, isAuthenticated])
  
  // Regenerate week options if existingUserUnlimitedWeeks changes (e.g. after a purchase elsewhere)
  // Or if numericPackageId changes to 3
  useEffect(() => {
    if (numericPackageId === 3) {
      setAvailableWeekOptions(getAvailableWeekOptions(userExistingUnlimitedWeeks));
    }
  }, [userExistingUnlimitedWeeks, numericPackageId]);


  const handlePaymentSuccess = async (paymentId: string) => {
    try {
      if (numericPackageId === 3 && !selectedUnlimitedWeek) {
        alert("Debes seleccionar una semana para tu paquete ilimitado.")
        return
      }
      setWaitingConfirmation(true)
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
        console.log('Entering error block in handlePaymentSuccess. Response not OK.');
        console.log('Error data from response:', errorData);
        setWaitingConfirmation(false); 
        const errorDescription = errorData.error || "Hubo un problema al registrar tu compra";
        console.log('Attempting to show alert with error description:', errorDescription);
        alert('API Error: ' + errorDescription);
      }
    } catch (error) {
      console.error("Error al procesar la compra:", error) // Original console.error
      console.log('Entering catch block in handlePaymentSuccess. Error:', error); // New diagnostic log
      const description = error instanceof Error ? error.message : "Error de conexión al procesar tu compra";
      setWaitingConfirmation(false);
      console.log('Attempting to show alert due to caught error. Description:', description); // New diagnostic log
      alert('Purchase Processing Error: ' + description);
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
      {waitingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center shadow-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Pago procesado, esperando confirmación...</p>
          </div>
        </div>
      )}
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
                      const option = availableWeekOptions.find((opt) => opt.value === e.target.value)
                      // Do not allow selecting an already purchased week, even if somehow enabled
                      if (option && option.isAlreadyPurchased) {
                        toast({
                          title: "Semana no disponible",
                          description: "Ya has adquirido un paquete para esta semana.",
                          variant: "destructive"
                        })
                        setSelectedUnlimitedWeek(null); // Or keep previous valid selection
                        e.target.value = selectedUnlimitedWeek?.value || ""; // Reset dropdown
                        return;
                      }
                      setSelectedUnlimitedWeek(option || null)
                    }}
                  >
                    <option value="">Selecciona una semana...</option>
                    {availableWeekOptions.map((opt) => (
                      <option 
                        key={opt.value} 
                        value={opt.value} 
                        disabled={opt.isAlreadyPurchased}
                        className={opt.isAlreadyPurchased ? "text-gray-400" : ""}
                      >
                        {opt.label}{opt.isAlreadyPurchased ? " (Ya adquirido)" : ""}
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
            {numericPackageId === 3 && !selectedUnlimitedWeek ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Selecciona una semana
                </h3>
                <p className="text-gray-600 max-w-sm">
                  Para continuar con el pago, primero debes seleccionar la semana en la que quieres usar tu paquete ilimitado.
                </p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
