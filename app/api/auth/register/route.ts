import { NextRequest, NextResponse } from 'next/server';
import { registerUser, AuthError } from '@/lib/services/auth.service';
import { sendVerificationEmail } from '@/lib/email';
import { UserRegistrationData } from '@/lib/types/auth';
import { getStatusCodeForAuthError, getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function POST(request: NextRequest) {
  try {
    const body: UserRegistrationData = await request.json();
    
    const { userId, verificationToken } = await registerUser(body);
    
    // Enviar correo de verificación
    try {
      await sendVerificationEmail(body.email, body.firstName, verificationToken);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // No fallar el registro si el email no se puede enviar
      // El usuario puede solicitar un reenvío más tarde
    }

    return NextResponse.json(
      { 
        message: 'Usuario registrado exitosamente. Por favor verifica tu correo electrónico.',
        userId 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registrando usuario:', error);
    
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