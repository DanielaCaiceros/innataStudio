// app/api/packages/success/unlimited-week/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/unlimited-week';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 });
    }

    // Verificar la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Pago no completado' }, { status: 400 });
    }

    const { userId, packageId, selectedWeek, expiryDate } = session.metadata!;

    // Verificar si ya se procesó este pago
    const existingPayment = await prisma.payment.findFirst({
      where: {
        stripeSessionId: sessionId
      }
    });

    if (existingPayment) {
      return NextResponse.json({ 
        success: true, 
        message: 'Pago ya procesado',
        alreadyProcessed: true 
      });
    }

    // Procesar el pago y crear el paquete
    const result = await prisma.$transaction(async (tx) => {
      // Crear el registro de pago
      const payment = await tx.payment.create({
        data: {
          userId: parseInt(userId),
          amount: session.amount_total! / 100, // Convertir de centavos
          currency: 'MXN',
          paymentMethod: 'stripe',
          status: 'completed',
          stripeSessionId: sessionId,
          stripePaymentIntentId: session.payment_intent as string,
        }
      });

      // Crear el paquete de usuario
      const userPackage = await tx.userPackage.create({
        data: {
          userId: parseInt(userId),
          packageId: parseInt(packageId),
          purchaseDate: new Date(selectedWeek), // Fecha de inicio de la semana seleccionada
          expiryDate: new Date(expiryDate),
          classesRemaining: 25,
          classesUsed: 0,
          paymentMethod: 'online',
          paymentStatus: 'paid',
          isActive: true
        }
      });

      // Relacionar el pago con el paquete
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          relatedUserPackageId: userPackage.id
        }
      });

      // Crear transacción de balance
      await tx.balanceTransaction.create({
        data: {
          userId: parseInt(userId),
          type: 'purchase',
          amount: 25, // 25 clases
          description: `Compra de Semana Ilimitada - Stripe`,
          relatedPaymentId: payment.id
        }
      });

      return { payment, userPackage };
    });

    return NextResponse.json({
      success: true,
      message: 'Paquete de Semana Ilimitada activado exitosamente',
      userPackage: {
        id: result.userPackage.id,
        expiryDate: result.userPackage.expiryDate,
        classesRemaining: result.userPackage.classesRemaining,
        paymentStatus: 'paid'
      },
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        status: result.payment.status
      }
    });

  } catch (error) {
    console.error('Error processing unlimited week payment:', error);
    return NextResponse.json(
      { error: 'Error procesando el pago' },
      { status: 500 }
    );
  }
}