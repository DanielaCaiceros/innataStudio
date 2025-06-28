import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, Prisma } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library" // More specific import for the error type
import { verifyToken } from "@/lib/jwt"
import { sendCancellationConfirmationEmail } from '@/lib/email'
import { format, addHours, parseISO, subHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma as prismaSingleton } from '@/lib/prisma'

const prisma = new PrismaClient()

// POST - Cancelar una reservación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } } // Directly destructure params
) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    const reservationId = parseInt(params.id); // Use params.id directly
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 })
    }

    // Verificar que la reservación existe y pertenece al usuario
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        scheduledClass: {
          include: {
            classType: true, // Include classType for className
          },
        },
        userPackage: {
          include: {
            package: true, // Include package for packageName
          },
        },
        user: { // Include user for email and name
          select: {
            email: true,
            firstName: true,
          },
        },
      },
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 })
    }

    if (reservation.userId !== userId) {
      return NextResponse.json({ error: "No tienes permiso para cancelar esta reservación" }, { status: 403 })
    }

    // Verificar que la reservación no esté ya cancelada
    if (reservation.status === "cancelled") {
      return NextResponse.json({ error: "Esta reservación ya está cancelada" }, { status: 400 })
    }

    // --- Robust Timezone-aware calculation for hoursUntilClass (for UTC-6 user timezone) ---
    
    const classDateObj = new Date(reservation.scheduledClass.date); // JS Date from Prisma, e.g., 2025-06-28T00:00:00.000Z
    const classTimeObj = new Date(reservation.scheduledClass.time); // JS Date from Prisma, e.g., 1970-01-01T09:00:00.000Z (where 09 is local hour)

    // Extract YYYY, MM (0-11), DD from the date part (which is UTC midnight of local date)
    const year = classDateObj.getUTCFullYear();
    const month = classDateObj.getUTCMonth(); // 0-11
    const day = classDateObj.getUTCDate();
    
    // Extract HH, MM, SS from the time part (assuming getUTCHours() gives the local hour number, e.g., 9 for 9 AM)
    const localHour = classTimeObj.getUTCHours();
    const localMinutes = classTimeObj.getUTCMinutes();
    const localSeconds = classTimeObj.getUTCSeconds();

    // Construct an ISO string for the local date and time, then append the known UTC-6 offset.
    // Format: YYYY-MM-DDTHH:mm:ss-06:00
    const localDateTimeString = 
      `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` +
      `T${String(localHour).padStart(2, '0')}:${String(localMinutes).padStart(2, '0')}:${String(localSeconds).padStart(2, '0')}`;
    
    const dateTimeStringWithOffset = `${localDateTimeString}-06:00`;

    // Parse this ISO string with offset. JS Date constructor will correctly interpret this into a UTC-based Date object.
    const classDateTimeUTC = new Date(dateTimeStringWithOffset);
    
    const nowUTC = new Date(); // Current time, JS Date objects are inherently UTC-based internally.

    // Logging for debugging
    console.log(`[CANCEL_RESERVATION] Reservation ID: ${reservationId}, User ID: ${userId}`);
    console.log(`[CANCEL_RESERVATION] Raw Class Date from DB: ${reservation.scheduledClass.date.toISOString()}`);
    console.log(`[CANCEL_RESERVATION] Raw Class Time from DB: ${reservation.scheduledClass.time.toISOString()}`);
    console.log(`[CANCEL_RESERVATION] Extracted Local Components: Y-${year}, M-${month}, D-${day}, H-${localHour}, M-${localMinutes}, S-${localSeconds}`);
    console.log(`[CANCEL_RESERVATION] Constructed Local DateTime String (for UTC-6): ${localDateTimeString}`);
    console.log(`[CANCEL_RESERVATION] DateTime String with Offset (-06:00): ${dateTimeStringWithOffset}`);
    console.log(`[CANCEL_RESERVATION] Parsed classDateTimeUTC (as ISO String): ${classDateTimeUTC.toISOString()}`);
    console.log(`[CANCEL_RESERVATION] Current time nowUTC (as ISO String): ${nowUTC.toISOString()}`);

    let hoursUntilClass = (classDateTimeUTC.getTime() - nowUTC.getTime()) / (1000 * 60 * 60);
    
    console.log(`[CANCEL_RESERVATION] Calculated hoursUntilClass: ${hoursUntilClass}`);
    // --- End of timezone-aware calculation ---
    
    // Refined isUnlimitedWeek check with logging
    const unlimitedPackageId = 3; // Define as a constant for clarity
    const isPackageIdUnlimited = reservation.userPackage?.package?.id === unlimitedPackageId;
    const isPackageNameUnlimited = reservation.userPackage?.package?.name?.toLowerCase().includes('semana ilimitada');
    const isUnlimitedWeek = isPackageIdUnlimited || isPackageNameUnlimited;

    console.log(`[CANCEL_RESERVATION] Reservation ID: ${reservationId}, Package ID: ${reservation.userPackage?.package?.id}, Package Name: "${reservation.userPackage?.package?.name}", isPackageIdUnlimited: ${isPackageIdUnlimited}, isPackageNameUnlimited: ${isPackageNameUnlimited}, Determined isUnlimitedWeek: ${isUnlimitedWeek}`);
    
    // For Semana Ilimitada: no refund regardless of cancellation time
    // For normal packages: refund only if cancelled with more than 12 hours notice
    const canRefund = !isUnlimitedWeek && hoursUntilClass >= 12;
    console.log(`[CANCEL_RESERVATION] Reservation ID: ${reservationId}, Determined canRefund: ${canRefund} (isUnlimitedWeek: ${isUnlimitedWeek}, hoursUntilClass: ${hoursUntilClass})`);

    // Obtener datos de la solicitud
    const body = await request.json()
    const { reason = "Cancelado por el usuario" } = body

    // MODIFICATION STARTS: Wrap critical operations in a transaction
    const updatedReservationDetails = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la reservación
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: new Date(),
          canRefund,
          bikeNumber: null // Clear bike number
        }
      });

      // 2. Incrementar los espacios disponibles en la clase
      await tx.scheduledClass.update({
        where: { id: reservation.scheduledClassId },
        data: {
          availableSpots: { increment: 1 }
        }
      });

      // 3. Handle refund, package updates, and penalization logic
      // This logic should also use the transaction client `tx` if it involves DB writes
      let isPenalized = false; // This variable is not used further, consider removing or using it.

      if (isUnlimitedWeek && reservation.userPackageId) {
        if (hoursUntilClass < 12) {
          // Penalty logic for unlimited week (class slot is lost)
          // No changes to UserPackage or UserAccountBalance in terms of class counts for penalty.
          isPenalized = true; // Mark as penalized, though not directly used later in this scope
          console.log(`[UNLIMITED CANCELLATION] User ${userId} penalized for late cancellation of reservation ${reservationId}.`);
        } else {
          // Early cancellation for unlimited week: free up slot in package
          await tx.userPackage.update({ // Use tx
            where: { id: reservation.userPackageId },
            data: {
              classesUsed: { decrement: 1 }
            }
          });
          await tx.userAccountBalance.update({ // Use tx
            where: { userId },
            data: {
              classesUsed: { decrement: 1 }
            }
          });
          console.log(`[UNLIMITED CANCELLATION] User ${userId} cancelled reservation ${reservationId} (early) for unlimited week. Slot freed in package.`);
        }
      } else if (canRefund && reservation.userPackageId) {
        // Normal Package Cancellation with Refund
        await tx.userPackage.update({ // Use tx
          where: { id: reservation.userPackageId },
          data: {
            classesRemaining: { increment: 1 },
            classesUsed: { decrement: 1 }
          }
        });
        await tx.userAccountBalance.update({ // Use tx
          where: { userId },
          data: {
            classesAvailable: { increment: 1 },
            classesUsed: { decrement: 1 }
          }
        });
        console.log(`[NORMAL CANCELLATION] User ${userId} cancelled reservation ${reservationId} with refund.`);
      } else if (!canRefund && reservation.userPackageId) {
        // Normal Package Cancellation with No Refund - class is lost
        console.log(`[NORMAL CANCELLATION] User ${userId} cancelled reservation ${reservationId} late, no refund.`);
      }
      // If !reservation.userPackageId, no package logic applies.

      return updatedReservation; // Return the updated reservation from the transaction
    });
    // MODIFICATION ENDS

    // Enviar correo de confirmación de cancelación
    if (reservation.user && reservation.scheduledClass.classType) {
      try {
        const classDate = new Date(reservation.scheduledClass.date);
        const classTime = new Date(reservation.scheduledClass.time);

        // Combinar fecha y hora UTC de la base de datos
        const scheduledDateTimeUTC = new Date(
          classDate.getUTCFullYear(),
          classDate.getUTCMonth(),
          classDate.getUTCDate(),
          classTime.getUTCHours(),
          classTime.getUTCMinutes(),
          0,
          0
        );

        const mexicoCityTimeZone = 'America/Mexico_City';

        const emailDetails = {
          className: reservation.scheduledClass.classType.name,
          date: formatInTimeZone(scheduledDateTimeUTC, mexicoCityTimeZone, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
          time: formatInTimeZone(scheduledDateTimeUTC, mexicoCityTimeZone, "HH:mm", { locale: es }),
          isRefundable: canRefund,
          packageName: reservation.userPackage?.package?.name,
          isUnlimitedWeek: isUnlimitedWeek
        };

        await sendCancellationConfirmationEmail(
          reservation.user.email,
          reservation.user.firstName ?? "Usuario",
          emailDetails
        );
        console.log(`Cancellation email sent for reservation ${reservationId}`);
      } catch (emailError) {
        console.error(`Failed to send cancellation email for reservation ${reservationId}:`, emailError);
      }
    } else {
      console.error(`Missing user, scheduledClass, or classType details for reservation ${reservationId}, cannot send email.`);
    }

    return NextResponse.json({
      success: true,
      message: isUnlimitedWeek 
        ? "Reservación cancelada. Para Semana Ilimitada no hay reposición de clase." 
        : "Reservación cancelada correctamente",
      refunded: canRefund,
      isUnlimitedWeek: isUnlimitedWeek,
      // Optionally, return details from updatedReservationDetails if needed by client
      reservationId: updatedReservationDetails.id, 
      newStatus: updatedReservationDetails.status 
    });

  } catch (error) {
    console.error("Error al cancelar reservación:", error);
    // Log the specific error if possible, especially if it's a PrismaClientKnownRequestError
    if (error instanceof PrismaClientKnownRequestError) { // Use the directly imported type
        console.error("Prisma Error Code:", error.code);
        console.error("Prisma Meta:", error.meta);
    }
    return NextResponse.json({ error: "Error al cancelar la reservación" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const reservationId = parseInt(params.id);
    const { reason } = await request.json();

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener la reservación
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
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

    if (!reservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    // Verificar que la reservación pertenezca al usuario
    if (reservation.userId !== user.user_id) {
      return NextResponse.json({ error: 'Sin permisos para cancelar esta reservación' }, { status: 403 });
    }

    // Verificar que la reservación esté confirmada
    if (reservation.status !== 'confirmed') {
      return NextResponse.json({ error: 'Solo se pueden cancelar reservaciones confirmadas' }, { status: 400 });
    }

    // Verificar tiempo límite para cancelación (12 horas antes)
    const classDateTime = new Date(reservation.scheduledClass.date);
    const classTime = new Date(reservation.scheduledClass.time);
    classDateTime.setHours(classTime.getHours(), classTime.getMinutes());
    
    const cancelationDeadline = subHours(classDateTime, 12);
    const now = new Date();

    if (now > cancelationDeadline) {
      return NextResponse.json({ 
        error: 'No puedes cancelar con menos de 12 horas de anticipación' 
      }, { status: 400 });
    }

    // Procesar la cancelación
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar la reservación
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'cancelled',
          cancellationReason: reason || 'Cancelada por el usuario',
          cancelledAt: new Date()
        }
      });

      // Incrementar espacios disponibles
      await tx.scheduledClass.update({
        where: { id: reservation.scheduledClassId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });

      // Si es un paquete de semana ilimitada, NO reembolsar la clase
      // (según las reglas de negocio: sin penalización pero sin reposición)
      if (reservation.userPackage?.packageId === 3) {
        // Para semana ilimitada, no se restaura la clase
        // Solo se actualiza el contador de clases usadas para reflejar la cancelación
        await tx.userPackage.update({
          where: { id: reservation.userPackageId! },
          data: {
            classesUsed: {
              decrement: 1
            }
            // NO incrementamos classesRemaining porque no hay reposición
          }
        });
      } else if (reservation.userPackage) {
        // Para otros paquetes, restaurar la clase
        await tx.userPackage.update({
          where: { id: reservation.userPackageId! },
          data: {
            classesUsed: {
              decrement: 1
            },
            classesRemaining: {
              increment: 1
            }
          }
        });
      }

      return updatedReservation;
    });

    return NextResponse.json({
      success: true,
      message: reservation.userPackage?.packageId === 3 
        ? 'Reservación cancelada. Para semana ilimitada no hay reposición de clase.'
        : 'Reservación cancelada exitosamente',
      reservation: {
        id: result.id,
        status: result.status,
        cancelledAt: result.cancelledAt,
        cancellationReason: result.cancellationReason
      }
    });

  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
