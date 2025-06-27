// app/api/admin/reservations/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { addHours, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { 
  formatAdminDate, 
  formatAdminTime, 
  parseAdminDateInput, 
  parseAdminTimeInput 
} from '@/lib/utils/admin-date';
import { 
  getUnlimitedWeekExpiryDate, 
  validateUnlimitedWeekUsage,
  calculateDailyUsage,
  isWithinUnlimitedWeekSchedule 
} from '@/lib/utils/unlimited-week';



const prisma = new PrismaClient();

// GET - Obtener todas las reservaciones (admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }
    
    // Parámetros de búsqueda/filtrado opcionales
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const userId = searchParams.get("userId");
    
    // Construir el filtro
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (date) {
      // Crear el rango de fecha completo para el día seleccionado
      const targetDate = new Date(date + "T00:00:00.000Z");
      const nextDay = new Date(targetDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      
      filter.scheduledClass = {
        date: {
          gte: targetDate,
          lt: nextDay
        }
      };
    }
    
    if (userId) {
      filter.userId = parseInt(userId);
    }

    // Obtener las reservaciones con información relacionada
    const reservations = await prisma.reservation.findMany({
      where: filter,
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        scheduledClass: {
          include: {
            classType: true,
            instructor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      },
      orderBy: [
        {
          scheduledClass: {
            date: "desc"
          }
        },
        {
          scheduledClass: {
            time: "asc"
          }
        }
      ]
    });

    // Formatear los datos para la respuesta con manejo correcto de fechas
    const formattedReservations = reservations.map((res) => {
      // Usar las utilidades de admin para formatear correctamente
      const formattedDate = formatAdminDate(res.scheduledClass.date);
      const formattedTime = formatAdminTime(res.scheduledClass.time);
      
      // Calcular clases restantes en el paquete
      const remainingClasses = res.userPackage?.classesRemaining || 0;

      let determinedPaymentMethod = "pending";
      if (res.userPackage && res.userPackage.paymentMethod) {
          determinedPaymentMethod = res.userPackage.paymentMethod;
      } else if (res.paymentMethod) {
          // res.paymentMethod is from the Reservation table itself
          determinedPaymentMethod = res.paymentMethod;
      }

      let determinedPaymentStatus = "pending";
      if (res.userPackage && res.userPackage.paymentStatus) {
          determinedPaymentStatus = res.userPackage.paymentStatus;
      } else if (res.paymentMethod === "stripe") {
          // If Reservation.paymentMethod is 'stripe', it implies a successful direct payment.
          determinedPaymentStatus = "paid";
      } else if (res.paymentMethod === "cash") { 
          // Assuming 'cash' on Reservation.paymentMethod also implies it's paid.
          determinedPaymentStatus = "paid";
      }
      // Note: Reservation.status refers to booking status (confirmed, cancelled), 
      // not payment status directly for non-package items.

      // The admin frontend page's badge text logic expects 'online' for Stripe payments.
      // And 'cash' for cash payments to render "Efectivo".
      // The `determinedPaymentMethod` from UserPackage might already be 'online'.
      // If `res.paymentMethod` was 'stripe', convert it to 'online' for frontend display consistency.
      let finalDisplayPaymentMethod = determinedPaymentMethod;
      if (determinedPaymentMethod === "stripe") {
          finalDisplayPaymentMethod = "online";
      }
      // If UserPackage.paymentMethod was already 'online', it remains 'online'.
      // If UserPackage.paymentMethod was 'cash', it remains 'cash'.
      // If res.paymentMethod was 'cash', it remains 'cash'.
      
      // Determine package name
      let packageName = "N/A";
      if (res.userPackage?.package?.name) {
        packageName = res.userPackage.package.name;
      } else if (finalDisplayPaymentMethod === "online" || finalDisplayPaymentMethod === "cash") {
        packageName = "PASE INDIVIDUAL";
      }
      
      return {
        id: res.id,
        user: `${res.user.firstName} ${res.user.lastName}`,
        email: res.user.email,
        phone: res.user.phone || "",
        class: res.scheduledClass.classType.name,
        date: formattedDate,
        time: formattedTime,
        status: res.status,
        package: packageName,
        remainingClasses: remainingClasses,
        paymentStatus: determinedPaymentStatus,
        paymentMethod: finalDisplayPaymentMethod,
        checkedIn: res.status === "attended",
        checkedInAt: res.checked_in_at,
        bikeNumber: res.bikeNumber,
        cancelledAt: res.cancelledAt
      };
    });

    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error("Error al obtener reservaciones:", error);
    return NextResponse.json({ error: "Error al obtener reservaciones" }, { status: 500 });
  }
}

