// lib/date-utils.ts

import { format, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Convierte una fecha de la base de datos (UTC) a una fecha local ajustada
 * para prevenir el problema de la zona horaria.
 */
export function adjustDateFromDatabase(dateString: string): Date {
  const date = new Date(dateString);
  
  // Para fechas sin tiempo (solo fecha), necesitamos ajustar la zona horaria
  if (dateString.length <= 10) {  // "YYYY-MM-DD" tiene 10 caracteres
    // No usamos addDays ya que date-fns considera la zona horaria
    // Creamos una fecha directamente con los componentes
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  
  return date;
}

/**
 * Formatea una fecha para mostrarla en la interfaz
 */
export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? adjustDateFromDatabase(date) : date;
  return format(dateObj, "EEEE, d 'de' MMMM", { locale: es });
}

/**
 * Prepara una fecha para enviarla a la API
 */
export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Extrae solo la hora de un objeto de fecha o string de tiempo
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  // Si es una cadena ISO 8601 (contiene 'T'), extraer la parte HH:mm
  if (typeof timeString === 'string' && timeString.includes('T')) {
    try {
      // Buscar la parte de la hora HH:mm:ss antes de la zona horaria
      const timePartMatch = timeString.match(/T(\d{2}:\d{2})/);
      if (timePartMatch && timePartMatch[1]) {
        return timePartMatch[1]; // Devuelve solo HH:mm
      }
      
      // Si no coincide, intentar crear un objeto Date
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return format(date, 'HH:mm');
      }
    } catch (error) {
      console.error("Error parsing time:", error);
    }
  }
  
  // Si ya es un string en formato HH:mm o similar
  if (typeof timeString === 'string' && /^[0-2]\d:[0-5]\d/.test(timeString)) {
     return timeString.substring(0, 5); // Asegurar HH:mm
  }
  
  return typeof timeString === 'string' ? timeString : '';
}