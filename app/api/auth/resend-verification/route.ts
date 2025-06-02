import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationEmail, AuthError } from '@/lib/services/auth.service';
import { getStatusCodeForAuthError, getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    await resendVerificationEmail(email);

    return NextResponse.json({
      message: 'Correo de verificación reenviado exitosamente'
    });
  } catch (error: any) {
    console.error('Error reenviando verificación:', error);
    
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