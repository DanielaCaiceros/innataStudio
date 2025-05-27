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

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  termsAccepted: boolean
}

export default function RegistroPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    termsAccepted: false
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.termsAccepted) {
      toast({
        title: "Error",
        description: "Debes aceptar los términos y condiciones",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar usuario')
      }

      // Mostrar mensaje de éxito
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
        termsAccepted: false
      })

      // Redirigir a la página de verificación
      router.push('/verificacion?email=' + encodeURIComponent(formData.email))
    } catch (error) {
      console.error('Error en el registro:', error)
      toast({
        title: "Error en el registro",
        description: error instanceof Error ? error.message : 'Error al registrar usuario',
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
                  required
                  className="h-12 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-brand-sage focus:ring-brand-sage" 
                />
              </div>
              <div>
                <Input 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Apellido" 
                  required
                  className="h-12 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-brand-sage focus:ring-brand-sage" 
                />
              </div>
            </div>
            <div>
              <Input 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                type="email" 
                placeholder="Email" 
                required
                className="h-12 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-brand-sage focus:ring-brand-sage" 
              />
            </div>
            <div>
              <Input 
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                type="tel" 
                placeholder="Teléfono" 
                required
                className="h-12 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-brand-sage focus:ring-brand-sage" 
              />
            </div>
            <div>
              <Input 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                type="password" 
                placeholder="Contraseña" 
                required
                minLength={6}
                className="h-12 border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-brand-sage focus:ring-brand-sage" 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                name="termsAccepted"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, termsAccepted: checked as boolean }))
                }
              />
              <label
                htmlFor="terms"
                className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
            </div>
            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-brand-sage to-brand-mint hover:from-brand-sage hover:to-brand-mint text-white"
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-700">
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