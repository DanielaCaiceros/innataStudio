// app/api/unlimited-week/usage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar paquete de semana ilimitada activo
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
            scheduledClass: {
              include: {
                classType: true
              }
            }
          }
        }
      }
    });

    if (!unlimitedWeekPackage) {
      return NextResponse.json({ hasActivePackage: false });
    }

    // Calcular estadísticas de uso
    const weekStart = startOfWeek(unlimitedWeekPackage.purchaseDate, { weekStartsOn: 1 });
    const weekEnd = unlimitedWeekPackage.expiryDate;
    const totalUsed = unlimitedWeekPackage.reservations.length;
    const remaining = Math.max(0, 25 - totalUsed);

    // Agrupar reservaciones por día para mostrar uso diario
    const dailyUsage = unlimitedWeekPackage.reservations.reduce((acc, reservation) => {
      const date = new Date(reservation.scheduledClass.date).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(reservation);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      hasActivePackage: true,
      packageInfo: {
        id: unlimitedWeekPackage.id,
        packageName: unlimitedWeekPackage.package.name,
        purchaseDate: unlimitedWeekPackage.purchaseDate,
        expiryDate: unlimitedWeekPackage.expiryDate,
        weekStart,
        weekEnd
      },
      usage: {
        total: {
          used: totalUsed,
          remaining,
          limit: 25
        },
        daily: dailyUsage
      },
      reservations: unlimitedWeekPackage.reservations.map(reservation => ({
        id: reservation.id,
        className: reservation.scheduledClass.classType.name,
        date: reservation.scheduledClass.date,
        time: reservation.scheduledClass.time,
        status: reservation.status
      }))
    });

  } catch (error) {
    console.error('Error fetching unlimited week usage:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}