"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function VerificacionPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const email = searchParams.get('email')

  const handleResendVerification = async () => {
    if (!email) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al reenviar el correo de verificación')
      }

      toast({
        title: "Correo reenviado",
        description: "Se ha enviado un nuevo correo de verificación a tu dirección de email.",
        duration: 5000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Error al reenviar el correo de verificación',
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-[#4A102A] mb-4">Error</h1>
          <p className="text-gray-600 mb-6">No se encontró una dirección de correo electrónico para verificar.</p>
          <Link href="/registro">
            <Button className="w-full bg-gradient-to-r from-[#4A102A] to-[#C5172E] hover:from-[#85193C] hover:to-[#C5172E] text-white">
              Volver al registro
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Imagen lateral */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden rounded-3xl m-5">
        <Image src="/innataAsset1.png" alt="Innata Cycling Studio" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#4A102A]/80 to-transparent mix-blend-multiply" />
      </div>

      {/* Contenido */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-[#4A102A] mb-4">Verifica tu cuenta</h1>
          
          <div className="mb-8">
            <p className="text-gray-600 mb-4">
              Hemos enviado un correo de verificación a:
            </p>
            <p className="text-lg font-medium text-[#4A102A]">{email}</p>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              Por favor revisa tu bandeja de entrada y sigue las instrucciones para verificar tu cuenta.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600">
                ¿No recibiste el correo? Revisa tu carpeta de spam o solicita un nuevo correo de verificación.
              </p>
            </div>

            <Button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#4A102A] to-[#C5172E] hover:from-[#85193C] hover:to-[#C5172E] text-white"
            >
              {isLoading ? "Enviando..." : "Reenviar correo de verificación"}
            </Button>

            <div className="mt-6">
              <Link href="/login" className="text-[#85193C] hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 