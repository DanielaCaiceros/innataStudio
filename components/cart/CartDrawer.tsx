"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Trash2, ArrowRight, ShoppingBag, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCart, getMaxQuantity } from "@/lib/context/CartContext"

export function CartButton() {
  const { totalItems } = useCart()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <ShoppingCart className="h-5 w-5 text-zinc-800" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-brand-cream text-white text-[10px] font-bold rounded-full">
              {totalItems > 9 ? "9+" : totalItems}
            </span>
          )}
          <span className="sr-only">Carrito de compras</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <CartDrawerContent onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

function CartDrawerContent({ onClose }: { onClose: () => void }) {
  const { items, totalPrice, removeItem, incrementItem, decrementItem, clearCart, branchName } = useCart()
  const router = useRouter()

  const handleCheckout = () => {
    onClose()
    router.push("/carrito/checkout")
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 py-5 border-b">
        <SheetTitle className="flex items-center gap-2 text-base font-semibold">
          <ShoppingCart className="h-4 w-4" />
          Mi Carrito
          {branchName && (
            <Badge variant="outline" className="ml-auto text-xs font-normal px-2 py-0.5">
              {branchName}
            </Badge>
          )}
        </SheetTitle>
      </SheetHeader>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="h-8 w-8 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Tu carrito está vacío</p>
            <p className="text-sm text-gray-500 mt-1">Agrega paquetes para comenzar</p>
          </div>
          <Button
            variant="outline"
            className="rounded-full mt-2"
            onClick={() => {
              onClose()
              router.push("/paquetes")
            }}
          >
            Ver paquetes
          </Button>
        </div>
      ) : (
        <>
          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {items.map((item) => {
              const max = getMaxQuantity(item.packageId)
              const subtotal = item.price * item.quantity
              return (
                <div key={item.packageId} className="p-3 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex-shrink-0 bg-gradient-to-br",
                        item.gradient,
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.packageId === 3
                          ? "Semana ilimitada (Lun-Vie)"
                          : item.classCount
                            ? `${item.classCount} clases`
                            : "Clases ilimitadas"}
                        {" · "}
                        {item.packageId === 3 ? "5 días hábiles" : `${item.validityDays} días`}
                      </p>
                    </div>
                    <span className="font-semibold text-sm text-gray-900 flex-shrink-0">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-between pl-13">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full border-gray-300"
                        onClick={() => decrementItem(item.packageId)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-full border-gray-300"
                        onClick={() => incrementItem(item.packageId)}
                        disabled={item.quantity >= max}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <button
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      onClick={() => removeItem(item.packageId)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} {items.reduce((s, i) => s + i.quantity, 0) === 1 ? "paquete" : "paquetes"})
              </span>
              <span className="font-bold text-lg text-gray-900">
                ${totalPrice.toFixed(2)} MXN
              </span>
            </div>
            <Button
              className="w-full bg-[#4A102A] hover:bg-[#85193C] text-white rounded-full font-medium h-11"
              onClick={handleCheckout}
            >
              Pagar ahora
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <button
              className="w-full text-xs text-gray-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors pt-1"
              onClick={clearCart}
            >
              <Trash2 className="h-3 w-3" />
              Vaciar carrito
            </button>
          </div>
        </>
      )}
    </div>
  )
}
