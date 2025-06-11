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
    return dayOfWeek >= 1 && dayOfWeek <= 5 // 1=Lunes, 5=Viernes
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
  
  /**
   * Obtiene la fecha de expiración para el paquete Semana Ilimitada
   * La vigencia es de 5 días hábiles desde la fecha de compra
   * @param purchaseDate - Fecha de compra
   * @returns Fecha de expiración (final del último día hábil)
   */
  export function getUnlimitedWeekExpiryDate(purchaseDate: Date = new Date()): Date {
    // Si la compra es en fin de semana, empezar desde el lunes siguiente
    const startDate = new Date(purchaseDate)
    
    // Si es sábado (6) o domingo (0), mover al lunes siguiente
    if (startDate.getDay() === 0) { // Domingo
      startDate.setDate(startDate.getDate() + 1) // Mover a lunes
    } else if (startDate.getDay() === 6) { // Sábado
      startDate.setDate(startDate.getDate() + 2) // Mover a lunes
    }
    
    // Agregar 5 días hábiles desde la fecha de inicio
    const expiryDate = addBusinessDays(startDate, 5)
    
    // Establecer al final del día (23:59:59)
    expiryDate.setHours(23, 59, 59, 999)
    
    return expiryDate
  }
  
  /**
   * Verifica si un paquete Semana Ilimitada está vigente
   * @param purchaseDate - Fecha de compra del paquete
   * @param currentDate - Fecha actual (por defecto: ahora)
   * @returns true si el paquete está vigente
   */
  export function isUnlimitedWeekValid(purchaseDate: Date, currentDate: Date = new Date()): boolean {
    const expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
    return currentDate <= expiryDate
  }
  
  /**
   * Obtiene información detallada sobre la vigencia del paquete
   * @param purchaseDate - Fecha de compra
   * @param currentDate - Fecha actual (por defecto: ahora)
   */
  export function getUnlimitedWeekValidityInfo(purchaseDate: Date, currentDate: Date = new Date()) {
    const expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
    const isValid = currentDate <= expiryDate
    
    // Calcular días hábiles restantes
    let businessDaysRemaining = 0
    if (isValid) {
      businessDaysRemaining = countBusinessDays(currentDate, expiryDate)
    }
    
    return {
      isValid,
      expiryDate,
      businessDaysRemaining,
      totalBusinessDays: 5,
      businessDaysUsed: Math.max(0, 5 - businessDaysRemaining)
    }
  }
  
  /**
   * Formatea un mensaje legible sobre la vigencia del paquete
   * @param purchaseDate - Fecha de compra
   * @param currentDate - Fecha actual (por defecto: ahora)
   */
  export function formatUnlimitedWeekValidity(purchaseDate: Date, currentDate: Date = new Date()): string {
    const info = getUnlimitedWeekValidityInfo(purchaseDate, currentDate)
    
    if (!info.isValid) {
      return `Paquete expirado el ${info.expiryDate.toLocaleDateString('es-ES')}`
    }
    
    if (info.businessDaysRemaining === 0) {
      return `Último día hábil - expira hoy`
    }
    
    if (info.businessDaysRemaining === 1) {
      return `1 día hábil restante`
    }
    
    return `${info.businessDaysRemaining} días hábiles restantes`
  }