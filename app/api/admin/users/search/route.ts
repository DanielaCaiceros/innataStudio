import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      )
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email || email.trim().length < 2) {
      return NextResponse.json([])
    }

    // Buscar usuarios que contengan el email especificado usando Prisma
    const users = await db.user.findMany({
      where: {
        email: {
          contains: email.trim(),
          mode: 'insensitive'
        }
      },
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true
      },
      orderBy: [
        { firstName: "asc" },
        { lastName: "asc" }
      ],
      take: 10 // Limitar resultados
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}