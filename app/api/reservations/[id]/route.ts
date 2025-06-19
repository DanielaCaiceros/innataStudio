import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth'; // Assuming this path is correct
import { SystemConfigService } from '@/lib/services/system-config.service'; // Assuming path
// import { UnlimitedWeekService } from '@/lib/services/unlimited-week.service'; // Path for service
import { differenceInHours, parseISO } from 'date-fns';

const prisma = new PrismaClient();
const UNLIMITED_WEEK_PACKAGE_ID = 3; // Hardcoded as per instruction

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authentication
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let decodedToken;
    try {
      decodedToken = await verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    const userId = decodedToken.userId;

    // 2. Parameters & Reservation Fetching
    const reservationId = parseInt(params.id, 10);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: 'ID de reservación inválido' }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        scheduledClass: true,
        userPackage: {
          include: {
            package: true,
          },
        },
        user: true, // For ownership verification, though userId from token is primary
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    // 3. Ownership Verification
    if (reservation.userId !== userId) {
      return NextResponse.json({ error: 'No tienes permiso para cancelar esta reservación' }, { status: 403 });
    }

    // 4. Status Check
    if (reservation.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta reservación ya ha sido cancelada' }, { status: 400 });
    }

    // 5. Timeliness Check (Grace Period)
    const graceTimeHours = await SystemConfigService.getGraceTimeHours(); // Defaults to 12 if not set

    // Combine date and time. Prisma stores time as DateTime object, but it's only the time part.
    // Date is also a DateTime object, but it's only the date part.
    // We need to construct the full DateTime of the class.
    const classDateStr = reservation.scheduledClass.date.toISOString().split('T')[0]; // YYYY-MM-DD
    const classTimeStr = reservation.scheduledClass.time.toISOString().split('T')[1]; // HH:mm:ss.SSSZ
    
    // Ensure classTimeStr is correctly representing the time from DB
    // If reservation.scheduledClass.time is already a time string like "HH:mm:ss"
    // then parseISO might not be needed or might need adjustment.
    // Assuming it's a full ISO string from which we extract time.
    
    const classStartDateTime = parseISO(`${classDateStr}T${classTimeStr}`);
    const now = new Date();
    const hoursUntilClass = differenceInHours(classStartDateTime, now);

    if (hoursUntilClass < graceTimeHours) {
      return NextResponse.json(
        { error: `No puedes cancelar la reservación con menos de ${graceTimeHours} horas de anticipación.` },
        { status: 400 }
      );
    }

    // 6. Cancellation Logic (within a Prisma transaction)
    await prisma.$transaction(async (tx) => {
      // Update Reservation
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Cancelada por el usuario',
        },
      });

      // Increment ScheduledClass availableSpots
      await tx.scheduledClass.update({
        where: { id: reservation.scheduledClassId },
        data: {
          availableSpots: {
            increment: 1,
          },
        },
      });

      // Conditional Refund Logic
      const isUnlimitedWeekPackage = reservation.userPackage?.packageId === UNLIMITED_WEEK_PACKAGE_ID;

      if (reservation.userPackageId && !isUnlimitedWeekPackage) {
        // It's a different package (not Semana Ilimitada), so refund class credit
        await tx.userPackage.update({
          where: { id: reservation.userPackageId },
          data: {
            classesRemaining: { increment: 1 },
            classesUsed: { decrement: 1 },
          },
        });

        // Update UserAccountBalance if it exists
        const userAccountBalance = await tx.userAccountBalance.findUnique({
            where: { userId: reservation.userId },
        });

        if (userAccountBalance) {
            await tx.userAccountBalance.update({
                where: { userId: reservation.userId },
                data: {
                    classesAvailable: { increment: 1 },
                    classesUsed: { decrement: 1 },
                },
            });
        }
        // Note: Creation of a "refund" BalanceTransaction is omitted for simplicity as per subtask focus,
        // but would typically be included here for full auditability.
      }
      // If it IS "Semana Ilimitada", no class credit refund actions are taken.
    });

    // 7. Response
    return NextResponse.json({ message: 'Reservación cancelada exitosamente' }, { status: 200 });

  } catch (error) {
    console.error('Error al cancelar reservación:', error);
    if (error instanceof Error && error.message.includes("Token inválido")) { // Example of specific error handling
        return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al cancelar la reservación' }, { status: 500 });
  }
}
