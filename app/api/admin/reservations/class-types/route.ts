import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// GET - Obtener lista de tipos de clases para selector
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
    
    // Obtener todos los tipos de clase
    const classTypes = await prisma.classType.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        intensity: true,
        category: true,
        capacity: true
      },
      orderBy: {
        name: "asc"
      }
    });

    return NextResponse.json(classTypes);
  } catch (error) {
    console.error("Error al obtener tipos de clases:", error);
    return NextResponse.json({ error: "Error al obtener tipos de clases" }, { status: 500 });
  }
}
