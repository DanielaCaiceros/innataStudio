import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// GET - Obtener todos los tipos de clase
export async function GET(request: NextRequest) {
  try {
    const classTypes = await prisma.classType.findMany({
      orderBy: { duration: "asc" },
    })

    return NextResponse.json(classTypes)
  } catch (error) {
    console.error("Error fetching class types:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Crear nuevo tipo de clase
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol de admin
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(payload.userId) },
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, duration, intensity, category, capacity } = body

    const classType = await prisma.classType.create({
      data: {
        name,
        description,
        duration: Number.parseInt(duration),
        intensity,
        category,
        capacity: capacity || 10,
      },
    })

    return NextResponse.json(classType, { status: 201 })
  } catch (error) {
    console.error("Error creating class type:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
