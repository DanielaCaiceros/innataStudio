// app/api/admin/unlimited-week/penalty/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getNextClassToCancel } from '@/lib/utils/unlimited-week';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar si el usuario es admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
    }

    const { reservationId, reason } = await request.json();

    if (!reservationId) {
      return NextResponse.json({ error: 'ID de reservación requerido' }, { status: 400 });
    }

    // Obtener la reservación que no fue atendida
    const missedReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: true,
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

    if (!missedReservation) {
      return NextResponse.json({ error: 'Reservación no encontrada' }, { status: 404 });
    }

    // Verificar que sea un paquete de semana ilimitada
    if (missedReservation.userPackage?.packageId !== 3) {
      return NextResponse.json({ 
        error: 'Esta reservación no pertenece a un paquete de semana ilimitada' 
      }, { status: 400 });
    }

    // Obtener todas las reservaciones futuras del usuario para esta semana
    const userReservations = await prisma.reservation.findMany({
      where: {
        userId: missedReservation.userId,
        userPackageId: missedReservation.userPackageId,
        status: 'confirmed'
      },
      include: {
        scheduledClass: {
          include: {
            classType: true
          }
        }
      }
    });

    // Encontrar la próxima clase a cancelar
    const nextClassToCancel = getNextClassToCancel(userReservations, missedReservation);

    if (!nextClassToCancel) {
      // Marcar la reservación perdida como no atendida
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'no_show',
          cancellationReason: reason || 'No se presentó a la clase'
        }
      });

      return NextResponse.json({
        success: true,
        message: 'No hay clases futuras para cancelar, solo se marcó la inasistencia',
        missedReservation: {
          id: missedReservation.id,
          className: missedReservation.scheduledClass.classType.name,
          date: missedReservation.scheduledClass.date,
          time: missedReservation.scheduledClass.time
        },
        cancelledReservation: null
      });
    }

    // Transacción para marcar la inasistencia y cancelar la próxima clase
    const result = await prisma.$transaction(async (tx) => {
      // Marcar la reservación perdida
      const updatedMissedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'no_show',
          cancellationReason: reason || 'No se presentó a la clase'
        }
      });

      // Cancelar la próxima clase
      const cancelledReservation = await tx.reservation.update({
        where: { id: nextClassToCancel.id },
        data: {
          status: 'cancelled',
          cancellationReason: 'Cancelada automáticamente por penalización de semana ilimitada',
          cancelledAt: new Date()
        }
      });

      // Incrementar espacios disponibles en la clase cancelada
      await tx.scheduledClass.update({
        where: { id: nextClassToCancel.scheduledClassId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });

      return { updatedMissedReservation, cancelledReservation };
    });

    return NextResponse.json({
      success: true,
      message: 'Penalización aplicada correctamente',
      missedReservation: {
        id: missedReservation.id,
        className: missedReservation.scheduledClass.classType.name,
        date: missedReservation.scheduledClass.date,
        time: missedReservation.scheduledClass.time
      },
      cancelledReservation: {
        id: nextClassToCancel.id,
        className: nextClassToCancel.scheduledClass.classType.name,
        date: nextClassToCancel.scheduledClass.date,
        time: nextClassToCancel.scheduledClass.time
      }
    });

  } catch (error) {
    console.error('Error applying unlimited week penalty:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}