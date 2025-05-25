// app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/services/auth.service';

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