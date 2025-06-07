import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail, AuthError } from '@/lib/services/auth.service';
import { getFriendlyErrorMessage } from '@/lib/utils/auth-errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      // Fix: usar la URL de producción en lugar de request.url
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://innatastudio.com';
      return NextResponse.redirect(
        new URL('/login?error=Token de verificación no proporcionado', baseUrl)
      );
    }

    await verifyEmail(token);

    // Fix: usar la URL de producción en lugar de request.url
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://innatastudio.com';
    return NextResponse.redirect(new URL('/login?verified=true', baseUrl));
  } catch (error: any) {
    console.error('Error verificando email:', error);
    
    let errorMessage = 'Error al verificar el email';
    
    if (error instanceof AuthError) {
      errorMessage = getFriendlyErrorMessage(error.code, error.message);
    }
    
    // Fix: usar la URL de producción en lugar de request.url
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://innatastudio.com';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, baseUrl)
    );
  }
}