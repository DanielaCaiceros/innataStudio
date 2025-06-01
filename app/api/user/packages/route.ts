import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// GET - Obtener paquetes activos del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    // Obtener paquetes activos del usuario
    const userPackages = await prisma.userPackage.findMany({
      where: { 
        userId,
        isActive: true,
        classesRemaining: { gt: 0 },
        expiryDate: { gte: new Date() }
      },
      include: {
        package: true
      },
      orderBy: { expiryDate: 'asc' }
    })

    // Formatear los datos para la respuesta
    const formattedPackages = userPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.package.name,
      classesRemaining: pkg.classesRemaining,
      classesUsed: pkg.classesUsed,
      expiryDate: pkg.expiryDate.toISOString().split('T')[0],
      isActive: pkg.isActive
    }))

    return NextResponse.json(formattedPackages)
  } catch (error) {
    console.error("Error fetching user packages:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
