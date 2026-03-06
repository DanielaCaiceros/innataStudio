import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Obtener todos los paquetes activos con precio específico por sucursal
export async function GET(
  request: NextRequest,
  { params }: { params: { branchId: string } }
) {
  try {
    const resolvedParams = await params;
    const branchId = parseInt(resolvedParams.branchId);

    if (isNaN(branchId)) {
      return NextResponse.json({ error: "ID de sucursal inválido" }, { status: 400 });
    }

    const packagePrices = await prisma.package_prices.findMany({
      where: {
        branch_id: branchId,
        is_active: true,
        packages: {
          isActive: true,
        },
      },
      include: {
        packages: {
          select: {
            id: true,
            name: true,
            description: true,
            classCount: true,
            validityDays: true,
            is_first_time_only: true,
          },
        },
        branches: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        package_id: "asc",
      },
    });

    if (packagePrices.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron paquetes para esta sucursal" },
        { status: 404 }
      );
    }

    // Formatear la respuesta para el frontend
    const packages = packagePrices.map((pp) => ({
      id: pp.packages.id,
      name: pp.packages.name,
      description: pp.packages.description,
      price: Number(pp.price),
      classCount: pp.packages.classCount,
      validityDays: pp.packages.validityDays,
      isFirstTimeOnly: pp.packages.is_first_time_only,
      branchId: pp.branches.id,
      branchName: pp.branches.name,
    }));

    return NextResponse.json(packages);
  } catch (error) {
    console.error("Error al obtener paquetes por sucursal:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
