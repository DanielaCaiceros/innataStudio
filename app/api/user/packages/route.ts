import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, User } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { sendPackagePurchaseConfirmationEmail } from "@/lib/email"
import { getUnlimitedWeekExpiryDate } from '@/lib/utils/unlimited-week'


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
        expiryDate: { gte: new Date() },
      },
      include: {
        package: true,
      },
      orderBy: { expiryDate: 'asc' },
    })

    // Contar solo las clases de paquetes que no son Semana Ilimitada
    const normalClassesCount = userPackages
      .filter(p => p.packageId !== 3)
      .reduce((total, pkg) => total + (pkg.classesRemaining || 0), 0)

    // Formatear los datos para la respuesta
    const formattedPackages = userPackages.map(pkg => ({
      id: pkg.id,
      packageId: pkg.packageId, // Importante para el frontend
      name: pkg.package.name,
      classesRemaining: pkg.classesRemaining,
      classesUsed: pkg.classesUsed,
      expiryDate: pkg.expiryDate.toISOString(),
      purchaseDate: pkg.purchaseDate ? pkg.purchaseDate.toISOString() : null,
      isActive: pkg.isActive,
    }))

    return NextResponse.json({
      packages: formattedPackages,
      totalAvailableClasses: normalClassesCount,
    })
  } catch (error) {
    console.error('Error fetching user packages:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
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
    const { packageId, paymentId, selectedWeekStartDate } = body

    if (!packageId || !paymentId) {
      return NextResponse.json({
        error: "Faltan datos requeridos: packageId y/o paymentId"
      }, { status: 400 })
    }

    const numericPackageId = Number(packageId)

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

    // --- BEGIN VALIDATION FOR UNLIMITED WEEKS (packageId 3) ---
    if (numericPackageId === 3) {
      if (!selectedWeekStartDate) {
        return NextResponse.json({ error: "Debe seleccionar una semana para el paquete ilimitado." }, { status: 400 });
      }

      const newSelectedWeekStart = new Date(selectedWeekStartDate);
      const newSelectedWeekEnd = getUnlimitedWeekExpiryDate(newSelectedWeekStart); // Friday of the selected week

      // Fetch user's existing/future unlimited weeks
      const existingUnlimitedUserPackages = await prisma.userPackage.findMany({
        where: {
          userId: userId,
          packageId: 3, // Unlimited week package ID
          OR: [
            { expiryDate: { gte: new Date() } }, // Active or future
            { purchaseDate: { gte: new Date() } } // Specifically future-dated (purchaseDate is Monday)
          ]
        },
        orderBy: {
          purchaseDate: 'asc'
        }
      });

      // 1. Overlap Prevention
      // Ensure newSelectedWeekStart is at UTC midnight for consistent comparison
      const normalizedNewSelectedWeekStart = new Date(Date.UTC(
        newSelectedWeekStart.getUTCFullYear(),
        newSelectedWeekStart.getUTCMonth(),
        newSelectedWeekStart.getUTCDate()
      ));

      for (const existingPkg of existingUnlimitedUserPackages) {
        // Ensure existingPkg.purchaseDate is also treated as UTC midnight for comparison
        const normalizedExistingPkgPurchaseDate = new Date(Date.UTC(
          existingPkg.purchaseDate.getUTCFullYear(),
          existingPkg.purchaseDate.getUTCMonth(),
          existingPkg.purchaseDate.getUTCDate()
        ));

        if (normalizedExistingPkgPurchaseDate.getTime() === normalizedNewSelectedWeekStart.getTime()) {
          return NextResponse.json({
            error: "Ya tienes un paquete de semana ilimitada comprado para la semana seleccionada."
          }, { status: 400 });
        }
      }

      // 2. Advance Purchase Limitation (Max 2 future weeks if one is currently active)
      const today = new Date();
      let activeUnlimitedWeek: { purchaseDate: Date, expiryDate: Date } | null = null;
      let futureUnlimitedWeeksCount = 0;

      for (const pkg of existingUnlimitedUserPackages) {
        // purchaseDate is Monday, expiryDate is Friday
        if (today >= pkg.purchaseDate && today <= pkg.expiryDate) {
          activeUnlimitedWeek = { purchaseDate: pkg.purchaseDate, expiryDate: pkg.expiryDate };
        }
      }

      if (activeUnlimitedWeek) {
        for (const pkg of existingUnlimitedUserPackages) {
          // If the package's start date (Monday) is after the current active week's end date (Friday)
          if (pkg.purchaseDate > activeUnlimitedWeek.expiryDate) {
            futureUnlimitedWeeksCount++;
          }
        }

        // If trying to buy another future week when already having 2 or more future ones
        if (futureUnlimitedWeeksCount >= 2 && newSelectedWeekStart > activeUnlimitedWeek.expiryDate) {
          return NextResponse.json({
            error: "Solo puedes comprar hasta 2 semanas ilimitadas por adelantado mientras tienes una activa."
          }, { status: 400 });
        }
      }
    }
    // --- END VALIDATION FOR UNLIMITED WEEKS ---

    // Calcular fecha de expiración
    let purchaseDate = new Date()
    let expiryDate: Date
    if (numericPackageId === 3 && selectedWeekStartDate) { // Use numericPackageId
      purchaseDate = new Date(selectedWeekStartDate)
      expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
    } else if (numericPackageId === 3) { // Use numericPackageId
      // This case should ideally not be hit if selectedWeekStartDate is now mandatory for packageId 3
      expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
    } else {
      expiryDate = new Date()
      expiryDate.setDate(purchaseDate.getDate() + packageInfo.validityDays)
    }

    // Iniciar transacción de base de datos
    const { userPackage, payment } = await prisma.$transaction(async (tx) => {
      // Crear el registro UserPackage
      const createdUserPackage = await tx.userPackage.create({
        data: {
          userId: userId as number,
          packageId: numericPackageId, // Use numericPackageId
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
           description: `Compra de paquete: ${packageInfo.name}${numericPackageId === 3 ? ' (5 días hábiles)' : ''}`, // Use numericPackageId
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
        isUnlimitedWeek: numericPackageId === 3, // Use numericPackageId
        validityType: numericPackageId === 3 ? '5 días hábiles' : `${packageInfo.validityDays} días` // Use numericPackageId
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
        isUnlimitedWeek: numericPackageId === 3, // Use numericPackageId
        validityMessage: numericPackageId === 3 // Use numericPackageId
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