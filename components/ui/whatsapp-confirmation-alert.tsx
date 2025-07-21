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

// Función para formatear la fecha de manera legible
const formatDateForWhatsApp = (dateString: string): string => {
  try {
    // Crear la fecha asumiendo que está en UTC y convertirla a la zona horaria local
    const date = new Date(dateString);
    
    // Si la fecha viene en formato ISO, asegurarse de usar la fecha sin conversión de zona horaria
    if (dateString.includes('T')) {
      // Para fechas ISO, extraer solo la parte de la fecha
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      const localDate = new Date(year, month - 1, day); // month - 1 porque los meses en JS van de 0-11
      
      return localDate.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Fallback al string original
  }
}

export function WhatsAppConfirmationAlert({
  className,
  date,
  time,
  userName,
}: WhatsAppConfirmationAlertProps) {
  
  const formattedDate = formatDateForWhatsApp(date);
  const message = encodeURIComponent(
    `Hola! Soy ${userName}. Quiero confirmar mi asistencia para la clase del ${formattedDate} a las ${formatTimeFromDB(time)}. ¡Gracias!`
  )

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`

  return (
    <Alert className={`border-amber-500 bg-amber-50 text-amber-900 ${className}`}>
      <MessageSquareText className="h-5 w-5 text-amber-600" />
      <AlertTitle className="font-bold">¡Acción Requerida!</AlertTitle>
      <AlertDescription>
        Para garantizar tu lugar con Semana Ilimitada, debes confirmar tu asistencia por WhatsApp con al menos 12 horas de anticipación.
        {/* <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3"
        > */}
          {/* <Button
            variant="default"
            size="sm"
            className="w-full bg-green-500 hover:bg-green-600 text-white mt-3"
          >
            <MessageSquareText className="h-4 w-4 mr-2" />
            Confirmar por WhatsApp
          </Button> */}
        {/* </a> */}
      </AlertDescription>
    </Alert>
  )
} 