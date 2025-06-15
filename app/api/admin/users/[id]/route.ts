// app/api/admin/users/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// GET - Obtener detalles de un usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario no válido" }, { status: 400 });
    }

    // Obtener usuario con información completa
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        accountBalance: true,
        userPackages: {
          include: {
            package: true
          },
          orderBy: { purchaseDate: 'desc' }
        },
        reservations: {
          include: {
            scheduledClass: {
              include: {
                classType: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Últimas 10 reservaciones
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Formatear datos para el frontend
    const activePackages = user.userPackages.filter(pkg => 
      pkg.isActive && pkg.expiryDate >= new Date()
    );

    const formattedUser = {
      id: user.user_id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      joinDate: user.joinDate.toISOString().split('T')[0],
      lastVisitDate: user.lastVisitDate ? user.lastVisitDate.toISOString().split('T')[0] : null,
      status: user.status,
      role: user.role,
      balance: {
        totalClassesPurchased: user.accountBalance?.totalClassesPurchased || 0,
        classesUsed: user.accountBalance?.classesUsed || 0,
        classesAvailable: user.accountBalance?.classesAvailable || 0
      },
      activePackages: activePackages.map(pkg => ({
        id: pkg.id,
        name: pkg.package.name,
        classesRemaining: pkg.classesRemaining,
        expiryDate: pkg.expiryDate.toISOString().split('T')[0],
        paymentStatus: pkg.paymentStatus
      })),
      recentReservations: user.reservations.map(res => ({
        id: res.id,
        className: res.scheduledClass.classType.name,
        date: res.scheduledClass.date.toISOString().split('T')[0],
        status: res.status
      }))
    };

    return NextResponse.json(formattedUser);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT - Actualizar usuario
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario no válido" }, { status: 400 });
    }

    const body = await request.json();
    const { firstName, lastName, email, phone, status, password } = body;

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { user_id: userId }
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si el email ya existe (excluyendo el usuario actual)
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          user_id: { not: userId }
        }
      });

      if (emailExists) {
        return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 });
      }
    }

    // Preparar datos para actualizar
    const updateData: any = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    
    // Si se proporciona nueva contraseña, hashearla
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { user_id: userId },
      data: updateData
    });

    return NextResponse.json({
      id: updatedUser.user_id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      status: updatedUser.status
    });

  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE - Eliminar usuario (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario no válido" }, { status: 400 });
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      include: {
        reservations: {
          where: {
            status: "confirmed",
            scheduledClass: {
              date: { gte: new Date() }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si tiene reservaciones futuras
    if (user.reservations.length > 0) {
      return NextResponse.json({ 
        error: "No se puede eliminar un usuario con reservaciones futuras" 
      }, { status: 400 });
    }

    // Soft delete - cambiar status a inactive
    await prisma.user.update({
      where: { user_id: userId },
      data: { 
        status: "inactive",
        email: `deleted_${Date.now()}_${user.email}` // Para evitar conflictos de email único
      }
    });

    return NextResponse.json({ message: "Usuario eliminado correctamente" });

  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}