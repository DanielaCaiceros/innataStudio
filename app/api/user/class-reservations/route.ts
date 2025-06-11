// app/api/user/class-reservations/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)

    const searchParams = request.nextUrl.searchParams
    const scheduledClassId = searchParams.get("scheduledClassId")

    if (!scheduledClassId) {
      return NextResponse.json({ error: "ID de clase requerido" }, { status: 400 })
    }

    // Obtener todas las reservas del usuario para esta clase específica
    const userReservations = await prisma.reservation.findMany({
      where: {
        userId,
        scheduledClassId: Number(scheduledClassId),
        status: "confirmed"
      },
      include: {
        userPackage: {
          include: {
            package: true
          }
        },
        scheduledClass: {
          include: {
            classType: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Formatear la respuesta
    const formattedReservations = userReservations.map(reservation => ({
      id: reservation.id,
      bikeNumber: reservation.bikeNumber,
      packageName: reservation.userPackage?.package.name || "Pase individual",
      packageType: reservation.userPackage?.package.id === 3 ? "unlimited" : "regular",
      createdAt: reservation.createdAt,
      paymentMethod: reservation.paymentMethod
    }))

    // Determinar si el usuario puede hacer más reservas
    const hasUnlimitedPackage = userReservations.some(r => 
      r.userPackage?.package?.id === 3 || 
      r.userPackage?.package?.name?.toLowerCase().includes('semana ilimitada')
    )

    const canMakeMoreReservations = userReservations.length > 0 && !hasUnlimitedPackage

    return NextResponse.json({
      reservations: formattedReservations,
      totalReservations: userReservations.length,
      canMakeMoreReservations,
      hasUnlimitedPackage
    })

  } catch (error) {
    console.error("Error al obtener reservas del usuario para la clase:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}