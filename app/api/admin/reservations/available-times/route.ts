import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// GET - Obtener horarios disponibles para una fecha específica
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol de admin
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(payload.userId) },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Fecha es requerida" }, { status: 400 });
    }

    // Crear el rango de fecha para el día seleccionado
    const targetDate = new Date(date + "T00:00:00.000Z");
    const nextDay = new Date(targetDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    // Obtener todas las clases programadas para la fecha específica
    const scheduledClasses = await prisma.scheduledClass.findMany({
      where: {
        date: {
          gte: targetDate,
          lt: nextDay
        },
        status: "scheduled"
      },
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
        },
        reservations: { // Include confirmed reservations to calculate spots
          where: {
            status: "confirmed"
          }
        }
      },
      orderBy: {
        time: "asc"
      }
    });

    // Formatear la respuesta con información de disponibilidad
    const availableTimes = scheduledClasses.map((scheduledClass) => {
      const classTime = new Date(scheduledClass.time);
      const hours = classTime.getUTCHours().toString().padStart(2, '0');
      const minutes = classTime.getUTCMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;

      const confirmedReservationsCount = scheduledClass.reservations.length;
      const calculatedAvailableSpots = scheduledClass.maxCapacity - confirmedReservationsCount;

      return {
        time: formattedTime,
        scheduledClassId: scheduledClass.id,
        className: scheduledClass.classType.name,
        instructorName: `${scheduledClass.instructor.user.firstName} ${scheduledClass.instructor.user.lastName}`,
        // Use the calculated available spots, ensuring it's not negative
        availableSpots: Math.max(0, calculatedAvailableSpots), 
        maxCapacity: scheduledClass.maxCapacity,
        typeId: scheduledClass.classTypeId
      };
    });

    return NextResponse.json(availableTimes);

  } catch (error) {
    console.error("Error al obtener horarios disponibles:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}