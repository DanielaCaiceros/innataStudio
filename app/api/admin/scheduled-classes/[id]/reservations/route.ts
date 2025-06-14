import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { formatInTimeZone } from 'date-fns-tz'

const prisma = new PrismaClient()

// Función helper para verificar si es tiempo de check-in
function canCheckIn(classDate: Date, classTime: Date): { canCheckIn: boolean, reason?: string } {
  const mexicoCityTimeZone = 'America/Mexico_City';
  
  // La fecha y hora están almacenadas en UTC en la BD, pero representan hora local
  const classDateUTC = new Date(classDate);
  const classTimeUTC = new Date(classTime);
  
  // Crear la fecha y hora completa en UTC (como está almacenada)
  const classDateTimeStoredUTC = new Date(Date.UTC(
    classDateUTC.getUTCFullYear(),
    classDateUTC.getUTCMonth(),
    classDateUTC.getUTCDate(),
    classTimeUTC.getUTCHours(),
    classTimeUTC.getUTCMinutes()
  ));
  
  // Convertir a hora local de México (agregar 6 horas para convertir de UTC almacenado a hora real de México)
  const classDateTimeMexico = new Date(classDateTimeStoredUTC.getTime() + (6 * 60 * 60 * 1000));

  // Obtener el tiempo actual
  const now = new Date();
  
  // Calcular la diferencia en minutos usando la hora corregida
  const timeDiff = now.getTime() - classDateTimeMexico.getTime();
  const minutesDiff = timeDiff / (1000 * 60);
  
  // Permitir check-in desde 20 minutos antes hasta 1 hora después de la clase
  if (minutesDiff > 60) { // 1 hora después
    return { 
      canCheckIn: false, 
      reason: "El tiempo para hacer check-in ha expirado (más de 1 hora después de la clase)" 
    };
  }
  
  if (minutesDiff < -20) { // 20 minutos antes
    return { 
      canCheckIn: false, 
      reason: "Aún no es tiempo de hacer check-in. Puedes hacerlo 20 minutos antes de la clase." 
    };
  }

  return { canCheckIn: true };
}

// GET - Obtener todas las reservaciones de una clase específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 })
    }

    const { id } = await params
    const scheduledClassId = parseInt(id)
    if (isNaN(scheduledClassId)) {
      return NextResponse.json({ error: "ID de clase no válido" }, { status: 400 })
    }

    // Verificar que la clase existe
    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: scheduledClassId },
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
    })

    if (!scheduledClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    // Obtener todas las reservaciones para esta clase (incluyendo canceladas)
    const reservations = await prisma.reservation.findMany({
      where: {
        scheduledClassId: scheduledClassId,
        status: {
          in: ["confirmed", "attended", "pending", "cancelled"]  // Incluir también las canceladas
        }
      },
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
        userPackage: {
          include: {
            package: true
          }
        }
      },
      orderBy: [
        { createdAt: 'asc' }
      ]
    })

    // Verificar si es tiempo de check-in para esta clase
    const checkInStatus = canCheckIn(scheduledClass.date, scheduledClass.time);

    // Formatear la respuesta
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      user: `${reservation.user.firstName} ${reservation.user.lastName}`,
      email: reservation.user.email,
      phone: reservation.user.phone || "",
      bikeNumber: reservation.bikeNumber,
      packageName: reservation.userPackage?.package.name || "PASE INDIVIDUAL",
      checkedIn: reservation.status === "attended",
      checkedInAt: reservation.checked_in_at,
      createdAt: reservation.createdAt,
      paymentMethod: reservation.paymentMethod || "package",
      status: reservation.status
    }))

    // Información de la clase
    const activeReservations = reservations.filter(r => r.status !== 'cancelled');
    const cancelledReservations = reservations.filter(r => r.status === 'cancelled');
    const classInfo = {
      id: scheduledClass.id,
      className: scheduledClass.classType.name,
      instructor: `${scheduledClass.instructor.user.firstName} ${scheduledClass.instructor.user.lastName}`,
      date: scheduledClass.date,
      time: scheduledClass.time,
      maxCapacity: scheduledClass.maxCapacity,
      availableSpots: scheduledClass.availableSpots,
      totalReservations: activeReservations.length,
      cancelledReservations: cancelledReservations.length,
      canCheckIn: checkInStatus.canCheckIn,
      checkInMessage: checkInStatus.reason
    }

    return NextResponse.json({
      classInfo,
      reservations: formattedReservations
    })

  } catch (error) {
    console.error("Error al obtener reservaciones de la clase:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
