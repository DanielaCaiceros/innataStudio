import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// PUT - Actualizar instructor
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const instructorId = Number.parseInt(params.id)
    const body = await request.json()
    const { firstName, lastName, email, bio, specialties, isFeatured } = body

    // Validar campos requeridos
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Nombre, apellido y email son requeridos" }, { status: 400 })
    }

    // Verificar que el instructor existe
    const existingInstructor = await db.instructor.findUnique({
      where: { id: instructorId },
      include: { user: true },
    })

    if (!existingInstructor) {
      return NextResponse.json({ error: "Instructor no encontrado" }, { status: 404 })
    }

    // Verificar si el email ya existe (excluyendo el usuario actual)
    const existingUser = await db.user.findFirst({
      where: {
        email,
        user_id: { not: existingInstructor.userId },
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Ya existe un usuario con este email" }, { status: 400 })
    }

    // Actualizar usuario e instructor en una transacción
    const result = await db.$transaction(async (prisma) => {
      // Actualizar usuario
      await prisma.user.update({
        where: { user_id: existingInstructor.userId },
        data: {
          firstName,
          lastName,
          email,
        },
      })

      // Actualizar instructor
      const instructor = await prisma.instructor.update({
        where: { id: instructorId },
        data: {
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

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating instructor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE - Eliminar instructor
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const instructorId = Number.parseInt(params.id)

    // Verificar que el instructor existe
    const existingInstructor = await db.instructor.findUnique({
      where: { id: instructorId },
      include: {
        scheduledClasses: true,
      },
    })

    if (!existingInstructor) {
      return NextResponse.json({ error: "Instructor no encontrado" }, { status: 404 })
    }

    // Verificar si tiene clases programadas
    if (existingInstructor.scheduledClasses.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el instructor porque tiene clases programadas" },
        { status: 400 },
      )
    }

    // Eliminar instructor y usuario en una transacción
    await db.$transaction(async (prisma) => {
      // Eliminar instructor
      await prisma.instructor.delete({
        where: { id: instructorId },
      })

      // Eliminar usuario
      await prisma.user.delete({
        where: { user_id: existingInstructor.userId },
      })
    })

    return NextResponse.json({ message: "Instructor eliminado correctamente" })
  } catch (error) {
    console.error("Error deleting instructor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
