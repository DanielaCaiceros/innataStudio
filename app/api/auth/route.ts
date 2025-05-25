// app/api/auth/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { registerUser, loginUser, verifyEmail, resendVerificationEmail } from '@/lib/services/auth.service';
import { sendVerificationEmail } from '@/lib/email';
import { UserRegistrationData, LoginCredentials } from '@/lib/types/auth';

// Ruta para registro de usuarios
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

// app/api/auth/login/route.ts

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    
    // Validar datos de entrada
    if (!body.email || !body.password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Iniciar sesión
    const authResponse = await loginUser(body);

    return NextResponse.json(authResponse);
  } catch (error: any) {
    console.error('Error en inicio de sesión:', error);
    return NextResponse.json(
      { error: error.message || 'Error en el inicio de sesión' },
      { status: 401 }
    );
  }
}

// app/api/auth/verify/route.ts

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 400 }
      );
    }

    await verifyEmail(token);

    // Redirigir a la página de inicio de sesión
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error: any) {
    console.error('Error verificando email:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

// app/api/auth/resend-verification/route.ts

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