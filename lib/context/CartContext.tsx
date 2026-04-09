"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"

// Packages that don't allow quantity > 1
// 1 = Primera Vez (once-per-user), 3 = Semana Ilimitada (week selection is 1 at a time)
const MAX_QUANTITY: Record<number, number> = { 1: 1, 3: 1 }
const DEFAULT_MAX_QUANTITY = 10

export function getMaxQuantity(packageId: number): number {
  return MAX_QUANTITY[packageId] ?? DEFAULT_MAX_QUANTITY
}

export interface CartItem {
  packageId: number
  name: string
  price: number
  branchId: number
  branchName: string
  gradient: string
  isFirstTimeOnly: boolean
  classCount: number | null
  validityDays: number
  type: string
  quantity: number
}

interface CartState {
  items: CartItem[]
  branchId: number | null
  branchName: string | null
}

export interface AddItemResult {
  success: boolean
  conflictBranch?: string
}

interface CartContextType {
  items: CartItem[]
  branchId: number | null
  branchName: string | null
  addItem: (item: Omit<CartItem, "quantity">) => AddItemResult
  removeItem: (packageId: number) => void
  incrementItem: (packageId: number) => void
  decrementItem: (packageId: number) => void
  clearCart: () => void
  replaceCartWithItem: (item: Omit<CartItem, "quantity">) => void
  totalItems: number
  totalPrice: number
  getQuantity: (packageId: number) => number
  isInCart: (packageId: number) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = "innata_cart"
const EMPTY_CART: CartState = { items: [], branchId: null, branchName: null }

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_CART)
  const cartRef = useRef<CartState>(EMPTY_CART)

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsed: CartState = JSON.parse(stored)
        // Migrate old items that lack quantity
        parsed.items = parsed.items.map((i) => ({ ...i, quantity: i.quantity ?? 1 }))
        setCart(parsed)
        cartRef.current = parsed
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
  }, [cart])

  const update = useCallback((newCart: CartState) => {
    setCart(newCart)
    cartRef.current = newCart
  }, [])

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">): AddItemResult => {
      const current = cartRef.current

      if (current.branchId !== null && current.branchId !== item.branchId && current.items.length > 0) {
        return { success: false, conflictBranch: current.branchName || undefined }
      }

      const existing = current.items.find((i) => i.packageId === item.packageId)
      const max = getMaxQuantity(item.packageId)

      if (existing) {
        if (existing.quantity >= max) return { success: true } // already at max, silent
        update({
          ...current,
          items: current.items.map((i) =>
            i.packageId === item.packageId ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        })
      } else {
        update({
          items: [...current.items, { ...item, quantity: 1 }],
          branchId: item.branchId,
          branchName: item.branchName,
        })
      }

      return { success: true }
    },
    [update],
  )

  const incrementItem = useCallback(
    (packageId: number) => {
      const current = cartRef.current
      const item = current.items.find((i) => i.packageId === packageId)
      if (!item) return
      if (item.quantity >= getMaxQuantity(packageId)) return
      update({
        ...current,
        items: current.items.map((i) =>
          i.packageId === packageId ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      })
    },
    [update],
  )

  const decrementItem = useCallback(
    (packageId: number) => {
      const current = cartRef.current
      const item = current.items.find((i) => i.packageId === packageId)
      if (!item) return

      if (item.quantity <= 1) {
        // Remove entirely
        const newItems = current.items.filter((i) => i.packageId !== packageId)
        update({
          items: newItems,
          branchId: newItems.length > 0 ? current.branchId : null,
          branchName: newItems.length > 0 ? current.branchName : null,
        })
      } else {
        update({
          ...current,
          items: current.items.map((i) =>
            i.packageId === packageId ? { ...i, quantity: i.quantity - 1 } : i,
          ),
        })
      }
    },
    [update],
  )

  const removeItem = useCallback(
    (packageId: number) => {
      const current = cartRef.current
      const newItems = current.items.filter((i) => i.packageId !== packageId)
      update({
        items: newItems,
        branchId: newItems.length > 0 ? current.branchId : null,
        branchName: newItems.length > 0 ? current.branchName : null,
      })
    },
    [update],
  )

  const clearCart = useCallback(() => update(EMPTY_CART), [update])

  const replaceCartWithItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      update({
        items: [{ ...item, quantity: 1 }],
        branchId: item.branchId,
        branchName: item.branchName,
      })
    },
    [update],
  )

  const totalItems = cart.items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const getQuantity = useCallback(
    (packageId: number) => cart.items.find((i) => i.packageId === packageId)?.quantity ?? 0,
    [cart.items],
  )

  const isInCart = useCallback(
    (packageId: number) => cart.items.some((i) => i.packageId === packageId),
    [cart.items],
  )

  return (
    <CartContext.Provider
      value={{
        items: cart.items,
        branchId: cart.branchId,
        branchName: cart.branchName,
        addItem,
        removeItem,
        incrementItem,
        decrementItem,
        clearCart,
        replaceCartWithItem,
        totalItems,
        totalPrice,
        getQuantity,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used within CartProvider")
  return context
}
