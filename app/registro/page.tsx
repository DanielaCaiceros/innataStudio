"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react"

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  termsAccepted: boolean
}

interface FieldErrors {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  termsAccepted: string
}

export default function RegistroPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false
  })

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    termsAccepted: ""
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Limpiar errores cuando el usuario empiece a escribir
    if (fieldErrors[name as keyof FieldErrors]) {
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

  const validateForm = (): boolean => {
    const errors: FieldErrors = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      termsAccepted: ""
    }
    
    let isValid = true

    // Validar nombre
    if (!formData.firstName.trim()) {
      errors.firstName = "El nombre es requerido"
      isValid = false
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = "El nombre debe tener al menos 2 caracteres"
      isValid = false
    }

    // Validar apellido
    if (!formData.lastName.trim()) {
      errors.lastName = "El apellido es requerido"
      isValid = false
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = "El apellido debe tener al menos 2 caracteres"
      isValid = false
    }

    // Validar email
    if (!formData.email.trim()) {
      errors.email = "El email es requerido"
      isValid = false
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Por favor ingresa un email válido"
      isValid = false
    }

    // Validar teléfono (opcional pero si se ingresa, debe ser válido)
    if (formData.phone && !/^[\d\s\-\+\(\)]{10,}$/.test(formData.phone.replace(/\s/g, ''))) {
      errors.phone = "Por favor ingresa un número de teléfono válido"
      isValid = false
    }

    // Validar contraseña
    if (!formData.password) {
      errors.password = "La contraseña es requerida"
      isValid = false
    } else if (formData.password.length < 8) {
      errors.password = "La contraseña debe tener al menos 8 caracteres"
      isValid = false
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = "La contraseña debe contener al menos una mayúscula, una minúscula y un número"
      isValid = false
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Confirma tu contraseña"
      isValid = false
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Las contraseñas no coinciden"
      isValid = false
    }

    // Validar términos y condiciones
    if (!formData.termsAccepted) {
      errors.termsAccepted = "Debes aceptar los términos y condiciones"
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
    setSuccessMessage("")

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar usuario')
      }

      // Mostrar mensaje de éxito
      setSuccessMessage("¡Registro exitoso! Hemos enviado un correo de verificación a tu email.")
      
      toast({
        title: "¡Registro exitoso!",
        description: "Por favor verifica tu correo electrónico para activar tu cuenta.",
        duration: 5000,
      })

      // Limpiar el formulario
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        termsAccepted: false
      })

      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push('/login?registered=true')
      }, 2000)

    } catch (error: any) {
      console.error('Error en el registro:', error)
      
      // Manejo específico de errores
      let errorMsg = "Error al registrar usuario. Por favor, intenta de nuevo."
      
      if (error.message) {
        if (error.message.includes("ya está registrado") || error.message.includes("already exists")) {
          errorMsg = "Este email ya está registrado. ¿Ya tienes una cuenta?"
          setFieldErrors(prev => ({ ...prev, email: "Este email ya está en uso" }))
        } else if (error.message.includes("email")) {
          errorMsg = "Hay un problema con el email proporcionado."
          setFieldErrors(prev => ({ ...prev, email: "Email inválido" }))
        } else if (error.message.includes("password")) {
          errorMsg = "Hay un problema con la contraseña proporcionada."
          setFieldErrors(prev => ({ ...prev, password: "Contraseña inválida" }))
        } else {
          errorMsg = error.message
        }
      }
      
      setErrorMessage(errorMsg)
      
      toast({
        title: "Error en el registro",
        description: errorMsg,
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Imagen lateral */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden rounded-3xl m-5">
        <Image src="/innataAsset1.png" alt="Innata Cycling Studio" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-sage/80 to-transparent mix-blend-multiply" />
      </div>

      {/* Formulario */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-brand-sage mb-2">Únete a Innata</h1>
          <p className="text-gray-500 mb-8">
            Crea tu cuenta y comienza tu transformación con nuestras clases de ciclismo indoor.
          </p>

          {/* Mensaje de éxito */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Mensaje de error */}
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
                {errorMessage.includes("¿Ya tienes una cuenta?") && (
                  <Link href="/login" className="text-brand-sage font-medium hover:underline ml-1">
                    Inicia sesión aquí
                  </Link>
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
              <span className="bg-white px-2 text-gray-500">Regístrate con email</span>
            </div>
          </div>

          {/* Formulario de registro */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Nombre" 
                  className={`h-12 ${fieldErrors.firstName ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                  disabled={isLoading}
                  autoComplete="given-name"
                />
                {fieldErrors.firstName && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>
                )}
              </div>
              <div>
                <Input 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Apellido" 
                  className={`h-12 ${fieldErrors.lastName ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                  disabled={isLoading}
                  autoComplete="family-name"
                />
                {fieldErrors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>
            
            <div>
              <Input 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                type="email" 
                placeholder="Email" 
                className={`h-12 ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                disabled={isLoading}
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>
            
            <div>
              <Input 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                type="tel" 
                placeholder="Teléfono (opcional)" 
                className={`h-12 ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                disabled={isLoading}
                autoComplete="tel"
              />
              {fieldErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
              )}
            </div>
            
            <div>
              <div className="relative">
                <Input 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña" 
                  className={`h-12 pr-10 ${fieldErrors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                  disabled={isLoading}
                  autoComplete="new-password"
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
              <p className="text-xs text-gray-500 mt-1">
                Mínimo 8 caracteres, debe contener mayúscula, minúscula y número
              </p>
            </div>
            
            <div>
              <div className="relative">
                <Input 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar contraseña" 
                  className={`h-12 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-300'}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
            
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="terms" 
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, termsAccepted: checked as boolean }))
                }
                disabled={isLoading}
                className={fieldErrors.termsAccepted ? 'border-red-500' : ''}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className={`text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                    fieldErrors.termsAccepted ? 'text-red-500' : 'text-gray-600'
                  }`}
                >
                  Acepto los{" "}
                  <Link href="/terminos" className="text-brand-sage hover:underline">
                    Términos y Condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="text-brand-sage hover:underline">
                    Política de Privacidad
                  </Link>
                </label>
                {fieldErrors.termsAccepted && (
                  <p className="text-xs text-red-500">{fieldErrors.termsAccepted}</p>
                )}
              </div>
            </div>
            
            <Button 
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-brand-sage to-brand-mint hover:from-brand-sage hover:to-brand-mint text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear Cuenta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-black">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-brand-sage font-medium hover:underline">
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}