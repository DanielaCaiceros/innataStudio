import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, User } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { sendPackagePurchaseConfirmationEmail } from "@/lib/email"
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/business-days'


const prisma = new PrismaClient()

// GET - Obtener paquetes activos del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    // Obtener paquetes activos del usuario
    const userPackages = await prisma.userPackage.findMany({
      where: { 
        userId,
        isActive: true,
        classesRemaining: { gt: 0 },
        expiryDate: { gte: new Date() }
      },
      include: {
        package: true
      },
      orderBy: { expiryDate: 'asc' }
    })

    // Formatear los datos para la respuesta
    const formattedPackages = userPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.package.name,
      classesRemaining: pkg.classesRemaining,
      classesUsed: pkg.classesUsed,
      expiryDate: pkg.expiryDate.toISOString(),
      isActive: pkg.isActive
    }))

    return NextResponse.json(formattedPackages)
  } catch (error) {
    console.error("Error fetching user packages:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Crear un nuevo paquete para el usuario después de un pago exitoso
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = parseInt(payload.userId)

    const body = await request.json()
    const { packageId, paymentId } = body

    if (!packageId || !paymentId) {
      return NextResponse.json({ 
        error: "Faltan datos requeridos: packageId y/o paymentId" 
      }, { status: 400 })
    }

    // Obtener información del paquete
    const packageInfo = await prisma.package.findUnique({
      where: { id: Number(packageId) }
    })

    if (!packageInfo) {
      return NextResponse.json({ 
        error: "Paquete no encontrado" 
      }, { status: 404 })
    }

    // Verificar si es un paquete "primera vez" y si el usuario ya lo ha comprado antes
    if (packageInfo.is_first_time_only === true) {
      const existingFirstTimePackage = await prisma.userPackage.findFirst({
        where: {
          userId: userId as number,
          package: {
            is_first_time_only: true,
          },
        },
      })

      if (existingFirstTimePackage) {
        return NextResponse.json({
          error: "El paquete PRIMERA VEZ solo puede ser adquirido una vez por usuario."
        }, { status: 400 })
      }
    }

    // Calcular fecha de expiración
    const purchaseDate = new Date()
    let expiryDate: Date

    // **NUEVA LÓGICA**: Para Semana Ilimitada (ID 3), usar días hábiles
    if (Number(packageId) === 3) {
      expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
    } else {
      // Para otros paquetes, usar días calendario normales
      expiryDate = new Date()
      expiryDate.setDate(purchaseDate.getDate() + packageInfo.validityDays)
    }

    // Iniciar transacción de base de datos
    const { userPackage, payment } = await prisma.$transaction(async (tx) => {
      // Crear el registro UserPackage
      const createdUserPackage = await tx.userPackage.create({
        data: {
          userId: userId as number,
          packageId: Number(packageId),
          purchaseDate,
          expiryDate,
          classesRemaining: packageInfo.classCount || 0,
          classesUsed: 0,
          isActive: true,
          paymentMethod: "online",
          paymentStatus: "paid"
        },
        include: {
          package: true
        }
      })

      // Crear el registro de Payment
      const createdPayment = await tx.payment.create({
        data: {
          userId: userId as number,
          userPackageId: createdUserPackage.id,
          amount: Number(packageInfo.price),
          paymentMethod: "stripe",
          stripePaymentIntentId: paymentId,
          status: "completed"
        }
      })

      // Actualizar el balance del usuario
      await tx.userAccountBalance.upsert({
        where: { userId: userId as number },
        update: {
          totalClassesPurchased: { increment: packageInfo.classCount || 0 },
          classesAvailable: { increment: packageInfo.classCount || 0 }
        },
        create: {
          userId: userId as number,
          totalClassesPurchased: packageInfo.classCount || 0,
          classesUsed: 0,
          classesAvailable: packageInfo.classCount || 0
        }
      })

      // Crear transacción de balance
      await tx.balanceTransaction.create({
        data: {
          userId: userId as number,
          type: "purchase",
          amount: packageInfo.classCount || 0,
          description: `Compra de paquete: ${packageInfo.name}${Number(packageId) === 3 ? ' (5 días hábiles)' : ''}`,
          relatedPaymentId: createdPayment.id
        }
      })

      return { userPackage: createdUserPackage, payment: createdPayment }
    })

    // Enviar email de confirmación con información específica para Semana Ilimitada
    try {
      // Fetch user details to get firstName and lastName
      const user = await prisma.user.findUnique({
        where: { user_id: userId as number },
        select: { firstName: true, lastName: true, email: true }
      });

      if (!user) {
        console.error('User not found for email confirmation:', userId);
        // Continue without sending email, or handle as appropriate
        return;
      }

      const emailDetails = {
        packageName: packageInfo.name,
        classCount: packageInfo.classCount || 0,
        price: Number(packageInfo.price),
        purchaseDate: purchaseDate.toLocaleDateString('es-ES'),
        expiryDate: expiryDate.toLocaleDateString('es-ES'),
        isUnlimitedWeek: Number(packageId) === 3,
        validityType: Number(packageId) === 3 ? '5 días hábiles' : `${packageInfo.validityDays} días`
      }

      await sendPackagePurchaseConfirmationEmail(
        user.email,
        user.firstName || 'Cliente',
        emailDetails
      )
    } catch (emailError) {
      console.error('Error enviando email de confirmación de compra:', emailError)
      // No fallar la compra si hay error en el email
    }

    return NextResponse.json({
      message: "Paquete comprado exitosamente",
      userPackage: {
        id: userPackage.id,
        packageName: packageInfo.name,
        classesRemaining: userPackage.classesRemaining,
        expiryDate: userPackage.expiryDate,
        isUnlimitedWeek: Number(packageId) === 3,
        validityMessage: Number(packageId) === 3 
          ? "Válido por 5 días hábiles (lunes a viernes)"
          : `Válido por ${packageInfo.validityDays} días`
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status
      }
    })

  } catch (error) {
    console.error("Error al procesar compra de paquete:", error)
    return NextResponse.json({ 
      error: "Error interno del servidor" 
    }, { status: 500 })
  }
}