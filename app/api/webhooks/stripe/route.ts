import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
})

const prisma = new PrismaClient()
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')!

    let event: Stripe.Event

    try {
      // Add 5-minute tolerance for timestamp verification
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret, 300)
      console.log(`✅ Webhook verificado exitosamente. Tipo: ${event.type}`)
    } catch (err) {
      console.error(`❌ Error verificando webhook: ${err}`)
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
    }

    // Return 200 immediately after verification
    const response = NextResponse.json({ received: true })

    // Process the event asynchronously
    processEvent(event).catch(error => {
      console.error('Error processing webhook event:', error)
    })

    return response
  } catch (error) {
    console.error('Error en webhook de Stripe:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'payment_intent.canceled':
      await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'payment_intent.requires_action':
      await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'payment_intent.processing':
      await handlePaymentProcessing(event.data.object as Stripe.PaymentIntent)
      break
    
    case 'charge.succeeded':
      await handleChargeSucceeded(event.data.object as Stripe.Charge)
      break
    
    case 'charge.failed':
      await handleChargeFailed(event.data.object as Stripe.Charge)
      break
    
    case 'charge.dispute.created':
      await handleChargeDispute(event.data.object as Stripe.Dispute)
      break
    
    default:
      console.log(`🤷‍♀️ Evento no manejado: ${event.type}`)
  }
}