// POST - Crear nueva reserva (admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, classId, date, time, package: packageType, paymentMethod, bikeNumber, userPackageId } = body;

    if (!userId || !classId || !date || !time || !packageType) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Usar las utilidades de admin para procesar fecha y hora correctamente
    const scheduledDateUTC = parseAdminDateInput(date);
    const scheduledTimeUTC = parseAdminTimeInput(time);

    // Validar número de bicicleta si se especifica
    let parsedBikeNumber = null;
    if (bikeNumber !== undefined && bikeNumber !== null) {
      parsedBikeNumber = Number(bikeNumber);
      if (isNaN(parsedBikeNumber) || parsedBikeNumber < 1 || parsedBikeNumber > 10) {
        return NextResponse.json({ error: "El número de bicicleta debe estar entre 1 y 10" }, { status: 400 });
      }

      // Verificar si la bicicleta ya está reservada para esta clase específica
      const scheduledDateUTC = parseAdminDateInput(date);
      const scheduledTimeUTC = parseAdminTimeInput(time);
      
      const bikeConflict = await prisma.reservation.findFirst({
        where: {
          bikeNumber: parsedBikeNumber,
          status: "confirmed",
          scheduledClass: {
            classTypeId: classId,
            date: scheduledDateUTC,
            time: scheduledTimeUTC
          }
        }
      });

      if (bikeConflict) {
        return NextResponse.json({ 
          error: `La bicicleta #${parsedBikeNumber} ya está reservada para esta clase` 
        }, { status: 400 });
      }
    }

    // Buscar la clase programada o crearla si no existe
    let scheduledClass = await prisma.scheduledClass.findFirst({
      where: {
        classTypeId: classId,
        date: scheduledDateUTC,
        time: scheduledTimeUTC
      },
      include: { // Include reservations to accurately check spots
        reservations: {
          where: {
            status: "confirmed"
          }
        }
      }
    });

    if (!scheduledClass) {
      // Obtener datos del tipo de clase
      const classType = await prisma.classType.findUnique({
        where: { id: classId }
      });

      if (!classType) {
        return NextResponse.json({ error: "Tipo de clase no encontrado" }, { status: 404 });
      }

      // Buscar un instructor (podría mejorarse para elegir un instructor específico)
      const instructor = await prisma.instructor.findFirst();
      
      if (!instructor) {
        return NextResponse.json({ error: "No se encontró ningún instructor disponible" }, { status: 404 });
      }

      // Crear la clase programada
      scheduledClass = await prisma.scheduledClass.create({
        data: {
          classTypeId: classId,
          instructorId: instructor.id,
          date: scheduledDateUTC,
          time: scheduledTimeUTC,
          maxCapacity: classType.capacity,
          availableSpots: classType.capacity - 1, // Restar 1 por la reservación que estamos creando
          status: "scheduled"
        },
        include: {
          reservations: {
            where: {
              status: "confirmed"
            }
          }
        }
      });

      if (!scheduledClass) {
        return NextResponse.json({ error: "Error al crear la clase programada" }, { status: 500 });
      }
    } else {
      // Verify spots based on actual reservations vs capacity
      const confirmedReservationsCount = scheduledClass.reservations.length;
      const trueAvailableSpots = scheduledClass.maxCapacity - confirmedReservationsCount;

      if (trueAvailableSpots <= 0) {
        // Even if scheduledClass.availableSpots might be > 0 due to staleness,
        // the real count shows it's full.
        return NextResponse.json({ error: "No hay espacios disponibles para esta clase (verificado por conteo real)" }, { status: 400 });
      }

      // If we proceed, decrement the stored availableSpots field.
      // This attempts to keep the DB field in sync, though the check above is the source of truth.
      await prisma.scheduledClass.update({
        where: { id: scheduledClass.id },
        data: {
          availableSpots: {
            decrement: 1
          }
          // Note: If this decrement leads to a negative number due to prior staleness,
          // it highlights the importance of the dynamic check.
          // Consider adding a DB constraint for availableSpots >= 0 if not already present.
        }
      });
    }

    // Buscar o crear el paquete de usuario
    let userPackage: any = null; // Explicitly type as any to cover all possible states
    let processedUserPackage = false; // Flag to indicate if a UserPackage was used or created

    // Wrap the entire reservation creation process in a transaction
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        // Si se proporcionó un userPackageId, significa que el admin seleccionó un paquete existente (incluido un "pase individual" si existe como UserPackage)
        if (userPackageId) {
          userPackage = await tx.userPackage.findUnique({
            where: { id: Number(userPackageId) },
            include: { package: true } // Include package info for remaining classes calculation
          });

          if (!userPackage) {
            throw new Error("Paquete seleccionado no encontrado");
          }
          if (userPackage.classesRemaining === null || userPackage.classesRemaining <= 0) {
            throw new Error("El paquete seleccionado no tiene clases restantes");
          }

          // Descontar la clase del paquete existente
          userPackage = await tx.userPackage.update({
            where: { id: userPackage.id },
            data: {
              classesUsed: { increment: 1 },
              classesRemaining: { decrement: 1 }
            },
            include: { package: true } // Re-include for updated remainingClasses
          });
          processedUserPackage = true;
        } 
        // Si no se proporcionó userPackageId, Y NO es un pase individual pagado directamente (sin UserPackage)
        // entonces podría ser un paquete nuevo que se crea (ej. Primera Vez, Semana Ilimitada, 10 Clases)
        else if (packageType !== "individual") {
          const packageMap = {
            // "individual": 2, // No se crea UserPackage nuevo para "individual" aquí, se maneja por userPackageId si existe
            "primera-vez": 1,
            "semana-ilimitada": 3,
            "10classes": 4,
          };
          const packageId = packageMap[packageType as keyof typeof packageMap];

          if (!packageId) {
            throw new Error(`Tipo de paquete '${packageType}' no válido para creación automática`);
          }

          const packageInfo = await tx.package.findUnique({ where: { id: packageId } });
          if (!packageInfo) {
            throw new Error("Definición de paquete no encontrada");
          }

          if (packageId === 3) { // Semana Ilimitada
            try {
              const existingUnlimited = await validateUnlimitedWeekReservation(userId, scheduledClass.id, body.selectedWeekStart);
              if (existingUnlimited) {
                userPackage = existingUnlimited; // Ya tiene uno, se usa ese
                // Decrement (handled by userPackageId block if it was selected, otherwise this is a new reservation against existing unlimited)
                 userPackage = await tx.userPackage.update({
                    where: { id: userPackage.id },
                    data: {
                      classesUsed: { increment: 1 },
                      // classesRemaining for unlimited might not be strict, but good to track usage
                      classesRemaining: (userPackage.classesRemaining ?? 0) > 0 ? { decrement: 1 } : 0 
                    },
                    include: { package: true }
                  });

              } else {
                userPackage = await createUnlimitedWeekPackage(userId, packageInfo, paymentMethod, body.selectedWeekStart);
              }
            } catch (err: any) {
              throw new Error(err.message || "Error en validación de semana ilimitada");
            }
          } else { // Para "primera-vez" o "10classes" si no se pasó userPackageId
            let expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + packageInfo.validityDays);
            userPackage = await tx.userPackage.create({
              data: {
                userId: userId,
                packageId: packageId,
                expiryDate: expiryDate,
                // classesRemaining should be classCount - 1 because one is used now
                classesRemaining: (packageInfo.classCount ?? 0) > 0 ? packageInfo.classCount! - 1 : 0,            classesUsed: 1,
                paymentMethod: paymentMethod === "pending" ? "pending" : paymentMethod,
                paymentStatus: paymentMethod === "pending" ? "pending" : "paid",
                isActive: true
              },
              include: { package: true }
            });
          }
          processedUserPackage = true;
        }
        // Si es 'individual' y NO se pasó userPackageId, significa que es un pago directo, no se usa UserPackage.
        // userPackage remains undefined in this case.

        // Crear la reserva
        const reservation = await tx.reservation.create({
          data: {
            userId: userId,
            scheduledClassId: scheduledClass.id,
            userPackageId: userPackage?.id, // Asocia si un UserPackage fue procesado o encontrado
            status: "confirmed",
            // Si se procesó un UserPackage, el método de pago de la reserva es 'package'.
            // Sino, es el método de pago directo (e.g. 'cash', 'stripe' para un pase individual sin UserPackage).
            paymentMethod: processedUserPackage ? "package" : paymentMethod,
            bikeNumber: parsedBikeNumber,
          },
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
            scheduledClass: { include: { classType: true } },
            userPackage: { include: { package: true } }
          }
        });

        // Actualizar el balance de clases del usuario si se procesó un UserPackage
        if (processedUserPackage && userPackage) {
          await tx.userAccountBalance.upsert({
            where: { userId: userId },
            update: {
              classesUsed: { increment: 1 },
              classesAvailable: { decrement: 1 }
            },
            create: {
              userId: userId,
              // totalClassesPurchased should reflect the original count of the package
              totalClassesPurchased: userPackage.packageId === 1 ? 1 : (userPackage.packageId === 2 ? 1 : (userPackage.packageId === 3 ? 25 : (userPackage.packageId === 4 ? 10 : 1))), 
              classesUsed: 1,
              classesAvailable: userPackage.classesRemaining // This is already decremented
            }
          });
        }

        return { reservation, userPackage, processedUserPackage };
      });
    } catch (error) {
      console.error("Error en transacción de creación de reservación:", error);
      const errorMessage = error instanceof Error ? error.message : "Error desconocido en la creación de la reservación";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Formatear la respuesta
    const formattedReservation = {
      id: result.reservation.id,
      user: `${result.reservation.user.firstName} ${result.reservation.user.lastName}`,
      email: result.reservation.user.email,
      phone: result.reservation.user.phone || "",
      class: result.reservation.scheduledClass.classType.name,
      date: formatAdminDate(result.reservation.scheduledClass.date),
      time: formatAdminTime(result.reservation.scheduledClass.time),
      status: result.reservation.status,
      package: result.userPackage?.package.name || "PASE INDIVIDUAL",
      remainingClasses: result.userPackage?.classesRemaining || 0,
      paymentStatus: result.userPackage?.paymentStatus || (paymentMethod === "pending" ? "pending" : "paid"),
      paymentMethod: result.userPackage?.paymentMethod || paymentMethod,
      checkedIn: false, // Nueva reserva, no ha hecho check-in
      checkedInAt: null, // Nueva reserva, no ha hecho check-in
      bikeNumber: result.reservation.bikeNumber || null // Incluir el número de bicicleta en la respuesta
    };

    return NextResponse.json(formattedReservation);
  } catch (error) {
    console.error("Error al crear reservación:", error);
    return NextResponse.json({ error: "Error al crear reservación" }, { status: 500 });
  }
}

