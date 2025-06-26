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
        const scheduledClassDate = reservation.scheduledClass.date; // Date object (e.g., 2025-06-28T00:00:00.000Z)
        const scheduledClassTimeSource = reservation.scheduledClass.time; // Date object or string "HH:mm:ss"

        const year = scheduledClassDate.getUTCFullYear();
        const month = scheduledClassDate.getUTCMonth(); // 0-indexed
        const day = scheduledClassDate.getUTCDate();

        // Assuming scheduledClass.time is a Date object where UTC hours/minutes are correct from Prisma
        // If it's a string like "HH:mm:ss", parse it. If it's a Date, get UTC parts.
        const hours = scheduledClassTimeSource.getUTCHours();
        const minutes = scheduledClassTimeSource.getUTCMinutes();
        // Fallback if time is not available or not in expected format, though ideally it should be.
        // For now, this relies on hours and minutes being correctly parsed or extracted.

        const classDateTimeUTC = new Date(Date.UTC(year, month, day, hours, minutes));

        const timeZone = 'America/Mexico_City';
        const formattedDateEmail = formatInTimeZone(classDateTimeUTC, timeZone, "dd 'de' MMMM 'de' yyyy", { locale: es });
        const formattedTimeEmail = formatInTimeZone(classDateTimeUTC, timeZone, "HH:mm 'hrs'");

        const emailDetails = {
          className: reservation.scheduledClass.classType.name,
          date: formattedDateEmail,
          time: formattedTimeEmail,
          isRefundable: false, // Admin cancellations don't automatically refund credits
          packageName: reservation.userPackage?.package?.name
        };

        await sendCancellationConfirmationEmail(
          reservation.user.email,
          `${reservation.user.firstName} ${reservation.user.lastName}`,
          emailDetails
        );

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