// app/api/admin/users/[userId]/packages/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)

    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario inválido" }, { status: 400 })
    }

    // Obtener paquetes del usuario
    const userPackages = await db.userPackage.findMany({
      where: {
        userId: userId
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
            classCount: true,
            validityDays: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedPackages = userPackages.map(up => ({
      id: up.id,
      packageId: up.packageId,
      packageName: up.package.name,
      packagePrice: Number(up.package.price),
      classCount: up.package.classCount,
      validityDays: up.package.validityDays,
      classesRemaining: up.classesRemaining,
      paymentStatus: up.paymentStatus,
      createdAt: up.createdAt,
      expiryDate: up.expiryDate
    }))

    return NextResponse.json(formattedPackages)

  } catch (error) {
    console.error("Error fetching user packages:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST - Crear un nuevo paquete para el usuario
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    const body = await request.json()
    const { packageId } = body

    console.log("POST /api/admin/users/[id]/packages - Debug:", {
      userId,
      packageId,
      packageIdType: typeof packageId,
      body
    })

    if (isNaN(userId) || packageId === undefined || packageId === null) {
      console.log("Validation failed:", { userId: isNaN(userId), packageId: packageId === undefined || packageId === null })
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    // Verificar que el paquete existe
    const packageExists = await db.package.findUnique({
      where: { id: packageId }
    })

    if (!packageExists) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 })
    }

    // Verificar que el usuario existe
    const userExists = await db.user.findUnique({
      where: { user_id: userId }
    })

    if (!userExists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Crear el paquete de usuario
    const userPackage = await db.userPackage.create({
      data: {
        userId: userId,
        packageId: packageId,
        classesRemaining: packageExists.classCount,
        paymentStatus: 'pending', // Inicialmente pendiente hasta que se pague
        expiryDate: new Date(Date.now() + (packageExists.validityDays * 24 * 60 * 60 * 1000))
      },
      include: {
        package: {
          select: {
            name: true,
            price: true,
            classCount: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "Paquete asignado exitosamente",
      userPackage: {
        id: userPackage.id,
        packageName: userPackage.package.name,
        packagePrice: Number(userPackage.package.price),
        classCount: userPackage.package.classCount,
        remainingClasses: userPackage.classesRemaining,
        status: userPackage.paymentStatus,
        expiresAt: userPackage.expiryDate
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Error creating user package:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}