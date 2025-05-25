// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/services/auth.service';
import { LoginCredentials } from '@/lib/types/auth';
import { cookies } from 'next/headers';

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

    // Establecer cookie con el token JWT
    (await
      // Establecer cookie con el token JWT
      cookies()).set({
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
    return NextResponse.json(
      { error: error.message || 'Error en el inicio de sesión' },
      { status: 401 }
    );
  }
}