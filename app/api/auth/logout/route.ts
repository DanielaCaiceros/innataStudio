// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Eliminar la cookie de autenticación
    (await
          // Eliminar la cookie de autenticación
          cookies()).delete('auth_token');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}