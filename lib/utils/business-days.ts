// lib/utils/business-days.ts

/**
 * Utilidades para cálculos de días hábiles
 * Los días hábiles son de lunes (1) a viernes (5)
 */

/**
 * Verifica si una fecha es día hábil (lunes a viernes)
 */
export function isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 // 1=Lunes, 5=Viernes, 0=Domingo
  }
  
  /**
   * Agrega días hábiles a una fecha
   * @param startDate - Fecha inicial
   * @param businessDays - Número de días hábiles a agregar
   * @returns Nueva fecha después de agregar los días hábiles
   */
  export function addBusinessDays(startDate: Date, businessDays: number): Date {
    const result = new Date(startDate)
    let daysAdded = 0
    
    while (daysAdded < businessDays) {
      result.setDate(result.getDate() + 1)
      
      // Solo contar si es día hábil
      if (isBusinessDay(result)) {
        daysAdded++
      }
    }
    
    return result
  }
  
  /**
   * Calcula el número de días hábiles entre dos fechas
   * @param startDate - Fecha inicial (incluida)
   * @param endDate - Fecha final (incluida)
   * @returns Número de días hábiles entre las fechas
   */
  export function countBusinessDays(startDate: Date, endDate: Date): number {
    if (startDate > endDate) {
      return 0
    }
    
    let count = 0
    const current = new Date(startDate)
    
    while (current <= endDate) {
      if (isBusinessDay(current)) {
        count++
      }
      current.setDate(current.getDate() + 1)
    }
    
    return count
  }