import { startOfWeek, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Valida si un usuario puede reservar una clase específica con su paquete de semana ilimitada
 * REGLA PRINCIPAL: Solo puede reservar clases de la semana exacta que compró
 */
export function canBookClassWithUnlimitedWeek(
  userPackage: any,
  scheduledClassDate: Date
): { canBook: boolean; message: string; weekInfo?: any } {
  
  if (!userPackage || userPackage.packageId !== 3) {
    return {
      canBook: false,
      message: 'No tienes un paquete de semana ilimitada activo'
    };
  }

  // Obtener la semana del paquete (basada en purchaseDate que ahora es la fecha de inicio de semana)
  const packageWeekStart = startOfWeek(new Date(userPackage.purchaseDate), { weekStartsOn: 1 });
  const packageWeekEnd = new Date(userPackage.expiryDate);
  
  // Obtener la semana de la clase
  const classWeekStart = startOfWeek(scheduledClassDate, { weekStartsOn: 1 });
  
  // Verificar que sea la misma semana
  if (packageWeekStart.getTime() !== classWeekStart.getTime()) {
    const packageWeekLabel = `${format(packageWeekStart, 'd \'de\' MMM', { locale: es })} al ${format(packageWeekEnd, 'd \'de\' MMM', { locale: es })}`;
    const classWeekLabel = format(scheduledClassDate, 'd \'de\' MMM', { locale: es });
    
    return {
      canBook: false,
      message: `Tu semana ilimitada es válida solo del ${packageWeekLabel}. La clase del ${classWeekLabel} no está en tu semana contratada.`,
      weekInfo: {
        packageWeek: { start: packageWeekStart, end: packageWeekEnd },
        classWeek: { start: classWeekStart }
      }
    };
  }

  // Verificar que sea lunes a viernes
  const classDay = scheduledClassDate.getDay();
  if (classDay === 0 || classDay === 6) { // domingo o sábado
    return {
      canBook: false,
      message: 'La semana ilimitada solo es válida de lunes a viernes'
    };
  }

  // Verificar que el paquete esté activo
  if (!userPackage.isActive || userPackage.paymentStatus !== 'paid') {
    return {
      canBook: false,
      message: 'Tu paquete de semana ilimitada no está activo'
    };
  }

  // Verificar que no haya expirado
  const today = new Date();
  if (today > new Date(userPackage.expiryDate)) {
    return {
      canBook: false,
      message: 'Tu paquete de semana ilimitada ha expirado'
    };
  }

  return {
    canBook: true,
    message: 'Puedes reservar esta clase con tu semana ilimitada',
    weekInfo: {
      packageWeek: { start: packageWeekStart, end: packageWeekEnd }
    }
  };
}

/**
 * Obtiene información de la semana específica del paquete del usuario
 */
export function getUserUnlimitedWeekInfo(userPackage: any) {
  if (!userPackage || userPackage.packageId !== 3) {
    return null;
  }

  const weekStart = startOfWeek(new Date(userPackage.purchaseDate), { weekStartsOn: 1 });
  const weekEnd = new Date(userPackage.expiryDate);
  
  return {
    weekStart,
    weekEnd,
    label: `${format(weekStart, 'd \'de\' MMM', { locale: es })} al ${format(weekEnd, 'd \'de\' MMM yyyy', { locale: es })}`,
    isCurrentWeek: isCurrentWeek(weekStart),
    daysInWeek: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    packageId: userPackage.id,
    isActive: userPackage.isActive,
    paymentStatus: userPackage.paymentStatus,
    classesUsed: userPackage.classesUsed || 0,
    classesRemaining: userPackage.classesRemaining || 0
  };
}

/**
 * Verifica si una semana es la semana actual
 */
function isCurrentWeek(weekStart: Date): boolean {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  return weekStart.getTime() === currentWeekStart.getTime();
}

/**
 * Filtra las clases disponibles que el usuario puede reservar con su semana ilimitada
 */
export function filterClassesForUnlimitedWeek(
  scheduledClasses: any[],
  userPackage: any
): any[] {
  if (!userPackage || userPackage.packageId !== 3) {
    return [];
  }

  const packageWeekStart = startOfWeek(new Date(userPackage.purchaseDate), { weekStartsOn: 1 });
  
  return scheduledClasses.filter(scheduledClass => {
    const classDate = new Date(scheduledClass.date);
    const classWeekStart = startOfWeek(classDate, { weekStartsOn: 1 });
    const classDay = classDate.getDay();
    
    // Debe ser la misma semana y de lunes a viernes
    return (
      packageWeekStart.getTime() === classWeekStart.getTime() &&
      classDay >= 1 && classDay <= 5
    );
  });
}