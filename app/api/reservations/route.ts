import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, Prisma } from "@prisma/client" // Import Prisma
import { verifyToken } from "@/lib/jwt"
import { sendBookingConfirmationEmail } from '@/lib/email'
import { format, addHours, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { UnlimitedWeekService } from '@/lib/services/unlimited-week.service'
import { SystemConfigService } from '@/lib/services/system-config.service'

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
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number(payload.userId)

    const body = await request.json()
    const { 
      scheduledClassId, 
      userPackageId, 
      paymentId, 
      bikeNumber,
      useUnlimitedWeek = false // Nuevo parámetro
    } = body

    if (!scheduledClassId) {
      return NextResponse.json({ error: "scheduledClassId es requerido" }, { status: 400 })
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

    // Verificar reservas existentes para esta clase
    const existingReservations = await prisma.reservation.findMany({
      where: {
        userId,
        scheduledClassId: Number.parseInt(scheduledClassId),
        status: "confirmed"
      },
      include: {
        userPackage: {
          include: {
            package: true
          }
        }
      }
    })

    // Si ya tiene reservas, verificar si puede hacer múltiples reservas
    if (existingReservations.length > 0) {
      // Obtener información del paquete actual para esta nueva reserva
      let currentPackage = null;
      if (userPackageId) {
        currentPackage = await prisma.userPackage.findFirst({
          where: {
            id: userPackageId,
            userId,
            isActive: true,
            classesRemaining: { gt: 0 },
            expiryDate: { gte: new Date() },
          },
          include: {
            package: true
          }
        })
      } else if (!paymentId) {
        // Buscar automáticamente un paquete disponible
        currentPackage = await prisma.userPackage.findFirst({
          where: {
            userId,
            isActive: true,
            classesRemaining: { gt: 0 },
            expiryDate: { gte: new Date() },
          },
          include: {
            package: true
          },
          orderBy: {
            expiryDate: 'asc'
          }
        })
      }

      // Verificar si es paquete "semana ilimitada" (ID 3)
      const isUnlimitedWeekPackage = (packageToCheck: any) => {
        return packageToCheck?.package?.id === 3 || packageToCheck?.package?.name?.toLowerCase().includes('semana ilimitada')
      }

      // Verificar si cualquier reserva existente usa paquete semana ilimitada
      const existingHasUnlimited = existingReservations.some(r => isUnlimitedWeekPackage(r.userPackage))
      const currentIsUnlimited = isUnlimitedWeekPackage(currentPackage)

      // Si cualquiera de las dos reservas es con paquete "semana ilimitada", no permitir múltiples reservas
      if (existingHasUnlimited || currentIsUnlimited) {
        return NextResponse.json({ 
          error: "No puedes hacer múltiples reservas para la misma clase con el paquete de semana ilimitada" 
        }, { status: 400 })
      }

      // **VALIDACIONES PARA BICICLETAS**
      if (parsedBikeNumber) {
        // Si especifica un número de bicicleta, verificar que no esté ya reservada por este usuario
        const bikeAlreadyReserved = existingReservations.some(r => r.bikeNumber === parsedBikeNumber)
        if (bikeAlreadyReserved) {
          return NextResponse.json({ 
            error: "Ya tienes una reserva en esta bicicleta para esta clase. Elige una bicicleta diferente." 
          }, { status: 400 })
        }
      } else {
        // Si NO especifica número de bicicleta, verificar si ya tiene una reserva sin bicicleta
        const hasReservationWithoutBike = existingReservations.some(r => !r.bikeNumber)
        if (hasReservationWithoutBike) {
          return NextResponse.json({ 
            error: "Ya tienes una reserva sin bicicleta específica para esta clase. Para hacer múltiples reservas, debes seleccionar números de bicicleta específicos." 
          }, { status: 400 })
        }
        
        // Si ya tiene otras reservas con bicicletas específicas, requerir bicicleta para esta nueva reserva
        const hasReservationsWithBikes = existingReservations.some(r => r.bikeNumber)
        if (hasReservationsWithBikes) {
          return NextResponse.json({ 
            error: "Ya tienes reservas con bicicletas específicas para esta clase. Para hacer otra reserva, debes seleccionar un número de bicicleta específico." 
          }, { status: 400 })
        }
      }
    }

    // Obtener información de la clase
    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: Number.parseInt(scheduledClassId) },
      include: {
        classType: true,
        instructor: {
          include: {
            user: true
          }
        }
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

    // **NUEVA LÓGICA: Manejar reserva con Semana Ilimitada**
    if (useUnlimitedWeek) {
      // Validar elegibilidad para Semana Ilimitada
      const validation = await UnlimitedWeekService.validateUnlimitedWeekReservation(
        userId, 
        Number.parseInt(scheduledClassId)
      )

      if (!validation.isValid || !validation.canUseUnlimitedWeek) {
        return NextResponse.json({ 
          error: validation.message || 'No puedes usar Semana Ilimitada para esta reserva',
          reason: validation.reason,
          weeklyUsage: validation.weeklyUsage
        }, { status: 400 })
      }

      // Obtener el paquete Semana Ilimitada activo
      const unlimitedWeekPackage = await prisma.userPackage.findFirst({
        where: {
          userId,
          packageId: 3, // ID del paquete Semana Ilimitada
          isActive: true,
          classesRemaining: { gt: 0 },
          expiryDate: { gte: new Date() }
        }
      })

      if (!unlimitedWeekPackage) {
        return NextResponse.json({ 
          error: 'No se encontró un paquete Semana Ilimitada válido' 
        }, { status: 400 })
      }

      // Verificar disponibilidad de espacios (aplicable para todos los tipos de reserva)
      if (scheduledClass.availableSpots <= 0) {
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
          { status: 202 }
        )
      }

      // Procesar reserva con Semana Ilimitada
      const result = await prisma.$transaction(async (tx) => {
        // Crear la reserva como CONFIRMADA por defecto
        const reservation = await tx.reservation.create({
          data: {
            userId,
            scheduledClassId: Number.parseInt(scheduledClassId),
            userPackageId: unlimitedWeekPackage.id,
            status: "confirmed", // Estado confirmado por defecto
            paymentMethod: "package",
            bikeNumber: parsedBikeNumber,
          },
          include: {
            scheduledClass: {
              include: {
                classType: true,
              },
            },
          },
        })

        // Descontar 1 clase del paquete
        await tx.userPackage.update({
          where: { id: unlimitedWeekPackage.id },
          data: {
            classesRemaining: { decrement: 1 },
            classesUsed: { increment: 1 },
          },
        })

        // Actualizar balance del usuario
        await tx.userAccountBalance.upsert({
          where: { userId },
          update: {
            classesAvailable: { decrement: 1 },
            classesUsed: { increment: 1 },
          },
          create: {
            userId,
            classesAvailable: (unlimitedWeekPackage.classesRemaining || 0) - 1,
            classesUsed: 1,
          },
        })

        // Reducir capacidad disponible
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
            description: `Reserva Semana Ilimitada: ${scheduledClass.classType.name}`,
            relatedReservationId: reservation.id,
          },
        })

        return reservation
      })

      // Enviar email de confirmación con mensaje especial para Semana Ilimitada
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
          const classDate = new Date(reservationWithDetails.scheduledClass.date)
          const classTime = new Date(reservationWithDetails.scheduledClass.time)
          const scheduledDateTimeUTC = new Date(
            classDate.getUTCFullYear(),
            classDate.getUTCMonth(),
            classDate.getUTCDate(),
            classTime.getUTCHours(),
            classTime.getUTCMinutes(),
            0,
            0
          )

          const mexicoCityTimeZone = 'America/Mexico_City'
          const graceTimeHours = await SystemConfigService.getGraceTimeHours()

          const emailDetails = {
            className: reservationWithDetails.scheduledClass.classType.name,
            date: formatInTimeZone(scheduledDateTimeUTC, mexicoCityTimeZone, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es }),
            time: formatInTimeZone(scheduledDateTimeUTC, mexicoCityTimeZone, "HH:mm", { locale: es }),
            instructor: `${reservationWithDetails.scheduledClass.instructor.user.firstName} ${reservationWithDetails.scheduledClass.instructor.user.lastName}`,
            confirmationCode: reservationWithDetails.id.toString().padStart(6, '0'),
            bikeNumber: reservationWithDetails.bikeNumber || undefined,
            isUnlimitedWeek: true,
            graceTimeHours
          }

          // Aquí necesitarías modificar tu función de email para incluir el mensaje de WhatsApp
          await sendBookingConfirmationEmail(
            reservationWithDetails.user.email,
            reservationWithDetails.user.firstName,
            emailDetails
          )
        } catch (emailError) {
          console.error('Error enviando email de confirmación:', emailError)
        }
      }

      return NextResponse.json({
        message: `Reserva creada exitosamente con Semana Ilimitada. ${validation.message}`,
        reservation: {
          id: result.id,
          className: result.scheduledClass.classType.name,
          status: result.status,
          paymentMethod: result.paymentMethod,
          isUnlimitedWeek: true,
          graceTimeRequired: true
        },
        weeklyUsage: validation.weeklyUsage
      }, { status: 201 })
    }

    // **LÓGICA MODIFICADA para reservas normales con múltiples reservas permitidas**
    
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