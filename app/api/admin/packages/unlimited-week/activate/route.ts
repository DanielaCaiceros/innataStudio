// app/api/admin/packages/unlimited-week/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const { userPackageId, paymentConfirmed } = await request.json();

    if (!userPackageId) {
      return NextResponse.json({ error: 'ID de paquete requerido' }, { status: 400 });
    }

    // Obtener el paquete
    const userPackage = await prisma.userPackage.findUnique({
      where: { id: userPackageId },
      include: {
        user: true,
        package: true
      }
    });

    if (!userPackage) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 });
    }

    if (userPackage.packageId !== 3) {
      return NextResponse.json({ error: 'No es un paquete de semana ilimitada' }, { status: 400 });
    }

    if (userPackage.paymentStatus === 'paid' && userPackage.isActive) {
      return NextResponse.json({ error: 'El paquete ya está activo' }, { status: 400 });
    }

    // Activar el paquete
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el paquete
      const updatedPackage = await tx.userPackage.update({
        where: { id: userPackageId },
        data: {
          paymentStatus: 'paid',
          isActive: true
        }
      });

      // Crear registro de pago en efectivo
      const payment = await tx.payment.create({
        data: {
          userId: userPackage.userId,
          amount: userPackage.package.price,
          currency: 'MXN',
          paymentMethod: 'cash',
          status: 'completed',
          relatedUserPackageId: userPackageId,
          processedBy: adminUser.user_id
        }
      });

      // Crear transacción de balance
      await tx.balanceTransaction.create({
        data: {
          userId: userPackage.userId,
          type: 'purchase',
          amount: 25,
          description: `Activación Semana Ilimitada - Pago en efectivo`,
          relatedPaymentId: payment.id,
          createdBy: adminUser.user_id
        }
      });

      return { updatedPackage, payment };
    });

    return NextResponse.json({
      success: true,
      message: 'Paquete de Semana Ilimitada activado exitosamente',
      userPackage: result.updatedPackage,
      payment: result.payment
    });

  } catch (error) {
    console.error('Error activating unlimited week package:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}