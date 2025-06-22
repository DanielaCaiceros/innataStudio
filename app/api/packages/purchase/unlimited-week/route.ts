// app/api/packages/purchase/unlimited-week/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/unlimited-week';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

console.log('--- API /api/reservations/validate-unlimited-week called ---');

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { selectedWeek, paymentMethod } = await request.json();

    if (!selectedWeek) {
      return NextResponse.json({ error: 'Semana requerida' }, { status: 400 });
    }

    if (!paymentMethod || !['stripe', 'cash'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Método de pago no válido' }, { status: 400 });
    }

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar si ya tiene un paquete de semana ilimitada activo
    const existingPackage = await prisma.userPackage.findFirst({
      where: {
        userId: user.user_id,
        packageId: 3, // Semana Ilimitada
        isActive: true,
        expiryDate: {
          gte: new Date()
        }
      }
    });

    if (existingPackage) {
      return NextResponse.json({ 
        error: 'Ya tienes un paquete de semana ilimitada activo' 
      }, { status: 400 });
    }

    // Obtener información del paquete
    const packageInfo = await prisma.package.findUnique({
      where: { id: 3 } // Semana Ilimitada
    });

    if (!packageInfo) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 });
    }

    // Calcular fecha de expiración basada en la semana seleccionada
    const weekStartDate = new Date(selectedWeek);
    const expiryDate = getUnlimitedWeekExpiryDate(weekStartDate);

    // Validar que la semana seleccionada sea válida (no en el pasado)
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStartDateOnly = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate());
    
    if (weekStartDateOnly < todayDateOnly) {
      return NextResponse.json({ 
        error: 'No puedes comprar un paquete para una semana que ya pasó' 
      }, { status: 400 });
    }

    if (paymentMethod === 'cash') {
      // Crear paquete pendiente de pago en efectivo
      // IMPORTANTE: el purchaseDate debe ser la fecha de inicio de la semana seleccionada
      const userPackage = await prisma.userPackage.create({
        data: {
          userId: user.user_id,
          packageId: 3,
          purchaseDate: weekStartDate, // Fecha de inicio de la semana seleccionada
          expiryDate: expiryDate,
          classesRemaining: 25,
          classesUsed: 0,
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          isActive: false // Se activa cuando se confirme el pago
        }
      });

      // Crear solicitud de pago en efectivo
      await prisma.cashPaymentRequest.create({
        data: {
          userId: user.user_id,
          packageId: 3,
          amount: packageInfo.price,
          status: 'pending',
          requestDate: new Date(),
          description: `Semana Ilimitada - ${weekStartDate.toLocaleDateString('es-MX')} a ${expiryDate.toLocaleDateString('es-MX')}`
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Paquete creado. Pendiente de pago en efectivo.',
        userPackage: {
          id: userPackage.id,
          paymentStatus: 'pending',
          paymentMethod: 'cash'
        }
      });

    } else {
      // Crear sesión de Stripe Checkout
      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: 'Semana Ilimitada',
                description: `Válida del ${weekStartDate.toLocaleDateString('es-MX')} al ${expiryDate.toLocaleDateString('es-MX')}`,
                images: ['https://innata.com/images/unlimited-week-package.jpg'], // Ajustar URL
              },
              unit_amount: Math.round(Number(packageInfo.price) * 100), // Convertir a centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.NEXTAUTH_URL}/packages/success?session_id={CHECKOUT_SESSION_ID}&package_type=unlimited-week`,
        cancel_url: `${process.env.NEXTAUTH_URL}/packages?cancelled=true`,
        metadata: {
          userId: user.user_id.toString(),
          packageId: '3',
          packageType: 'unlimited-week',
          selectedWeek: selectedWeek,
          expiryDate: expiryDate.toISOString()
        },
        customer_email: user.email,
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
      });

      return NextResponse.json({
        success: true,
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id
      });
    }

  } catch (error) {
    console.error('Error creating unlimited week package:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}