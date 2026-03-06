// app/api/packages/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Obtener todos los paquetes disponibles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    let branchIdInt: number | null = null;
    if (branchId !== null) {
      const parsed = parseInt(branchId, 10);
      if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== branchId.trim()) {
        return NextResponse.json({ error: "branchId debe ser un entero positivo" }, { status: 400 });
      }
      branchIdInt = parsed;
    }

    const packages = await prisma.package.findMany({
      where: {
        isActive: true,
      },
      include: {
        package_prices: branchIdInt !== null
          ? {
              where: {
                branch_id: branchIdInt,
                is_active: true,
              },
            }
          : false,
      },
      orderBy: {
        price: "asc",
      },
    });

    const result = packages.map((pkg) => {
      const branchPrice =
        branchIdInt !== null && pkg.package_prices && pkg.package_prices.length > 0
          ? pkg.package_prices[0]
          : null;

      return {
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        price: branchPrice ? branchPrice.price : pkg.price,
        classCount: pkg.classCount,
        validityDays: pkg.validityDays,
        isActive: pkg.isActive,
        stripePriceId: branchPrice?.stripe_price_id ?? pkg.stripePriceId,
        is_first_time_only: pkg.is_first_time_only,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error al obtener paquetes:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
