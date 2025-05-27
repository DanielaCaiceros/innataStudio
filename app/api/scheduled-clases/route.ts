import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { startOfWeek, endOfWeek } from "date-fns"

const prisma = new PrismaClient()

// GET - Obtener clases programadas disponibles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")

    // Si no se proporciona fecha, usar la fecha actual
    const referenceDate = dateParam ? new Date(dateParam) : new Date()

    // Obtener el inicio y fin de la semana
    const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 }) // Lunes
    const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 }) // Domingo

    const scheduledClasses = await prisma.scheduledClass.findMany({
      where: {
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: "scheduled",
      },
      include: {
        classType: true,
        instructor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reservations: {
          where: {
            status: "confirmed",
          },
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    })

    // Formatear la respuesta para el frontend
    const formattedClasses = scheduledClasses.map((scheduledClass) => ({
      id: scheduledClass.id,
      classType: {
        id: scheduledClass.classType.id,
        name: scheduledClass.classType.name,
        duration: scheduledClass.classType.duration,
        description: scheduledClass.classType.description,
        intensity: scheduledClass.classType.intensity,
        category: scheduledClass.classType.category,
      },
      instructor: {
        id: scheduledClass.instructor.id,
        name: `${scheduledClass.instructor.user.firstName} ${scheduledClass.instructor.user.lastName}`,
      },
      date: scheduledClass.date,
      time: scheduledClass.time,
      maxCapacity: scheduledClass.maxCapacity,
      availableSpots: scheduledClass.availableSpots,
      enrolledCount: scheduledClass.reservations.length,
    }))

    return NextResponse.json(formattedClasses)
  } catch (error) {
    console.error("Error fetching scheduled classes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 