import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, Prisma } from "@prisma/client" // Import Prisma
import { verifyToken } from "@/lib/jwt"
import { sendBookingConfirmationEmail } from '@/lib/email'
import { format, addHours, parseISO, startOfWeek } from 'date-fns'
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
  
  // Si faltan menos de 1 minuto  para la clase
  const ONE_MINUTE = 1 * 60 * 1000
  const timeDifference = classDateTime.getTime() - now.getTime()
  
  if (timeDifference < ONE_MINUTE) {
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

    // --- BEGIN NEW VALIDATION FOR UNLIMITED WEEK MULTIPLE BOOKINGS ---
    if (useUnlimitedWeek) { // Check specifically for unlimited week attempts
      const existingReservationForClass = await prisma.reservation.findFirst({
        where: {
          userId: userId,
          scheduledClassId: Number(scheduledClassId),
          status: "confirmed", // Consider other active statuses if necessary
        }
      });

      if (existingReservationForClass) {
        return NextResponse.json({ 
          error: "Ya tienes una reserva confirmada para esta clase. No se permiten múltiples reservas para la misma clase con el paquete Semana Ilimitada." 
        }, { status: 409 }); // 409 Conflict
      }
    }
    // --- END NEW VALIDATION FOR UNLIMITED WEEK MULTIPLE BOOKINGS ---

    // Validar número de bicicleta
    let parsedBikeNumber = null
    if (bikeNumber !== undefined && bikeNumber !== null) {
      parsedBikeNumber = Number(bikeNumber)
      if (isNaN(parsedBikeNumber) || parsedBikeNumber < 1 || parsedBikeNumber > 10) {
        return NextResponse.json({ error: "El número de bicicleta debe estar entre 1 y 10" }, { status: 400 })
      }

      // Verificar si la bicicleta ya está reservada para esta clase (parsedBikeNumber is a number here)
      const existingBikeReservation = await prisma.reservation.findFirst({
        where: {
          scheduledClassId: Number.parseInt(scheduledClassId),
          bikeNumber: parsedBikeNumber, // Check for the specific bike
          status: "confirmed"
        }
      })

      if (existingBikeReservation) {
        return NextResponse.json({ error: "Esta bicicleta ya está reservada para esta clase" }, { status: 400 })
      }
    } else {
      // bikeNumber was not provided, so parsedBikeNumber is null.
      // NEW CHECK: Verify if the "no-bike" slot (bikeNumber: null) is already taken for this class by ANY user.
      const existingNullBikeSlotReservation = await prisma.reservation.findFirst({
        where: {
          scheduledClassId: Number.parseInt(scheduledClassId),
          bikeNumber: null, 
          status: "confirmed"
        }
      });

      if (existingNullBikeSlotReservation) {
        // The check at lines 62-75 (if useUnlimitedWeek is true) is designed to prevent the *current user*
        // from booking the same class twice with an unlimited package.
        // The check at lines 148-153 (hasReservationWithoutBike) handles the *current user* trying to make
        // multiple non-unlimited bookings where one of them is a "no-bike" slot.
        // This new check here is to prevent a unique constraint violation if *another user* has the "no-bike" slot,
        // or if the current user is making a single non-unlimited "no-bike" booking and that slot is taken.
        return NextResponse.json({ error: "El puesto para reserva sin bicicleta específica ya está ocupado para esta clase." }, { status: 400 });
      }
    }

    // Check for multiple reservations by the CURRENT USER (this block was previously here and handles user's own conflicting reservations)
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
          error: "No puedes reservar una clase que está por iniciar en menos de 1 minuto."
        }, { status: 400 })
      }
    }

    // **NUEVA LÓGICA: Manejar reserva con Semana Ilimitada**
    if (useUnlimitedWeek) {
      // Validar elegibilidad para Semana Ilimitada (This is a re-validation)
      console.log(`[API_RESERVATIONS] Re-validating with UnlimitedWeekService for userId: ${userId}, classId: ${scheduledClassId}`);
      const validation = await UnlimitedWeekService.validateUnlimitedWeekReservation(
        userId, 
        Number.parseInt(scheduledClassId)
      );

      if (!validation.isValid || !validation.canUseUnlimitedWeek) {
        console.error(`[API_RESERVATIONS] Re-validation FAILED: ${validation.message}, Reason: ${validation.reason}`);
        return NextResponse.json({ 
          error: validation.message || 'No puedes usar Semana Ilimitada para esta reserva (re-validation failed)',
          reason: validation.reason,
          weeklyUsage: validation.weeklyUsage
        }, { status: 400 });
      }

      // Obtener el paquete Semana Ilimitada activo para la semana específica de la clase
      const classDateFromDb = new Date(scheduledClass.date); // e.g., 2025-07-01T00:00:00Z (date from DB is UTC midnight)
      
      // Normalize classDateFromDb to its UTC noon to ensure startOfWeek behaves correctly
      const classDateAtUtcNoon = new Date(Date.UTC(
        classDateFromDb.getUTCFullYear(),
        classDateFromDb.getUTCMonth(),
        classDateFromDb.getUTCDate(),
        12, 0, 0, 0 // Use noon UTC
      ));
      
      // Step 1: Get the start of the week. This might have a time component reflecting local midnight.
      let tempClassWeekStart = startOfWeek(classDateAtUtcNoon, { weekStartsOn: 1 }); 

      // Step 2: Normalize this to true UTC midnight for that day.
      const classWeekStartForQuery = new Date(Date.UTC(
          tempClassWeekStart.getUTCFullYear(),
          tempClassWeekStart.getUTCMonth(),
          tempClassWeekStart.getUTCDate(),
          0, 0, 0, 0
      ));

      const unlimitedWeekPackage = await prisma.userPackage.findFirst({
        where: {
          userId,
          packageId: 3, // ID del paquete Semana Ilimitada
          isActive: true,
          classesRemaining: { gt: 0 }, // Ensure package has classes
          // Ensure the class date falls within the package's purchase and expiry dates
          // Note: DB dates are DATE type, Prisma handles them as JS Date objects (usually UTC midnight)
          purchaseDate: { lte: classDateFromDb }, 
          expiryDate: { gte: classDateFromDb }    
        }
      });

      if (!unlimitedWeekPackage) {
        console.error(`[API_RESERVATIONS] CRITICAL FAIL: unlimitedWeekPackage not found for userId ${userId} covering classDate: ${classDateFromDb.toISOString()}`);
        return NextResponse.json({ 
          error: 'No se encontró un paquete Semana Ilimitada válido para esta clase (segunda verificación).' 
        }, { status: 400 });
      }

      // Verificar que el paquete sea para la semana correcta
      // unlimitedWeekPackage.purchaseDate is already the correct Monday UTC 00:00 from the DB
      const packageWeekStartFromDB = unlimitedWeekPackage.purchaseDate; 

      if (packageWeekStartFromDB.getTime() !== classWeekStartForQuery.getTime()) {
        console.error(`[API_RESERVATIONS] CRITICAL FAIL: Week start mismatch! Package starts ${packageWeekStartFromDB.toISOString()}, Class week starts ${classWeekStartForQuery.toISOString()}`);
        return NextResponse.json({ 
          error: 'Tu Semana Ilimitada no es válida para esta semana (verificación de inicio de semana falló). Solo puedes reservar en la semana específica que contrataste.' 
        }, { status: 400 });
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
    
    let userPackage = null;

    if (userPackageId) {
      // Si se proporciona un ID de paquete específico, usar ese.
      userPackage = await prisma.userPackage.findFirst({
        where: {
          id: userPackageId,
          userId,
          isActive: true,
          classesRemaining: { gt: 0 },
          expiryDate: { gte: new Date() }, // Ensure it's not expired generally
        },
        include: {
          package: true // Include package details to check its type
        }
      });

      if (!userPackage) {
        return NextResponse.json({ error: "Paquete especificado no válido, expirado o sin clases disponibles." }, { status: 400 });
      }

      // Si el paquete especificado es Semana Ilimitada, validar sus reglas específicas para esta clase
      if (userPackage.packageId === 3) { // 3 is the ID for Unlimited Week package
        const classDateForValidation = new Date(scheduledClass.date); // UTC Date from DB
        const classDay = classDateForValidation.getUTCDay(); // 0 (Sunday) - 6 (Saturday)

        // Check 1: Must be a weekday (Monday to Friday)
        if (classDay === 0 || classDay === 6) {
          return NextResponse.json({ error: "El paquete Semana Ilimitada especificado solo es válido de Lunes a Viernes." }, { status: 400 });
        }

        // Check 2: The class must fall within the specific week of the unlimited package
        // purchaseDate for unlimited packages is the Monday (UTC midnight) of their valid week.
        const packageWeekStart = userPackage.purchaseDate;
        const classWeekStart = startOfWeek(classDateForValidation, { weekStartsOn: 1 }); // Monday of class week

        // Normalize classWeekStart to UTC midnight for accurate comparison
        const normalizedClassWeekStart = new Date(Date.UTC(
          classWeekStart.getUTCFullYear(),
          classWeekStart.getUTCMonth(),
          classWeekStart.getUTCDate(),
          0, 0, 0, 0
        ));

        if (packageWeekStart.getTime() !== normalizedClassWeekStart.getTime()) {
          return NextResponse.json({ error: "La clase no cae dentro de la semana específica de tu paquete Semana Ilimitada." }, { status: 400 });
        }
      }
    } else if (!paymentId) {
      // No se proporcionó paquete específico ni paymentId, buscar automáticamente un paquete disponible.
      // Esta es la lógica que necesita la corrección principal.

      const availablePackages = await prisma.userPackage.findMany({
        where: {
          userId,
          isActive: true,
          classesRemaining: { gt: 0 },
          expiryDate: { gte: new Date() },
        },
        include: {
          package: true // Necesitamos package.id para la lógica de filtrado
        },
        orderBy: [
          { package: { id: 'asc' } }, // Prioritize non-unlimited packages if dates are same
          { expiryDate: 'asc' }
        ]
      });

      if (!availablePackages || availablePackages.length === 0) {
        return NextResponse.json({ 
          error: "No tienes clases disponibles en tus paquetes. Necesitas comprar un paquete o pagar por esta clase individual." 
        }, { status: 400 });
      }

      // Filtrar los paquetes:
      // - Paquetes normales son siempre elegibles si activos y con clases.
      // - Paquetes Semana Ilimitada (ID 3) solo son elegibles si la clase es L-V y es de LA semana del paquete.
      const classDateForFiltering = new Date(scheduledClass.date); // UTC date from DB
      const classDay = classDateForFiltering.getUTCDay(); // 0 (Sunday) - 6 (Saturday)
      const isClassOnWeekday = classDay >= 1 && classDay <= 5;

      const classWeekStartForFiltering = startOfWeek(classDateForFiltering, { weekStartsOn: 1 });
      const normalizedClassWeekStartForFiltering = new Date(Date.UTC(
        classWeekStartForFiltering.getUTCFullYear(),
        classWeekStartForFiltering.getUTCMonth(),
        classWeekStartForFiltering.getUTCDate(),
        0,0,0,0
      ));

      let chosenPackage = null;
      for (const pkg of availablePackages) {
        if (pkg.packageId === 3) { // Es un paquete de Semana Ilimitada
          if (isClassOnWeekday) {
            // purchaseDate for unlimited packages is the Monday UTC midnight of their valid week.
            const packageSpecificWeekStart = pkg.purchaseDate; 
            if (packageSpecificWeekStart.getTime() === normalizedClassWeekStartForFiltering.getTime()) {
              chosenPackage = pkg;
              break; // Encontramos un paquete de semana ilimitada válido
            }
          }
          // Si no es día hábil o no es la semana correcta, este paquete de semana ilimitada no es elegible.
        } else {
          // Es un paquete normal, es elegible.
          chosenPackage = pkg;
          break; // Encontramos un paquete normal elegible, lo preferimos o es el único.
        }
      }
      
      userPackage = chosenPackage;

      if (!userPackage) {
        return NextResponse.json({ 
          error: "No se encontró un paquete adecuado para esta clase. Los paquetes de Semana Ilimitada solo son válidos de Lunes a Viernes para la semana comprada." 
        }, { status: 400 });
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