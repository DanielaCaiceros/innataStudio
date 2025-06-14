"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react"
import { ForgotPasswordModal } from "@/components/ui/forgot-password-modal"
import { ResetPasswordModal } from "@/components/ui/reset-password-modal"

function LoginContent() {
  const router = useRouter()
  const { login } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetToken, setResetToken] = useState("")
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: ""
  })

  // Verificar parámetros de URL para mensajes
  useEffect(() => {
    const registered = searchParams.get("registered")
    const verified = searchParams.get("verified")
    const error = searchParams.get("error")
    const resetTokenParam = searchParams.get("reset-token")

    console.log("Login page useEffect triggered")
    console.log("Reset token from URL:", resetTokenParam)
    console.log("All search params:", Object.fromEntries(searchParams.entries()))

    if (registered === "true") {
      setSuccessMessage("Registro exitoso. Revisa tu email para verificar tu cuenta.")
    }
    
    if (verified === "true") {
      setSuccessMessage("Cuenta verificada exitosamente. Ahora puedes iniciar sesión.")
    }
    
    if (error) {
      setErrorMessage(decodeURIComponent(error))
    }

    // Si hay un token de reset en la URL, abrir el modal de reset
    if (resetTokenParam) {
      console.log("Found reset token, setting up modal:", resetTokenParam)
      setResetToken(resetTokenParam)
      setShowResetPasswordModal(true)
    }
  }, [searchParams])

  // Efecto adicional para depuración
  useEffect(() => {
    console.log("Modal states:", { 
      showResetPasswordModal, 
      resetToken, 
      showForgotPasswordModal 
    })
  }, [showResetPasswordModal, resetToken, showForgotPasswordModal])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ""
      }))
    }
    
    // Limpiar mensaje de error general
    if (errorMessage) {
      setErrorMessage("")
    }
  }

  const validateForm = () => {
    const errors = {
      email: "",
      password: ""
    }
    
    let isValid = true

    // Validar email
    if (!formData.email.trim()) {
      errors.email = "El email es requerido"
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Por favor ingresa un email válido"
      isValid = false
    }

    // Validar contraseña
    if (!formData.password) {
      errors.password = "La contraseña es requerida"
      isValid = false
    } else if (formData.password.length < 6) {
      errors.password = "La contraseña debe tener al menos 6 caracteres"
      isValid = false
    }

    setFieldErrors(errors)
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      await login(formData)
      
      toast({
        title: "¡Bienvenido!",
        description: "Has iniciado sesión correctamente.",
      })
      
      const redirect = searchParams.get("redirect") || "/mi-cuenta"
      router.push(redirect)
    } catch (error: any) {
      console.error("Login error:", error)
      
      // Manejo específico de errores
      let errorMsg = "Error al iniciar sesión. Por favor, intenta de nuevo."
      
      if (error.message) {
        if (error.message.includes("Credenciales inválidas")) {
          errorMsg = "Email o contraseña incorrectos. Por favor verifica tus datos."
        } else if (error.message.includes("verificación")) {
          errorMsg = "Tu cuenta no ha sido verificada. Revisa tu email y haz clic en el enlace de verificación."
        } else if (error.message.includes("inactive")) {
          errorMsg = "Tu cuenta ha sido desactivada. Contacta al soporte para más información."
        } else {
          errorMsg = error.message
        }
      }
      
      setErrorMessage(errorMsg)
      
      toast({
        title: "Error al iniciar sesión",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!formData.email.trim()) {
      setFieldErrors(prev => ({ ...prev, email: "Ingresa tu email para reenviar la verificación" }))
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Error al reenviar el correo de verificación")
      }
      
      setSuccessMessage("Correo de verificación reenviado. Revisa tu bandeja de entrada.")
      setErrorMessage("")
      
      toast({
        title: "Correo reenviado",
        description: "Hemos enviado un nuevo correo de verificación a tu dirección de email.",
        variant: "default",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al reenviar el correo de verificación.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Imagen lateral */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden rounded-3xl m-2">
        <Image src="/innataAsset1.png" alt="Innata Cycling Studio" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#4A102A]/80 to-transparent mix-blend-multiply" />
      </div>

      {/* Formulario */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-brand-gray mb-2">Bienvenido a Innata</h1>
          <p className="text-gray-500 mb-8">
            Innata es un espacio único para transformar tu cuerpo y mente a través del ciclismo indoor.
          </p>

          {/* Alertas de éxito */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
                {successMessage.includes("verificar") && (
                  <button 
                    className="text-[#85193C] font-medium hover:underline ml-1"
                    onClick={handleResendVerification}
                    disabled={isLoading}
                  >
                    Reenviar correo
                  </button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Alertas de error */}
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
                {errorMessage.includes("verificación") && (
                  <button 
                    className="text-[#85193C] font-medium hover:underline ml-1"
                    onClick={handleResendVerification}
                    disabled={isLoading}
                  >
                    Reenviar correo
                  </button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Separador */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Continuar con email</span>
            </div>
          </div>

          {/* Formulario de login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input 
                name="email"
                type="email" 
                placeholder="tu@email.com" 
                className={`h-12 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Input 
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña" 
                  className={`h-12 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <button 
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-brand-gray hover:underline"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            
            <Button 
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-brand-sage to-brand-gray hover:from-brand-mint hover:to-brand-sage text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-black">
            ¿No tienes una cuenta?{" "}
            <Link href="/registro" className="text-brand-gray font-medium hover:underline">
              Regístrate
            </Link>
          </div>

          <div className="mt-8 text-xs text-center text-gray-500">
            Al iniciar sesión, aceptas nuestros{" "}
            <Link href="/terminos" className="text-[#85193C] hover:underline">
              Términos y Condiciones
            </Link>{" "}
            y{" "}
            <Link href="/privacidad" className="text-[#85193C] hover:underline">
              Política de Privacidad
            </Link>
          </div>
        </div>

        {/* Modales */}
        <ForgotPasswordModal
          isOpen={showForgotPasswordModal}
          onClose={() => setShowForgotPasswordModal(false)}
          initialEmail={formData.email}
        />

        <ResetPasswordModal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false)
            setResetToken("")
            // Limpiar el token de la URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('reset-token')
            window.history.replaceState({}, '', newUrl.toString())
          }}
          onSuccess={() => {
            setShowResetPasswordModal(false)
            setResetToken("")
            setSuccessMessage("Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.")
            // Limpiar el token de la URL
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('reset-token')
            window.history.replaceState({}, '', newUrl.toString())
          }}
          token={resetToken}
        />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-sage mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}