import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyJWT } from "@/lib/jwt"
import { connectDB } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieStore = cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const decoded = verifyJWT(token)
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

    const db = await connectDB()

    // Buscar usuarios que contengan el email especificado
    const users = await db.execute(
      `SELECT user_id, firstName, lastName, email 
       FROM users 
       WHERE email LIKE ? 
       ORDER BY firstName, lastName
       LIMIT 10`,
      [`%${email.trim()}%`]
    )

    return NextResponse.json(users.rows)
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
