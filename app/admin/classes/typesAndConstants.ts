// app/admin/classes/typesAndConstants.ts

export interface ClassType {
  id: number;
  name: string;
  description?: string;
  duration: number;
  intensity: string;
  category: string;
  capacity: number;
}

export interface Instructor {
  id: number;
  user: {
    firstName: string;
    lastName: string;
  };
  specialties: string[];
}

export interface ScheduledClass {
  id: number;
  date: string; // This will be a UTC date string like YYYY-MM-DDTHH:mm:ss.sssZ
  time: string; // This is also a date string, 1970-01-01THH:mm:00.000Z
  maxCapacity: number;
  availableSpots: number;
  status: string;
  classType: ClassType;
  instructor: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  reservations: Array<{
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    status?: string;
  }>;
  waitlist: Array<{
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
  cancelledReservations?: number; // Añadido campo opcional para las cancelaciones
  totalReservations: number; // Total non-cancelled reservations
}

export const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", 
  "17:00", "18:00", "19:00", "20:00", "21:00",
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

export function convertUtcToLocalDateForDisplay(utcDateString: string): Date {
  if (!utcDateString) {
    // console.warn("convertUtcToLocalDateForDisplay received undefined or null string");
    return new Date(); // Consider how to handle this; maybe throw error or return specific invalid date
  }
  const d = new Date(utcDateString); 
  if (isNaN(d.getTime())) {
    console.error("Invalid date string received in convertUtcToLocalDateForDisplay:", utcDateString);
    // Consider how to handle this; maybe throw error or return specific invalid date
    return new Date(); // Fallback
  }
  // Creates a new Date object using the year, month, day, etc., from the UTC perspective of the original date.
  // This effectively "transfers" the date/time parts to the local timezone without conversion.
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

export const formatTime = (timeString: string): string => {
  if (!timeString) return 'Hora no disponible';

  // If it's a full ISO string (e.g., from Prisma, which includes 'T' and often 'Z')
  if (typeof timeString === 'string' && timeString.includes('T')) {
    try {
      // Attempt to extract HH:mm directly if it's a known format like ...THH:mm:ss.sssZ
      const timePartMatch = timeString.match(/T(\d{2}:\d{2})/);
      if (timePartMatch && timePartMatch[1]) {
        return timePartMatch[1]; // Returns HH:mm
      }
      // Fallback: if direct match fails, parse the date and get UTC time
      // This is important if the time part isn't fixed or if we need to be sure about UTC
      // const date = new Date(timeString);
      // if (!isNaN(date.getTime())) {
      //   const hours = date.getUTCHours().toString().padStart(2, '0');
      //   const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      //   return `${hours}:${minutes}`;
      // }
    } catch (error) {
      console.error("Error parsing ISO time string in formatTime:", timeString, error);
      return 'Hora no disponible'; // Fallback on error
    }
  }

  // If it's already a string in HH:mm format (e.g., from timeSlots)
  if (typeof timeString === 'string' && /^[0-2]\d:[0-5]\d/.test(timeString)) {
     return timeString.substring(0, 5); // Ensure HH:mm, handles HH:mm:ss too
  }

  console.warn("Unexpected time format in formatTime:", timeString);
  return typeof timeString === 'string' ? timeString : 'Hora no disponible';
};
