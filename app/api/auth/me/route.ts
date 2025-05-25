// app/api/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/jwt';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de la cookie
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    // Verificar el token
    const payload = await verifyToken(token);
    
    // Obtener los datos del usuario
    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(payload.userId) },
      select: {
        user_id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        profileImage: true,
        status: true,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Usuario no activo' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      userId: user.user_id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImage: user.profileImage,
    });
  } catch (error: any) {
    console.error('Error verificando usuario:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 401 }
    );
  }
}