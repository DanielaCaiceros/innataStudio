// app/login/page.client.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Verificar si hay mensajes en la URL
  const registered = searchParams.get("registered");
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");
  const redirect = searchParams.get("redirect") || "/mi-cuenta";

  useEffect(() => {
    if (registered === "true") {
      toast({
        title: "¡Registro exitoso!",
        description: "Hemos enviado un correo de verificación a tu dirección de email. Por favor verifica tu cuenta para continuar.",
        variant: "default",
      });
    }
    
    if (verified === "true") {
      toast({
        title: "¡Cuenta verificada!",
        description: "Tu cuenta ha sido verificada exitosamente. Ahora puedes iniciar sesión.",
        variant: "default",
      });
    }
    
    if (error) {
      toast({
        title: "Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
    }
  }, [registered, verified, error, toast]);

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    }
    
    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }
      
      // Guardar token en cookie
      document.cookie = `auth_token=${data.token}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 días
      
      toast({
        title: "¡Inicio de sesión exitoso!",
        description: "Bienvenido(a) de nuevo a Innata Studio.",
        variant: "default",
      });
      
      // Redirigir a la página principal o a la URL de redirección
      router.push(redirect);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error en el inicio de sesión",
        description: error.message || "Ocurrió un error durante el inicio de sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: "Ingresa tu email para reenviar la verificación" });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al reenviar el correo de verificación");
      }
      
      toast({
        title: "Correo reenviado",
        description: "Hemos enviado un nuevo correo de verificación a tu dirección de email.",
        variant: "default",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al reenviar el correo de verificación.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Alertas */}
          {registered === "true" && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ¡Registro exitoso! Hemos enviado un correo de verificación a tu dirección de email.
                <button 
                  className="text-[#85193C] font-medium hover:underline ml-1"
                  onClick={handleResendVerification}
                  disabled={isLoading}
                >
                  Reenviar correo
                </button>
              </AlertDescription>
            </Alert>
          )}

          {verified === "true" && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ¡Tu cuenta ha sido verificada! Ahora puedes iniciar sesión.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {decodeURIComponent(error)}
                {error.includes("verificación") && (
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

          {/* Formulario de email */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="tu@email.com" 
                className={`h-12 border-${errors.email ? 'red-500' : 'gray-300'}`} 
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
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
            <div className="flex justify-between items-center text-sm">
              <Link href="/reset-password" className="text-brand-gray hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Button 
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-brand-sage to-brand-gray hover:from-brand-mint hover:to-brand-sage text-white"
              disabled={isLoading}
            >
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
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
      </div>
    </div>
  );
}