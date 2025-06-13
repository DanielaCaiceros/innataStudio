import { NextRequest, NextResponse } from 'next/server';
import { confirmPasswordReset, AuthError } from '@/lib/services/auth.service';
import { getStatusCodeForAuthError, getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    
    await confirmPasswordReset(token, password);

    return NextResponse.json({
      message: 'Contraseña restablecida exitosamente'
    });
  } catch (error: any) {
    console.error('Error en reset password:', error);
    
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
