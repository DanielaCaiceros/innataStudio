import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Obtener todos los instructores
export async function GET(request: NextRequest) {
  try {
    const instructors = await prisma.instructor.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            profileImage: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: "asc",
        },
      },
    })

    return NextResponse.json(instructors)
  } catch (error) {
    console.error("Error fetching instructors:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
