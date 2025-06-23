// lib/utils/unlimited-week.ts

import { startOfWeek, endOfWeek, addWeeks, isBefore, isAfter, isWithinInterval, addDays,format, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export interface UnlimitedWeekValidation {
  isValid: boolean;
  canUseUnlimitedWeek: boolean;
  message: string;
  weeklyUsage?: {
    used: number;
    remaining: number;
    limit: number;
    weekStart: Date;
    weekEnd: Date;
  };
}

export interface WeekOption {
  startDate: Date;
  endDate: Date;
  label: string;
  value: string;
}

/**
 * Calcula la fecha de expiración para un paquete de semana ilimitada
 * Siempre termina el viernes de la semana seleccionada
 */
export function getUnlimitedWeekExpiryDate(startWeekDate: Date): Date {

  // The startWeekDate coming from the payment API is already guaranteed to be the correct Monday 00:00:00 UTC
  const mondayOfWeek = startWeekDate; 
  // It's good practice to use UTC methods if the date is conceptually UTC

  // Using addDays from date-fns for robustness instead of manual setDate
  const fridayOfWeek = addDays(mondayOfWeek, 4); // New way
  
  const result = endOfDay(fridayOfWeek);
  
  return result;
}

/**
 * Obtiene las opciones de semanas disponibles para comprar
 * Puedes elegir cualquier semana dentro de las próximas 3 semanas
 * Una vez elegida, solo puedes reservar clases de lunes a viernes de ESA semana específica
 */
export function getAvailableWeekOptions(): WeekOption[] {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  const weeks: WeekOption[] = [];
  
  // Determinar desde qué semana empezar
  let startWeek = 0;
  
  // Si es sábado (6) o domingo (0), no puede comprar para la semana actual
  if (currentDay === 0 || currentDay === 6) {
    startWeek = 1; // Empezar desde la próxima semana
  }
  
  // Generar las opciones de semana (máximo 3 semanas hacia adelante)
  for (let i = startWeek; i < startWeek + 4; i++) {
    const weekStart = startOfWeek(addWeeks(today, i), { weekStartsOn: 1 });
    const weekEnd = getUnlimitedWeekExpiryDate(weekStart);
    
    const label = `Semana del ${format(weekStart, 'd MMM', { locale: es })} al ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;
    const value = format(weekStart, 'yyyy-MM-dd');
    
    weeks.push({
      startDate: weekStart,
      endDate: weekEnd,
      label,
      value
    });
  }
  
  return weeks;
}

/**
 * Valida si un usuario puede usar su paquete de semana ilimitada para una clase específica
 * IMPORTANTE: Solo puede reservar clases de la semana específica que compró
 */
export function validateUnlimitedWeekUsage(
  userPackage: any,
  scheduledClassDate: Date,
  currentUsage: number
): UnlimitedWeekValidation {
  const today = new Date();
  
  // Verificar si el paquete existe y está activo
  if (!userPackage || !userPackage.isActive) {
    return {
      isValid: false,
      canUseUnlimitedWeek: false,
      message: 'No tienes un paquete de semana ilimitada activo'
    };
  }
  
  // Verificar si el paquete ha expirado
  if (isAfter(today, userPackage.expiryDate)) {
    return {
      isValid: false,
      canUseUnlimitedWeek: false,
      message: 'Tu paquete de semana ilimitada ha expirado'
    };
  }
  
  // VALIDACIÓN CLAVE: Verificar que la clase esté dentro de la semana específica comprada
  const packageWeekStart = startOfWeek(userPackage.purchaseDate, { weekStartsOn: 1 });
  const packageWeekEnd = userPackage.expiryDate;
  const classWeekStart = startOfWeek(scheduledClassDate, { weekStartsOn: 1 });
  
  // La clase debe estar exactamente en la misma semana que el paquete
  if (classWeekStart.getTime() !== packageWeekStart.getTime()) {
    const packageWeekLabel = `${format(packageWeekStart, 'd MMM', { locale: es })} al ${format(packageWeekEnd, 'd MMM', { locale: es })}`;
    return {
      isValid: false,
      canUseUnlimitedWeek: false,
      message: `Tu semana ilimitada es válida solo del ${packageWeekLabel}. Esta clase no está en tu semana contratada.`
    };
  }
  
  // Verificar que sea lunes a viernes
  if (!isWithinUnlimitedWeekSchedule(scheduledClassDate)) {
    return {
      isValid: false,
      canUseUnlimitedWeek: false,
      message: 'La semana ilimitada solo aplica de lunes a viernes'
    };
  }
  
  // Verificar límite semanal (máximo 25 clases)
  if (currentUsage >= 25) {
    return {
      isValid: false,
      canUseUnlimitedWeek: false,
      message: 'Has alcanzado el límite de 25 clases para esta semana'
    };
  }
  
  return {
    isValid: true,
    canUseUnlimitedWeek: true,
    message: 'Puedes usar tu semana ilimitada para esta clase',
    weeklyUsage: {
      used: currentUsage,
      remaining: 25 - currentUsage,
      limit: 25,
      weekStart: packageWeekStart,
      weekEnd: packageWeekEnd
    }
  };
}

/**
 * Verifica si una fecha/hora está dentro del horario permitido para semana ilimitada
 * (Lunes a viernes)
 */
export function isWithinUnlimitedWeekSchedule(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Lunes (1) a viernes (5)
}

/**
 * Calcula el uso diario de un usuario para una fecha específica
 */
export function calculateDailyUsage(reservations: any[], targetDate: Date): number {
  return reservations.filter(reservation => {
    const reservationDate = new Date(reservation.scheduledClass.date);
    return (
      reservationDate.toDateString() === targetDate.toDateString() &&
      reservation.status === 'confirmed'
    );
  }).length;
}

/**
 * Obtiene información de una semana específica para mostrar al usuario
 */
export function getWeekInfo(weekStartDate: Date) {
  const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
  const weekEnd = getUnlimitedWeekExpiryDate(weekStart);
  
  return {
    start: weekStart,
    end: weekEnd,
    label: `Semana del ${format(weekStart, 'd MMM', { locale: es })} al ${format(weekEnd, 'd MMM yyyy', { locale: es })}`,
    isCurrentWeek: isWithinInterval(new Date(), { start: weekStart, end: weekEnd })
  };
}

/**
 * Determina la próxima clase a cancelar según las reglas de penalización
 */
export function getNextClassToCancel(
  userReservations: any[],
  missedReservation: any
): any | null {
  const missedDate = new Date(missedReservation.scheduledClass.date);
  const missedTime = new Date(missedReservation.scheduledClass.time);
  
  // Filtrar reservaciones futuras confirmadas del mismo usuario
  const futureReservations = userReservations.filter(reservation => {
    const resDate = new Date(reservation.scheduledClass.date);
    const resTime = new Date(reservation.scheduledClass.time);
    
    // Debe ser una reservación futura y confirmada
    if (reservation.status !== 'confirmed') return false;
    
    // Si es el mismo día, debe ser después de la clase perdida
    if (resDate.toDateString() === missedDate.toDateString()) {
      return resTime > missedTime;
    }
    
    // Si es un día posterior
    return resDate > missedDate;
  });
  
  // Ordenar por fecha y hora (más próxima primero)
  futureReservations.sort((a, b) => {
    const dateA = new Date(a.scheduledClass.date);
    const dateB = new Date(b.scheduledClass.date);
    
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    const timeA = new Date(a.scheduledClass.time);
    const timeB = new Date(b.scheduledClass.time);
    return timeA.getTime() - timeB.getTime();
  });
  
  return futureReservations.length > 0 ? futureReservations[0] : null;
}