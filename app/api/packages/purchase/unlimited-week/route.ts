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

    // --- START: Business Rules for Multiple Unlimited Weeks ---
    const todayForChecks = new Date(); // Use a consistent 'today' for all checks
    todayForChecks.setUTCHours(0, 0, 0, 0); // Normalize to UTC midnight

    // 1. Check max number of unlimited weeks (e.g., max 2 not fully expired)
    const unlimitedPackagesCount = await prisma.userPackage.count({
      where: {
        userId: user.user_id,
        packageId: 3, // Semana Ilimitada
        // Count packages that are not fully passed (expiry is today or in future)
        // OR that are isActive:false but paymentStatus:'pending' (cash purchases for future)
        OR: [
          { expiryDate: { gte: todayForChecks }, isActive: true },
          { expiryDate: { gte: todayForChecks }, isActive: false, paymentStatus: 'pending' } 
        ]
      },
    });

    if (unlimitedPackagesCount >= 2) {
      return NextResponse.json({ error: 'Solo puedes tener un máximo de 2 Semanas Ilimitadas activas o programadas.' }, { status: 400 });
    }
    
    // Define dates for the new package being purchased
    const newPackagePurchaseDate = new Date(selectedWeek); // This is already Monday UTC midnight
    const newPackageTargetFriday = new Date(newPackagePurchaseDate.valueOf());
    newPackageTargetFriday.setUTCDate(newPackagePurchaseDate.getUTCDate() + 4); // This is Friday UTC midnight

    // 2. Check for overlap with the selected week for the new package
    const overlappingPackage = await prisma.userPackage.findFirst({
      where: {
        userId: user.user_id,
        packageId: 3,
        // Overlap condition: (ExistingStart <= NewEnd) AND (ExistingEnd >= NewStart)
        purchaseDate: { lte: newPackageTargetFriday }, // Existing package starts before or on the new package's end date
        expiryDate: { gte: newPackagePurchaseDate },   // Existing package ends after or on the new package's start date
      },
    });

    if (overlappingPackage) {
      return NextResponse.json({ error: 'Ya tienes una Semana Ilimitada programada que se superpone con la semana seleccionada.' }, { status: 400 });
    }
    // --- END: Business Rules for Multiple Unlimited Weeks ---

    // Obtener información del paquete
    const packageInfo = await prisma.package.findUnique({
      where: { id: 3 } // Semana Ilimitada
    });

    if (!packageInfo) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 });
    }

    // weekStartDate will be Monday UTC midnight e.g., 2025-06-30T00:00:00.000Z
    const weekStartDate = new Date(selectedWeek); 

    // Calculate targetFriday (Friday UTC end of day) based on weekStartDate
    const targetFriday = new Date(weekStartDate.valueOf()); // Clone weekStartDate
    targetFriday.setUTCDate(weekStartDate.getUTCDate() + 4); // Add 4 days to get to Friday
    targetFriday.setUTCHours(23, 59, 59, 999); // Set to the end of the day in UTC

    // Validar que la semana seleccionada sea válida (no en el pasado)
    // todayForChecks (UTC midnight) is already defined above for the max package check
    const weekStartDateForPastCheck = new Date(weekStartDate.valueOf()); // Clone to avoid mutating weekStartDate
    weekStartDateForPastCheck.setUTCHours(0,0,0,0); // Ensure UTC midnight for comparison
        
    if (weekStartDateForPastCheck < todayForChecks) {
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
          purchaseDate: weekStartDate, // Fecha de inicio de la semana seleccionada (which is newPackagePurchaseDate)
          expiryDate: targetFriday,   // This is newPackageTargetFriday
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
          //requestDate: new Date(),
          notes: `Semana Ilimitada - ${new Date(selectedWeek).toLocaleDateString('es-MX', { timeZone: 'UTC' })} a ${targetFriday.toLocaleDateString('es-MX', {timeZone: 'UTC'})}`
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
                    description: `Válida del ${new Date(selectedWeek).toLocaleDateString('es-MX', { timeZone: 'UTC' })} al ${targetFriday.toLocaleDateString('es-MX', { timeZone: 'UTC' })}`,
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
          selectedWeek: selectedWeek, // Monday string, e.g., "2025-06-30"
          expiryDate: targetFriday.toISOString() // Friday UTC midnight ISO string, e.g., "2025-07-04T00:00:00.000Z"
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