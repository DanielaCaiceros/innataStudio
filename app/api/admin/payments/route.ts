// app/api/admin/payments/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/unlimited-week'

// GET - Obtener todos los pagos
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

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
      transaction_id: payment.transactionId,
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
    const token = request.cookies.get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, amount, userPackageId, notes, selectedWeek, packageId: bodyPackageId } = body

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

    const userExists = await db.user.findUnique({
      where: { user_id: user_id }
    })

    if (!userExists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Validar userPackageId: existe, pertenece al usuario, y no ha sido procesado ya
    if (userPackageId) {
      const userPackageExists = await db.userPackage.findUnique({
        where: { id: userPackageId }
      })
      if (!userPackageExists) {
        return NextResponse.json({ error: "Paquete de usuario no encontrado" }, { status: 404 })
      }
      if (userPackageExists.userId !== user_id) {
        return NextResponse.json({ error: "El paquete no pertenece al usuario especificado" }, { status: 400 })
      }
      if (userPackageExists.paymentStatus === 'completed') {
        return NextResponse.json({ error: "Este paquete ya ha sido procesado" }, { status: 400 })
      }
    }

    let packageData = null;
    if (bodyPackageId) {
      packageData = await db.package.findUnique({ where: { id: bodyPackageId } });
      if (!packageData) {
        return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
      }
    }

    // Calcular fechas
    let purchaseDate = new Date();
    let expirationDate = new Date();
    let datesCalculated = false;

    if (bodyPackageId === 3 && selectedWeek) {
      const selectedWeekDate = new Date(selectedWeek);
      purchaseDate = new Date(Date.UTC(
        selectedWeekDate.getUTCFullYear(),
        selectedWeekDate.getUTCMonth(),
        selectedWeekDate.getUTCDate(),
        0, 0, 0, 0
      ));
      expirationDate = getUnlimitedWeekExpiryDate(purchaseDate);
      datesCalculated = true;
    } else if (bodyPackageId === 3) {
      const now = new Date();
      purchaseDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      expirationDate = getUnlimitedWeekExpiryDate(purchaseDate);
      datesCalculated = true;
    } else if (packageData) {
      expirationDate = new Date();
      expirationDate.setUTCDate(expirationDate.getUTCDate() + packageData.validityDays);
      datesCalculated = true;
    }

    // Si hay userPackageId pero no bodyPackageId, no podemos calcular fechas correctas
    if (userPackageId && !datesCalculated) {
      return NextResponse.json(
        { error: "Se debe especificar packageId para poder actualizar las fechas del paquete" },
        { status: 400 }
      )
    }

    // ----- Todas las operaciones en una transacción -----
    const result = await db.$transaction(async (tx) => {
      let userPackageForPaymentLink: { id: number; classCount: number; packageName: string } | null = null;

      if (bodyPackageId === 3) {
        if (userPackageId) {
          const updatedUserPackage = await tx.userPackage.update({
            where: { id: userPackageId },
            data: {
              purchaseDate: purchaseDate,
              expiryDate: expirationDate,
              isActive: true,
              paymentStatus: 'completed',
            }
          });
          userPackageForPaymentLink = {
            id: updatedUserPackage.id,
            classCount: updatedUserPackage.classesRemaining ?? 0,
            packageName: packageData!.name,
          };

          if ((updatedUserPackage.classesRemaining ?? 0) > 0) {
            await tx.userAccountBalance.upsert({
              where: { userId: user_id },
              update: {
                totalClassesPurchased: { increment: updatedUserPackage.classesRemaining ?? 0 },
                classesAvailable: { increment: updatedUserPackage.classesRemaining ?? 0 },
              },
              create: {
                userId: user_id,
                totalClassesPurchased: updatedUserPackage.classesRemaining ?? 0,
                classesUsed: 0,
                classesAvailable: updatedUserPackage.classesRemaining ?? 0,
              }
            });
          }
        } else {
          const unlimitedBase = await tx.package.findUnique({ where: { id: 3 } });
          if (!unlimitedBase) throw new Error("Paquete base de semana ilimitada no encontrado");

          const newUserPackage = await tx.userPackage.create({
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
          userPackageForPaymentLink = {
            id: newUserPackage.id,
            classCount: unlimitedBase.classCount ?? 0,
            packageName: unlimitedBase.name,
          };

          await tx.userAccountBalance.upsert({
            where: { userId: user_id },
            update: {
              totalClassesPurchased: { increment: unlimitedBase.classCount ?? 0 },
              classesAvailable: { increment: unlimitedBase.classCount ?? 0 },
            },
            create: {
              userId: user_id,
              totalClassesPurchased: unlimitedBase.classCount ?? 0,
              classesUsed: 0,
              classesAvailable: unlimitedBase.classCount ?? 0,
            }
          });
        }
      } else if (userPackageId) {
        const updatedUserPackage = await tx.userPackage.update({
          where: { id: userPackageId },
          data: {
            purchaseDate: purchaseDate,
            expiryDate: expirationDate,
            isActive: true,
            paymentStatus: 'completed',
          }
        });
        userPackageForPaymentLink = {
          id: updatedUserPackage.id,
          classCount: updatedUserPackage.classesRemaining ?? 0,
          packageName: packageData!.name,
        };

        if ((updatedUserPackage.classesRemaining ?? 0) > 0) {
          await tx.userAccountBalance.upsert({
            where: { userId: user_id },
            update: {
              totalClassesPurchased: { increment: updatedUserPackage.classesRemaining ?? 0 },
              classesAvailable: { increment: updatedUserPackage.classesRemaining ?? 0 },
            },
            create: {
              userId: user_id,
              totalClassesPurchased: updatedUserPackage.classesRemaining ?? 0,
              classesUsed: 0,
              classesAvailable: updatedUserPackage.classesRemaining ?? 0,
            }
          });
        }
      } else if (bodyPackageId && packageData) {
        const newUserPackage = await tx.userPackage.create({
          data: {
            userId: user_id,
            packageId: bodyPackageId,
            purchaseDate: purchaseDate,
            expiryDate: expirationDate,
            classesRemaining: packageData.classCount,
            isActive: true,
            paymentStatus: 'completed',
            paymentMethod: 'cash',
          }
        });
        userPackageForPaymentLink = {
          id: newUserPackage.id,
          classCount: packageData.classCount ?? 0,
          packageName: packageData.name,
        };

        await tx.userAccountBalance.upsert({
          where: { userId: user_id },
          update: {
            totalClassesPurchased: { increment: packageData.classCount ?? 0 },
            classesAvailable: { increment: packageData.classCount ?? 0 },
          },
          create: {
            userId: user_id,
            totalClassesPurchased: packageData.classCount ?? 0,
            classesUsed: 0,
            classesAvailable: packageData.classCount ?? 0,
          }
        });
      }

      // Metadata del pago — incluir semana siempre para paquetes ilimitados
      let paymentMetadata: any = notes ? { notes, created_by: "admin" } : { created_by: "admin" };
      if (bodyPackageId === 3) {
        paymentMetadata.unlimitedWeek = {
          start: purchaseDate.toISOString().slice(0, 10),
          end: expirationDate.toISOString().slice(0, 10),
        };
      }

      const payment = await tx.payment.create({
        data: {
          userId: user_id,
          amount: parseFloat(amount),
          paymentMethod: 'cash',
          status: 'completed',
          userPackageId: userPackageForPaymentLink ? userPackageForPaymentLink.id : null,
          paymentDate: new Date(),
          metadata: paymentMetadata,
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          userPackage: {
            include: {
              package: { select: { name: true, price: true } }
            }
          }
        }
      });

      // Registrar balanceTransaction para todos los casos con paquete
      if (userPackageForPaymentLink && userPackageForPaymentLink.classCount > 0) {
        await tx.balanceTransaction.create({
          data: {
            userId: user_id,
            type: 'purchase',
            amount: userPackageForPaymentLink.classCount,
            description: `Compra de ${userPackageForPaymentLink.packageName} (efectivo)`,
            relatedPaymentId: payment.id,
            createdBy: Number(decoded.userId),
          }
        });
      }

      return payment;
    });

    return NextResponse.json({
      message: "Pago registrado exitosamente",
      payment: {
        id: result.id,
        amount: Number(result.amount),
        method: result.paymentMethod,
        status: result.status,
        user: `${result.user.firstName} ${result.user.lastName}`,
        package: result.userPackage?.package?.name || null,
        created_at: result.createdAt,
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