// --- INICIO DE NUEVAS FUNCIONES PARA SEMANA ILIMITADA ---
/**
 * Validaciones específicas para Semana Ilimitada antes de crear reservación
 */
async function validateUnlimitedWeekReservation(
  userId: number, 
  scheduledClassId: number, 
  selectedWeekStart?: string
) {
  const scheduledClass = await prisma.scheduledClass.findUnique({
    where: { id: scheduledClassId },
    include: { classType: true }
  });

  if (!scheduledClass) {
    throw new Error('Clase no encontrada');
  }

  const classDate = new Date(scheduledClass.date);

  // Verificar que la clase esté en horario permitido (lunes a viernes)
  if (!isWithinUnlimitedWeekSchedule(classDate)) {
    throw new Error('La semana ilimitada solo aplica de lunes a viernes');
  }

  // Si se especifica una semana de inicio, validar que la clase esté en esa semana
  if (selectedWeekStart) {
    const weekStartDate = new Date(selectedWeekStart);
    const weekEndDate = getUnlimitedWeekExpiryDate(weekStartDate);
    
    if (classDate < weekStartDate || classDate > weekEndDate) {
      throw new Error('La clase debe estar dentro de la semana seleccionada');
    }
  }

  // Buscar paquete activo de semana ilimitada
  const existingPackage = await prisma.userPackage.findFirst({
    where: {
      userId: userId,
      packageId: 3,
      isActive: true,
      expiryDate: {
        gte: new Date()
      }
    },
    include: {
      reservations: {
        where: { status: 'confirmed' },
        include: { scheduledClass: true }
      }
    }
  });

  if (existingPackage) {
    // Validar límites de uso
    const weeklyUsage = existingPackage.reservations.length;
    const dailyUsage = calculateDailyUsage(existingPackage.reservations, classDate);

    if (weeklyUsage >= 25) {
      throw new Error('Has alcanzado el límite de 25 clases para esta semana');
    }

    if (dailyUsage >= 5) {
      throw new Error('Has alcanzado el límite de 5 clases por día');
    }

    return existingPackage;
  }

  return null;
}

