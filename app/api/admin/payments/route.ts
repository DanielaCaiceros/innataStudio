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
    const { user_id, amount, userPackageId, notes, selectedWeek, packageId: bodyPackageId } = body // Destructure packageId as bodyPackageId for clarity
    console.log('[PAYMENT_API_LOG] Received request. Body:', JSON.stringify(body, null, 2));
    console.log(`[PAYMENT_API_LOG] Parsed values: userId=${user_id}, amount=${amount}, userPackageId=${userPackageId}, selectedWeek=${selectedWeek}, packageId=${bodyPackageId}`);

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
    if (bodyPackageId) { // Use destructured bodyPackageId
      console.log(`[PAYMENT_API_LOG] Fetching packageData for packageId: ${bodyPackageId}`);
      packageData = await db.package.findUnique({ where: { id: bodyPackageId } });
      if (!packageData) {
        console.error(`[PAYMENT_API_LOG] Error: Paquete no encontrado con id: ${bodyPackageId}`);
        return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
      }
      console.log(`[PAYMENT_API_LOG] Found packageData: ${JSON.stringify(packageData, null, 2)}`);
    }

    // Si es compra de semana ilimitada, calcular la expiración usando la semana seleccionada
    let purchaseDate = new Date();
    let expirationDate = new Date();
    console.log(`[PAYMENT_API_LOG] Initial dates: purchaseDate=${purchaseDate.toISOString()}, expirationDate=${expirationDate.toISOString()}`);

    // Para Semana Ilimitada, usar la semana seleccionada
    if (bodyPackageId === 3 && selectedWeek) {
      console.log(`[PAYMENT_API_LOG] Calculating dates for Unlimited Week (packageId 3) with selectedWeek: ${selectedWeek}`);
      const selectedWeekDate = new Date(selectedWeek);
      const mondayUTC = new Date(Date.UTC(
        selectedWeekDate.getUTCFullYear(),
        selectedWeekDate.getUTCMonth(),
        selectedWeekDate.getUTCDate(),
        0, 0, 0, 0
      ));
      purchaseDate = mondayUTC;
      expirationDate = getUnlimitedWeekExpiryDate(purchaseDate); // This returns Friday 23:59:59 UTC
      console.log(`[PAYMENT_API_LOG] Calculated for selectedWeek: purchaseDate=${purchaseDate.toISOString()}, expirationDate=${expirationDate.toISOString()}`);
    } else if (bodyPackageId === 3) {
      console.log(`[PAYMENT_API_LOG] Calculating dates for Unlimited Week (packageId 3) - FALLBACK (no selectedWeek)`);
      const now = new Date();
      const mondayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      purchaseDate = mondayUTC;
      expirationDate = getUnlimitedWeekExpiryDate(purchaseDate);
      console.log(`[PAYMENT_API_LOG] Calculated for fallback (current week): purchaseDate=${purchaseDate.toISOString()}, expirationDate=${expirationDate.toISOString()}`);
    } else {
      console.log(`[PAYMENT_API_LOG] Calculating dates for Regular Package (packageId: ${bodyPackageId})`);
      if (packageData) {
        // purchaseDate remains new Date() (today)
        expirationDate = new Date(); // Ensure expirationDate starts from today for this calculation path
        expirationDate.setUTCDate(expirationDate.getUTCDate() + packageData.validityDays);
        console.log(`[PAYMENT_API_LOG] Calculated for regular package: purchaseDate=${purchaseDate.toISOString()} (today), expirationDate=${expirationDate.toISOString()}`);
      } else {
        console.log(`[PAYMENT_API_LOG] No packageData for regular package, dates remain as initial: purchaseDate=${purchaseDate.toISOString()}, expirationDate=${expirationDate.toISOString()}`);
      }
    }

    // ----- Start of Refactored UserPackage Handling -----
    let userPackageForPaymentLink: { id: number } | null = null; 
    // This will hold the ID of the UserPackage to be linked in the Payment record.
    // It's either the one found by userPackageId (and potentially updated) or a newly created one.

    if (bodyPackageId === 3) { // Operations specific to "Semana Ilimitada"
        console.log(`[PAYMENT_API_LOG] Handling UserPackage for Unlimited Week (packageId 3). userPackageId from body: ${userPackageId}`);
        if (userPackageId) { 
            console.log(`[PAYMENT_API_LOG] Case 1: Unlimited Week with userPackageId ${userPackageId}. Updating existing UserPackage.`);
            console.log(`[PAYMENT_API_LOG] Data for UserPackage UPDATE: purchaseDate=${purchaseDate.toISOString()}, expiryDate=${expirationDate.toISOString()}`);
            const updatedUserPackage = await db.userPackage.update({
                where: { id: userPackageId },
                data: {
                    purchaseDate: purchaseDate, // Correct future Monday from selectedWeek
                    expiryDate: expirationDate, // Correct future Friday from selectedWeek
                    isActive: true,
                    paymentStatus: 'completed'
                    // Assuming classCount, etc., are correctly set by handleAssignPackage or are standard.
                }
            });
            userPackageForPaymentLink = { id: updatedUserPackage.id };
            console.log(`[PAYMENT_API_LOG] UserPackage ${userPackageId} updated. ID for payment link: ${updatedUserPackage.id}`);
        } else { 
            console.log(`[PAYMENT_API_LOG] Case 2: Unlimited Week with NO userPackageId. Creating new UserPackage.`);
            const unlimitedBase = await db.package.findUnique({ where: { id: 3 } });
            if (!unlimitedBase) {
                console.error(`[PAYMENT_API_LOG] Error: Paquete base de semana ilimitada (id: 3) no encontrado.`);
                return NextResponse.json({ error: "Paquete base de semana ilimitada no encontrado" }, { status: 404 });
            }
            console.log(`[PAYMENT_API_LOG] Data for UserPackage CREATE: purchaseDate=${purchaseDate.toISOString()}, expiryDate=${expirationDate.toISOString()}`);
            const newUserPackage = await db.userPackage.create({
                data: {
                    userId: user_id,
                    packageId: 3,
                    purchaseDate: purchaseDate, // Correct future Monday
                    expiryDate: expirationDate, // Correct future Friday
                    classesRemaining: unlimitedBase.classCount,
                    isActive: true,
                    paymentStatus: 'completed',
                    paymentMethod: 'cash',
                }
            });
            userPackageForPaymentLink = { id: newUserPackage.id };
            console.log(`[PAYMENT_API_LOG] New UserPackage created with id ${newUserPackage.id}. ID for payment link: ${newUserPackage.id}`);
        }
    } else if (userPackageId) {
        console.log(`[PAYMENT_API_LOG] Case 3: Regular Package with userPackageId ${userPackageId}. Updating existing UserPackage.`);
        const updatedUserPackage = await db.userPackage.update({
            where: { id: userPackageId },
            data: {
                isActive: true,
                paymentStatus: 'completed'
            }
        });
        userPackageForPaymentLink = { id: updatedUserPackage.id };
        console.log(`[PAYMENT_API_LOG] Regular UserPackage ${userPackageId} updated. ID for payment link: ${updatedUserPackage.id}`);
    } else {
        console.log(`[PAYMENT_API_LOG] No userPackageId provided and not an Unlimited Week package needing creation. No UserPackage operation performed in this section.`);
    }
    // ----- End of Refactored UserPackage Handling -----

    // Populate Payment Metadata
    let paymentMetadata: any = notes ? { notes: notes, created_by: "admin" } : { created_by: "admin" };
    console.log(`[PAYMENT_API_LOG] Initial paymentMetadata: ${JSON.stringify(paymentMetadata)}`);
    if (bodyPackageId === 3 && selectedWeek) { // For any unlimited week with selectedWeek
        // purchaseDate and expirationDate vars hold the correct dates from selectedWeek logic
        paymentMetadata.unlimitedWeek = {
            start: purchaseDate.toISOString().slice(0,10),
            end: expirationDate.toISOString().slice(0,10)
        };
        console.log(`[PAYMENT_API_LOG] Added unlimitedWeek to paymentMetadata: ${JSON.stringify(paymentMetadata.unlimitedWeek)}`);
    }

    console.log(`[PAYMENT_API_LOG] Creating Payment record. UserPackageId to link: ${userPackageForPaymentLink ? userPackageForPaymentLink.id : null}`);
    const payment = await db.payment.create({
      data: {
        userId: user_id,
        amount: parseFloat(amount),
        paymentMethod: 'cash', 
        status: 'completed', 
        userPackageId: userPackageForPaymentLink ? userPackageForPaymentLink.id : null,
        paymentDate: new Date(),
        metadata: paymentMetadata
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        userPackage: { // This inclusion will now reflect the potentially updated/new UserPackage
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

    // The specific updates to UserPackage are now handled above.
    // The old generic update block `if (userPackageId)` is no longer needed here.

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