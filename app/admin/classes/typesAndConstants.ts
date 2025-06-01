import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

export interface ClassType {
  id: number
  name: string
  description?: string
  duration: number
  intensity: string
  category: string
  capacity: number
}

export interface Instructor {
  id: number
  user: {
    firstName: string
    lastName: string
  }
  specialties: string[]
}

export interface ScheduledClass {
  id: number
  date: string
  time: string
  maxCapacity: number
  availableSpots: number
  status: string
  classType: ClassType
  instructor: {
    id: number
    user: {
      firstName: string
      lastName: string
    }
  }
  reservations: Array<{
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }>
  waitlist: Array<{
    user: {
      firstName: string
      lastName: string
      email: string
    }
  }>
}

export const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
  "20:00", "21:00",
];

export const weekDays = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

// app/admin/classes/typesAndConstants.ts
export const formatTime = (timeString: string): string => {
  if (!timeString) return 'Hora no disponible';

  // Para strings con formato ISO
  if (typeof timeString === 'string' && timeString.includes('T')) {
    try {
      const timePartMatch = timeString.match(/T(\d{2}:\d{2})/);
      if (timePartMatch && timePartMatch[1]) {
        return timePartMatch[1];
      }
      
      // Si el formato es como "1970-01-01T12:00:00.000Z"
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.getUTCHours().toString().padStart(2, '0') + ':' + 
               date.getUTCMinutes().toString().padStart(2, '0');
      }
    } catch (error) {
      console.error("Error parsing ISO time string:", timeString, error);
      return 'Hora no disponible';
    }
  }

  // Para strings en formato HH:MM o HH:MM:SS
  if (typeof timeString === 'string' && /^[0-2]\d:[0-5]\d(:[0-5]\d)?$/.test(timeString)) {
    return timeString.substring(0, 5);
  }

  console.warn("Unexpected time format:", timeString);
  return typeof timeString === 'string' ? timeString : 'Hora no disponible';
};

export const formatDateForAPI = (dateString: string): string => {
  // Ensure the date is interpreted in the local timezone
  const date = new Date(dateString);
  
  // Format as YYYY-MM-DD in local timezone
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
};

// Add this helper for parsing dates from the API
export const parseAPIDate = (dateString: string): Date => {
  // Parse date without timezone conversion
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const utcToLocalDate = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  try {
    // Crear una fecha desde el string, asumiendo que está en UTC
    const date = new Date(dateString);
    
    // Crear una nueva fecha usando los componentes en UTC para mantener el mismo día
    const localDate = new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    );
    
    return localDate;
  } catch (error) {
    console.error("Error converting UTC date to local:", error);
    return new Date();
  }
};

// Formatear fecha para mostrar en la interfaz
export const formatDateForDisplay = (dateString: string): string => {
  try {
    const date = utcToLocalDate(dateString);
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error formatting date for display:", error);
    return dateString;
  }
}