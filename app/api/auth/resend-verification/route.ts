// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { resendVerificationEmail } from '@/lib/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    await resendVerificationEmail(email);

    return NextResponse.json({
      message: 'Correo de verificación reenviado exitosamente'
    });
  } catch (error: any) {
    console.error('Error reenviando verificación:', error);
    return NextResponse.json(
      { error: error.message || 'Error al reenviar el correo de verificación' },
      { status: 400 }
    );
  }
}