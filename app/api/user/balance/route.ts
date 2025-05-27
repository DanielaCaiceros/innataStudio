import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// GET - Obtener balance del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    // Obtener o crear balance del usuario
    let userBalance = await prisma.userAccountBalance.findUnique({
      where: { userId },
    })

    if (!userBalance) {
      // Crear balance inicial si no existe
      userBalance = await prisma.userAccountBalance.create({
        data: {
          userId,
          totalClassesPurchased: 0,
          classesUsed: 0,
          classesAvailable: 0,
        },
      })
    }

    return NextResponse.json({
      totalClassesPurchased: userBalance.totalClassesPurchased || 0,
      classesUsed: userBalance.classesUsed || 0,
      classesAvailable: userBalance.classesAvailable || 0,
    })
  } catch (error) {
    console.error("Error fetching user balance:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
