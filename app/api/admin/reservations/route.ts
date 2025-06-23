// app/api/admin/reservations/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { addHours, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  formatAdminDate, 
  formatAdminTime, 
  parseAdminDateInput, 
  parseAdminTimeInput 
} from '@/lib/utils/admin-date';
import { 
  getUnlimitedWeekExpiryDate, 
  validateUnlimitedWeekUsage,
  calculateDailyUsage,
  isWithinUnlimitedWeekSchedule 
} from '@/lib/utils/unlimited-week';



const prisma = new PrismaClient();

// GET - Obtener todas las reservaciones (admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }
    
    // Parámetros de búsqueda/filtrado opcionales
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");
    
    // Construir el filtro
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (date) {
      // Crear el rango de fecha completo para el día seleccionado
      const targetDate = new Date(date + "T00:00:00.000Z");
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      
      filter.scheduledClass = {
        date: {
          gte: targetDate,
          lt: nextDay
        }
      };
    }
    
    if (userId) {
      filter.userId = parseInt(userId);
    }

    // Obtener las reservaciones con información relacionada
    const reservations = await prisma.reservation.findMany({
      where: filter,
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        scheduledClass: {
          include: {
            classType: true,
            instructor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      },
      orderBy: [
        {
          scheduledClass: {
            date: "desc"
          }
        },
        {
          scheduledClass: {
            time: "asc"
          }
        }
      ]
    });

    // Formatear los datos para la respuesta con manejo correcto de fechas
    const formattedReservations = reservations.map((res) => {
      // Usar las utilidades de admin para formatear correctamente
      const formattedDate = formatAdminDate(res.scheduledClass.date);
      const formattedTime = formatAdminTime(res.scheduledClass.time);
      
      // Calcular clases restantes en el paquete
      const remainingClasses = res.userPackage?.classesRemaining || 0;

      let determinedPaymentMethod = "pending";
      if (res.userPackage && res.userPackage.paymentMethod) {
          determinedPaymentMethod = res.userPackage.paymentMethod;
      } else if (res.paymentMethod) {
          // res.paymentMethod is from the Reservation table itself
          determinedPaymentMethod = res.paymentMethod;
      }

      let determinedPaymentStatus = "pending";
      if (res.userPackage && res.userPackage.paymentStatus) {
          determinedPaymentStatus = res.userPackage.paymentStatus;
      } else if (res.paymentMethod === "stripe") {
          // If Reservation.paymentMethod is 'stripe', it implies a successful direct payment.
          determinedPaymentStatus = "paid";
      } else if (res.paymentMethod === "cash") { 
          // Assuming 'cash' on Reservation.paymentMethod also implies it's paid.
          determinedPaymentStatus = "paid";
      }
      // Note: Reservation.status refers to booking status (confirmed, cancelled), 
      // not payment status directly for non-package items.

      // The admin frontend page's badge text logic expects 'online' for Stripe payments.
      // And 'cash' for cash payments to render "Efectivo".
      // The `determinedPaymentMethod` from UserPackage might already be 'online'.
      // If `res.paymentMethod` was 'stripe', convert it to 'online' for frontend display consistency.
      let finalDisplayPaymentMethod = determinedPaymentMethod;
      if (determinedPaymentMethod === "stripe") {
          finalDisplayPaymentMethod = "online";
      }
      // If UserPackage.paymentMethod was already 'online', it remains 'online'.
      // If UserPackage.paymentMethod was 'cash', it remains 'cash'.
      // If res.paymentMethod was 'cash', it remains 'cash'.
      
      return {
        id: res.id,
        user: `${res.user.firstName} ${res.user.lastName}`,
        email: res.user.email,
        phone: res.user.phone || "",
        class: res.scheduledClass.classType.name,
        date: formattedDate,
        time: formattedTime,
        status: res.status,
        package: res.userPackage?.package.name || ((finalDisplayPaymentMethod === "online" || finalDisplayPaymentMethod === "cash") && !res.userPackage ? "PASE INDIVIDUAL" : "N/A"),
        remainingClasses: remainingClasses,
        paymentStatus: determinedPaymentStatus,
        paymentMethod: finalDisplayPaymentMethod,
        checkedIn: res.status === "attended",
        checkedInAt: res.checked_in_at,
        bikeNumber: res.bikeNumber
      };
    });

    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error("Error al obtener reservaciones:", error);
    return NextResponse.json({ error: "Error al obtener reservaciones" }, { status: 500 });
  }
}

