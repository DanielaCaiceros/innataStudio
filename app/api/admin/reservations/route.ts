// app/api/admin/reservations/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

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
      
      return {
        id: res.id,
        user: `${res.user.firstName} ${res.user.lastName}`,
        email: res.user.email,
        phone: res.user.phone || "",
        class: res.scheduledClass.classType.name,
        date: formattedDate,
        time: formattedTime,
        status: res.status,
        package: res.userPackage?.package.name || "PASE INDIVIDUAL",
        remainingClasses: remainingClasses,
        paymentStatus: res.userPackage?.paymentStatus || "pending",
        paymentMethod: res.userPackage?.paymentMethod || "pending"
      };
    });

    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error("Error al obtener reservaciones:", error);
    return NextResponse.json({ error: "Error al obtener reservaciones" }, { status: 500 });
  }
}

// ... resto del código POST se mantiene igual
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

    // Buscar la clase programada o crearla si no existe
    let scheduledClass = await prisma.scheduledClass.findFirst({
      where: {
        classTypeId: classId,
        date: new Date(date),
        time: new Date(`${date}T${time}:00`)
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
          date: new Date(date),
          time: new Date(`${date}T${time}:00`),
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
      // Obtener el paquete correspondiente
      const packageMap = {
        "5classes": 1, // ID del paquete de 5 clases
        "10classes": 2, // ID del paquete de 10 clases
        "monthly": 3,   // ID del paquete mensual
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

      // Calcular fecha de expiración
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + packageInfo.validityDays);
      
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

    // Formatear la respuesta
    const formattedReservation = {
      id: reservation.id,
      user: `${reservation.user.firstName} ${reservation.user.lastName}`,
      email: reservation.user.email,
      phone: reservation.user.phone || "",
      class: reservation.scheduledClass.classType.name,
      date: reservation.scheduledClass.date.toISOString().split('T')[0],
      time: reservation.scheduledClass.time.toTimeString().slice(0, 5),
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