// Maneja pagos exitosos - crítico para confirmar paquetes/clases
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 Pago exitoso: ${paymentIntent.id} por $${paymentIntent.amount / 100} MXN`)
  
  try {
    // Buscar si ya existe un pago registrado con este Payment Intent
    const existingPayment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id }
    })

    if (existingPayment) {
      console.log(`ℹ️ Pago ya procesado: ${paymentIntent.id}`)
      
      // Asegurar que el estado esté actualizado
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { 
          status: 'completed',
          metadata: {
            ...existingPayment.metadata as object,
            webhook_processed_at: new Date().toISOString(),
            stripe_status: paymentIntent.status
          }
        }
      })
      return
    }

    // Si el pago no existe, puede ser un pago directo por clase individual
    // Intentar extraer información del metadata o description
    const metadata = paymentIntent.metadata
    const userId = metadata.userId ? parseInt(metadata.userId) : null
    const packageId = metadata.packageId ? parseInt(metadata.packageId) : null
    const reservationId = metadata.reservationId ? parseInt(metadata.reservationId) : null

    if (userId) {
      // Crear el registro de pago
      const payment = await prisma.payment.create({
        data: {
          userId: userId,
          amount: paymentIntent.amount / 100, // Convertir de centavos
          paymentMethod: 'stripe',
          status: 'completed',
          stripePaymentIntentId: paymentIntent.id,
          paymentDate: new Date(),
          metadata: {
            stripe_payment_intent: paymentIntent.id,
            webhook_processed_at: new Date().toISOString(),
            customer_email: paymentIntent.receipt_email || null,
            ...metadata
          }
        }
      })

      // Si es un paquete, crear UserPackage
      if (packageId) {
        const packageData = await prisma.package.findUnique({
          where: { id: packageId }
        })

        if (packageData) {
          // Determinar fecha de expiración según el tipo de paquete
          let calculatedPurchaseDate: Date;
          let calculatedExpiryDate: Date;
          let calculatedClassesRemaining: number | null = packageData.classCount; // Default

          // Check if this is the "Semana Ilimitada" package (ID 3) using metadata
          // and ensure necessary metadata fields are present.
          if (packageId === 3 && metadata.packageType === 'unlimited-week' && metadata.selectedWeek && metadata.expiryDate) {
            console.log('[Webhook] Processing Semana Ilimitada specific logic.');
            console.log('[Webhook] Metadata received:', { 
              selectedWeek: metadata.selectedWeek, 
              expiryDateString: metadata.expiryDate 
            });

            calculatedPurchaseDate = new Date(metadata.selectedWeek as string); // e.g., "2025-07-07"
            calculatedExpiryDate = new Date(metadata.expiryDate as string);   // ISO string from purchase initiation
            calculatedClassesRemaining = 25; // Fixed for Semana Ilimitada

            console.log('[Webhook] Calculated dates for Semana Ilimitada:', {
              purchase: calculatedPurchaseDate.toISOString(),
              expiry: calculatedExpiryDate.toISOString(),
              remainingClasses: calculatedClassesRemaining
            });

          } else {
            console.log('[Webhook] Processing standard package logic.');
            // Standard package logic (e.g., 10 class pack)
            calculatedPurchaseDate = new Date(); // Purchase is now
            calculatedExpiryDate = new Date();
            calculatedExpiryDate.setDate(calculatedPurchaseDate.getDate() + packageData.validityDays);
            // calculatedClassesRemaining remains packageData.classCount
             console.log('[Webhook] Calculated dates for Standard Package:', {
              purchase: calculatedPurchaseDate.toISOString(),
              expiry: calculatedExpiryDate.toISOString(),
              remainingClasses: calculatedClassesRemaining
            });
          }

          const userPackage = await prisma.userPackage.create({
            data: {
              userId: userId,
              packageId: packageId,
              purchaseDate: calculatedPurchaseDate,
              expiryDate: calculatedExpiryDate,
              classesRemaining: calculatedClassesRemaining,
              isActive: true,
              paymentStatus: 'paid',
              paymentMethod: 'stripe'
            }
          })

          // Actualizar el pago con la referencia al paquete
          await prisma.payment.update({
            where: { id: payment.id },
            data: { userPackageId: userPackage.id }
          })

          console.log(`📦 Paquete activado: ${packageData.name} para usuario ${userId}`)
        }
      }

      // Si hay una reservación asociada, actualizarla
      if (reservationId) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'confirmed',
            paymentMethod: 'stripe'
          }
        })

        console.log(`🎫 Reservación confirmada: ${reservationId}`)
      }

      // Crear transacción de balance
      await prisma.balanceTransaction.create({
        data: {
          userId: userId,
          type: packageId ? 'credit' : 'single_class_paid',
          amount: paymentIntent.amount / 100,
          description: `Pago Stripe confirmado: ${paymentIntent.description || 'Compra en línea'}`,
          relatedPaymentId: payment.id,
          relatedReservationId: reservationId
        }
      })

      console.log(`Pago procesado exitosamente para usuario ${userId}`)
    } else {
      console.warn(` No se pudo extraer userId del payment intent: ${paymentIntent.id}`)
    }

  } catch (error) {
    console.error(`❌ Error procesando pago exitoso ${paymentIntent.id}:`, error)
    throw error
  }
}

// Maneja fallos de pago - importante para notificar al usuario
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ Pago fallido: ${paymentIntent.id}`)
  
  try {
    const metadata = paymentIntent.metadata
    const userId = metadata.userId ? parseInt(metadata.userId) : null
    const reservationId = metadata.reservationId ? parseInt(metadata.reservationId) : null

    // Buscar pago existente y actualizarlo
    const existingPayment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id }
    })

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { 
          status: 'failed',
          metadata: {
            ...existingPayment.metadata as object,
            webhook_processed_at: new Date().toISOString(),
            stripe_status: paymentIntent.status,
            failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error'
          }
        }
      })
    }

    // Si hay una reservación, marcarla como pendiente de pago
    if (reservationId) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: 'pending',
          paymentMethod: 'pending'
        }
      })
    }

    // Aquí podrías enviar un email al usuario notificando el fallo
    console.log(`🔔 Pago fallido procesado para usuario ${userId}`)

  } catch (error) {
    console.error(`❌ Error procesando fallo de pago ${paymentIntent.id}:`, error)
  }
}