// POST - Crear nueva reserva (admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, classId, date, time, package: packageType, paymentMethod, bikeNumber, userPackageId } = body;

    if (!userId || !classId || !date || !time || !packageType) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Usar las utilidades de admin para procesar fecha y hora correctamente
    const scheduledDateUTC = parseAdminDateInput(date);
    const scheduledTimeUTC = parseAdminTimeInput(time);

    // Validar número de bicicleta si se especifica
    let parsedBikeNumber = null;
    if (bikeNumber !== undefined && bikeNumber !== null) {
      parsedBikeNumber = Number(bikeNumber);
      if (isNaN(parsedBikeNumber) || parsedBikeNumber < 1 || parsedBikeNumber > 10) {
        return NextResponse.json({ error: "El número de bicicleta debe estar entre 1 y 10" }, { status: 400 });
      }

      // Verificar si la bicicleta ya está reservada para esta clase específica
      const scheduledDateUTC = parseAdminDateInput(date);
      const scheduledTimeUTC = parseAdminTimeInput(time);
      
      const bikeConflict = await prisma.reservation.findFirst({
        where: {
          bikeNumber: parsedBikeNumber,
          status: "confirmed",
          scheduledClass: {
            classTypeId: classId,
            date: scheduledDateUTC,
            time: scheduledTimeUTC
          }
        }
      });

      if (bikeConflict) {
        return NextResponse.json({ 
          error: `La bicicleta #${parsedBikeNumber} ya está reservada para esta clase` 
        }, { status: 400 });
      }
    }

    // Buscar la clase programada o crearla si no existe
    let scheduledClass = await prisma.scheduledClass.findFirst({
      where: {
        classTypeId: classId,
        // Usar las nuevas fechas UTC calculadas
        date: scheduledDateUTC,
        time: scheduledTimeUTC
      }
    });

    if (!scheduledClass) {
      // Obtener datos del tipo de clase
      const classType = await prisma.classType.findUnique({
        where: { id: classId }
      });

      if (!classType) {
        return NextResponse.json({ error: "Tipo de clase no encontrado" }, { status: 404 });
      }

      // Buscar un instructor (podría mejorarse para elegir un instructor específico)
      const instructor = await prisma.instructor.findFirst();
      
      if (!instructor) {
        return NextResponse.json({ error: "No se encontró ningún instructor disponible" }, { status: 404 });
      }

      // Crear la clase programada
      scheduledClass = await prisma.scheduledClass.create({
        data: {
          classTypeId: classId,
          instructorId: instructor.id,
          date: scheduledDateUTC,
          time: scheduledTimeUTC,
          maxCapacity: classType.capacity,
          availableSpots: classType.capacity - 1, // Restar 1 por la reservación que estamos creando
          status: "scheduled"
        }
      });
    } else {
      // Verificar si hay espacios disponibles
      if (scheduledClass.availableSpots <= 0) {
        return NextResponse.json({ error: "No hay espacios disponibles para esta clase" }, { status: 400 });
      }

      // Actualizar espacios disponibles
      await prisma.scheduledClass.update({
        where: { id: scheduledClass.id },
        data: {
          availableSpots: {
            decrement: 1
          }
        }
      });
    }

    // Buscar o crear el paquete de usuario
    let userPackage;

    // Si es un paquete (no un pase individual)
    if (packageType !== "individual") {
      // Si el admin seleccionó un paquete específico, usarlo
      if (userPackageId) {
        userPackage = await prisma.userPackage.findUnique({
          where: { id: Number(userPackageId) }
        });
        if (!userPackage) {
          return NextResponse.json({ error: "Paquete seleccionado no encontrado" }, { status: 404 });
        }
        // Descontar la clase
        await prisma.userPackage.update({
          where: { id: userPackage.id },
          data: {
            classesUsed: { increment: 1 },
            classesRemaining: { decrement: 1 }
          }
        });
      } else {
        const packageMap = {
          "individual": 2,        // PASE INDIVIDUAL
          "primera-vez": 1,       // PRIMERA VEZ  
          "semana-ilimitada": 3,  // SEMANA ILIMITADA
          "10classes": 4,         // PAQUETE 10 CLASES
        };
        const packageId = packageMap[packageType as keyof typeof packageMap];
        if (!packageId) {
          return NextResponse.json({ error: "Tipo de paquete no válido" }, { status: 400 });
        }
        const packageInfo = await prisma.package.findUnique({
          where: { id: packageId }
        });
        if (!packageInfo) {
          return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
        }
        if (packageId === 3) { // Semana Ilimitada
          try {
            const existingUnlimited = await validateUnlimitedWeekReservation(userId, scheduledClass.id, body.selectedWeekStart);
            if (existingUnlimited) {
              userPackage = existingUnlimited;
              await prisma.userPackage.update({
                where: { id: userPackage.id },
                data: {
                  classesUsed: { increment: 1 },
                  classesRemaining: { decrement: 1 }
                }
              });
            } else {
              userPackage = await createUnlimitedWeekPackage(userId, packageInfo, paymentMethod, body.selectedWeekStart);
            }
          } catch (err: any) {
            return NextResponse.json({ error: err.message || "Error en validación de semana ilimitada" }, { status: 400 });
          }
        } else {
          let expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + packageInfo.validityDays);
          userPackage = await prisma.userPackage.create({
            data: {
              userId: userId,
              packageId: packageId,
              expiryDate: expiryDate,
              classesRemaining: packageInfo.classCount,
              classesUsed: 1, // Ya estamos usando una clase
              paymentMethod: paymentMethod === "pending" ? "pending" : paymentMethod,
              paymentStatus: paymentMethod === "pending" ? "pending" : "paid",
              isActive: true
            }
          });
        }
      }
    }

    // Crear la reserva
    const reservation = await prisma.reservation.create({
      data: {
        userId: userId,
        scheduledClassId: scheduledClass.id,
        userPackageId: userPackage?.id, // Puede ser null para pases individuales
        status: "confirmed",
        paymentMethod: packageType !== "individual" ? "package" : paymentMethod,
        bikeNumber: parsedBikeNumber, // Agregar el número de bicicleta
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        scheduledClass: {
          include: {
            classType: true
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      }
    });

    // Actualizar el balance de clases del usuario si es necesario
    if (packageType !== "individual") {
      await prisma.userAccountBalance.upsert({
        where: { userId: userId },
        update: {
          classesUsed: {
            increment: 1
          },
          classesAvailable: {
            decrement: 1
          }
        },
        create: {
          userId: userId,
          totalClassesPurchased: userPackage?.classesRemaining ? userPackage.classesRemaining + 1 : 1,
          classesUsed: 1,
          classesAvailable: userPackage?.classesRemaining || 0
        }
      });
    }

    // Formatear la respuesta usando las utilidades de admin
    const formattedReservation = {
      id: reservation.id,
      user: `${reservation.user.firstName} ${reservation.user.lastName}`,
      email: reservation.user.email,
      phone: reservation.user.phone || "",
      class: reservation.scheduledClass.classType.name,
      date: formatAdminDate(reservation.scheduledClass.date),
      time: formatAdminTime(reservation.scheduledClass.time),
      status: reservation.status,
      package: reservation.userPackage?.package.name || "PASE INDIVIDUAL",
      remainingClasses: reservation.userPackage?.classesRemaining || 0,
      paymentStatus: reservation.userPackage?.paymentStatus || (paymentMethod === "pending" ? "pending" : "paid"),
      paymentMethod: reservation.userPackage?.paymentMethod || paymentMethod,
      checkedIn: false, // Nueva reserva, no ha hecho check-in
      checkedInAt: null, // Nueva reserva, no ha hecho check-in
      bikeNumber: reservation.bikeNumber || null // Incluir el número de bicicleta en la respuesta
    };

    return NextResponse.json(formattedReservation);
  } catch (error) {
    console.error("Error al crear reservación:", error);
    return NextResponse.json({ error: "Error al crear reservación" }, { status: 500 });
  }
}

