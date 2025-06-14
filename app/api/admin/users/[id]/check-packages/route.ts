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

    console.log("🔍 check-packages API - userId:", userId)

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

    console.log("🔍 check-packages API - Usuario encontrado:", user)

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Debug: log del userId que estamos consultando
    console.log("🔍 DEBUG check-packages - Consultando usuario ID:", userId)

    // Obtener TODOS los paquetes del usuario primero para debug
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

    console.log("🔍 DEBUG - Todos los paquetes del usuario:", allUserPackages.map(pkg => ({
      id: pkg.id,
      packageName: pkg.package.name,
      classesRemaining: pkg.classesRemaining,
      isActive: pkg.isActive,
      expiryDate: pkg.expiryDate,
      paymentStatus: pkg.paymentStatus
    })))

    // Obtener paquetes activos del usuario con clases disponibles
    const activePackages = await prisma.userPackage.findMany({
      where: {
        userId: userId,
        isActive: true,
        classesRemaining: { gt: 0 },
        expiryDate: { gte: new Date() },
        paymentStatus: { in: ["paid", "completed"] } // Aceptar ambos estados de pago
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
      orderBy: { expiryDate: 'asc' }
    })

    console.log("🔍 DEBUG - Paquetes activos filtrados:", activePackages.map(pkg => ({
      id: pkg.id,
      packageName: pkg.package.name,
      classesRemaining: pkg.classesRemaining,
      paymentStatus: pkg.paymentStatus
    })))

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
        paymentStatus: pkg.paymentStatus
      })),
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
