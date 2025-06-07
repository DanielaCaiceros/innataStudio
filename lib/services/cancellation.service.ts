// lib/services/cancellation.service.ts

import { db } from '@/lib/db';
import { sendCancellationEmail } from '@/lib/email';

interface CancellationResult {
  success: boolean;
  refundStatus: 'refunded' | 'no_refund';
  hoursBeforeClass: number;
  message: string;
}

export class CancellationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'CancellationError';
  }
}

export async function cancelReservation(
  reservationId: number,
  userId: number,
  reason?: string
): Promise<CancellationResult> {
  try {
    // Obtener la reserva con todos los datos relacionados
    const reservation = await db.reservation.findFirst({
      where: {
        id: reservationId,
        userId: userId,
        status: 'confirmed'
      },
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
      throw new CancellationError('Reserva no encontrada o ya cancelada', 'RESERVATION_NOT_FOUND');
    }

    // Calcular las horas de diferencia entre ahora y la clase
    const now = new Date();
    const classDateTime = new Date(
      `${reservation.scheduledClass.date.toISOString().split('T')[0]}T${reservation.scheduledClass.time.toISOString().split('T')[1]}`
    );
    const hoursBeforeClass = Math.floor((classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Determinar si se puede hacer reembolso (más de 12 horas antes)
    const canRefund = hoursBeforeClass >= 12;
    const refundStatus: 'refunded' | 'no_refund' = canRefund ? 'refunded' : 'no_refund';

    // Actualizar la reserva en una transacción
    await db.$transaction(async (tx) => {
      // Actualizar estado de la reserva
      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: canRefund ? 'cancelled' : 'cancelled_no_refund',
          cancellationReason: reason || 'Cancelado por el usuario',
          cancelledAt: now,
          canRefund: canRefund
        }
      });

      // Si hay reembolso, devolver la clase al paquete del usuario
      if (canRefund && reservation.userPackage) {
        await tx.userPackage.update({
          where: { id: reservation.userPackage.id },
          data: {
            classesRemaining: {
              increment: 1
            },
            classesUsed: {
              decrement: 1
            }
          }
        });

        // Crear transacción de balance para refund
        await tx.balanceTransaction.create({
          data: {
            userId: userId,
            type: 'refund',
            amount: 1,
            description: `Clase devuelta por cancelación: ${reservation.scheduledClass.classType.name}`,
            relatedReservationId: reservationId
          }
        });
      } else {
        // Crear transacción de balance para clase perdida
        await tx.balanceTransaction.create({
          data: {
            userId: userId,
            type: 'forfeited',
            amount: 1,
            description: `Clase perdida por cancelación tardía: ${reservation.scheduledClass.classType.name}`,
            relatedReservationId: reservationId
          }
        });
      }

      // Aumentar disponibilidad en la clase programada
      await tx.scheduledClass.update({
        where: { id: reservation.scheduledClassId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });
    });

    // Preparar datos para el email
    const emailData = {
      className: reservation.scheduledClass.classType.name,
      packageName: reservation.userPackage?.package.name,
      date: reservation.scheduledClass.date.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: reservation.scheduledClass.time.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      instructor: `${reservation.scheduledClass.instructor.user.firstName} ${reservation.scheduledClass.instructor.user.lastName}`,
      cancellationTime: now.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      refundStatus,
      hoursBeforeClass: Math.max(0, hoursBeforeClass)
    };

    // Enviar email de confirmación de cancelación
    try {
      await sendCancellationEmail(
        reservation.user.email,
        reservation.user.firstName,
        emailData
      );
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // No fallar la cancelación si el email falla
    }

    const message = canRefund 
      ? 'Reserva cancelada exitosamente. La clase ha sido devuelta a tu saldo.'
      : 'Reserva cancelada. Como fue menos de 12 horas antes, la clase se ha perdido.';

    return {
      success: true,
      refundStatus,
      hoursBeforeClass: Math.max(0, hoursBeforeClass),
      message
    };

  } catch (error) {
    console.error('Error canceling reservation:', error);
    
    if (error instanceof CancellationError) {
      throw error;
    }
    
    throw new CancellationError('Error interno al cancelar la reserva', 'INTERNAL_ERROR');
  }
}