// --- INICIO DE NUEVAS FUNCIONES PARA SEMANA ILIMITADA ---
/**
 * Validaciones específicas para Semana Ilimitada antes de crear reservación
 */
async function validateUnlimitedWeekReservation(
  userId: number, 
  scheduledClassId: number, 
  selectedWeekStart?: string
) {
  const scheduledClass = await prisma.scheduledClass.findUnique({
    where: { id: scheduledClassId },
    include: { classType: true }
  });

  if (!scheduledClass) {
    throw new Error('Clase no encontrada');
  }

  const classDate = new Date(scheduledClass.date);

  // Verificar que la clase esté en horario permitido (lunes a viernes)
  if (!isWithinUnlimitedWeekSchedule(classDate)) {
    throw new Error('La semana ilimitada solo aplica de lunes a viernes');
  }

  // Si se especifica una semana de inicio, validar que la clase esté en esa semana
  if (selectedWeekStart) {
    const weekStartDate = new Date(selectedWeekStart);
    const weekEndDate = getUnlimitedWeekExpiryDate(weekStartDate);
    
    if (classDate < weekStartDate || classDate > weekEndDate) {
      throw new Error('La clase debe estar dentro de la semana seleccionada');
    }
  }

  // Buscar paquete activo de semana ilimitada
  const existingPackage = await prisma.userPackage.findFirst({
    where: {
      userId: userId,
      packageId: 3,
      isActive: true,
      expiryDate: {
        gte: new Date()
      }
    },
    include: {
      reservations: {
        where: { status: 'confirmed' },
        include: { scheduledClass: true }
      }
    }
  });

  if (existingPackage) {
    // Validar límites de uso
    const weeklyUsage = existingPackage.reservations.length;
    const dailyUsage = calculateDailyUsage(existingPackage.reservations, classDate);

    if (weeklyUsage >= 25) {
      throw new Error('Has alcanzado el límite de 25 clases para esta semana');
    }

    if (dailyUsage >= 5) {
      throw new Error('Has alcanzado el límite de 5 clases por día');
    }

    return existingPackage;
  }

  return null;
}

