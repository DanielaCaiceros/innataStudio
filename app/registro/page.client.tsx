// app/registro/page.client.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

export default function RegistroClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Limpiar error cuando el usuario empieza a escribir de nuevo
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, acceptTerms: checked }));
    
    if (errors.acceptTerms && checked) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.acceptTerms;
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El formato del email es inválido";
    }
    
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres";
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "Debes aceptar los términos y condiciones";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al registrar usuario");
      }
      
      toast({
        title: "¡Registro exitoso!",
        description: "Hemos enviado un correo de verificación a tu dirección de email. Por favor verifica tu cuenta para continuar.",
        variant: "default",
      });
      
      // Redirigir a la página de inicio de sesión
      router.push("/login?registered=true");
    } catch (error: any) {
      toast({
        title: "Error en el registro",
        description: error.message || "Ocurrió un error durante el registro. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Imagen lateral */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden rounded-3xl m-5">
        <Image src="/innataAsset1.png" alt="Innata Cycling Studio" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-[#4A102A]/80 to-transparent mix-blend-multiply" />
      </div>

      {/* Formulario */}
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-[#4A102A] mb-2">Únete a Innata</h1>
          <p className="text-gray-500 mb-8">
            Crea tu cuenta y comienza tu transformación con nuestras clases de ciclismo indoor.
          </p>

          {/* Botones de redes sociales */}
          <div className="space-y-4 mb-6">
            <Button variant="outline" className="w-full flex items-center justify-center gap-2 h-12 border-gray-300 text-black">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.0223 13.607 12.1761 15 9.99984 15C7.23859 15 4.99984 12.7612 4.99984 10C4.99984 7.23871 7.23859 5 9.99984 5C11.2744 5 12.4344 5.48683 13.3177 6.28537L15.6744 3.92871C14.1887 2.56204 12.1932 1.66663 9.99984 1.66663C5.39775 1.66663 1.6665 5.39788 1.6665 10C1.6665 14.6021 5.39775 18.3333 9.99984 18.3333C14.6019 18.3333 18.3332 14.6021 18.3332 10C18.3332 9.44121 18.2757 8.89583 18.1711 8.36788Z"
                  fill="#FFC107"
                />
                <path
                  d="M2.62744 6.12121L5.36536 8.12913C6.10619 6.29496 7.90036 5 9.99994 5C11.2745 5 12.4345 5.48683 13.3178 6.28537L15.6745 3.92871C14.1887 2.56204 12.1932 1.66663 9.99994 1.66663C6.79911 1.66663 4.02327 3.47371 2.62744 6.12121Z"
                  fill="#FF3D00"
                />
                <path
                  d="M10 18.3334C12.1525 18.3334 14.1084 17.4755 15.5871 16.1542L13.008 13.9875C12.1432 14.6452 11.0865 15.0009 10 15.0001C7.83255 15.0001 5.99213 13.618 5.2988 11.6875L2.5813 13.7813C3.96047 16.4926 6.76163 18.3334 10 18.3334Z"
                  fill="#4CAF50"
                />
                <path
                  d="M18.1711 8.36796H17.5V8.33337H10V11.6667H14.7096C14.3809 12.5902 13.7889 13.3972 13.0067 13.9879L13.0079 13.9871L15.5871 16.1538C15.4046 16.3171 18.3333 14.1667 18.3333 10.0001C18.3333 9.44129 18.2758 8.89591 18.1711 8.36796Z"
                  fill="#1976D2"
                />
              </svg>
              Registrarse con Google
            </Button>
          </div>

          {/* Separador */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">O regístrate con email</span>
            </div>
          </div>

          {/* Formulario de registro */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input 
                  placeholder="Nombre" 
                  className={`h-12 border-${errors.firstName ? 'red-500' : 'gray-300'}`} 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Input 
                  placeholder="Apellido" 
                  className={`h-12 border-${errors.lastName ? 'red-500' : 'gray-300'}`} 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>
            <div>
              <Input 
                type="email" 
                placeholder="Email" 
                className={`h-12 border-${errors.email ? 'red-500' : 'gray-300'}`} 
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div>
              <Input 
                type="tel" 
                placeholder="Teléfono (opcional)" 
                className="h-12 border-gray-300" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            <div>
              <Input 
                type="password" 
                placeholder="Contraseña" 
                className={`h-12 border-${errors.password ? 'red-500' : 'gray-300'}`} 
                name="password"
                value={formData.password}
                onChange={handleChange}
              />
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={formData.acceptTerms}
                onCheckedChange={handleCheckboxChange}
              />
              <label
                htmlFor="terms"
                className={`text-sm ${errors.acceptTerms ? 'text-red-500' : 'text-gray-500'} leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`}
              >
                Acepto los{" "}
                <Link href="/terminos" className="text-[#85193C] hover:underline">
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacidad" className="text-[#85193C] hover:underline">
                  Política de Privacidad
                </Link>
              </label>
            </div>
            {errors.acceptTerms && <p className="text-xs text-red-500 mt-1">{errors.acceptTerms}</p>}
            
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-[#4A102A] to-[#C5172E] hover:from-[#85193C] hover:to-[#C5172E] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-black">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="text-[#85193C] font-medium hover:underline">
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}