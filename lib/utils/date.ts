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
 * Este método maneja correctamente la conversión de hora local México a UTC
 * @param dateString - Fecha de la clase (UTC medianoche)
 * @param timeString - Hora de la clase (representada como UTC pero es hora local México)
 * @returns Date object en UTC que representa el momento exacto de la clase
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
  
  // Convertir la hora local de México (UTC-6) a UTC
  // La hora almacenada representa hora local México, así que agregamos 6 horas para obtener UTC real
  const utcHours = hours + 6;
  
  // Crear el timestamp UTC correcto
  const utcDateTime = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    utcHours,
    minutes,
    0,
    0
  ));
  
  return utcDateTime;
}

/**
 * Verifica si una clase es reservable (no ha pasado y no está por iniciar)
 * @param dateString - Fecha de la clase
 * @param timeString - Hora de la clase
 * @returns boolean
 */
export function isClassReservable(dateString: string, timeString: string): boolean {
  try {
    // Get current UTC time
    const now = new Date();
    const nowUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds()
    ));
    
    const classDateTime = createClassDateTime(dateString, timeString)
    
    console.log("[FRONTEND isClassReservable] Current UTC Time:", nowUTC.toISOString());
    console.log("[FRONTEND isClassReservable] Class Time UTC:", classDateTime.toISOString());
    console.log("[FRONTEND isClassReservable] Class Date Input:", dateString);
    console.log("[FRONTEND isClassReservable] Class Time Input:", timeString);
    
    // Si la clase ya pasó
    if (classDateTime < nowUTC) {
      console.log("[FRONTEND isClassReservable] Class has already passed.");
      return false
    }
    
    // Si faltan menos de 1 minuto para la clase
    const ONE_MINUTE = 1 * 60 * 1000
    const timeDifference = classDateTime.getTime() - nowUTC.getTime()
    console.log("[FRONTEND isClassReservable] Time Difference (ms):", timeDifference);
    console.log("[FRONTEND isClassReservable] Time Difference (minutes):", Math.round(timeDifference / 60000));
    
    if (timeDifference < ONE_MINUTE) {
      console.log("[FRONTEND isClassReservable] Class is starting in less than 1 minute.");
      return false
    }
    
    console.log("[FRONTEND isClassReservable] Class is reservable.");
    return true
  } catch (error) {
    console.error("Error verificando si la clase es reservable:", error)
    return false
  }
}