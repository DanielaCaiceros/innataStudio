"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle, ShoppingBag, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

function CartConfirmationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const count = Number(searchParams.get("count") || "1")
  const branchName = searchParams.get("branchName") || ""
  const paymentId = searchParams.get("paymentId") || ""

  if (!paymentId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardContent className="pt-6">
            <p className="text-gray-600 mb-6">No se pudo confirmar la compra.</p>
            <Button onClick={() => router.push("/")}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card className="text-center shadow-sm rounded-3xl">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-green-600">¡Compra exitosa!</CardTitle>
          <CardDescription className="text-base mt-2">
            {count === 1
              ? "Tu paquete ha sido activado correctamente."
              : `Tus ${count} paquetes han sido activados correctamente.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 space-y-3 text-left">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-brand-cream flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Paquetes comprados</p>
                <p className="font-semibold text-gray-900">
                  {count} {count === 1 ? "paquete" : "paquetes"}
                </p>
              </div>
            </div>

            {branchName && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-brand-cream flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Sucursal</p>
                  <p className="font-semibold text-gray-900">{branchName}</p>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            Recibirás un email de confirmación con los detalles de tu compra.
          </p>

          <div className="grid gap-3 pt-2">
            <Button
              className="w-full bg-[#4A102A] hover:bg-[#85193C] text-white rounded-full"
              onClick={() => router.push("/reservar")}
            >
              Reservar una clase
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => router.push("/mi-cuenta")}
            >
              Ver mis paquetes
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-500 rounded-full"
              onClick={() => router.push("/paquetes")}
            >
              Seguir comprando
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CartConfirmacionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      }
    >
      <CartConfirmationContent />
    </Suspense>
  )
}
