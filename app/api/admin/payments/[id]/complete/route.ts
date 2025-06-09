import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { sendPackagePurchaseConfirmationEmail } from "@/lib/email"

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación y rol de admin
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const paymentId = parseInt(params.id)
    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "ID de pago inválido" }, { status: 400 })
    }

    // Actualizar el pago y activar el paquete en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Obtener el pago y el paquete asociado
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          userPackage: {
            include: {
              package: true
            }
          }
        }
      })

      if (!payment) {
        throw new Error("Pago no encontrado")
      }

      if (payment.status !== "pending" || payment.paymentMethod !== "cash") {
        throw new Error("El pago no está pendiente o no es un pago en efectivo")
      }

      // Actualizar el pago
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: "completed",
          paymentDate: new Date()
        }
      })

      // Si hay un paquete asociado, activarlo y actualizar el balance
      if (payment.userPackage) {
        // Activar el paquete
        await tx.userPackage.update({
          where: { id: payment.userPackage.id },
          data: {
            isActive: true,
            paymentStatus: "paid"
          }
        })

        // Actualizar el balance del usuario
        await tx.userAccountBalance.upsert({
          where: { userId: payment.userId },
          update: {
            totalClassesPurchased: {
              increment: payment.userPackage.package.classCount || 0
            },
            classesAvailable: {
              increment: payment.userPackage.package.classCount || 0
            },
            lastUpdated: new Date()
          },
          create: {
            userId: payment.userId,
            totalClassesPurchased: payment.userPackage.package.classCount || 0,
            classesUsed: 0,
            classesAvailable: payment.userPackage.package.classCount || 0,
            lastUpdated: new Date()
          }
        })

        // Crear una transacción de balance
        await tx.balanceTransaction.create({
          data: {
            userId: payment.userId,
            type: "purchase",
            amount: payment.userPackage.package.classCount || 0,
            description: `Compra de paquete: ${payment.userPackage.package.name}`,
            createdAt: new Date(),
            relatedPaymentId: payment.id
          }
        })

        // Enviar correo de confirmación
        const user = await tx.user.findUnique({
          where: { user_id: payment.userId },
          select: { email: true, firstName: true }
        })

        if (user && user.email && user.firstName) {
          const packageDetails = {
            packageName: payment.userPackage.package.name,
            classCount: payment.userPackage.package.classCount || 0,
            expiryDate: payment.userPackage.expiryDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
            purchaseDate: payment.userPackage.purchaseDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
            price: Number(payment.userPackage.package.price)
          }

          await sendPackagePurchaseConfirmationEmail(user.email, user.firstName, packageDetails)
        }
      }

      return updatedPayment
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error al marcar pago como completado:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al procesar la solicitud" },
      { status: 500 }
    )
  }
} 