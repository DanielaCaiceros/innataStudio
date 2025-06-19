import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth"; // Assuming path for auth
import { parseISO, format } from 'date-fns'; // For date formatting in messages

const prisma = new PrismaClient();
const UNLIMITED_WEEK_PACKAGE_ID = 3;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication & Admin Check
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    // 2. Parameter & Original Reservation Fetching
    const originalReservationId = parseInt(params.id, 10);
    if (isNaN(originalReservationId)) {
      return NextResponse.json({ error: "ID de reservación original no válido" }, { status: 400 });
    }

    const originalReservation = await prisma.reservation.findUnique({
      where: { id: originalReservationId },
      include: {
        user: true,
        scheduledClass: true,
        userPackage: {
          include: {
            package: true,
          },
        },
      },
    });

    if (!originalReservation) {
      return NextResponse.json({ error: "Reservación original no encontrada" }, { status: 404 });
    }

    // Status check for original reservation
    if (originalReservation.status !== 'confirmed') {
      return NextResponse.json(
        { error: `La reservación original ya ha sido procesada (estado: ${originalReservation.status}). No se puede aplicar penalización.` },
        { status: 400 }
      );
    }

    // 3. "Semana Ilimitada" Check
    if (originalReservation.userPackage?.packageId !== UNLIMITED_WEEK_PACKAGE_ID) {
      return NextResponse.json(
        { error: "Esta función de penalización solo aplica a reservaciones de Semana Ilimitada." },
        { status: 400 }
      );
    }
    const userId = originalReservation.userId;

    // Construct start datetime for the original class to find subsequent classes
    const originalClassDateStr = originalReservation.scheduledClass.date.toISOString().split('T')[0];
    const originalClassTimeStr = originalReservation.scheduledClass.time.toISOString().split('T')[1];
    const originalClassStartDateTime = parseISO(`${originalClassDateStr}T${originalClassTimeStr}`);

    // 4. Find Next Immediate Reservation
    const nextReservation = await prisma.reservation.findFirst({
      where: {
        userId: userId,
        status: 'confirmed',
        scheduledClass: {
          // Ensure the class date/time is after the original missed class
          OR: [ // Handles cases where next class is on same day but later time, or on a future day
            {
              date: { gt: originalReservation.scheduledClass.date },
            },
            {
              date: originalReservation.scheduledClass.date,
              time: { gt: originalReservation.scheduledClass.time },
            }
          ]
        },
      },
      orderBy: [
        { scheduledClass: { date: 'asc' } },
        { scheduledClass: { time: 'asc' } },
      ],
      include: {
        scheduledClass: true,
        userPackage: { // Include to be thorough, though not strictly needed for cancellation logic
          include: {
            package: true,
          },
        },
      },
    });

    if (!nextReservation) {
      // Option 1: Update original reservation to no-show even if no future class to cancel
      await prisma.reservation.update({
        where: { id: originalReservationId },
        data: {
          status: 'cancelled', // Or a specific NO_SHOW status if enum allows
          cancellationReason: "No Show - Sin clases futuras para penalización.",
          cancelledAt: new Date(),
        },
      });
      return NextResponse.json(
        { message: "Reservación original marcada como No Show. No se encontraron reservaciones futuras confirmadas para aplicar penalización adicional." },
        { status: 200 }
      );
    }

    // 5. Cancel Next Immediate Reservation (within a Prisma transaction)
    const originalClassDateFormatted = format(originalClassStartDateTime, "dd/MM/yyyy 'a las' HH:mm");
    const nextClassDateFormatted = format(parseISO(`${nextReservation.scheduledClass.date.toISOString().split('T')[0]}T${nextReservation.scheduledClass.time.toISOString().split('T')[1]}`), "dd/MM/yyyy 'a las' HH:mm");


    await prisma.$transaction(async (tx) => {
      // Update original reservation to reflect no-show
      await tx.reservation.update({
        where: { id: originalReservationId },
        data: {
          status: 'cancelled', // Or a specific NO_SHOW status
          cancellationReason: `No Show - Penalización aplicada a clase del ${nextClassDateFormatted}.`,
          cancelledAt: new Date(),
        },
      });

      // Cancel the next reservation
      await tx.reservation.update({
        where: { id: nextReservation.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: `Penalización por no asistir a clase anterior del ${originalClassDateFormatted}.`,
        },
      });

      // Increment available spots for the cancelled next reservation
      await tx.scheduledClass.update({
        where: { id: nextReservation.scheduledClassId },
        data: {
          availableSpots: { increment: 1 },
        },
      });
      // No refund logic for the nextReservation, as per requirements.
    });

    // 6. Notification for the cancelled next class
    await prisma.notifications.create({
      data: {
        user_id: userId,
        type: "reservation_cancelled_penalty",
        title: "Clase cancelada por penalización",
        message: `Tu reservación para la clase del ${nextClassDateFormatted} ha sido cancelada como penalización por no asistir a tu clase del ${originalClassDateFormatted}.`,
        data: {
          originalReservationId: originalReservationId,
          cancelledReservationId: nextReservation.id,
        },
      },
    });

    // 7. Response
    return NextResponse.json(
      { 
        success: true,
        message: `Penalización aplicada: Reservación original (${originalReservationId}) marcada como No Show. Siguiente reservación (${nextReservation.id}) cancelada.`,
        originalReservation: { id: originalReservationId, status: 'cancelled' },
        penalizedReservation: { id: nextReservation.id, status: 'cancelled' }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error al aplicar penalización por no show:", error);
    if (error instanceof Error) {
        if (error.message.includes("Token inválido")) {
            return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
        }
    }
    return NextResponse.json({ error: "Error interno del servidor al aplicar la penalización" }, { status: 500 });
  }
}
