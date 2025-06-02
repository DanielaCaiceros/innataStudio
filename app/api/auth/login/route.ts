import { NextRequest, NextResponse } from 'next/server';
import { loginUser, AuthError } from '@/lib/services/auth.service';
import { LoginCredentials } from '@/lib/types/auth';
import { cookies } from 'next/headers';
import { getStatusCodeForAuthError, getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    
    const authResponse = await loginUser(body);

    // Establecer cookie con el token JWT
    (await cookies()).set({
      name: 'auth_token',
      value: authResponse.token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: 'strict'
    });

    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error('Error en inicio de sesión:', error);
    
    if (error instanceof AuthError) {
      const statusCode = getStatusCodeForAuthError(error.code);
      const friendlyMessage = getFriendlyErrorMessage(error.code, error.message);
      
      return NextResponse.json(
        { error: friendlyMessage, code: error.code },
        { status: statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
