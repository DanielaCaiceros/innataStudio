"use client"

import { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { getAvailableWeekOptions } from "@/lib/utils/unlimited-week"

interface SearchedUser {
  id: number
  name: string
  email: string
}

interface Package {
  id: number
  name: string
  price: number
  classCount: number | null
}

interface CartItem {
  packageId: number
  packageName: string
  price: number
  quantity: number
  isUnlimited: boolean
  selectedWeek?: { start: string; end: string }
}

export function AdminCart({ onPaymentComplete }: { onPaymentComplete?: () => void }) {
  const [open, setOpen] = useState(false)

  // User selection
  const [nameSearch, setNameSearch] = useState("")
  const [searchedUsers, setSearchedUsers] = useState<SearchedUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null)

  // Branch + packages
  const [branchId, setBranchId] = useState("")
  const [packages, setPackages] = useState<Package[]>([])
  const [weekSelections, setWeekSelections] = useState<Record<number, { start: string; end: string } | null>>({})

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)

  // Debounced user search by name
  useEffect(() => {
    if (nameSearch.trim().length < 2) {
      setSearchedUsers([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/admin/users/search?name=${encodeURIComponent(nameSearch)}`)
        if (res.ok) {
          const data = await res.json()
          setSearchedUsers(
            data.map((u: { user_id: number; firstName: string; lastName: string; email: string }) => ({
              id: u.user_id,
              name: `${u.firstName} ${u.lastName}`,
              email: u.email,
            }))
          )
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [nameSearch])

  // Load packages by branch
  useEffect(() => {
    if (!branchId || !["1", "2"].includes(branchId)) {
      setPackages([])
      return
    }
    fetch(`/api/packages/by-branch/${branchId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPackages)
      .catch(() => setPackages([]))
  }, [branchId])

  const addToCart = (pkg: Package) => {
    const isUnlimited = pkg.name.toLowerCase().includes("ilimitada")
    const week = isUnlimited ? weekSelections[pkg.id] : undefined

    if (isUnlimited && !week) {
      toast({
        title: "Selecciona una semana",
        description: "Elige la semana para el paquete ilimitado antes de agregar.",
        variant: "destructive",
      })
      return
    }

    setCartItems((prev) => {
      if (isUnlimited) {
        // Each unlimited week is a separate entry
        return [...prev, { packageId: pkg.id, packageName: pkg.name, price: pkg.price, quantity: 1, isUnlimited: true, selectedWeek: week! }]
      }
      const existing = prev.find((i) => i.packageId === pkg.id)
      if (existing) {
        return prev.map((i) => (i.packageId === pkg.id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { packageId: pkg.id, packageName: pkg.name, price: pkg.price, quantity: 1, isUnlimited: false }]
    })
  }

  const updateQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const newQty = prev[index].quantity + delta
      if (newQty <= 0) return prev.filter((_, i) => i !== index)
      return prev.map((item, i) => (i === index ? { ...item, quantity: newQty } : item))
    })
  }

  const removeItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index))
  }

  const reset = () => {
    setSelectedUser(null)
    setNameSearch("")
    setBranchId("")
    setPackages([])
    setCartItems([])
    setNotes("")
    setWeekSelections({})
    setSearchedUsers([])
  }

  const handleProcess = async () => {
    if (!selectedUser || !branchId || cartItems.length === 0) return

    setIsProcessing(true)
    try {
      const res = await fetch("/api/admin/payments/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: selectedUser.id,
          branch_id: parseInt(branchId),
          items: cartItems.map((i) => ({
            packageId: i.packageId,
            quantity: i.quantity,
            selectedWeek: i.selectedWeek?.start,
          })),
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al procesar el carrito")

      toast({
        title: "Pago procesado",
        description: `${data.count} paquete(s) asignados a ${selectedUser.name} por $${data.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      })
      reset()
      setOpen(false)
      onPaymentComplete?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar el carrito",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative border-[#4A102A] text-[#4A102A] hover:bg-[#4A102A] hover:text-white">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Carrito
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-[#4A102A] text-white text-xs rounded-full">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-[#4A102A]">Carrito Administrativo</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          {/* User selection */}
          <div className="space-y-2">
            <Label>Cliente</Label>
            <div className="relative">
              <Input
                placeholder="Buscar por nombre..."
                value={nameSearch}
                onChange={(e) => {
                  setNameSearch(e.target.value)
                  if (selectedUser) setSelectedUser(null)
                }}
              />
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="h-4 w-4 border-2 border-[#4A102A] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {searchedUsers.length > 0 && !selectedUser && (
              <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
                {searchedUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setNameSearch(u.name); setSearchedUsers([]) }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-0 text-sm"
                  >
                    <div className="font-medium">{u.name}</div>
                    <div className="text-gray-500 text-xs">{u.email}</div>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <div className="font-medium text-green-800">{selectedUser.name}</div>
                  <div className="text-green-600 text-xs">{selectedUser.email}</div>
                </div>
              </div>
            )}
          </div>

          {/* Branch selection */}
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Select
              value={branchId}
              onValueChange={(v) => {
                setBranchId(v)
                setCartItems([])
                setWeekSelections({})
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona sucursal..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">SAHAGÚN</SelectItem>
                <SelectItem value="2">APAN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Package catalog */}
          {packages.length > 0 && (
            <div className="space-y-2">
              <Label>Paquetes disponibles</Label>
              <div className="space-y-2">
                {packages.map((pkg) => {
                  const isUnlimited = pkg.name.toLowerCase().includes("ilimitada")
                  const weekOpts = isUnlimited ? getAvailableWeekOptions() : []
                  return (
                    <div key={pkg.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{pkg.name}</div>
                          <div className="text-xs text-gray-500">
                            ${pkg.price.toLocaleString("es-MX")}
                            {pkg.classCount ? ` · ${pkg.classCount} clases` : ""}
                          </div>
                        </div>
                        {!isUnlimited && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 h-8 text-xs"
                            onClick={() => addToCart(pkg)}
                            disabled={!selectedUser || !branchId}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar
                          </Button>
                        )}
                      </div>

                      {isUnlimited && (
                        <div className="space-y-2">
                          <Select
                            value={weekSelections[pkg.id]?.start || ""}
                            onValueChange={(val) => {
                              const opt = weekOpts.find((o) => o.value === val)
                              if (opt) {
                                setWeekSelections((prev) => ({
                                  ...prev,
                                  [pkg.id]: {
                                    start: opt.startDate.toISOString().slice(0, 10),
                                    end: opt.endDate.toISOString().slice(0, 10),
                                  },
                                }))
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Selecciona semana..." />
                            </SelectTrigger>
                            <SelectContent>
                              {weekOpts.map((w, i) => (
                                <SelectItem key={i} value={w.value}>
                                  {w.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs"
                            onClick={() => addToCart(pkg)}
                            disabled={!selectedUser || !branchId}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Agregar semana
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cart summary */}
          {cartItems.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Resumen del carrito</Label>
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.packageName}</div>
                      {item.selectedWeek && (
                        <div className="text-xs text-blue-600">
                          {item.selectedWeek.start} → {item.selectedWeek.end}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        ${(item.price * item.quantity).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    {!item.isUnlimited && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateQuantity(idx, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm w-5 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateQuantity(idx, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-500 hover:text-red-700 shrink-0"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <div className="flex justify-between items-center pt-1 font-semibold">
                  <span>Total</span>
                  <span className="text-[#4A102A]">
                    ${totalPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {cartItems.length > 0 && (
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Notas sobre el pago..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        {cartItems.length > 0 && selectedUser && branchId && (
          <SheetFooter className="px-4 sm:px-6 py-4 border-t shrink-0">
            <Button
              className="w-full bg-[#4A102A] hover:bg-[#5A1A3A]"
              onClick={handleProcess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                `Procesar Pago · $${totalPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
