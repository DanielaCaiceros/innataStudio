// app/api/admin/packages/unlimited-week/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos de administrador
    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 });
    }

    const packageId = parseInt(params.id);

    if (isNaN(packageId)) {
      return NextResponse.json({ error: 'ID de paquete no válido' }, { status: 400 });
    }

    // Obtener detalles del paquete específico
    const packageDetails = await prisma.userPackage.findUnique({
      where: { id: packageId },
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        package: {
          select: {
            name: true,
            price: true,
            description: true
          }
        },
        reservations: {
          include: {
            scheduledClass: {
              include: {
                classType: {
                  select: {
                    name: true,
                    duration: true,
                    intensity: true
                  }
                },
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
            }
          },
          orderBy: {
            scheduledClass: {
              date: 'asc'
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
            stripeSessionId: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!packageDetails) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 });
    }

    // Verificar que sea un paquete de semana ilimitada
    if (packageDetails.packageId !== 3) {
      return NextResponse.json({ 
        error: 'Este no es un paquete de semana ilimitada' 
      }, { status: 400 });
    }

    // Calcular uso diario
    const dailyUsage = packageDetails.reservations.reduce((acc, reservation) => {
      const date = new Date(reservation.scheduledClass.date).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        id: reservation.id,
        className: reservation.scheduledClass.classType.name,
        time: reservation.scheduledClass.time,
        status: reservation.status,
        instructor: `${reservation.scheduledClass.instructor.user.firstName} ${reservation.scheduledClass.instructor.user.lastName}`
      });
      return acc;
    }, {} as Record<string, any[]>);

    // Formatear respuesta
    const formattedDetails = {
      id: packageDetails.id,
      user: {
        id: packageDetails.user.user_id,
        name: `${packageDetails.user.firstName} ${packageDetails.user.lastName}`,
        email: packageDetails.user.email,
        phone: packageDetails.user.phone
      },
      packageInfo: {
        name: packageDetails.package.name,
        price: packageDetails.package.price,
        description: packageDetails.package.description
      },
      purchaseDate: packageDetails.purchaseDate,
      expiryDate: packageDetails.expiryDate,
      paymentStatus: packageDetails.paymentStatus,
      paymentMethod: packageDetails.paymentMethod,
      isActive: packageDetails.isActive,
      classesUsed: packageDetails.classesUsed || 0,
      classesRemaining: packageDetails.classesRemaining || 0,
      
      // Reservaciones detalladas
      reservations: packageDetails.reservations.map(reservation => ({
        id: reservation.id,
        className: reservation.scheduledClass.classType.name,
        date: reservation.scheduledClass.date,
        time: reservation.scheduledClass.time,
        status: reservation.status,
        instructor: `${reservation.scheduledClass.instructor.user.firstName} ${reservation.scheduledClass.instructor.user.lastName}`,
        duration: reservation.scheduledClass.classType.duration,
        intensity: reservation.scheduledClass.classType.intensity,
        cancellationReason: reservation.cancellationReason,
        cancelledAt: reservation.cancelledAt
      })),

      // Uso diario agrupado
      dailyUsage,

      // Historial de pagos
      payments: packageDetails.payments,

      // Estadísticas
      stats: {
        totalReservations: packageDetails.reservations.length,
        confirmedReservations: packageDetails.reservations.filter(r => r.status === 'confirmed').length,
        cancelledReservations: packageDetails.reservations.filter(r => r.status === 'cancelled').length,
        noShowReservations: packageDetails.reservations.filter(r => r.status === 'no_show').length,
        usagePercentage: Math.round(((packageDetails.classesUsed || 0) / 25) * 100),
        daysWithClasses: Object.keys(dailyUsage).length,
        averageClassesPerDay: Object.keys(dailyUsage).length > 0 
          ? Math.round((packageDetails.classesUsed || 0) / Object.keys(dailyUsage).length * 10) / 10 
          : 0
      }
    };

    return NextResponse.json(formattedDetails);

  } catch (error) {
    console.error('Error fetching package details:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
