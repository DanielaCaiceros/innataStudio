"use client"

import { AuthProvider } from '@/lib/hooks/useAuth'
import { ThemeProvider } from '@/components/theme-provider'
import { BranchProvider } from '@/lib/context/BranchContext'
import { Toaster } from '@/components/ui/toaster'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <BranchProvider>
          {children}
          <Toaster />
        </BranchProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}