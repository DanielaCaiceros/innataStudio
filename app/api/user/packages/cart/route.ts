import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { sendPackagePurchaseConfirmationEmail } from "@/lib/email"
import { getUnlimitedWeekExpiryDate } from "@/lib/utils/unlimited-week"

const prisma = new PrismaClient()

interface CartPackageInput {
  packageId: number
  selectedWeekStartDate?: string // ISO string, only required for packageId === 3
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = parseInt(payload.userId)

    const body = await request.json()
    const { packages, branchId, paymentId } = body as {
      packages: CartPackageInput[]
      branchId: number
      paymentId: string
    }

    if (!packages?.length || !paymentId || !branchId) {
      return NextResponse.json({ error: "Faltan datos requeridos: packages, branchId, paymentId" }, { status: 400 })
    }

    const numericBranchId = Number(branchId)

    const packageIds = packages.map((p) => p.packageId)
    const uniquePackageIds = [...new Set(packageIds)]

    // Fetch all package definitions in one query
    const packageInfos = await prisma.package.findMany({
      where: { id: { in: uniquePackageIds } },
    })

    if (packageInfos.length !== uniquePackageIds.length) {
      return NextResponse.json({ error: "Uno o más paquetes no fueron encontrados" }, { status: 404 })
    }

    // Check first-time package constraint upfront
    const firstTimePkg = packageInfos.find((p) => p.is_first_time_only)
    if (firstTimePkg) {
      const existing = await prisma.userPackage.findFirst({
        where: { userId, package: { is_first_time_only: true } },
      })
      if (existing) {
        return NextResponse.json(
          { error: "El paquete PRIMERA VEZ solo puede adquirirse una vez por usuario." },
          { status: 400 },
        )
      }
    }

    // Validate unlimited week packages
    for (const cartPkg of packages) {
      if (cartPkg.packageId === 3) {
        if (!cartPkg.selectedWeekStartDate) {
          return NextResponse.json(
            { error: "Debes seleccionar una semana para el paquete de Semana Ilimitada." },
            { status: 400 },
          )
        }

        const newWeekStart = new Date(cartPkg.selectedWeekStartDate)
        const normalizedNewWeekStart = new Date(
          Date.UTC(newWeekStart.getUTCFullYear(), newWeekStart.getUTCMonth(), newWeekStart.getUTCDate()),
        )

        const existingUnlimitedWeeks = await prisma.userPackage.findMany({
          where: {
            userId,
            packageId: 3,
            branch_id: numericBranchId,
            OR: [{ expiryDate: { gte: new Date() } }, { purchaseDate: { gte: new Date() } }],
          },
          orderBy: { purchaseDate: "asc" },
        })

        // Check for overlap
        for (const existing of existingUnlimitedWeeks) {
          const normalizedExisting = new Date(
            Date.UTC(
              existing.purchaseDate.getUTCFullYear(),
              existing.purchaseDate.getUTCMonth(),
              existing.purchaseDate.getUTCDate(),
            ),
          )
          if (normalizedExisting.getTime() === normalizedNewWeekStart.getTime()) {
            return NextResponse.json(
              { error: "Ya tienes un paquete de Semana Ilimitada para esa semana." },
              { status: 400 },
            )
          }
        }
      }
    }

    // Process all packages in a single transaction
    const createdResults = await prisma.$transaction(async (tx) => {
      const results = []

      for (const cartPkg of packages) {
        const pkgInfo = packageInfos.find((p) => p.id === cartPkg.packageId)!

        // Get branch-specific price
        let packagePrice = Number(pkgInfo.price)
        const branchPriceRecord = await tx.package_prices.findFirst({
          where: { package_id: pkgInfo.id, branch_id: numericBranchId, is_active: true },
          include: { branches: true },
        })
        if (branchPriceRecord) {
          packagePrice = Number(branchPriceRecord.price)
        }

        // Calculate dates
        let purchaseDate = new Date()
        let expiryDate: Date

        if (pkgInfo.id === 3 && cartPkg.selectedWeekStartDate) {
          purchaseDate = new Date(cartPkg.selectedWeekStartDate)
          expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
        } else {
          expiryDate = new Date()
          expiryDate.setDate(purchaseDate.getDate() + pkgInfo.validityDays)
        }

        // Create UserPackage
        const createdUserPackage = await tx.userPackage.create({
          data: {
            userId,
            packageId: pkgInfo.id,
            purchaseDate,
            expiryDate,
            classesRemaining: pkgInfo.classCount || 0,
            classesUsed: 0,
            isActive: true,
            paymentMethod: "online",
            paymentStatus: "paid",
            branch_id: numericBranchId,
          },
          include: { package: true },
        })

        // Create Payment record
        const createdPayment = await tx.payment.create({
          data: {
            userId,
            userPackageId: createdUserPackage.id,
            amount: packagePrice,
            paymentMethod: "stripe",
            stripePaymentIntentId: paymentId,
            status: "completed",
          },
        })

        // Update user balance
        await tx.userAccountBalance.upsert({
          where: { userId },
          update: {
            totalClassesPurchased: { increment: pkgInfo.classCount || 0 },
            classesAvailable: { increment: pkgInfo.classCount || 0 },
          },
          create: {
            userId,
            totalClassesPurchased: pkgInfo.classCount || 0,
            classesUsed: 0,
            classesAvailable: pkgInfo.classCount || 0,
          },
        })

        // Create balance transaction
        await tx.balanceTransaction.create({
          data: {
            userId,
            type: "purchase",
            amount: pkgInfo.classCount || 0,
            description: `Compra de paquete: ${pkgInfo.name}${pkgInfo.id === 3 ? " (5 días hábiles)" : ""}`,
            relatedPaymentId: createdPayment.id,
          },
        })

        results.push({
          userPackage: createdUserPackage,
          payment: createdPayment,
          packageInfo: pkgInfo,
          packagePrice,
        })
      }

      return results
    })

    // Send confirmation email (non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { firstName: true, lastName: true, email: true },
      })

      if (user) {
        const branchName =
          (
            await prisma.package_prices.findFirst({
              where: { package_id: packageIds[0], branch_id: numericBranchId },
              include: { branches: true },
            })
          )?.branches?.name ?? undefined

        const totalClassCount = createdResults.reduce(
          (sum, r) => sum + (r.packageInfo.classCount || 0),
          0,
        )
        const totalAmount = createdResults.reduce((sum, r) => sum + r.packagePrice, 0)
        const firstResult = createdResults[0]

        await sendPackagePurchaseConfirmationEmail(user.email, user.firstName || "Cliente", {
          packageName: createdResults.map((r) => r.packageInfo.name).join(", "),
          classCount: totalClassCount,
          price: totalAmount,
          purchaseDate: new Date().toLocaleDateString("es-ES"),
          expiryDate: firstResult.userPackage.expiryDate.toLocaleDateString("es-ES"),
          isUnlimitedWeek: createdResults.some((r) => r.packageInfo.id === 3),
          branchName,
        })
      }
    } catch (emailError) {
      console.error("Error enviando email de confirmación del carrito:", emailError)
    }

    return NextResponse.json({
      message: "Paquetes comprados exitosamente",
      count: createdResults.length,
      packages: createdResults.map((r) => ({
        id: r.userPackage.id,
        packageName: r.packageInfo.name,
        classesRemaining: r.userPackage.classesRemaining,
        expiryDate: r.userPackage.expiryDate,
      })),
    })
  } catch (error) {
    console.error("Error al procesar compra del carrito:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
