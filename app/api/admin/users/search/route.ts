// app/api/admin/users/search/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
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

    // Obtener el parámetro de búsqueda
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: "Parámetro email requerido" }, { status: 400 })
    }

    // Buscar usuarios por email (búsqueda parcial)
    const users = await db.user.findMany({
      where: {
        email: {
          contains: email,
          mode: 'insensitive'
        }
      },
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true
      },
      orderBy: {
        firstName: 'asc'
      },
      take: 10 // Limitar resultados para mejor performance
    })

    return NextResponse.json(users)

  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}