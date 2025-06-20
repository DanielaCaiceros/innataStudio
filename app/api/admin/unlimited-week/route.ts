// app/api/admin/packages/unlimited-week/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    // Obtener todos los paquetes de semana ilimitada
    const packages = await prisma.userPackage.findMany({
      where: {
        packageId: 3 // Semana Ilimitada
      },
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        package: {
          select: {
            name: true,
            price: true
          }
        },
        reservations: {
          where: {
            status: {
              in: ['confirmed', 'cancelled', 'no_show']
            }
          },
          include: {
            scheduledClass: {
              include: {
                classType: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        payments: {
          select: {
            amount: true,
            status: true,
            paymentMethod: true,
            createdAt: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Formatear los datos para el frontend
    const formattedPackages = packages.map(pkg => ({
      id: pkg.id,
      user: {
        id: pkg.user.user_id,
        name: `${pkg.user.firstName} ${pkg.user.lastName}`,
        email: pkg.user.email
      },
      purchaseDate: pkg.purchaseDate,
      expiryDate: pkg.expiryDate,
      paymentStatus: pkg.paymentStatus,
      paymentMethod: pkg.paymentMethod,
      isActive: pkg.isActive,
      classesUsed: pkg.classesUsed || 0,
      classesRemaining: pkg.classesRemaining || 0,
      totalReservations: pkg.reservations.length,
      packageInfo: {
        name: pkg.package.name,
        price: pkg.package.price
      },
      // Estadísticas adicionales
      confirmedReservations: pkg.reservations.filter(r => r.status === 'confirmed').length,
      cancelledReservations: pkg.reservations.filter(r => r.status === 'cancelled').length,
      noShowReservations: pkg.reservations.filter(r => r.status === 'no_show').length,
      // Último pago
      lastPayment: pkg.payments.length > 0 ? pkg.payments[pkg.payments.length - 1] : null
    }));

    // Estadísticas generales
    const stats = {
      total: formattedPackages.length,
      active: formattedPackages.filter(p => p.isActive && p.paymentStatus === 'paid').length,
      pending: formattedPackages.filter(p => p.paymentStatus === 'pending').length,
      expired: formattedPackages.filter(p => !p.isActive || new Date(p.expiryDate) < new Date()).length,
      totalRevenue: formattedPackages
        .filter(p => p.paymentStatus === 'paid')
        .reduce((sum, p) => sum + Number(p.packageInfo.price), 0)
    };

    return NextResponse.json({
      packages: formattedPackages,
      stats
    });

  } catch (error) {
    console.error('Error fetching unlimited week packages:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
