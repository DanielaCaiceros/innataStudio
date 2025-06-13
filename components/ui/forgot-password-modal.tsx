"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface ForgotPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialEmail?: string
}

export function ForgotPasswordModal({ isOpen, onClose, initialEmail = "" }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(initialEmail)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Por favor ingresa tu email' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setEmailSent(true)
        setMessage({ 
          type: 'success', 
          text: 'Si existe una cuenta con este email, recibirás un correo con instrucciones para restablecer tu contraseña' 
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al enviar el correo' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión. Intenta de nuevo.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail(initialEmail)
    setMessage(null)
    setEmailSent(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 w-12 h-12 bg-brand-sage/10 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-brand-sage" />
          </div>
          <DialogTitle className="text-center text-brand-gray">
            ¿Olvidaste tu contraseña?
          </DialogTitle>
          <DialogDescription className="text-center">
            {emailSent ? 
              "Revisa tu correo electrónico" :
              "Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña"
            }
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="space-y-4">
            {message && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Revisa tu bandeja de entrada y la carpeta de spam
              </p>
              <p className="text-xs text-gray-500">
                Puede tomar algunos minutos en llegar
              </p>
            </div>

            <Button 
              onClick={handleClose}
              className="w-full bg-brand-sage hover:bg-brand-mint"
            >
              Entendido
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (message) setMessage(null)
                }}
                disabled={isLoading}
                required
                className="h-12"
              />
            </div>

            {message && message.type === 'error' && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full h-12 bg-brand-sage hover:bg-brand-mint"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar enlace de reset"
                )}
              </Button>

              <Button 
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="w-full h-12"
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
