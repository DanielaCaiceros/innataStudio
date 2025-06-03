import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// POST - Crear nueva reserva
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    const body = await request.json()
    const { scheduledClassId, userPackageId, paymentId } = body

    if (!scheduledClassId) {
      return NextResponse.json({ error: "ID de clase requerido" }, { status: 400 })
    }

    // Verificar que la clase existe y está disponible
    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: Number.parseInt(scheduledClassId) },
      include: {
        classType: true,
      },
    })

    if (!scheduledClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    if (scheduledClass.status !== "scheduled") {
      return NextResponse.json({ error: "Esta clase no está disponible para reservas" }, { status: 400 })
    }

    // Validación: no permitir reservar si la clase ya pasó o está por iniciar muy pronto
    const now = new Date()
    // scheduledClass.date es la fecha (sin hora), scheduledClass.time es la hora (Date)
    // Unimos fecha y hora para comparar correctamente
    const classDate = scheduledClass.date
    const classTime = scheduledClass.time
    // Unir fecha y hora en un solo Date
    const classDateTime = new Date(
      classDate.getFullYear(),
      classDate.getMonth(),
      classDate.getDate(),
      classTime.getHours(),
      classTime.getMinutes(),
      0, 0
    )
    // Si la clase ya pasó
    if (classDateTime < now) {
      return NextResponse.json({ error: "No puedes reservar una clase que ya pasó." }, { status: 400 })
    }
    // Si faltan menos de 30 minutos para la clase
    const THIRTY_MIN = 30 * 60 * 1000
    if (classDateTime.getTime() - now.getTime() < THIRTY_MIN) {
      return NextResponse.json({ error: "No puedes reservar una clase que está por iniciar en menos de 30 minutos." }, { status: 400 })
    }

    // Verificar que el usuario no tenga ya una reserva para esta clase
    const existingReservation = await prisma.reservation.findUnique({
      where: {
        userId_scheduledClassId: {
          userId,
          scheduledClassId: Number.parseInt(scheduledClassId),
        },
      },
    })

    if (existingReservation) {
      return NextResponse.json({ error: "Ya tienes una reserva para esta clase" }, { status: 400 })
    }

    // Si se proporciona un ID de paquete, verificar que sea válido
    // Si no se proporciona pero tampoco hay paymentId, buscar automáticamente un paquete disponible
    let userPackage = null
    if (userPackageId) {
      userPackage = await prisma.userPackage.findFirst({
        where: {
          id: userPackageId,
          userId,
          isActive: true,
          classesRemaining: { gt: 0 },
          expiryDate: { gte: new Date() },
        },
      })

      if (!userPackage) {
        return NextResponse.json({ error: "Paquete no válido o sin clases disponibles" }, { status: 400 })
      }
    } else if (!paymentId) {
      // No se proporcionó paquete específico ni paymentId, buscar automáticamente un paquete disponible
      userPackage = await prisma.userPackage.findFirst({
        where: {
          userId,
          isActive: true,
          classesRemaining: { gt: 0 },
          expiryDate: { gte: new Date() },
        },
        orderBy: {
          expiryDate: 'asc' // Usar primero el que expire antes
        }
      })

      if (!userPackage) {
        return NextResponse.json({ 
          error: "No tienes clases disponibles en tus paquetes. Necesitas comprar un paquete o pagar por esta clase individual." 
        }, { status: 400 })
      }
    }

    // Verificar disponibilidad de espacios
    if (scheduledClass.availableSpots <= 0) {
      // Agregar a lista de espera
      const waitlistPosition = await prisma.waitlist.count({
        where: { scheduledClassId: Number.parseInt(scheduledClassId) },
      })

      const waitlistEntry = await prisma.waitlist.create({
        data: {
          userId,
          scheduledClassId: Number.parseInt(scheduledClassId),
          position: waitlistPosition + 1,
        },
      })

      return NextResponse.json(
        {
          message: "Clase llena. Te hemos agregado a la lista de espera.",
          waitlistPosition: waitlistEntry.position,
        },
        { status: 202 },
      )
    }

    // Crear la reserva en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear la reserva
      const reservation = await tx.reservation.create({
        data: {
          userId,
          scheduledClassId: Number.parseInt(scheduledClassId),
          userPackageId: userPackage?.id,
          status: "confirmed",
          paymentMethod: userPackage ? "package" : "pending",
        },
        include: {
          scheduledClass: {
            include: {
              classType: true
            }
          }
        }
      })

      // Si se usa un paquete, actualizar sus clases disponibles
      if (userPackage) {
        await tx.userPackage.update({
          where: { id: userPackage.id },
          data: {
            classesRemaining: { decrement: 1 },
            classesUsed: { increment: 1 },
          },
        })

        // Actualizar el balance del usuario
        await tx.userAccountBalance.upsert({
          where: { userId },
          create: {
            userId,
            classesAvailable: (userPackage.classesRemaining || 0) - 1,
            classesUsed: 1,
          },
          update: {
            classesAvailable: { decrement: 1 },
            classesUsed: { increment: 1 },
          },
        })
      }

      // Actualizar espacios disponibles en la clase
      await tx.scheduledClass.update({
        where: { id: Number.parseInt(scheduledClassId) },
        data: {
          availableSpots: { decrement: 1 },
        },
      })

      // Crear transacción de balance
      await tx.balanceTransaction.create({
        data: {
          userId,
          type: "debit",
          amount: 1,
          description: `Reserva de clase: ${scheduledClass.classType.name}`,
          relatedReservationId: reservation.id,
        },
      })

      return reservation
    })

    return NextResponse.json(
      {
        message: "Reserva creada exitosamente",
        reservation: {
          id: result.id,
          className: result.scheduledClass.classType.name,
          status: result.status,
          paymentMethod: result.paymentMethod,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating reservation:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
