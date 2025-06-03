import { ScheduledClass } from "@/app/admin/classes/typesAndConstants"
import { format, isSameDay } from "date-fns"

/**
 * Convierte un string de tiempo de la BD (formato ISO) a formato HH:mm
 * @param timeString - String de tiempo en formato ISO (ej: "1970-01-01T18:00:00.000Z")
 * @returns String en formato HH:mm (ej: "18:00")
 */
export function formatTimeFromDBFixed(timeString: string): string {
    if (!timeString) return "00:00"
    
    try {
      const date = new Date(timeString)
      // Mantener en UTC para consistencia
      const hours = date.getUTCHours().toString().padStart(2, '0')
      const minutes = date.getUTCMinutes().toString().padStart(2, '0')
      return `${hours}:${minutes}`
    } catch (error) {
      console.error("Error formateando tiempo:", error, timeString)
      return "00:00"
    }
  }
  
  /**
   * Versión mejorada que crea fecha y hora local correctamente
   */
  export function createLocalClassDateTime(dateString: string, timeString: string): Date {
    // Extraer componentes UTC
    const classDate = new Date(dateString);
    const timeDate = new Date(timeString);
    
    // Crear fecha local (no UTC) para comparación con Date() local
    const localDateTime = new Date(
      classDate.getUTCFullYear(),
      classDate.getUTCMonth(), 
      classDate.getUTCDate(),
      timeDate.getUTCHours(),
      timeDate.getUTCMinutes(),
      0,
      0
    );
    
    return localDateTime;
  }

/**
 * Convierte una fecha UTC de la BD a fecha local para comparación
 * @param dateString - String de fecha en formato ISO UTC
 * @returns Date object para comparación local
 */
export function convertUTCToLocalDate(dateString: string): Date {
  const utcDate = new Date(dateString)
  return new Date(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate())
}

/**
 * Verifica si una clase es del día seleccionado
 * @param classDate - Fecha de la clase en formato ISO
 * @param selectedDate - Fecha seleccionada por el usuario
 * @returns boolean
 */
export function isClassOnSelectedDate(classDate: string, selectedDate: Date): boolean {
  const classLocalDate = convertUTCToLocalDate(classDate)
  return isSameDay(classLocalDate, selectedDate)
}

/**
 * Obtiene horarios únicos de una lista de clases
 * @param classes - Array de clases
 * @returns Array de horarios únicos ordenados
 */
export function getUniqueTimeSlotsFromClasses(classes: Array<{ time: string }>): string[] {
  const timeSlots = classes.map(cls => formatTimeFromDBFixed(cls.time))
  const uniqueSlots = [...new Set(timeSlots)]
  return uniqueSlots.sort()
}

/**
 * Filtra clases por fecha y hora específica
 * @param classes - Array de clases
 * @param selectedDate - Fecha seleccionada
 * @param selectedTime - Hora seleccionada en formato HH:mm
 * @returns Array de clases filtradas
 */
export function filterClassesByDateAndTime(
  classes: Array<{ date: string; time: string }>, 
  selectedDate: Date, 
  selectedTime: string
): Array<{ date: string; time: string }> {
  return classes.filter(cls => {
    const isCorrectDate = isClassOnSelectedDate(cls.date, selectedDate)
    const classTime = formatTimeFromDBFixed(cls.time)
    const isCorrectTime = classTime === selectedTime
    
    return isCorrectDate && isCorrectTime
  })
}

// Agregar estas funciones al archivo de utils o directamente en reservar/page.tsx

/**
 * Crea un Date object completo combinando fecha y hora de la clase
 * CORREGIDO: Mantiene las fechas en UTC para evitar problemas de zona horaria
 */
export function createClassDateTime(dateString: string, timeString: string): Date {
    // Parsear la fecha UTC
    const classDate = new Date(dateString);
    
    // Parsear la hora UTC  
    const timeDate = new Date(timeString);
    
    // Crear nueva fecha combinando fecha y hora en UTC
    const combinedDate = new Date(Date.UTC(
      classDate.getUTCFullYear(),
      classDate.getUTCMonth(), 
      classDate.getUTCDate(),
      timeDate.getUTCHours(),
      timeDate.getUTCMinutes(),
      0,
      0
    ));
    
    return combinedDate;
  }
  
  
 
  
  