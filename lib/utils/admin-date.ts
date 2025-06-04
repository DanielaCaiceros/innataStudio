// lib/utils/admin-date.ts
/**
 * Utilidades específicas para el manejo de fechas en el panel de administración
 */

/**
 * Formatea una fecha de la BD para mostrar en el admin (formato YYYY-MM-DD)
 */
export function formatAdminDate(dateInput: string | Date): string {
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      
      // Usar UTC para mantener la fecha exacta sin conversión de zona horaria
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Error formateando fecha para admin:", error, dateInput);
      return "";
    }
  }
  
  /**
   * Formatea una hora de la BD para mostrar en el admin (formato HH:mm)
   */
  export function formatAdminTime(timeInput: string | Date): string {
    try {
      const time = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;
      
      // Extraer hora y minutos UTC
      const hours = time.getUTCHours().toString().padStart(2, '0');
      const minutes = time.getUTCMinutes().toString().padStart(2, '0');
      
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formateando hora para admin:", error, timeInput);
      return "00:00";
    }
  }
  
  /**
   * Formatea fecha y hora juntas para mostrar en el admin
   */
  export function formatAdminDateTime(dateInput: string | Date, timeInput: string | Date): string {
    const formattedDate = formatAdminDate(dateInput);
    const formattedTime = formatAdminTime(timeInput);
    
    return `${formattedDate} ${formattedTime}`;
  }
  
  /**
   * Convierte una fecha del input de fecha del frontend a formato de BD
   */
  export function parseAdminDateInput(dateString: string): Date {
    // Crear fecha UTC para evitar problemas de zona horaria
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  
  /**
   * Convierte una hora del input de tiempo del frontend a formato de BD
   */
  export function parseAdminTimeInput(timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0, 0));
  }