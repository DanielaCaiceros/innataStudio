// app/api/admin/users/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// GET - Obtener todos los usuarios (admin)
export async function GET(request: NextRequest) {
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

    // Parámetros de búsqueda opcionales
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    
    // Construir filtro
    let whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    
    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Obtener usuarios con información de balance
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        joinDate: true,
        lastVisitDate: true,
        status: true,
        role: true,
        accountBalance: {
          select: {
            classesAvailable: true,
            totalClassesPurchased: true,
            classesUsed: true
          }
        },
        userPackages: {
          where: {
            isActive: true,
            expiryDate: { gte: new Date() }
          },
          include: {
            package: {
              select: {
                name: true
              }
            }
          },
          orderBy: { expiryDate: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" }
      ]
    });

    // Formatear datos para el frontend
    const formattedUsers = users.map(user => {
      const activePackage = user.userPackages[0];
      
      return {
        id: user.user_id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || "",
        package: activePackage ? activePackage.package.name : "Sin paquete activo",
        remainingClasses: user.accountBalance?.classesAvailable || 0,
        joinDate: user.joinDate.toISOString().split('T')[0],
        lastVisit: user.lastVisitDate ? user.lastVisitDate.toISOString().split('T')[0] : "Nunca",
        status: user.status
      };
    });

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST - Crear nuevo usuario (admin)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, email, phone, package: packageType, password, notes } = body;

    // Validar datos requeridos
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
    }

    // Separar nombre y apellido
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          passwordHash: hashedPassword,
          status: "active",
          role: "client",
          emailVerified: true
        }
      });

      // Crear balance inicial
      await tx.userAccountBalance.create({
        data: {
          userId: newUser.user_id,
          totalClassesPurchased: 0,
          classesUsed: 0,
          classesAvailable: 0
        }
      });

      // Si se especifica un paquete, crear el paquete de usuario
      if (packageType && packageType !== "individual") {
        // Mapear tipos de paquete a IDs (ajusta según tu DB)
        const packageMap: Record<string, number> = {
          "5classes": 1,
          "10classes": 2,
          "monthly": 3
        };

        const packageId = packageMap[packageType];
        if (packageId) {
          const packageInfo = await tx.package.findUnique({
            where: { id: packageId }
          });

          if (packageInfo) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + packageInfo.validityDays);

            await tx.userPackage.create({
              data: {
                userId: newUser.user_id,
                packageId: packageId,
                expiryDate: expiryDate,
                classesRemaining: packageInfo.classCount || 0,
                classesUsed: 0,
                paymentStatus: "paid",
                paymentMethod: "admin"
              }
            });

            // Actualizar balance
            await tx.userAccountBalance.update({
              where: { userId: newUser.user_id },
              data: {
                totalClassesPurchased: packageInfo.classCount || 0,
                classesAvailable: packageInfo.classCount || 0
              }
            });
          }
        }
      }

      return newUser;
    });

    return NextResponse.json({
      id: result.user_id,
      name: `${result.firstName} ${result.lastName}`,
      email: result.email,
      phone: result.phone || "",
      status: result.status
    }, { status: 201 });

  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}