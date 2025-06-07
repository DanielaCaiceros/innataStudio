import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// POST - Cancelar una reservación
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    const reservationId = parseInt(params.id)
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 })
    }

    // Verificar que la reservación existe y pertenece al usuario
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        scheduledClass: true,
        userPackage: true
      }
    })

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 })
    }

    if (reservation.userId !== userId) {
      return NextResponse.json({ error: "No tienes permiso para cancelar esta reservación" }, { status: 403 })
    }

    // Verificar que la reservación no esté ya cancelada
    if (reservation.status === "cancelled") {
      return NextResponse.json({ error: "Esta reservación ya está cancelada" }, { status: 400 })
    }

    // Verificar la política de cancelación (24 horas antes de la clase)
    const classDateTime = new Date(
      `${reservation.scheduledClass.date.toISOString().split('T')[0]}T${reservation.scheduledClass.time.toTimeString().slice(0, 8)}`
    )
    const now = new Date()
    const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Determinar si se puede reembolsar la clase
    const canRefund = hoursUntilClass >= 24

    // Obtener datos de la solicitud
    const body = await request.json()
    const { reason = "Cancelado por el usuario" } = body

    // Actualizar la reservación
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: "cancelled",
        cancellationReason: reason,
        cancelledAt: new Date(),
        canRefund
      }
    })

    // Incrementar los espacios disponibles en la clase
    await prisma.scheduledClass.update({
      where: { id: reservation.scheduledClassId },
      data: {
        availableSpots: { increment: 1 }
      }
    })

    // Si se puede reembolsar y viene de un paquete, devolver la clase al paquete
    if (canRefund && reservation.userPackageId) {
      await prisma.userPackage.update({
        where: { id: reservation.userPackageId },
        data: {
          classesRemaining: { increment: 1 },
          classesUsed: { decrement: 1 }
        }
      })

      // Actualizar balance general del usuario
      await prisma.userAccountBalance.update({
        where: { userId },
        data: {
          classesAvailable: { increment: 1 },
          classesUsed: { decrement: 1 }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Reservación cancelada correctamente",
      refunded: canRefund
    })
  } catch (error) {
    console.error("Error al cancelar reservación:", error)
    return NextResponse.json({ error: "Error al cancelar la reservación" }, { status: 500 })
  }
}