// Nueva función para crear paquete de semana ilimitada
async function createUnlimitedWeekPackage(
  userId: number, 
  packageInfo: any, 
  paymentMethod: string, 
  selectedWeekStart?: string
) {
  let expiryDate: Date;

  if (selectedWeekStart) {
    // Si se especifica una semana, usar esa fecha de inicio
    const weekStartDate = new Date(selectedWeekStart);
    expiryDate = getUnlimitedWeekExpiryDate(weekStartDate);
  } else {
    // Si no se especifica, usar la semana actual/próxima según reglas de negocio
    const today = new Date();
    const currentDay = today.getDay();
    
    if (currentDay === 0 || currentDay === 6) {
      // Sábado o domingo: usar la próxima semana
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (8 - currentDay) % 7);
      expiryDate = getUnlimitedWeekExpiryDate(nextMonday);
    } else {
      // Lunes a viernes: usar semana actual
      expiryDate = getUnlimitedWeekExpiryDate(today);
    }
  }

  return await prisma.userPackage.create({
    data: {
      userId: userId,
      packageId: 3, // Semana Ilimitada
      expiryDate: expiryDate,
      classesRemaining: 25, // Máximo 25 clases por semana
      classesUsed: 1, // Ya estamos usando una clase
      paymentMethod: paymentMethod === "pending" ? "pending" : paymentMethod,
      paymentStatus: paymentMethod === "pending" ? "pending" : "paid",
      isActive: true
    }
  });
}
// --- FIN DE NUEVAS FUNCIONES PARA SEMANA ILIMITADA ---