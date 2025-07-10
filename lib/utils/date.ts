import { format, isSameDay } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Convierte un string de tiempo de la BD (formato ISO) a formato HH:mm
 * Mantiene la hora UTC para consistencia
 */
export function formatTimeFromDB(timeString: string): string {
  if (!timeString) return "00:00"
  
  try {
    const date = new Date(timeString)
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  } catch (error) {
    console.error("Error formateando tiempo:", error, timeString)
    return "00:00"
  }
}

/**
 * Convierte una fecha UTC de la BD a formato local para mostrar
 * Sin conversión de zona horaria (mantiene los mismos números)
 */
export function formatDateFromDB(dateString: string): string {
  if (!dateString) return ""
  
  try {
    const date = new Date(dateString)
    // Usar UTC para mantener la fecha exacta sin conversión de zona horaria
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error("Error formateando fecha:", error, dateString)
    return ""
  }
}

/**
 * Convierte una fecha UTC de la BD a fecha legible en español
 */
export function formatDateToSpanish(dateString: string): string {
  if (!dateString) return ""
  
  try {
    const date = new Date(dateString)
    // Crear fecha local usando componentes UTC para evitar conversión
    const localDate = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
    return format(localDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  } catch (error) {
    console.error("Error formateando fecha a español:", error, dateString)
    return ""
  }
}

/**
 * Convierte una fecha UTC de la BD a fecha local para comparación
 */
export function convertUTCToLocalDate(dateString: string): Date {
  const utcDate = new Date(dateString)
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
}

/**
 * Verifica si una clase es del día seleccionado
 */
export function isClassOnSelectedDate(classDate: string, selectedDate: Date): boolean {
  const classLocalDate = convertUTCToLocalDate(classDate)
  return isSameDay(classLocalDate, selectedDate)
}

/**
 * Obtiene horarios únicos de una lista de clases
 */
export function getUniqueTimeSlotsFromClasses(classes: Array<{ time: string }>): string[] {
  const timeSlots = classes.map(cls => formatTimeFromDB(cls.time))
  const uniqueSlots = [...new Set(timeSlots)]
  return uniqueSlots.sort()
}

/**
 * Filtra clases por fecha y hora específica
 */
export function filterClassesByDateAndTime(
  classes: Array<{ date: string; time: string }>, 
  selectedDate: Date, 
  selectedTime: string
): Array<{ date: string; time: string }> {
  return classes.filter(cls => {
    const isCorrectDate = isClassOnSelectedDate(cls.date, selectedDate)
    const classTime = formatTimeFromDB(cls.time)
    const isCorrectTime = classTime === selectedTime
    
    return isCorrectDate && isCorrectTime
  })
}

/**
 * Crea un Date object completo combinando fecha y hora de la clase
 * Acepta hora en formato 'HH:mm' o string ISO (por ejemplo, '1970-01-01T10:00:00.000Z')
 * Siempre usa la fecha de la clase y la hora/minutos extraídos
 */
export function createClassDateTime(dateString: string, timeString: string): Date {
  let hours = 0, minutes = 0;

  if (timeString.includes('T')) {
    const dateObj = new Date(timeString);
    hours = dateObj.getUTCHours();
    minutes = dateObj.getUTCMinutes();
  } else if (/^\d{2}:\d{2}$/.test(timeString)) {
    [hours, minutes] = timeString.split(':').map(Number);
  }

  const date = new Date(dateString);
  
  // FIXED: Las horas en BD son hora local México (UTC-6)
  // Necesitamos agregar 6 horas para convertir a UTC
  const localHour = hours
  const utcHour = localHour + 6 // Convertir UTC-6 a UTC
  
  // Si la hora UTC resultante es >= 24, la clase es al día siguiente
  const nextDay = utcHour >= 24
  const finalHour = nextDay ? utcHour - 24 : utcHour
  
  // Crear la fecha base
  let finalDate = new Date(date)
  if (nextDay) {
    finalDate.setUTCDate(finalDate.getUTCDate() + 1) // Agregar un día
  }
  
  return new Date(Date.UTC(
    finalDate.getUTCFullYear(),
    finalDate.getUTCMonth(),
    finalDate.getUTCDate(),
    finalHour,
    minutes,
    0,
    0
  ));
}

/**
 * Verifica si una clase es reservable (no ha pasado y no está por iniciar)
 */
export function isClassReservable(dateString: string, timeString: string): boolean {
  try {
    const now = new Date()
    const classDateTime = createClassDateTime(dateString, timeString)
    
    // Si la clase ya pasó
    if (classDateTime < now) {
      return false
    }
    
    // Si faltan menos de 1 minuto para la clase
    const ONE_MINUTE = 1 * 60 * 1000
    const timeDifference = classDateTime.getTime() - now.getTime()
    
    if (timeDifference < ONE_MINUTE) {
      return false
    }
    
    return true
  } catch (error) {
    console.error("Error verificando si la clase es reservable:", error)
    return false
  }
}