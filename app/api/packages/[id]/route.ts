// app/api/packages/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Obtener un paquete específico por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params;
    const packageId = parseInt(resolvedParams.id);

    if (isNaN(packageId)) {
      return NextResponse.json({ error: "ID de paquete inválido" }, { status: 400 });
    }

    const packageData = await prisma.package.findUnique({
      where: {
        id: packageId,
        isActive: true
      }
    });

    if (!packageData) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }

    return NextResponse.json(packageData);
  } catch (error) {
    console.error("Error al obtener paquete:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
