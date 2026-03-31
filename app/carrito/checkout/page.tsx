"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StripeCheckout } from "@/components/stripe-checkout"
import { BranchConfirmationBadge } from "@/components/branch-indicator-badge"
import { useCart } from "@/lib/context/CartContext"
import { useAuth } from "@/lib/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { getAvailableWeekOptions } from "@/lib/utils/unlimited-week"
import type { WeekOption } from "@/lib/utils/unlimited-week"

export default function CartCheckoutPage() {
  const { items, totalPrice, branchId, branchName, clearCart } = useCart()
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [waitingConfirmation, setWaitingConfirmation] = useState(false)
  const [selectedUnlimitedWeek, setSelectedUnlimitedWeek] = useState<WeekOption | null>(null)
  const [availableWeekOptions, setAvailableWeekOptions] = useState<WeekOption[]>([])

  const hasUnlimitedWeek = items.some((item) => item.packageId === 3)

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login?redirect=/carrito/checkout")
    }
  }, [isAuthLoading, isAuthenticated, router])

  useEffect(() => {
    if (!isAuthLoading && items.length === 0) {
      router.push("/paquetes")
    }
  }, [isAuthLoading, items.length, router])

  useEffect(() => {
    if (hasUnlimitedWeek) {
      setAvailableWeekOptions(getAvailableWeekOptions())
    }
  }, [hasUnlimitedWeek])

  const handlePaymentSuccess = async (paymentId: string) => {
    if (hasUnlimitedWeek && !selectedUnlimitedWeek) {
      toast({
        title: "Semana requerida",
        description: "Selecciona la semana para tu paquete ilimitado antes de pagar.",
        variant: "destructive",
      })
      return
    }

    setWaitingConfirmation(true)

    try {
      // Expand quantities: 2x package becomes 2 entries in the array
      const packages = items.flatMap((item) =>
        Array.from({ length: item.quantity }, () => ({
          packageId: item.packageId,
          ...(item.packageId === 3 && selectedUnlimitedWeek
            ? { selectedWeekStartDate: selectedUnlimitedWeek.startDate.toISOString() }
            : {}),
        })),
      )

      const response = await fetch("/api/user/packages/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packages, branchId, paymentId }),
      })

      if (response.ok) {
        const data = await response.json()
        clearCart()
        router.push(
          `/carrito/confirmacion?paymentId=${paymentId}&count=${data.count}&branchName=${encodeURIComponent(branchName || "")}`,
        )
      } else {
        const errorData = await response.json()
        setWaitingConfirmation(false)
        toast({
          title: "No se pudo completar la compra",
          description: errorData.error || "Hubo un problema al registrar los paquetes.",
          variant: "destructive",
        })
      }
    } catch {
      setWaitingConfirmation(false)
      toast({
        title: "Error de conexión",
        description: "Revisa tu conexión e intenta de nuevo.",
        variant: "destructive",
      })
    }
  }

  const handlePaymentCancel = () => {
    toast({
      title: "Pago cancelado",
      description: "El proceso de pago fue cancelado.",
      variant: "destructive",
    })
  }

  if (isAuthLoading || items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cream" />
      </div>
    )
  }

  const needsWeekSelection = hasUnlimitedWeek && !selectedUnlimitedWeek

  return (
    <div className="min-h-screen bg-white">
      {waitingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center shadow-lg gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-gray-700 font-medium">Pago procesado, esperando confirmación...</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 min-h-screen">
          {/* Left: Order Summary */}
          <div className="p-8 lg:p-12 flex flex-col">
            <div className="flex items-center gap-4 mb-8">
              <Button variant="ghost" size="sm" asChild className="p-2">
                <Link href="/paquetes">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mb-8">
              <h1 className="text-lg text-gray-600 mb-1">Checkout</h1>
              <div className="text-4xl font-bold text-gray-900">${totalPrice.toFixed(2)} MXN</div>
            </div>

            <div className="flex-1 space-y-4">
              {/* Package list */}
              {items.map((item) => (
                <div key={item.packageId} className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-brand-sage to-brand-mint rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      {item.packageId === 3
                        ? "Clases ilimitadas"
                        : item.classCount
                          ? `${item.classCount} clases`
                          : "Clases ilimitadas"}
                      {" · "}
                      {item.packageId === 3 ? "5 días hábiles" : `${item.validityDays} días`}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </p>
                    )}
                  </div>
                  <div className="font-semibold text-gray-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}

              {/* Unlimited week selector */}
              {hasUnlimitedWeek && (
                <div className="p-4 bg-white rounded-xl border border-gray-200 mt-2">
                  <h4 className="font-medium text-gray-900 mb-3">Selecciona tu semana ilimitada</h4>
                  <select
                    aria-label="Selecciona tu semana ilimitada"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedUnlimitedWeek?.value || ""}
                    onChange={(e) => {
                      const opt = availableWeekOptions.find((o) => o.value === e.target.value)
                      setSelectedUnlimitedWeek(opt || null)
                    }}
                  >
                    <option value="">Selecciona una semana...</option>
                    {availableWeekOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.isAlreadyPurchased}>
                        {opt.label}
                        {opt.isAlreadyPurchased ? " (Ya adquirido)" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedUnlimitedWeek && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm font-medium text-blue-900">
                        Semana: {selectedUnlimitedWeek.label}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Branch info */}
              <div className="mt-2">
                <BranchConfirmationBadge />
                <p className="text-xs text-gray-500 mt-2">
                  Todos los paquetes quedarán registrados en la sucursal{" "}
                  <span className="font-semibold">{branchName}</span>.
                </p>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  {(() => {
                    const total = items.reduce((s, i) => s + i.quantity, 0)
                    return <span>Subtotal ({total} {total === 1 ? "paquete" : "paquetes"})</span>
                  })()}
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span>${totalPrice.toFixed(2)} MXN</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Payment form */}
          <div className="bg-white p-8 lg:p-12">
            {needsWeekSelection ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona una semana</h3>
                <p className="text-gray-600 max-w-sm text-sm">
                  Elige la semana para tu paquete ilimitado en el panel izquierdo para continuar con
                  el pago.
                </p>
              </div>
            ) : (
              <StripeCheckout
                amount={totalPrice}
                description={`Carrito Innata - ${items.length} paquete${items.length > 1 ? "s" : ""} - ${branchName}`}
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
