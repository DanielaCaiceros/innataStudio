import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { parseISO, isMonday, startOfWeek, addWeeks, formatISO, isPast, startOfToday, isValid as isValidDate } from 'date-fns';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

const UNLIMITED_WEEK_PACKAGE_ID = 3;

export async function POST(req: Request) {
  try {
    const { 
      amount, 
      description, 
      email, 
      name, 
      userId, 
      packageId, 
      reservationId, 
      selectedStartDate // Destructure selectedStartDate
    } = await req.json();

    let parsedSelectedDateISO: string | undefined = undefined;

    if (Number(packageId) === UNLIMITED_WEEK_PACKAGE_ID) {
      if (!selectedStartDate || typeof selectedStartDate !== 'string') {
        return NextResponse.json({ error: "selectedStartDate es requerido y debe ser una cadena de texto para el paquete Semana Ilimitada." }, { status: 400 });
      }

      const parsedDate = parseISO(selectedStartDate);
      if (!isValidDate(parsedDate)) {
        return NextResponse.json({ error: "Formato de selectedStartDate inválido. Use YYYY-MM-DD." }, { status: 400 });
      }

      if (!isMonday(parsedDate)) {
        return NextResponse.json({ error: "selectedStartDate debe ser un lunes." }, { status: 400 });
      }
      
      const today = startOfToday(); // Get current date at midnight for accurate comparison
      // The isMonday(parsedDate) check has already been performed.
      // So, if parsedDate is today, it's a Monday.
      // We just need to ensure parsedDate is not any day before today.
      if (isPast(parsedDate)) { 
        // isPast(parsedDate) is true if parsedDate is before startOfToday().
        // This correctly flags any past date, including past Mondays.
        return NextResponse.json({ error: "selectedStartDate no puede ser en el pasado." }, { status: 400 });
      }

      const currentWeekMonday = startOfWeek(today, { weekStartsOn: 1 });
      const maxAllowedMonday = addWeeks(currentWeekMonday, 3);

      if (parsedDate > maxAllowedMonday) {
        return NextResponse.json({ error: `selectedStartDate no puede ser más allá del ${formatISO(maxAllowedMonday, { representation: 'date' })} (Lunes de la 3ra semana futura).` }, { status: 400 });
      }
      parsedSelectedDateISO = formatISO(parsedDate, { representation: 'date' });
    }

    const metadata: Stripe.MetadataParam = {
      customerName: name,
      userId: userId?.toString(),
      packageId: packageId?.toString(),
      reservationId: reservationId?.toString(),
    };

    if (parsedSelectedDateISO) {
      metadata.selectedStartDate = parsedSelectedDateISO;
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // Amount is already in centavos for MXN
      currency: 'mxn',
      description,
      receipt_email: email,
      metadata, // Use the constructed metadata object
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