// Nueva función para crear paquete de semana ilimitada
async function createUnlimitedWeekPackage(
  userId: number, 
  packageInfo: any, 
  paymentMethod: string, 
  selectedWeekStart?: string
) {
  let expiryDate: Date;

  if (selectedWeekStart) {
    // Si se especifica una semana, usar esa fecha de inicio
    const weekStartDate = new Date(selectedWeekStart);
    expiryDate = getUnlimitedWeekExpiryDate(weekStartDate);
  } else {
    // Si no se especifica, usar la semana actual/próxima según reglas de negocio
    const today = new Date();
    const currentDay = today.getDay();
    
    if (currentDay === 0 || currentDay === 6) {
      // Sábado o domingo: usar la próxima semana
      const nextMonday = new Date(today);
      nextMonday.setDate(today.getDate() + (8 - currentDay) % 7);
      expiryDate = getUnlimitedWeekExpiryDate(nextMonday);
    } else {
      // Lunes a viernes: usar semana actual
      expiryDate = getUnlimitedWeekExpiryDate(today);
    }
  }

  return await prisma.userPackage.create({
    data: {
      userId: userId,
      packageId: 3, // Semana Ilimitada
      expiryDate: expiryDate,
      classesRemaining: 25, // Máximo 25 clases por semana
      classesUsed: 1, // Ya estamos usando una clase
      paymentMethod: paymentMethod === "pending" ? "pending" : paymentMethod,
      paymentStatus: paymentMethod === "pending" ? "pending" : "paid",
      isActive: true
    }
  });
}
// --- FIN DE NUEVAS FUNCIONES PARA SEMANA ILIMITADA ---