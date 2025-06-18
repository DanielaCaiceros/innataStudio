// app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Eliminar la cookie de autenticación de manera más completa
    cookieStore.set({
      name: 'auth_token',
      value: '',
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expira inmediatamente
    });
    
    // También intentar eliminar con delete por compatibilidad
    cookieStore.delete({
      name: 'auth_token',
      path: '/',
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Logout successful' 
    });
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}