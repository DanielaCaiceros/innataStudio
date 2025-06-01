// app/api/packages/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Obtener todos los paquetes disponibles
export async function GET(request: NextRequest) {
  try {
    const packages = await prisma.package.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        price: 'asc'
      }
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error("Error al obtener paquetes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}