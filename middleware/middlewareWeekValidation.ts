import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function validateUnlimitedWeekReservation(
  request: NextRequest,
  scheduledClassId: number,
  userId: number
) {
  try {
    // Validar que sea una clase de lunes a viernes
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/unlimited-week/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify({ scheduledClassId })
    });

    const validation = await response.json();
    
    if (!validation.isValid) {
      return {
        isValid: false,
        error: validation.message
      };
    }

    return {
      isValid: true,
      weeklyUsage: validation.weeklyUsage
    };

  } catch (error) {
    console.error('Error validating unlimited week reservation:', error);
    return {
      isValid: false,
      error: 'Error validando reservación de semana ilimitada'
    };
  }
}
