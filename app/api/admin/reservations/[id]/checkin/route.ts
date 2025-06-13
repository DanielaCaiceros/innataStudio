import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// POST - Realizar check-in de una reservación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Obtener la reservación
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        scheduledClass: true
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    if (reservation.status !== "confirmed") {
      return NextResponse.json({ error: "Solo se puede hacer check-in de reservaciones confirmadas" }, { status: 400 });
    }

    if (reservation.checked_in) {
      return NextResponse.json({ error: "Esta reservación ya tiene check-in" }, { status: 400 });
    }

    // Verificar el horario de check-in (20 minutos antes hasta 1 hora después del inicio de la clase)
    const now = new Date();
    const classDateTime = new Date(reservation.scheduledClass.date);
    classDateTime.setHours(
      reservation.scheduledClass.time.getHours(),
      reservation.scheduledClass.time.getMinutes(),
      0,
      0
    );

    const twentyMinutesBefore = new Date(classDateTime.getTime() - 20 * 60 * 1000);
    const oneHourAfter = new Date(classDateTime.getTime() + 60 * 60 * 1000);

    if (now < twentyMinutesBefore || now > oneHourAfter) {
      return NextResponse.json(
        { error: "Solo se puede hacer check-in desde 20 minutos antes hasta 1 hora después del inicio de la clase" },
        { status: 400 }
      );
    }

    // Realizar el check-in
    const updatedReservation = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        checked_in: true,
        checked_in_at: new Date(),
        checked_in_by: Number(payload.userId)
      }
    });

    return NextResponse.json({
      message: "Check-in realizado con éxito",
      checkedInAt: updatedReservation.checked_in_at
    });

  } catch (error) {
    console.error("Error al realizar check-in:", error);
    return NextResponse.json(
      { error: "Error al realizar check-in" },
      { status: 500 }
    );
  }
}

// DELETE - Deshacer check-in de una reservación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Obtener la reservación
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    if (!reservation.checked_in) {
      return NextResponse.json({ error: "Esta reservación no tiene check-in" }, { status: 400 });
    }

    // Deshacer el check-in
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        checked_in: false,
        checked_in_at: null,
        checked_in_by: null
      }
    });

    return NextResponse.json({
      message: "Check-in deshecho con éxito"
    });

  } catch (error) {
    console.error("Error al deshacer check-in:", error);
    return NextResponse.json(
      { error: "Error al deshacer check-in" },
      { status: 500 }
    );
  }
} 