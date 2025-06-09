import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scheduledClassId = searchParams.get("scheduledClassId")

    if (!scheduledClassId) {
      return NextResponse.json({ error: "ID de clase requerido" }, { status: 400 })
    }

    // Obtener todas las reservas confirmadas para esta clase
    const reservations = await prisma.reservation.findMany({
      where: {
        scheduledClassId: Number(scheduledClassId),
        status: "confirmed"
      },
      select: {
        bikeNumber: true
      }
    })

    // Crear array de todas las bicicletas (1-10)
    const allBikes = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      available: !reservations.some(r => r.bikeNumber === i + 1)
    }))

    return NextResponse.json(allBikes)
  } catch (error) {
    console.error("Error al obtener bicicletas disponibles:", error)
    return NextResponse.json(
      { error: "Error al obtener bicicletas disponibles" },
      { status: 500 }
    )
  }
} 