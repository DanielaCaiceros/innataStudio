// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/auth.service';
import { sendVerificationEmail } from '@/lib/email';
import { UserRegistrationData } from '@/lib/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: UserRegistrationData = await request.json();
    
    // Validar datos de entrada
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    // Registrar usuario
    const { userId, verificationToken } = await registerUser(body);
    
    // Enviar correo de verificación
    await sendVerificationEmail(body.email, body.firstName, verificationToken);

    return NextResponse.json(
      { 
        message: 'Usuario registrado exitosamente. Por favor verifica tu correo electrónico.',
        userId 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registrando usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error al registrar usuario' },
      { status: 400 }
    );
  }
}