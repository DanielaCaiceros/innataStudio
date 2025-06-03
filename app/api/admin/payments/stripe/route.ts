import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from 'next/headers'
import Stripe from "stripe"

const prisma = new PrismaClient()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil"
})

// POST - Asociar un pago de Stripe con usuario y paquete
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del admin usando cookies
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userData = JSON.parse(userCookie.value);
    if (!userData || userData.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { userId, packageId, stripePaymentIntentId, notes } = await request.json()

    // Validar datos requeridos
    if (!userId || !packageId || !stripePaymentIntentId) {
      return NextResponse.json({ 
        error: "Faltan campos requeridos: userId, packageId, stripePaymentIntentId" 
      }, { status: 400 })
    }

    // Verificar que el usuario y paquete existen
    const user = await prisma.user.findUnique({
      where: { user_id: userId }
    })

    const packageData = await prisma.package.findUnique({
      where: { id: packageId }
    })

    if (!user || !packageData) {
      return NextResponse.json({ 
        error: "Usuario o paquete no encontrado" 
      }, { status: 404 })
    }

    // Verificar el payment intent de Stripe
    let paymentIntent
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId)
    } catch (error) {
      return NextResponse.json({ 
        error: "Payment Intent de Stripe no válido" 
      }, { status: 400 })
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        error: "El pago de Stripe no está completado" 
      }, { status: 400 })
    }

    // Verificar si ya existe un pago con este Payment Intent
    const existingPayment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: stripePaymentIntentId }
    })

    if (existingPayment) {
      return NextResponse.json({ 
        error: "Este pago de Stripe ya está registrado" 
      }, { status: 400 })
    }

    // Crear el pago y el paquete de usuario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el pago
      const payment = await tx.payment.create({
        data: {
          userId: userId,
          userPackageId: null, // Se actualizará después
          amount: paymentIntent.amount / 100, // Stripe maneja centavos
          paymentMethod: 'stripe',
          status: 'completed',
          stripePaymentIntentId: stripePaymentIntentId,
          metadata: { notes: notes || null },
          paymentDate: new Date()
        }
      })

      // Crear el paquete de usuario
      const expirationDate = new Date()
      expirationDate.setMonth(expirationDate.getMonth() + 3) // 3 meses de vigencia

      const userPackage = await tx.userPackage.create({
        data: {
          userId: userId,
          packageId: packageId,
          purchaseDate: new Date(),
          expiryDate: expirationDate,
          classesRemaining: packageData.classCount,
          isActive: true
        }
      })

      // Actualizar el pago con la referencia al paquete de usuario
      await tx.payment.update({
        where: { id: payment.id },
        data: { userPackageId: userPackage.id }
      })

      // Crear transacción de balance
      await tx.balanceTransaction.create({
        data: {
          userId: userId,
          type: 'credit',
          amount: paymentIntent.amount / 100,
          description: `Compra de ${packageData.name} (Stripe)`,
          relatedPaymentId: payment.id
        }
      })

      return { payment, userPackage }
    })

    return NextResponse.json({
      success: true,
      message: "Pago de Stripe asociado correctamente",
      payment: result.payment,
      userPackage: result.userPackage
    })

  } catch (error) {
    console.error("Error associating Stripe payment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
