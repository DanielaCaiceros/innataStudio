// app/api/admin/users/[id]/check-packages/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Verificar si el usuario tiene clases disponibles en sus paquetes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación del admin
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get("branchId")
    let branchIdInt: number | null = null
    if (branchId !== null) {
      const parsed = parseInt(branchId, 10)
      if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== branchId.trim()) {
        return NextResponse.json({ error: "branchId debe ser un entero positivo" }, { status: 400 })
      }
      branchIdInt = parsed
    }

    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Obtener TODOS los paquetes del usuario
    const allUserPackages = await prisma.userPackage.findMany({
      where: {
        userId: userId
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            classCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Obtener paquetes activos del usuario con clases disponibles
    // Si se pasa branchId, incluir paquetes de esa sucursal Y paquetes globales (branch_id = null)
    const activePackages = await prisma.userPackage.findMany({
      where: {
        userId: userId,
        isActive: true,
        classesRemaining: { gt: 0 },
        expiryDate: { gte: new Date() },
        paymentStatus: { in: ["paid", "completed"] },
        ...(branchIdInt !== null ? {
          OR: [
            { branch_id: branchIdInt },
            { branch_id: null },
          ]
        } : {}),
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            classCount: true
          }
        },
        branches: {
          select: { id: true, name: true }
        },
      },
      orderBy: { expiryDate: 'asc' }
    })

    // Calcular total de clases disponibles
const totalAvailableClasses = activePackages.reduce((total, pkg) => total + (pkg.classesRemaining ?? 0), 0)

    const response = {
      user: {
        id: user.user_id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      },
      hasAvailableClasses: totalAvailableClasses > 0,
      totalAvailableClasses,
      activePackages: activePackages.map(pkg => ({
        id: pkg.id,
        name: pkg.package.name,
        classesRemaining: pkg.classesRemaining,
        expiryDate: pkg.expiryDate.toISOString().split('T')[0],
        paymentStatus: pkg.paymentStatus,
        branchId: pkg.branch_id ?? null,
        branchName: pkg.branches?.name ?? null,
      })),
      filteredByBranch: branchIdInt !== null,
      needsPackage: totalAvailableClasses === 0
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Error checking user packages:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
