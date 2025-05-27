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
    const { classTypeId, instructorId, date, time, maxCapacity } = body
    const scheduleId = Number.parseInt(params.id)

    // Verificar que la clase existe
    const existingClass = await prisma.scheduledClass.findUnique({
      where: { id: scheduleId },
      include: { reservations: true },
    })

    if (!existingClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    // Si se reduce la capacidad, verificar que no haya más reservas que la nueva capacidad
    const confirmedReservations = existingClass.reservations.filter((r) => r.status === "confirmed").length
    if (Number.parseInt(maxCapacity) < confirmedReservations) {
      return NextResponse.json(
        {
          error: `No se puede reducir la capacidad a ${maxCapacity}. Hay ${confirmedReservations} reservas confirmadas.`,
        },
        { status: 400 },
      )
    }

    // Actualizar la clase
    const updatedClass = await prisma.scheduledClass.update({
      where: { id: scheduleId },
      data: {
        classTypeId: Number.parseInt(classTypeId),
        instructorId: Number.parseInt(instructorId),
        date: new Date(date),
        time: new Date(`1970-01-01T${time}:00.000Z`),
        maxCapacity: Number.parseInt(maxCapacity),
        availableSpots: Number.parseInt(maxCapacity) - confirmedReservations,
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
        reservations: {
          where: {
            status: "confirmed",
          },
        },
        waitlist: true,
      },
    })

    return NextResponse.json(updatedClass)
  } catch (error) {
    console.error("Error updating scheduled class:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
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

    const scheduleId = Number.parseInt(params.id)

    // Verificar que la clase existe
    const existingClass = await prisma.scheduledClass.findUnique({
      where: { id: scheduleId },
      include: { reservations: true, waitlist: true },
    })

    if (!existingClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    // Verificar si hay reservas confirmadas
    const confirmedReservations = existingClass.reservations.filter((r) => r.status === "confirmed")
    if (confirmedReservations.length > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar la clase. Hay ${confirmedReservations.length} reservas confirmadas.`,
        },
        { status: 400 },
      )
    }

    // Eliminar la clase (esto también eliminará reservas y waitlist por CASCADE)
    await prisma.scheduledClass.delete({
      where: { id: scheduleId },
    })

    return NextResponse.json({ message: "Clase eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting scheduled class:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
