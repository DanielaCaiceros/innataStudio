import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: Request) {
  try {
    const { amount, description, email, name, userId, packageId, reservationId } = await req.json();

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount is already in centavos for MXN
      currency: 'mxn',
      description,
      receipt_email: email,
      metadata: {
        customerName: name,
        userId: userId?.toString(),
        packageId: packageId?.toString(),
        reservationId: reservationId?.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    
    // More detailed error response
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    const errorType = err instanceof Stripe.errors.StripeError ? err.type : 'unknown';
    
    return NextResponse.json(
      { 
        error: 'Error creating payment intent',
        details: {
          message: errorMessage,
          type: errorType,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
} 