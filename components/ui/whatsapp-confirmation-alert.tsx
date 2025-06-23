import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { MessageSquareText } from 'lucide-react'
import { formatTimeFromDB } from '@/lib/utils/date'

interface WhatsAppConfirmationAlertProps {
  className?: string;
  date: string;
  time: string;
  userName: string;
}

const WHATSAPP_NUMBER = "527753571894" // Número de WhatsApp del estudio

export function WhatsAppConfirmationAlert({
  className,
  date,
  time,
  userName,
}: WhatsAppConfirmationAlertProps) {
  
  const message = encodeURIComponent(
    `Hola! Soy ${userName}. Quiero confirmar mi asistencia para la clase del ${date} a las ${formatTimeFromDB(time)}. ¡Gracias!`
  )

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`

  return (
    <Alert className={`border-amber-500 bg-amber-50 text-amber-900 ${className}`}>
      <MessageSquareText className="h-5 w-5 text-amber-600" />
      <AlertTitle className="font-bold">¡Acción Requerida!</AlertTitle>
      <AlertDescription>
        Para garantizar tu lugar con Semana Ilimitada, debes confirmar tu asistencia por WhatsApp con al menos 12 horas de anticipación.
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3"
        >
          <Button
            variant="default"
            size="sm"
            className="w-full bg-green-500 hover:bg-green-600 text-white mt-3"
          >
            <MessageSquareText className="h-4 w-4 mr-2" />
            Confirmar por WhatsApp
          </Button>
        </a>
      </AlertDescription>
    </Alert>
  )
} 