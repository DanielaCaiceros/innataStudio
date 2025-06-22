// app/api/user/reservations/unlimited-week/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  validateUnlimitedWeekUsage,
  calculateDailyUsage,
  isWithinUnlimitedWeekSchedule 
} from '@/lib/utils/unlimited-week';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { scheduledClassId, bikeNumber } = await request.json();

    if (!scheduledClassId) {
      return NextResponse.json({ error: 'ID de clase requerido' }, { status: 400 });
    }

    if (!bikeNumber) {
      return NextResponse.json({ error: 'Debes seleccionar una bicicleta para la reserva.' }, { status: 400 });
    }

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener información de la clase
    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: scheduledClassId },
      include: {
        classType: true,
        instructor: {
          include: {
            user: true
          }
        }
      }
    });

    if (!scheduledClass) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    // Verificar disponibilidad
    if (scheduledClass.availableSpots <= 0) {
      return NextResponse.json({ error: 'No hay espacios disponibles' }, { status: 400 });
    }

    const classDate = new Date(scheduledClass.date);

    // Verificar horario permitido
    if (!isWithinUnlimitedWeekSchedule(classDate)) {
      return NextResponse.json({ 
        error: 'La semana ilimitada solo aplica de lunes a viernes' 
      }, { status: 400 });
    }

    // Buscar paquete de semana ilimitada activo
    const unlimitedWeekPackage = await prisma.userPackage.findFirst({
      where: {
        userId: user.user_id,
        packageId: 3,
        isActive: true,
        expiryDate: {
          gte: new Date()
        }
      },
      include: {
        package: true,
        reservations: {
          where: { status: 'confirmed' },
          include: { scheduledClass: true }
        }
      }
    });

    if (!unlimitedWeekPackage) {
      return NextResponse.json({ 
        error: 'No tienes un paquete de semana ilimitada activo' 
      }, { status: 400 });
    }

    // Validar límites
    const weeklyUsage = unlimitedWeekPackage.reservations.length;
    const dailyUsage = calculateDailyUsage(unlimitedWeekPackage.reservations, classDate);

    if (weeklyUsage >= 25) {
      return NextResponse.json({ 
        error: 'Has alcanzado el límite de 25 clases para esta semana' 
      }, { status: 400 });
    }

    if (dailyUsage >= 5) {
      return NextResponse.json({ 
        error: 'Has alcanzado el límite de 5 clases por día' 
      }, { status: 400 });
    }

    // Verificar que no tenga ya una reservación para esta clase
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        userId: user.user_id,
        scheduledClassId: scheduledClassId,
        status: {
          in: ['confirmed', 'pending']
        }
      }
    });

    if (existingReservation) {
      return NextResponse.json({ 
        error: 'Ya tienes una reservación para esta clase' 
      }, { status: 400 });
    }

    // Crear la reservación en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear la reservación
      const reservation = await tx.reservation.create({
        data: {
          userId: user.user_id,
          scheduledClassId: scheduledClassId,
          userPackageId: unlimitedWeekPackage.id,
          status: 'confirmed',
          paymentMethod: 'package',
          bikeNumber: bikeNumber
        },
        include: {
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

      // Actualizar espacios disponibles
      await tx.scheduledClass.update({
        where: { id: scheduledClassId },
        data: {
          availableSpots: {
            decrement: 1
          }
        }
      });

      // Actualizar uso del paquete
      await tx.userPackage.update({
        where: { id: unlimitedWeekPackage.id },
        data: {
          classesUsed: {
            increment: 1
          },
          classesRemaining: {
            decrement: 1
          }
        }
      });

      return reservation;
    });

    // Enviar correo de confirmación con el flag isUnlimitedWeek: true
    try {
      const { sendBookingConfirmationEmail } = await import('@/lib/email');
      const { formatDateToSpanish, formatTimeFromDB } = await import('@/lib/utils/date');
      await sendBookingConfirmationEmail(
        user.email,
        user.firstName,
        {
          className: result.scheduledClass.classType.name,
          date: formatDateToSpanish(
            result.scheduledClass.date instanceof Date
              ? result.scheduledClass.date.toISOString()
              : result.scheduledClass.date
          ),
          time: formatTimeFromDB(
            result.scheduledClass.time instanceof Date
              ? result.scheduledClass.time.toISOString()
              : result.scheduledClass.time
          ),
          instructor: `${result.scheduledClass.instructor.user.firstName} ${result.scheduledClass.instructor.user.lastName}`,
          confirmationCode: result.id.toString().padStart(6, '0'),
          bikeNumber: result.bikeNumber || undefined,
          isUnlimitedWeek: true,
          graceTimeHours: 12 // O el valor que uses en tu sistema
        }
      );
    } catch (emailError) {
      console.error('Error enviando email de confirmación (semana ilimitada):', emailError);
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: result.id,
        className: result.scheduledClass.classType.name,
        instructor: `${result.scheduledClass.instructor.user.firstName} ${result.scheduledClass.instructor.user.lastName}`,
        date: result.scheduledClass.date,
        time: result.scheduledClass.time,
        status: result.status,
        package: result.userPackage?.package.name
      },
      weeklyUsage: {
        used: weeklyUsage + 1,
        remaining: 24 - weeklyUsage,
        limit: 25
      }
    });

  } catch (error) {
    console.error('Error creating unlimited week reservation:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
