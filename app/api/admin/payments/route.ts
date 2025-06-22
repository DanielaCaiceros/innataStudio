// app/api/admin/payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/unlimited-week'

// GET - Obtener todos los pagos
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del admin
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    // Obtener todos los pagos con información del usuario usando Prisma
    const payments = await db.payment.findMany({
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                classCount: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Formatear los datos para la respuesta
    const formattedPayments = payments.map(payment => ({
      payment_id: payment.id,
      user_id: payment.userId,
      amount: Number(payment.amount),
      payment_method: payment.paymentMethod,
      payment_status: payment.status,
      created_at: payment.createdAt,
      payment_date: payment.paymentDate,
      stripe_payment_intent_id: payment.stripePaymentIntentId,
      userPackageId: payment.userPackageId,
      metadata: payment.metadata,
      transaction_id: payment.transactionId, // Agregado para el menú de detalles
      user: {
        firstName: payment.user.firstName,
        lastName: payment.user.lastName,
        email: payment.user.email
      },
      package: payment.userPackage?.package?.name || null,
      package_price: payment.userPackage?.package?.price ? 
        Number(payment.userPackage.package.price) : null
    }))

    return NextResponse.json(formattedPayments)

  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Crear un nuevo pago en efectivo
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación del admin
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, amount, userPackageId, notes, selectedWeek } = body
    console.log('Admin Payments POST body:', body);
    console.log('selectedWeek:', selectedWeek);

    // Validaciones
    if (!user_id || !amount) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: user_id, amount" },
        { status: 400 }
      )
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser un número válido mayor a 0" },
        { status: 400 }
      )
    }

    // Verificar que el usuario existe
    const userExists = await db.user.findUnique({
      where: { user_id: user_id }
    })

    if (!userExists) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      )
    }

    // Si se especifica un paquete, verificar que existe
    if (userPackageId) {
      const userPackageExists = await db.userPackage.findUnique({
        where: { id: userPackageId }
      })
      if (!userPackageExists) {
        return NextResponse.json(
          { error: "Paquete de usuario no encontrado" },
          { status: 404 }
        )
      }
    }

    // Obtener información del paquete
    let packageData = null;
    if (body.packageId) {
      packageData = await db.package.findUnique({ where: { id: body.packageId } });
      if (!packageData) {
        return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
      }
    }

    // Si es compra de semana ilimitada, calcular la expiración usando la semana seleccionada
    let purchaseDate = new Date();
    let expirationDate = new Date();
    // Para Semana Ilimitada, usar la semana seleccionada
    if (body.packageId === 3 && selectedWeek) {
      // Parse selectedWeek as UTC and set to Monday 00:00:00 UTC
      const selectedWeekDate = new Date(selectedWeek);
      const mondayUTC = new Date(Date.UTC(
        selectedWeekDate.getUTCFullYear(),
        selectedWeekDate.getUTCMonth(),
        selectedWeekDate.getUTCDate(),
        0, 0, 0, 0
      ));
      purchaseDate = mondayUTC;
      expirationDate = getUnlimitedWeekExpiryDate(purchaseDate); // This returns Friday 23:59:59 UTC
    } else if (body.packageId === 3) {
      // Fallback: si no se envía selectedWeek, usar la fecha actual (UTC-normalized)
      const now = new Date();
      const mondayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      purchaseDate = mondayUTC;
      expirationDate = getUnlimitedWeekExpiryDate(purchaseDate);
    } else {
      // Para otros paquetes, usar validityDays del paquete (30 días)
      if (packageData) {
        expirationDate = new Date();
        expirationDate.setUTCDate(expirationDate.getUTCDate() + packageData.validityDays);
      }
    }

    // Crear el paquete de usuario si es semana ilimitada y no se está usando userPackageId
    let userPackage = null;
    if (body.packageId === 3 && !userPackageId) {
      // Buscar el paquete base de semana ilimitada
      const unlimitedBase = await db.package.findUnique({ where: { id: 3 } });
      if (!unlimitedBase) {
        return NextResponse.json({ error: "Paquete base de semana ilimitada no encontrado" }, { status: 404 });
      }
      userPackage = await db.userPackage.create({
        data: {
          userId: user_id,
          packageId: 3,
          purchaseDate: purchaseDate,
          expiryDate: expirationDate,
          classesRemaining: unlimitedBase.classCount,
          isActive: true,
          paymentStatus: 'completed',
          paymentMethod: 'cash',
        }
      });
    }

    // Crear el pago manual/efectivo usando Prisma
    const payment = await db.payment.create({
      data: {
        userId: user_id,
        amount: parseFloat(amount),
        paymentMethod: 'cash', // Siempre efectivo desde admin
        status: 'completed', // Los pagos manuales se marcan como completados
        userPackageId: userPackageId || userPackage?.id || null,
        paymentDate: new Date(),
        metadata: notes ? { notes: notes, created_by: "admin" } : { created_by: "admin" }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        userPackage: {
          include: {
            package: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      }
    })

    // Si hay un userPackageId, actualizar el estado del paquete si es necesario
    if (userPackageId) {
      await db.userPackage.update({
        where: { id: userPackageId },
        data: {
          isActive: true,
          paymentStatus: 'completed'
        }
      })
    }

    return NextResponse.json({
      message: "Pago registrado exitosamente",
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.paymentMethod,
        status: payment.status,
        user: `${payment.user.firstName} ${payment.user.lastName}`,
        package: payment.userPackage?.package?.name || null,
        created_at: payment.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}