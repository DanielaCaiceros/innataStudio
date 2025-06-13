import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset, AuthError } from '@/lib/services/auth.service';
import { getStatusCodeForAuthError, getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    await requestPasswordReset(email);

    return NextResponse.json({
      message: 'Si existe una cuenta con este email, recibirás un correo con instrucciones para restablecer tu contraseña'
    });
  } catch (error: any) {
    console.error('Error en forgot password:', error);
    
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
