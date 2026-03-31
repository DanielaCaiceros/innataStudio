"use client"

import { Suspense } from 'react'
import { AuthProvider } from '@/lib/hooks/useAuth'
import { ThemeProvider } from '@/components/theme-provider'
import { BranchProvider } from '@/lib/context/BranchContext'
import { CartProvider } from '@/lib/context/CartContext'
import { Toaster } from '@/components/ui/toaster'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <Suspense fallback={null}>
          <BranchProvider>
            <CartProvider>
              {children}
              <Toaster />
            </CartProvider>
          </BranchProvider>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  )
}