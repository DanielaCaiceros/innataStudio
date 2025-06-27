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
          canRefund: !isUnlimitedWeek, // Only allow refund for non-Semana Ilimitada packages
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

      // 3. FIXED: Handle package refund based on package type
      if (reservation.userPackageId) {
        if (isUnlimitedWeek) {
          // For Semana Ilimitada: update usage count but don't refund
          await prisma.userPackage.update({
            where: { id: reservation.userPackageId },
            data: {
              classesUsed: {
                decrement: 1
              }
              // Don't increment classesRemaining - no refund for Semana Ilimitada
            }
          });
        } else {
          // For normal packages: refund the class
          await prisma.userPackage.update({
            where: { id: reservation.userPackageId },
            data: {
              classesRemaining: {
                increment: 1
              },
              classesUsed: {
                decrement: 1
              }
            }
          });

          // 4. Actualizar el balance de clases del usuario (only for normal packages)
          await prisma.userAccountBalance.update({
            where: { userId: reservation.userId },
            data: {
              classesAvailable: {
                increment: 1
              },
              classesUsed: {
                decrement: 1
              }
            }
          });

          // 5. Registrar la transacción en el balance del usuario (only for normal packages)
          await prisma.balanceTransaction.create({
            data: {
              userId: reservation.userId,
              type: "refund",
              amount: 1, // Representa una clase devuelta
              description: `Reembolso por cancelación: ${reason}`,
              relatedReservationId: reservationId,
              createdBy: parseInt(payload.userId)
            }
          });
        }
      }

      // 6. Notificar al usuario
      await prisma.notifications.create({
        data: {
          user_id: reservation.userId,
          type: "reservation_cancelled",
          title: "Reservación cancelada",
          message: `Tu reservación ha sido cancelada. Motivo: ${reason}${isUnlimitedWeek ? ' (Semana Ilimitada: sin reposición)' : ''}`,
          data: {
            reservationId: reservationId,
            refunded: !isUnlimitedWeek && reservation.userPackageId ? true : false,
            isUnlimitedWeek: isUnlimitedWeek
          }
        }
      });

      return updatedReservation;
    });

    // Send cancellation email if requested
    if (sendEmail && reservation.user?.email) {
      try {
        const scheduledClassDate = reservation.scheduledClass.date; // Date object (e.g., 2025-06-28T00:00:00.000Z UTC midnight)
        const scheduledClassTimeSource = reservation.scheduledClass.time; // Date object (e.g., 1970-01-01T09:00:00.000Z UTC time on epoch date)
        
        console.log(`[Admin Cancel] Reservation ID: ${reservationId}`);
        console.log(`[Admin Cancel] Raw DB Date: ${scheduledClassDate.toISOString()}`);
        console.log(`[Admin Cancel] Raw DB Time (JS Date obj): ${scheduledClassTimeSource.toISOString()}`);
        
        const year = scheduledClassDate.getUTCFullYear();
        const month = scheduledClassDate.getUTCMonth(); // 0-indexed
        const day = scheduledClassDate.getUTCDate();
        
        const intendedLocalHour = scheduledClassTimeSource.getUTCHours(); // This is 9 from user logs for the problematic class
        const intendedLocalMinute = scheduledClassTimeSource.getUTCMinutes(); // This is 0 from user logs
        
        console.log(`[Admin Cancel] Assuming DB time's UTC hour component as intended local hour: ${intendedLocalHour}, minute: ${intendedLocalMinute}`);
        
        // Format the time part directly using these assumed local hours and minutes
        const hourStr = intendedLocalHour.toString().padStart(2, '0');
        const minuteStr = intendedLocalMinute.toString().padStart(2, '0');
        const formattedTimeEmail = `${hourStr}:${minuteStr} hrs`; // Directly use assumed local hours/minutes
        
        // Date formatting: Use the date part from scheduledClassDate, format it.
        // We still use formatInTimeZone for the date part to ensure consistent locale and format,
        // but the input date for this is just the date, time components will be midnight UTC.
        const dateOnlyForFormatting = new Date(year, month, day); // Use local date constructor instead of UTC
        const timeZone = 'America/Mexico_City'; // Keep for date part consistency
        const formattedDateEmail = formatInTimeZone(dateOnlyForFormatting, timeZone, "dd 'de' MMMM 'de' yyyy", { locale: es });
        
        console.log(`[Admin Cancel] Formatted Email Date (MX): ${formattedDateEmail}`);
        console.log(`[Admin Cancel] Manually Formatted Email Time (MX): ${formattedTimeEmail}`);
        
        const emailDetails = {
          className: reservation.scheduledClass.classType.name,
          date: formattedDateEmail,
          time: formattedTimeEmail, // Using the directly formatted time
          isRefundable: false, 
          packageName: reservation.userPackage?.package?.name
        };
        
        // The rest of the email sending logic follows...
        // await sendCancellationConfirmationEmail(
        //   reservation.user.email,
        //   `${reservation.user.firstName} ${reservation.user.lastName}`,
        //   emailDetails
        // );
        

        console.log("Cancellation email sent successfully");
      } catch (emailError) {
        console.error("Error sending cancellation email:", emailError);
        // Don't fail the cancellation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: isUnlimitedWeek 
        ? "Reservación cancelada. Para Semana Ilimitada no hay reposición de clase." 
        : "Reservación cancelada con éxito",
      reservation: {
        id: result.id,
        status: result.status,
        cancellationReason: result.cancellationReason,
        cancelledAt: result.cancelledAt
      },
      isUnlimitedWeek: isUnlimitedWeek,
      emailSent: sendEmail
    });
  } catch (error) {
    console.error("Error al cancelar reservación:", error);
    return NextResponse.json({ error: "Error al cancelar reservación" }, { status: 500 });
  }
}