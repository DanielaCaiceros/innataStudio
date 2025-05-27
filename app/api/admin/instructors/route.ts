import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

// GET - Obtener todos los instructores
export async function GET(request: NextRequest) {
  try {
    const instructors = await db.instructor.findMany({
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

// POST - Crear nuevo instructor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, bio, specialties, isFeatured } = body

    // Validar campos requeridos
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Nombre, apellido y email son requeridos" }, { status: 400 })
    }

    // Verificar si el email ya existe
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 })
    }

    // Crear usuario e instructor en una transacción
    const result = await db.$transaction(async (prisma) => {
      // Crear usuario
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: await bcrypt.hash("instructor123", 10), // Password temporal
          role: "instructor",
          status: "active",
          emailVerified: true,
        },
      })

      // Crear perfil de instructor
      const instructor = await prisma.instructor.create({
        data: {
          userId: user.user_id,
          bio: bio || null,
          specialties: specialties || [],
          isFeatured: isFeatured || false,
        },
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
      })

      return instructor
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating instructor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
