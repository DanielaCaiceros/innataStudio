import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient, User } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { sendPackagePurchaseConfirmationEmail } from "@/lib/email"

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
    const userId = Number.parseInt(payload.userId)

    // Obtener los datos del body
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
          userId: userId,
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
    const expiryDate = new Date()
    expiryDate.setDate(purchaseDate.getDate() + packageInfo.validityDays)

    // Crear el registro UserPackage
    const userPackage = await prisma.userPackage.create({
      data: {
        userId,
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

    // Actualizar el balance del usuario si existe
    await prisma.userAccountBalance.upsert({
      where: { userId },
      update: {
        totalClassesPurchased: {
          increment: packageInfo.classCount || 0
        },
        classesAvailable: {
          increment: packageInfo.classCount || 0
        },
        lastUpdated: new Date()
      },
      create: {
        userId,
        totalClassesPurchased: packageInfo.classCount || 0,
        classesUsed: 0,
        classesAvailable: packageInfo.classCount || 0,
        lastUpdated: new Date()
      }
    })

    // Crear una transacción de balance para el registro
    await prisma.balanceTransaction.create({
      data: {
        userId,
        type: "purchase",
        amount: packageInfo.classCount || 0,
        description: `Compra de paquete: ${packageInfo.name}`,
        createdAt: new Date()
      }
    })

    // Enviar correo de confirmación de compra de paquete
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { email: true, firstName: true }
      })

      if (user && user.email && user.firstName) {
        const packageDetails = {
          packageName: userPackage.package.name,
          classCount: userPackage.package.classCount || 0,
          expiryDate: userPackage.expiryDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
          purchaseDate: userPackage.purchaseDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
          price: userPackage.package.price.toNumber(), // Asegurarse que el precio sea un número
        }

        await sendPackagePurchaseConfirmationEmail(user.email, user.firstName, packageDetails)
        console.log(`Package confirmation email sent to user ${userId}`)
      } else {
        console.error(`User details not found for user ${userId}, cannot send package confirmation email.`)
      }
    } catch (emailError) {
      console.error(`Failed to send package confirmation email to user ${userId}:`, emailError)
      // No relanzar el error, ya que la compra fue exitosa.
    }

    return NextResponse.json({
      success: true,
      userPackage: {
        id: userPackage.id,
        packageName: userPackage.package.name,
        classesRemaining: userPackage.classesRemaining,
        expiryDate: userPackage.expiryDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      }
    })

  } catch (error) {
    console.error("Error creating user package:", error)
    // Determinar si el error es por el paquete "PRIMERA VEZ"
    if (error instanceof Error && error.message.includes("El paquete PRIMERA VEZ solo puede ser adquirido una vez por usuario.")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ 
      error: "Error interno del servidor al procesar la compra" 
    }, { status: 500 })
  }
}
