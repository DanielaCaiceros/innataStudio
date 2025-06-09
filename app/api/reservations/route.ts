import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { sendBookingConfirmationEmail } from '@/lib/email'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const prisma = new PrismaClient()

/**
 * Crea un Date object completo combinando fecha y hora de la clase
 * @param dateString - Fecha de la clase en formato ISO
 * @param timeString - Hora de la clase en formato ISO
 * @returns Date object con fecha y hora combinadas
 */
function createClassDateTime(dateString: string, timeString: string): Date {
  const classDate = new Date(dateString)
  const timeDate = new Date(timeString)
  
  return new Date(
    classDate.getUTCFullYear(),
    classDate.getUTCMonth(), 
    classDate.getUTCDate(),
    timeDate.getUTCHours(),
    timeDate.getUTCMinutes(),
    0,
    0
  )
}

/**
 * Verifica si una clase es reservable (no ha pasado y no está a punto de empezar)
 * @param dateString - Fecha de la clase
 * @param timeString - Hora de la clase
 * @returns boolean
 */
function isClassBookable(dateString: string, timeString: string): boolean {
  const now = new Date()
  const classDateTime = createClassDateTime(dateString, timeString)
  
  // Si la clase ya pasó
  if (classDateTime < now) {
    return false
  }
  
  // Si faltan menos de 30 minutos para la clase
  const THIRTY_MIN = 30 * 60 * 1000
  const timeDifference = classDateTime.getTime() - now.getTime()
  
  if (timeDifference < THIRTY_MIN) {
    return false
  }
  
  return true
}

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
    const { scheduledClassId, userPackageId, paymentId, bikeNumber } = body

    if (!scheduledClassId) {
      return NextResponse.json({ error: "ID de clase requerido" }, { status: 400 })
    }

    // Validar número de bicicleta
    if (bikeNumber) {
      if (bikeNumber < 1 || bikeNumber > 10) {
        return NextResponse.json({ error: "El número de bicicleta debe estar entre 1 y 10" }, { status: 400 })
      }

      // Verificar si la bicicleta ya está reservada para esta clase
      const existingBikeReservation = await prisma.reservation.findFirst({
        where: {
          scheduledClassId: Number.parseInt(scheduledClassId),
          bikeNumber,
          status: "confirmed"
        }
      })

      if (existingBikeReservation) {
        return NextResponse.json({ error: "Esta bicicleta ya está reservada para esta clase" }, { status: 400 })
      }
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

    // Validación usando las funciones de utilidad
    const classDateString = scheduledClass.date.toISOString()
    const classTimeString = scheduledClass.time.toISOString()
    
    if (!isClassBookable(classDateString, classTimeString)) {
      const classDateTime = createClassDateTime(classDateString, classTimeString)
      const now = new Date()
      
      if (classDateTime < now) {
        return NextResponse.json({ 
          error: "No puedes reservar una clase que ya pasó." 
        }, { status: 400 })
      } else {
        return NextResponse.json({ 
          error: "No puedes reservar una clase que está por iniciar en menos de 30 minutos." 
        }, { status: 400 })
      }
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
          bikeNumber: bikeNumber ? Number.parseInt(bikeNumber) : null,
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
    const reservationWithDetails = await prisma.reservation.findUnique({
      where: { id: result.id },
      include: {
        user: true,
        scheduledClass: {
          include: {
            classType: true,
            instructor: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })
    
    if (reservationWithDetails) {
      try {
        // Formatear los datos para el email
        const bookingDetails = {
          className: reservationWithDetails.scheduledClass.classType.name,
          date: format(reservationWithDetails.scheduledClass.date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
          time: format(reservationWithDetails.scheduledClass.time, "HH:mm"),
          instructor: `${reservationWithDetails.scheduledClass.instructor.user.firstName} ${reservationWithDetails.scheduledClass.instructor.user.lastName}`,
          confirmationCode: `RES-${result.id.toString().padStart(6, '0')}`
        }
    
        // Enviar email de confirmación
        await sendBookingConfirmationEmail(
          reservationWithDetails.user.email,
          reservationWithDetails.user.firstName,
          bookingDetails
        )
        
        console.log('Email de confirmación enviado exitosamente para reserva:', result.id)
      } catch (emailError) {
        console.error('Error enviando email de confirmación:', emailError)
        // No fallar la reserva si hay error en el email
      }
    }
    
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