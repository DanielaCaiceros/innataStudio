import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail, AuthError } from '@/lib/services/auth.service';
import { getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.redirect(
        new URL('/login?error=Token de verificación no proporcionado', request.url)
      );
    }

    await verifyEmail(token);

    // Redirigir a la página de inicio de sesión con mensaje de éxito
    return NextResponse.redirect(new URL('/login?verified=true', request.url));
  } catch (error: any) {
    console.error('Error verificando email:', error);
    
    let errorMessage = 'Error al verificar el email';
    
    if (error instanceof AuthError) {
      errorMessage = getFriendlyErrorMessage(error.code, error.message);
    }
    
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}