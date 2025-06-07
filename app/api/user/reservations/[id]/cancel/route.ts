// app/api/reservations/[id]/cancel/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cancelReservation, CancellationError } from '@/lib/services/cancellation.service';

// Función auxiliar para obtener el userId de la sesión
// Adapta esto según tu sistema de autenticación
async function getUserIdFromRequest(request: NextRequest): Promise<number | null> {
  try {
    // Opción 1: Si usas cookies de sesión
    const sessionCookie = request.cookies.get('session-token');
    if (!sessionCookie) return null;
    
    // Aquí deberías decodificar tu cookie de sesión y extraer el userId
    // Esto es un placeholder - adapta según tu implementación
    const userId = 1; // Reemplaza con tu lógica de autenticación
    
    return userId;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación - adapta según tu sistema
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { error: 'ID de reserva inválido' },
        { status: 400 }
      );
    }

    // Obtener el motivo de cancelación del body (opcional)
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Si no hay body o no es JSON válido, continúa sin reason
    }

    // Cancelar la reserva
    const result = await cancelReservation(
      reservationId,
      userId,
      reason
    );

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in cancel reservation API:', error);

    if (error instanceof CancellationError) {
      let statusCode = 400;
      
      switch (error.code) {
        case 'RESERVATION_NOT_FOUND':
          statusCode = 404;
          break;
        case 'INTERNAL_ERROR':
          statusCode = 500;
          break;
      }

      return NextResponse.json(
        { 
          error: error.message,
          code: error.code 
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}