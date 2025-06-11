// app/api/admin/reservations/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { addHours, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/business-days'


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
      // Formatear la fecha de la clase
      const classDate = new Date(res.scheduledClass.date);
      const formattedDate = classDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Formatear la hora de la clase
      const classTime = new Date(res.scheduledClass.time);
      const hours = classTime.getUTCHours().toString().padStart(2, '0');
      const minutes = classTime.getUTCMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;
      
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
        paymentMethod: finalDisplayPaymentMethod
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
    const { userId, classId, date, time, package: packageType, paymentMethod } = body;

    if (!userId || !classId || !date || !time || !packageType) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // --- NUEVA LÓGICA PARA MANEJO DE FECHA Y HORA (ALMACENAMIENTO) ---
    // El usuario proporciona fecha (YYYY-MM-DD) y hora (HH:MM) en hora local de México (UTC-6).
    // Necesitamos almacenar esto en la base de datos como su equivalente UTC.

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    // Crear un objeto Date representando la hora de la clase en UTC.
    // México es UTC-6, por lo que sumamos 6 horas a los componentes de hora local para obtener UTC.
    // El mes es 0-indexado en Date.UTC, por eso 'month - 1'.
    const scheduledTimeUTC = new Date(Date.UTC(year, month - 1, day, hours + 6, minutes, 0, 0));

    // Para el campo scheduledClass.date, necesitamos el inicio del día en UTC para esta clase.
    const scheduledDateUTC = new Date(Date.UTC(
      scheduledTimeUTC.getUTCFullYear(),
      scheduledTimeUTC.getUTCMonth(),
      scheduledTimeUTC.getUTCDate()
    ));
    // --- FIN NUEVA LÓGICA ---

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
          // Usar las nuevas fechas UTC calculadas
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
      const packageMap = {
        "5classes": 1,
        "10classes": 2, 
        "monthly": 3, // Este debería ser el ID del paquete Semana Ilimitada
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

  // **NUEVA LÓGICA**: Calcular fecha de expiración según el tipo de paquete
  let expiryDate: Date;
  
  if (packageId === 3) { // Semana Ilimitada
    expiryDate = getUnlimitedWeekExpiryDate(new Date());
  } else {
    // Para otros paquetes, usar días calendario normales
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + packageInfo.validityDays);
  }
  
  // Crear el paquete de usuario
  userPackage = await prisma.userPackage.create({
    data: {
      userId: userId,
      packageId: packageId,
      expiryDate: expiryDate,
      classesRemaining: packageInfo.classCount,
      classesUsed: 1, // Ya estamos usando una clase
      paymentMethod: paymentMethod === "pending" ? "pending" : paymentMethod,
      paymentStatus: paymentMethod === "pending" ? "pending" : "paid",
    }
  });
}

    // Crear la reserva
    const reservation = await prisma.reservation.create({
      data: {
        userId: userId,
        scheduledClassId: scheduledClass.id,
        userPackageId: userPackage?.id, // Puede ser null para pases individuales
        status: "confirmed",
        paymentMethod: packageType !== "individual" ? "package" : paymentMethod,
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

    // Formatear la respuesta para el frontend del admin (también debe usar la zona horaria local)
    // Asumiendo que `reservation.scheduledClass.date` y `reservation.scheduledClass.time` ya son UTC del DB.
    const classDateTimeUTC = new Date(Date.UTC(
      reservation.scheduledClass.date.getUTCFullYear(),
      reservation.scheduledClass.date.getUTCMonth(),
      reservation.scheduledClass.date.getUTCDate(),
      reservation.scheduledClass.time.getUTCHours(),
      reservation.scheduledClass.time.getUTCMinutes()
    ));

    const mexicoCityTimeZone = 'America/Mexico_City';

    const formattedReservation = {
      id: reservation.id,
      user: `${reservation.user.firstName} ${reservation.user.lastName}`,
      email: reservation.user.email,
      phone: reservation.user.phone || "",
      class: reservation.scheduledClass.classType.name,
      date: formatInTimeZone(classDateTimeUTC, mexicoCityTimeZone, 'yyyy-MM-dd'),
      time: formatInTimeZone(classDateTimeUTC, mexicoCityTimeZone, 'HH:mm'),
      status: reservation.status,
      package: reservation.userPackage?.package.name || "PASE INDIVIDUAL",
      remainingClasses: reservation.userPackage?.classesRemaining || 0,
      paymentStatus: reservation.userPackage?.paymentStatus || (paymentMethod === "pending" ? "pending" : "paid"),
      paymentMethod: reservation.userPackage?.paymentMethod || paymentMethod,
    };

    return NextResponse.json(formattedReservation);
  } catch (error) {
    console.error("Error al crear reservación:", error);
    return NextResponse.json({ error: "Error al crear reservación" }, { status: 500 });
  }
}