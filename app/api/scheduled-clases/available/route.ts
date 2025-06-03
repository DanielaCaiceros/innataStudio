import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Obtener clases disponibles para la semana actual o fecha específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get("date")

    console.log("📅 Fecha solicitada:", dateParam)

    let dateFilter = {}
    
    if (dateParam) {
      // Si se proporciona una fecha específica, buscar clases para ese día exacto
      const targetDate = new Date(dateParam + "T00:00:00.000Z")
      const nextDay = new Date(targetDate)
      nextDay.setUTCDate(nextDay.getUTCDate() + 1)
      
      dateFilter = {
        date: {
          gte: targetDate,
          lt: nextDay,
        }
      }
      
      console.log("🔍 Filtro de fecha:", {
        gte: targetDate.toISOString(),
        lt: nextDay.toISOString()
      })
    } else {
      // Si no se proporciona fecha, obtener clases de los próximos 30 días
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      
      const futureLimit = new Date(today)
      futureLimit.setUTCDate(futureLimit.getUTCDate() + 30)
      
      dateFilter = {
        date: {
          gte: today,
          lte: futureLimit
        }
      }
      
      console.log("🔍 Filtro sin fecha específica (próximos 30 días):", {
        gte: today.toISOString(),
        lte: futureLimit.toISOString()
      })
    }

    const scheduledClasses = await prisma.scheduledClass.findMany({
      where: {
        ...dateFilter,
        status: "scheduled",
        availableSpots: {
          gt: 0,
        },
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

    console.log(`📊 Clases encontradas en BD: ${scheduledClasses.length}`)
    
    // Debug: mostrar las clases encontradas
    scheduledClasses.forEach((cls, index) => {
      console.log(`📋 Clase ${index + 1}:`, {
        id: cls.id,
        name: cls.classType.name,
        date: cls.date.toISOString(),
        time: cls.time.toISOString(),
        availableSpots: cls.availableSpots,
        maxCapacity: cls.maxCapacity
      })
    })

    // Formatear la respuesta para el frontend
    const formattedClasses = scheduledClasses.map((scheduledClass) => {
      // Convertir la fecha UTC a formato local para mostrar
      const localDate = new Date(scheduledClass.date)
      
      // Para el tiempo, extraer solo la hora y minutos
      const timeDate = new Date(scheduledClass.time)
      const timeString = timeDate.toISOString()
      
      const formatted = {
        id: scheduledClass.id,
        classType: {
          id: scheduledClass.classType.id,
          name: scheduledClass.classType.name,
          duration: scheduledClass.classType.duration,
          description: scheduledClass.classType.description,
        },
        instructor: {
          id: scheduledClass.instructor.id,
          name: `${scheduledClass.instructor.user.firstName} ${scheduledClass.instructor.user.lastName}`,
        },
        date: localDate.toISOString(),
        time: timeString,
        maxCapacity: scheduledClass.maxCapacity,
        availableSpots: scheduledClass.availableSpots,
        enrolledCount: scheduledClass.reservations.length,
      }
      
      console.log(`🔄 Clase formateada:`, {
        id: formatted.id,
        name: formatted.classType.name,
        date: formatted.date,
        time: formatted.time
      })
      
      return formatted
    })

    console.log(`✅ Enviando ${formattedClasses.length} clases al frontend`)
    
    return NextResponse.json(formattedClasses)
  } catch (error) {
    console.error("❌ Error fetching available classes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}