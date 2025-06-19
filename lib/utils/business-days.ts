// lib/utils/business-days.ts
import { startOfWeek, addDays, startOfDay, isEqual } from 'date-fns';

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
  export function getUnlimitedWeekExpiryDate(baseDate: Date, selectedStartDate?: Date | null): Date {
    let expiry: Date;

    if (selectedStartDate) {
      // selectedStartDate is expected to be a Monday
      const startDateNormalized = startOfDay(new Date(selectedStartDate));
      expiry = addDays(startDateNormalized, 4); // Monday + 4 days = Friday
    } else {
      // Fallback logic: Expiry is Friday of the week of purchase (or next week if purchased on weekend)
      const purchaseD = startOfDay(new Date(baseDate));
      let effectiveMonday: Date;
      const dayOfWeek = purchaseD.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

      if (dayOfWeek === 0) { // Sunday
        effectiveMonday = addDays(purchaseD, 1);
      } else if (dayOfWeek === 6) { // Saturday
        effectiveMonday = addDays(purchaseD, 2);
      } else {
        // If Mon-Fri, use the Monday of that week
        effectiveMonday = startOfWeek(purchaseD, { weekStartsOn: 1 });
      }
      expiry = addDays(effectiveMonday, 4); // Friday
    }

    expiry.setHours(23, 59, 59, 999); // Set to end of day
    return expiry;
  }
  
  /**
   * Verifica si un paquete Semana Ilimitada está vigente
   * @param baseDate - Fecha de compra del paquete (o base para cálculo sin selectedStartDate)
   * @param currentDate - Fecha actual (por defecto: ahora)
   * @param selectedStartDate - Fecha de inicio seleccionada (Lunes)
   * @returns true si el paquete está vigente
   */
  export function isUnlimitedWeekValid(baseDate: Date, currentDate: Date = new Date(), selectedStartDate?: Date | null): boolean {
    const normalizedCurrentDate = startOfDay(new Date(currentDate));
    const expiryDate = getUnlimitedWeekExpiryDate(baseDate, selectedStartDate);

    let actualStartDate: Date;
    if (selectedStartDate) {
      actualStartDate = startOfDay(new Date(selectedStartDate));
    } else {
      // Fallback: determine effective start Monday based on baseDate (purchase date)
      const purchaseD = startOfDay(new Date(baseDate));
      const dayOfWeek = purchaseD.getDay();
      if (dayOfWeek === 0) { actualStartDate = addDays(purchaseD, 1); }
      else if (dayOfWeek === 6) { actualStartDate = addDays(purchaseD, 2); }
      else { actualStartDate = startOfWeek(purchaseD, { weekStartsOn: 1 }); }
    }
    return normalizedCurrentDate >= actualStartDate && normalizedCurrentDate <= expiryDate;
  }
  
  /**
   * Obtiene información detallada sobre la vigencia del paquete
   * @param baseDate - Fecha de compra (o base para cálculo sin selectedStartDate)
   * @param currentDate - Fecha actual (por defecto: ahora)
   * @param selectedStartDate - Fecha de inicio seleccionada (Lunes)
   */
  export function getUnlimitedWeekValidityInfo(baseDate: Date, currentDate: Date = new Date(), selectedStartDate?: Date | null) {
    const normalizedCurrentDate = startOfDay(new Date(currentDate));
    const expiryDate = getUnlimitedWeekExpiryDate(baseDate, selectedStartDate);
    
    let actualStartDate: Date;
    if (selectedStartDate) {
      actualStartDate = startOfDay(new Date(selectedStartDate));
    } else {
      const purchaseD = startOfDay(new Date(baseDate));
      const dayOfWeek = purchaseD.getDay();
      if (dayOfWeek === 0) { actualStartDate = addDays(purchaseD, 1); }
      else if (dayOfWeek === 6) { actualStartDate = addDays(purchaseD, 2); }
      else { actualStartDate = startOfWeek(purchaseD, { weekStartsOn: 1 }); }
    }

    const isValid = normalizedCurrentDate >= actualStartDate && normalizedCurrentDate <= expiryDate;
    
    let businessDaysRemaining = 0;
    if (isValid) {
      // If current date is before actual start, count all days from actual start. Otherwise, from current.
      const countFrom = normalizedCurrentDate < actualStartDate ? actualStartDate : normalizedCurrentDate;
      businessDaysRemaining = countBusinessDays(countFrom, expiryDate);
    } else if (normalizedCurrentDate < actualStartDate) {
      // Package hasn't started yet, show total days it will have
      businessDaysRemaining = countBusinessDays(actualStartDate, expiryDate);
    }
    
    // Total business days for a standard week (Mon-Fri) is 5
    // If selectedStartDate is used, the package is always for 1 week (Mon-Fri).
    // If fallback is used, it's also for 1 week (Mon-Fri of purchase/next week).
    const totalBusinessDays = 5; 

    return {
      isValid,
      startDate: actualStartDate, // Added for clarity
      expiryDate,
      businessDaysRemaining,
      totalBusinessDays, // This is always 5 for a weekly package
      businessDaysUsed: Math.max(0, totalBusinessDays - businessDaysRemaining)
    };
  }
  
  /**
   * Formatea un mensaje legible sobre la vigencia del paquete
   * @param baseDate - Fecha de compra (o base para cálculo sin selectedStartDate)
   * @param currentDate - Fecha actual (por defecto: ahora)
   * @param selectedStartDate - Fecha de inicio seleccionada (Lunes)
   */
  export function formatUnlimitedWeekValidity(baseDate: Date, currentDate: Date = new Date(), selectedStartDate?: Date | null): string {
    const info = getUnlimitedWeekValidityInfo(baseDate, currentDate, selectedStartDate);
    
    const currentDayStart = startOfDay(new Date(currentDate));
    if (currentDayStart < info.startDate && !info.isValid) { // Not yet active
        return `Paquete inicia el ${info.startDate.toLocaleDateString('es-ES')} y expira el ${info.expiryDate.toLocaleDateString('es-ES')}. Días hábiles: ${info.businessDaysRemaining}/${info.totalBusinessDays}.`;
    }
    
    if (!info.isValid) { // Expired
      return `Paquete expiró el ${info.expiryDate.toLocaleDateString('es-ES')}`;
    }
    
    // Special handling for today if it's the expiryDate
    if (isEqual(startOfDay(info.expiryDate), startOfDay(currentDate))) {
         if (info.businessDaysRemaining > 0) { // Should be 1 if it's the last day and still valid
            return `Último día hábil - expira hoy. Días restantes: ${info.businessDaysRemaining}/${info.totalBusinessDays}.`;
         } else { // Should not happen if isValid is true and on expiry date
            return `Paquete expira hoy. Días restantes: ${info.businessDaysRemaining}/${info.totalBusinessDays}.`;
         }
    }
        
    return `Paquete válido hasta ${info.expiryDate.toLocaleDateString('es-ES')}. Días hábiles restantes: ${info.businessDaysRemaining}/${info.totalBusinessDays}.`;
  }