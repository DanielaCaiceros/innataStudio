// app/api/unlimited-week/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { 
  validateUnlimitedWeekUsage, 
  calculateDailyUsage,
  isWithinUnlimitedWeekSchedule 
} from '@/lib/utils/unlimited-week';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { scheduledClassId } = await request.json();

    if (!scheduledClassId) {
      return NextResponse.json({ error: 'ID de clase requerido' }, { status: 400 });
    }

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener información de la clase programada
    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: scheduledClassId },
      include: {
        classType: true
      }
    });

    if (!scheduledClass) {
      return NextResponse.json({ error: 'Clase no encontrada' }, { status: 404 });
    }

    const classDate = new Date(scheduledClass.date);

    // Verificar si la clase está en horario permitido (lunes a viernes)
    if (!isWithinUnlimitedWeekSchedule(classDate)) {
      return NextResponse.json({
        isValid: false,
        canUseUnlimitedWeek: false,
        message: 'La semana ilimitada solo aplica de lunes a viernes'
      });
    }

    // Buscar paquete de semana ilimitada activo del usuario
    const today = new Date();
    const unlimitedWeekPackage = await prisma.userPackage.findFirst({
      where: {
        userId: user.user_id,
        packageId: 3, // ID del paquete "Semana ilimitada"
        isActive: true,
        expiryDate: {
          gte: today
        }
      },
      include: {
        package: true,
        reservations: {
          where: {
            status: 'confirmed'
          },
          include: {
            scheduledClass: true
          }
        }
      }
    });

    if (!unlimitedWeekPackage) {
      return NextResponse.json({
        isValid: false,
        canUseUnlimitedWeek: false,
        message: 'No tienes un paquete de semana ilimitada activo'
      });
    }

    // Calcular uso semanal actual
    const weeklyUsage = unlimitedWeekPackage.reservations.length;

    // Calcular uso diario para la fecha de la clase
    const dailyUsage = calculateDailyUsage(unlimitedWeekPackage.reservations, classDate);

    // Verificar límite diario (máximo 5 clases por día)
    if (dailyUsage >= 5) {
      return NextResponse.json({
        isValid: false,
        canUseUnlimitedWeek: false,
        message: 'Has alcanzado el límite de 5 clases por día'
      });
    }

    // Validar el uso de semana ilimitada
    const validation = validateUnlimitedWeekUsage(
      unlimitedWeekPackage,
      classDate,
      weeklyUsage
    );

    return NextResponse.json(validation);

  } catch (error) {
    console.error('Error validating unlimited week:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
