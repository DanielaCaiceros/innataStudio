import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// GET - Obtener lista de clientes para selector
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
    
    // Construir la consulta con filtro opcional de búsqueda
    let whereClause: any = {
      // Solo mostrar clientes activos
      status: { in: ["active", "pending_verification"] },
      // Excluir administradores en la lista de clientes
      role: "client"
    };
    
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    
    // Obtener la lista de usuarios
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        // Incluir balance para mostrar clases disponibles
        accountBalance: {
          select: {
            classesAvailable: true
          }
        }
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" }
      ]
      // Removido el límite de 100 para mostrar todos los clientes
    });

    // Formatear los datos para el selector
    const formattedUsers = users.map(user => ({
      id: user.user_id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone || "",
      availableClasses: user.accountBalance?.classesAvailable || 0
    }));

    return NextResponse.json(formattedUsers);
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}
