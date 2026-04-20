// app/api/reservations/available-bikes/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { getBranchBikeLayout, SPECIAL_CLASS_BIKE_LAYOUT } from "@/lib/config/branch-bike-layouts"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scheduledClassId = searchParams.get("scheduledClassId")

    if (!scheduledClassId) {
      return NextResponse.json({ error: "ID de clase requerido" }, { status: 400 })
    }

    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: Number(scheduledClassId) },
      select: { id: true, branch_id: true, isSpecial: true, maxCapacity: true },
    })

    if (!scheduledClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    const layout = scheduledClass.isSpecial
      ? { ...SPECIAL_CLASS_BIKE_LAYOUT, bikeCount: scheduledClass.maxCapacity }
      : getBranchBikeLayout(scheduledClass.branch_id)

    // Verificar autenticación para obtener el userId
    const token = request.cookies.get("auth_token")?.value
    let userId = null
    
    if (token) {
      try {
        const payload = await verifyToken(token)
        userId = Number.parseInt(payload.userId)
      } catch (error) {
        // Si no se puede verificar el token, continuar sin userId
        console.warn("No se pudo verificar el token para bicicletas disponibles")
      }
    }

    // Obtener reservas que ocupan bici: confirmed y attended
    const reservations = await prisma.reservation.findMany({
      where: {
        scheduledClassId: Number(scheduledClassId),
        status: { in: ["confirmed", "attended"] }
      },
      select: {
        bikeNumber: true,
        userId: true,
        userPackage: {
          include: {
            package: true
          }
        }
      }
    })

    // Obtener las reservas del usuario actual si está autenticado
    const userReservations = userId 
      ? reservations.filter(r => r.userId === userId)
      : []

    // Verificar si el usuario tiene paquete semana ilimitada
    const hasUnlimitedPackage = userReservations.some(r => 
      r.userPackage?.package?.id === 3 || 
      r.userPackage?.package?.name?.toLowerCase().includes('semana ilimitada')
    )

    // Crear array de bicicletas basado en configuración de la sucursal.
    const allBikes = Array.from({ length: layout.bikeCount }, (_, i) => {
      const bikeNumber = i + 1
      const isReservedByOthers = reservations.some(r => 
        r.bikeNumber === bikeNumber && r.userId !== userId
      )
      const isReservedByUser = userReservations.some(r => 
        r.bikeNumber === bikeNumber
      )

      // Una bicicleta está disponible si:
      // 1. No está reservada por otros usuarios, Y
      // 2. Si el usuario actual ya tiene una reserva en esta clase:
      //    - Si tiene paquete semana ilimitada: no puede reservar ninguna bicicleta
      //    - Si no tiene paquete semana ilimitada: puede reservar bicicletas diferentes a las que ya tiene
      let available = !isReservedByOthers

      if (userId && userReservations.length > 0) {
        if (hasUnlimitedPackage) {
          // Con paquete semana ilimitada, no puede hacer más reservas
          available = false
        } else {
          // Con otros paquetes, no puede usar la misma bicicleta que ya tiene reservada
          available = available && !isReservedByUser
        }
      }

      return {
        id: bikeNumber,
        available,
        reservedByUser: isReservedByUser
      }
    })

    return NextResponse.json({
      bikes: allBikes,
      userHasReservation: userReservations.length > 0,
      userHasUnlimitedPackage: hasUnlimitedPackage,
      canMakeMultipleReservations: userId && userReservations.length > 0 && !hasUnlimitedPackage,
      branchId: scheduledClass.branch_id,
      layout: {
        bikeCount: layout.bikeCount,
        positions: layout.positions,
      },
    })
  } catch (error) {
    console.error("Error al obtener bicicletas disponibles:", error)
    return NextResponse.json(
      { error: "Error al obtener bicicletas disponibles" },
      { status: 500 }
    )
  }
}