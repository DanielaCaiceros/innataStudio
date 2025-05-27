import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// PUT - Actualizar clase programada
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { classTypeId, instructorId, date, time, maxCapacity, status } = body
    const classId = Number.parseInt(params.id)

    // Verificar que la clase existe
    const existingClass = await prisma.scheduledClass.findUnique({
      where: { id: classId },
    })

    if (!existingClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    // Si se cambia fecha/hora, verificar que no haya solapamiento
    if (date && time) {
      const conflictingClass = await prisma.scheduledClass.findFirst({
        where: {
          id: { not: classId },
          date: new Date(date),
          time: new Date(`1970-01-01T${time}:00.000Z`),
        },
      })

      if (conflictingClass) {
        return NextResponse.json({ error: "Ya existe una clase programada en este horario" }, { status: 400 })
      }
    }

    // Actualizar la clase
    const updatedClass = await prisma.scheduledClass.update({
      where: { id: classId },
      data: {
        ...(classTypeId && { classTypeId: Number.parseInt(classTypeId) }),
        ...(instructorId && { instructorId: Number.parseInt(instructorId) }),
        ...(date && { date: new Date(date) }),
        ...(time && { time: new Date(`1970-01-01T${time}:00.000Z`) }),
        ...(maxCapacity && {
          maxCapacity: Number.parseInt(maxCapacity),
          availableSpots: Number.parseInt(maxCapacity) - (existingClass.maxCapacity - existingClass.availableSpots),
        }),
        ...(status && { status }),
      },
      include: {
        classType: true,
        instructor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedClass)
  } catch (error) {
    console.error("Error updating scheduled class:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE - Eliminar clase programada
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const classId = Number.parseInt(params.id)

    // Verificar que la clase existe
    const existingClass = await prisma.scheduledClass.findUnique({
      where: { id: classId },
      include: {
        reservations: true,
      },
    })

    if (!existingClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    // Verificar si hay reservas confirmadas
    const confirmedReservations = existingClass.reservations.filter((r) => r.status === "confirmed")

    if (confirmedReservations.length > 0) {
      return NextResponse.json({ error: "No se puede eliminar una clase con reservas confirmadas" }, { status: 400 })
    }

    // Eliminar la clase (las reservas y waitlist se eliminan en cascada)
    await prisma.scheduledClass.delete({
      where: { id: classId },
    })

    return NextResponse.json({ message: "Clase eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting scheduled class:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