// Maneja cancelaciones de pago
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log(`🚫 Pago cancelado: ${paymentIntent.id}`)
  
  try {
    const metadata = paymentIntent.metadata
    const reservationId = metadata.reservationId ? parseInt(metadata.reservationId) : null

    // Buscar pago existente y actualizarlo
    const existingPayment = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id }
    })

    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { 
          status: 'canceled',
          metadata: {
            ...existingPayment.metadata as object,
            webhook_processed_at: new Date().toISOString(),
            stripe_status: paymentIntent.status
          }
        }
      })
    }

    // Si hay una reservación, cancelarla o marcarla como pendiente
    if (reservationId) {
      // Obtener la reservación para liberar el espacio
      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId }
      })

      if (reservation) {
        await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'canceled',
            paymentMethod: 'canceled'
          }
        })

        // Liberar el espacio en la clase
        await prisma.scheduledClass.update({
          where: { id: reservation.scheduledClassId },
          data: {
            availableSpots: { increment: 1 }
          }
        })
      }
    }

  } catch (error) {
    console.error(`❌ Error procesando cancelación de pago ${paymentIntent.id}:`, error)
  }
}

// Maneja disputas de cargos - importante por la política de cancelación de 12 horas
async function handleChargeDispute(dispute: Stripe.Dispute) {
  console.log(`⚖️ Disputa creada para disputa: ${dispute.id}`)
  
  try {
    const chargeId = dispute.charge as string
    
    // Buscar el pago asociado usando el charge ID en metadata o descripción
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          {
            metadata: {
              path: ['charge_id'],
              equals: chargeId
            }
          },
          {
            stripePaymentIntentId: {
              not: null
            }
          }
        ],
        status: 'completed'
      },
      include: {
        user: true,
        userPackage: {
          include: { package: true }
        }
      },
      take: 10 // Limitar resultados para eficiencia
    })

    // Buscar el pago correcto (simplificado)
    const payment = payments.find(p => 
      p.metadata && 
      typeof p.metadata === 'object' && 
      'charge_id' in p.metadata && 
      p.metadata.charge_id === chargeId
    ) || payments[0] // Fallback al primer pago si no se encuentra match exacto

    if (payment) {
      // Actualizar el estado del pago
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'disputed',
          metadata: {
            ...payment.metadata as object,
            dispute_created_at: new Date().toISOString(),
            dispute_charge_id: chargeId,
            dispute_id: dispute.id
          }
        }
      })

      // Crear una nota de seguimiento
      await prisma.balanceTransaction.create({
        data: {
          userId: payment.userId,
          type: 'dispute',
          amount: 0,
          description: `Disputa creada para cargo ${chargeId} - Paquete: ${payment.userPackage?.package?.name || 'Clase individual'}`,
          relatedPaymentId: payment.id
        }
      })

      console.log(`📝 Disputa registrada para usuario ${payment.user.email}`)
    } else {
      console.warn(`⚠️ No se encontró pago asociado para disputa ${dispute.id}`)
    }

  } catch (error) {
    console.error(`❌ Error procesando disputa ${dispute.id}:`, error)
  }
}

async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  console.log(`⚠️ Pago requiere acción adicional: ${paymentIntent.id}`)
  // Update payment status to requires_action
  await updatePaymentStatus(paymentIntent.id, 'requires_action')
}

async function handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent) {
  console.log(`⏳ Pago en procesamiento: ${paymentIntent.id}`)
  // Update payment status to processing
  await updatePaymentStatus(paymentIntent.id, 'processing')
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log(`✅ Cargo exitoso: ${charge.id}`)
  // Additional charge-specific logic if needed
}

async function handleChargeFailed(charge: Stripe.Charge) {
  console.log(`❌ Cargo fallido: ${charge.id}`)
  // Additional charge-specific logic if needed
}

async function updatePaymentStatus(paymentIntentId: string, status: string) {
  const existingPayment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntentId }
  })

  if (existingPayment) {
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { 
        status,
        metadata: {
          ...existingPayment.metadata as object,
          webhook_processed_at: new Date().toISOString(),
          stripe_status: status
        }
      }
    })
  }
}
