import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { sendCancellationConfirmationEmail } from "@/lib/email";
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const prisma = new PrismaClient();

// POST - Cancelar una reservación
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

    // FIXED: Await params for Next.js 15+
    const resolvedParams = await params;
    const reservationId = parseInt(resolvedParams.id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Obtener la reservación
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
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
                    lastName: true
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
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    if (reservation.status === "cancelled") {
      return NextResponse.json({ error: "Esta reservación ya ha sido cancelada" }, { status: 400 });
    }

    // Obtener datos adicionales del cuerpo de la solicitud
    const body = await request.json();
    const { reason = "Cancelado por administrador", sendEmail = true } = body;

    // FIXED: Determine if it's a Semana Ilimitada package
    const isUnlimitedWeek = reservation.userPackage?.package?.id === 3 || 
                           reservation.userPackage?.package?.name?.toLowerCase().includes('semana ilimitada');

    // Iniciar transacción para asegurar que todas las operaciones se completen o ninguna
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Actualizar el estado de la reservación
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: new Date(),
          canRefund: false, // Admin cancellations do not automatically refund
          bikeNumber: null // Set bike_number to null on cancellation
        }
      });

      // 2. Incrementar espacios disponibles en la clase
      await prisma.scheduledClass.update({
        where: { id: reservation.scheduledClassId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });

      // 3. Handle package update (decrement classesUsed if applicable, but no refund)
      if (reservation.userPackageId && reservation.status !== 'pending') { // Only decrement if it was a confirmed/used class
        await prisma.userPackage.update({
          where: { id: reservation.userPackageId },
          data: {
            classesUsed: {
              decrement: 1
            }
            // No increment of classesRemaining, as per "no refund" rule for admin cancellations
          }
        });
        // Also update UserAccountBalance if it was a used class from a package
        // We only decrement classesUsed here, not increment classesAvailable
        await prisma.userAccountBalance.update({
          where: { userId: reservation.userId },
          data: {
            classesUsed: {
              decrement: 1
            }
            // No increment of classesAvailable
          }
        });
      }
      // The `canRefund` field in reservation update is already set to `false` (or `!isUnlimitedWeek` which becomes `false` if we treat all admin cancels as non-refundable)
      // For admin cancellations, we explicitly state no automatic refunds.
      // The `canRefund` field in the reservation table might be used by other processes,
      // but for this specific admin cancellation flow, we are ensuring no class credit is returned.
      // Let's ensure `canRefund` is explicitly false for admin cancellations.
      // This is already handled by the initial update: data: { status: "cancelled", ..., canRefund: false } if we assume isUnlimitedWeek logic applies to all admin cancels.
      // To be more explicit and enforce "no refund for admin cancellations" globally within this endpoint:
      // The `updatedReservation` data block should ensure `canRefund` is set to `false`.
      // The initial update `prisma.reservation.update` already includes:
      // `canRefund: !isUnlimitedWeek,`
      // We will change this to `canRefund: false,` to make it universal for admin cancellations.

      // 4. Notificar al usuario
      await prisma.notifications.create({
        data: {
          user_id: reservation.userId,
          type: "reservation_cancelled",
          title: "Reservación cancelada por administrador",
          message: `Tu reservación para ${reservation.scheduledClass.classType.name} el ${formatInTimeZone(reservation.scheduledClass.date, 'America/Mexico_City', "dd/MM/yyyy", { locale: es })} a las ${formatInTimeZone(reservation.scheduledClass.time, 'America/Mexico_City', "HH:mm", { locale: es })} ha sido cancelada por un administrador. Motivo: ${reason}. Esta cancelación no genera un reembolso automático de la clase.`,
          data: {
            reservationId: reservationId,
            refunded: false, // Explicitly false for admin cancellations
            isUnlimitedWeek: isUnlimitedWeek // Still useful to know the original package type for context
          }
        }
      });

      return updatedReservation;
    });

    // Send cancellation email if requested
    if (sendEmail && reservation.user?.email) {
      try {
        const scheduledClassDate = reservation.scheduledClass.date;
        const scheduledClassTimeSource = reservation.scheduledClass.time;
        
        const year = scheduledClassDate.getUTCFullYear();
        const month = scheduledClassDate.getUTCMonth();
        const day = scheduledClassDate.getUTCDate();
        
        const intendedLocalHour = scheduledClassTimeSource.getUTCHours();
        const intendedLocalMinute = scheduledClassTimeSource.getUTCMinutes();
        
        const hourStr = intendedLocalHour.toString().padStart(2, '0');
        const minuteStr = intendedLocalMinute.toString().padStart(2, '0');
        const formattedTimeEmail = `${hourStr}:${minuteStr}`;
        
        const dateOnlyForFormatting = new Date(year, month, day);
        const timeZone = 'America/Mexico_City';
        const formattedDateEmail = formatInTimeZone(dateOnlyForFormatting, timeZone, "dd 'de' MMMM 'de' yyyy", { locale: es });
        
        const emailDetails = {
          className: reservation.scheduledClass.classType.name,
          date: formattedDateEmail,
          time: formattedTimeEmail,
          isRefundable: false, // Explicitly false for admin cancellations
          packageName: reservation.userPackage?.package?.name
        };
        
        await sendCancellationConfirmationEmail(
          reservation.user.email,
          reservation.user.firstName,
          emailDetails
        );
        
        console.log("Cancellation email sent successfully (admin cancel).");
      } catch (emailError) {
        console.error("Error preparing cancellation email (admin cancel):", emailError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Reservación cancelada por administrador. No se ha procesado un reembolso automático de la clase.",
      reservation: {
        id: result.id,
        status: result.status,
        cancellationReason: result.cancellationReason,
        cancelledAt: result.cancelledAt
      },
      isUnlimitedWeek: isUnlimitedWeek, // Keep for informational purposes
      emailSent: sendEmail
    });
  } catch (error) {
    console.error("Error al cancelar reservación:", error);
    return NextResponse.json({ error: "Error al cancelar reservación" }, { status: 500 });
  }
}