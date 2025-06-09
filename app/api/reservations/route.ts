import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, Prisma } from "@prisma/client" // Import Prisma
import { verifyToken } from "@/lib/jwt"
import { sendBookingConfirmationEmail } from '@/lib/email'
import { format, addHours, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'

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
    let parsedBikeNumber = null
    if (bikeNumber !== undefined && bikeNumber !== null) {
      parsedBikeNumber = Number(bikeNumber)
      if (isNaN(parsedBikeNumber) || parsedBikeNumber < 1 || parsedBikeNumber > 10) {
        return NextResponse.json({ error: "El número de bicicleta debe estar entre 1 y 10" }, { status: 400 })
      }

      // Verificar si la bicicleta ya está reservada para esta clase
      const existingBikeReservation = await prisma.reservation.findFirst({
        where: {
          scheduledClassId: Number.parseInt(scheduledClassId),
          bikeNumber: parsedBikeNumber,
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
          bikeNumber: parsedBikeNumber,
          status: "confirmed",
          // Ajustar paymentMethod basado en paymentId o userPackage
          paymentMethod: paymentId ? "stripe" : (userPackage ? "package" : "pending"),
        },
        include: {
          scheduledClass: {
            include: {
              classType: true
            }
          }
        }
      })

      let newPayment = null; // Para almacenar el pago si se crea uno
      if (paymentId) {
        // Crear registro de Payment si se proporcionó paymentId (pago con Stripe)
        newPayment = await tx.payment.create({
          data: {
            userId,
            userPackageId: null, // No se usa paquete para esta transacción específica
            amount: new Prisma.Decimal(69.00), // Precio de clase individual
            currency: "mxn",
            paymentMethod: "stripe",
            stripePaymentIntentId: paymentId,
            status: "completed",
            paymentDate: new Date(),
            metadata: { "reservationId": reservation.id, "notes": "Single class purchase" },
          }
        });

        // No se descuenta de userAccountBalance ya que es un pago directo, no de paquete.
        // Opcionalmente, se podría registrar una "compra" de clase individual en userAccountBalance si se quisiera rastrear.

      } else if (userPackage) {
        // Si se usa un paquete, actualizar sus clases disponibles
        await tx.userPackage.update({
          where: { id: userPackage.id },
          data: {
            classesRemaining: { decrement: 1 },
            classesUsed: { increment: 1 },
          },
        })

        // Actualizar el balance del usuario (solo si se usa paquete)
        await tx.userAccountBalance.upsert({
          where: { userId },
          create: { // Esto podría necesitar ajuste si el usuario no tiene balance previo
            userId,
            classesAvailable: (userPackage.classesRemaining || 0) - 1, // Asumiendo que classesRemaining ya está actualizado o es el valor antes de la tx
            classesUsed: 1,
          },
          update: {
            classesAvailable: { decrement: 1 },
            classesUsed: { increment: 1 },
          },
        })
      }

      // Actualizar espacios disponibles en la clase (esto siempre sucede)
      await tx.scheduledClass.update({
        where: { id: Number.parseInt(scheduledClassId) },
        data: {
          availableSpots: { decrement: 1 },
        },
      })

      // Crear transacción de balance condicionalmente
      if (paymentId && newPayment) {
        // Transacción para compra de clase individual con Stripe
        await tx.balanceTransaction.create({
          data: {
            userId,
            type: "single_class_paid", // Changed from "purchase_single_class"
            amount: 0, // El valor monetario está en el registro Payment
            description: `Compra de clase individual: ${scheduledClass.classType.name} (Stripe)`,
            relatedReservationId: reservation.id,
            relatedPaymentId: newPayment.id,
          },
        });
      } else if (userPackage) {
        // Transacción para débito de clase de un paquete
        await tx.balanceTransaction.create({
          data: {
            userId,
            type: "debit",
            amount: 1, // Se debita 1 clase del paquete
            description: `Reserva de clase: ${scheduledClass.classType.name}`,
            relatedReservationId: reservation.id,
          },
        });
      }
      // Considerar un caso 'else' aquí si ni paymentId ni userPackage están presentes, aunque la lógica previa debería evitarlo.

      return reservation
    })

    // Obtener detalles completos de la reserva para el correo y la respuesta.
    // 'result' ya es la reserva con scheduledClass y classType incluidos desde la transacción.
    const reservationWithDetails = await prisma.reservation.findUnique({
      where: { id: result.id }, // result.id es el ID de la reserva creada
      include: {
        user: true, // Necesario para el email
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
        const classDate = new Date(reservationWithDetails.scheduledClass.date);
        const classTime = new Date(reservationWithDetails.scheduledClass.time);

        // Combinar fecha y hora UTC de la base de datos
        const scheduledDateTimeUTC = new Date(
          classDate.getUTCFullYear(),
          classDate.getUTCMonth(),
          classDate.getUTCDate(),
          classTime.getUTCHours(),
          classTime.getUTCMinutes(),
          0,
          0
        );

        const mexicoCityTimeZone = 'America/Mexico_City';

        const emailDetails = {
          className: reservationWithDetails.scheduledClass.classType.name,
          date: formatInTimeZone(scheduledDateTimeUTC, mexicoCityTimeZone, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
          time: formatInTimeZone(scheduledDateTimeUTC, mexicoCityTimeZone, "HH:mm", { locale: es }),
          instructor: `${reservationWithDetails.scheduledClass.instructor.user.firstName} ${reservationWithDetails.scheduledClass.instructor.user.lastName}`,
          confirmationCode: reservationWithDetails.id.toString().padStart(6, '0'),
          bikeNumber: reservationWithDetails.bikeNumber || undefined
        };

        // Enviar email de confirmación
        await sendBookingConfirmationEmail(
          reservationWithDetails.user.email,
          reservationWithDetails.user.firstName,
          emailDetails
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