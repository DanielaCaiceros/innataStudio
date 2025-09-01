// app/api/admin/reservations/[id]/checkin/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { formatInTimeZone } from 'date-fns-tz';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Esperar a que se resuelva la promesa params
    const params = await context.params;
    const reservationId = parseInt(params.id);
    
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Verificar que la reservación existe y está confirmada
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: true,
        scheduledClass: {
          include: {
            classType: true,
            instructor: {
              include: {
                user: true
              }
            }
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    if (reservation.status !== "confirmed") {
      return NextResponse.json({ 
        error: "Solo se puede hacer check-in de reservaciones confirmadas" 
      }, { status: 400 });
    }

    // Verificar que la clase no ha pasado (manejar zona horaria correctamente)
    // PROBLEMA IDENTIFICADO: Las fechas están almacenadas incorrectamente en UTC
    // Necesitamos convertir la hora almacenada de UTC a hora local de México
    
    const mexicoCityTimeZone = 'America/Mexico_City';
    
    // La fecha y hora están almacenadas en UTC en la BD, pero representan hora local
    const classDateUTC = new Date(reservation.scheduledClass.date);
    const classTimeUTC = new Date(reservation.scheduledClass.time);
    
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
    
    // console.log("=== DEBUG CHECK-IN CORREGIDO ===");
    // console.log("Clase:", reservation.scheduledClass.classType.name);
    // console.log("Fecha clase almacenada (UTC):", classDateTimeStoredUTC.toISOString());
    // console.log("Fecha clase corregida (México):", classDateTimeMexico.toISOString());
    // console.log("Fecha clase corregida (México local):", formatInTimeZone(classDateTimeMexico, mexicoCityTimeZone, 'yyyy-MM-dd HH:mm:ss'));
    // console.log("Fecha actual (UTC):", now.toISOString());
    // console.log("Fecha actual (México):", formatInTimeZone(now, mexicoCityTimeZone, 'yyyy-MM-dd HH:mm:ss'));
    // console.log("Diferencia en minutos:", minutesDiff);
    // console.log("=== FIN DEBUG ===");
    
    // Permitir check-in desde 20 minutos antes hasta 1 hora después de la clase
    if (minutesDiff > 60) { // 1 hora después
      return NextResponse.json({ 
        error: "El tiempo para hacer check-in ha expirado (más de 1 hora después de la clase)" 
      }, { status: 400 });
    }
    
    if (minutesDiff < -20) { // 20 minutos antes
      return NextResponse.json({ 
        error: "Aún no es tiempo de hacer check-in. Puedes hacerlo 20 minutos antes de la clase." 
      }, { status: 400 });
    }

    // Actualizar el status de la reservación a "attended"
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: { 
        status: "attended",
        checked_in_at: new Date()
      }
    });

    // No modificamos los contadores de clases aquí porque ya se descontaron al hacer la reserva

    return NextResponse.json({ 
      message: "Check-in realizado exitosamente",
      reservation: {
        id: updatedReservation.id,
        status: updatedReservation.status,
        checked_in_at: updatedReservation.checked_in_at
      }
    });

  } catch (error) {
    console.error("Error en check-in:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE - Deshacer check-in
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Esperar a que se resuelva la promesa params
    const params = await context.params;
    const reservationId = parseInt(params.id);
    
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Verificar que la reservación existe y está con check-in
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: true,
        userPackage: {
          include: {
            package: true
          }
        }
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    if (reservation.status !== "attended") {
      return NextResponse.json({ 
        error: "Solo se puede deshacer el check-in de reservaciones que ya tienen check-in" 
      }, { status: 400 });
    }

    // Revertir el status de la reservación a "confirmed"
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: { 
        status: "confirmed",
        checked_in_at: null
      }
    });

    // No modificamos los contadores de clases aquí porque no se modificaron en el check-in

    return NextResponse.json({ 
      message: "Check-in deshecho exitosamente",
      reservation: {
        id: updatedReservation.id,
        status: updatedReservation.status,
        checked_in_at: updatedReservation.checked_in_at
      }
    });

  } catch (error) {
    console.error("Error al deshacer check-in:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}