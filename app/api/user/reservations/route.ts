import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"
import { formatDateFromDB, formatTimeFromDB, formatDateToSpanish, createClassDateTime } from "@/lib/utils/date"

const prisma = new PrismaClient()

// GET - Obtener reservaciones del usuario
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const userId = Number.parseInt(payload.userId)
    
    // Obtener query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // upcoming/past
    
    const now = new Date()
    
    // Obtener TODAS las reservaciones del usuario primero
    const allReservations = await prisma.reservation.findMany({
      where: { 
        userId
      },
      include: {
        scheduledClass: {
          include: {
            classType: true,
            instructor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      },
      orderBy: {
        scheduledClass: {
          date: 'asc'
        }
      }
    })

    // Filtrar las reservaciones según fecha Y hora combinadas
    const filteredReservations = allReservations.filter(res => {
      const classDateTime = createClassDateTime(
        res.scheduledClass.date.toISOString(), 
        res.scheduledClass.time.toISOString()
      )
      
      if (status === "past") {
        return classDateTime < now
      } else {
        return classDateTime >= now
      }
    })

    // Ordenar según el status
    if (status === "past") {
      filteredReservations.sort((a, b) => {
        const dateTimeA = createClassDateTime(a.scheduledClass.date.toISOString(), a.scheduledClass.time.toISOString())
        const dateTimeB = createClassDateTime(b.scheduledClass.date.toISOString(), b.scheduledClass.time.toISOString())
        return dateTimeB.getTime() - dateTimeA.getTime() // Más recientes primero
      })
    } else {
      filteredReservations.sort((a, b) => {
        const dateTimeA = createClassDateTime(a.scheduledClass.date.toISOString(), a.scheduledClass.time.toISOString())
        const dateTimeB = createClassDateTime(b.scheduledClass.date.toISOString(), b.scheduledClass.time.toISOString())
        return dateTimeA.getTime() - dateTimeB.getTime() // Más próximas primero
      })
    }

    // Formatear los datos para la respuesta usando las utilidades corregidas
    const formattedReservations = filteredReservations.map(res => {
      const instructorName = `${res.scheduledClass.instructor.user.firstName} ${res.scheduledClass.instructor.user.lastName}`
      
      return {
        id: res.id,
        className: res.scheduledClass.classType.name,
        instructor: instructorName,
        date: formatDateFromDB(res.scheduledClass.date.toISOString()),
        dateFormatted: formatDateToSpanish(res.scheduledClass.date.toISOString()),
        time: formatTimeFromDB(res.scheduledClass.time.toISOString()),
        duration: `${res.scheduledClass.classType.duration} min`,
        location: "Sala Principal",
        status: res.status,
        canCancel: status !== "past" && res.status !== "cancelled",
        package: res.userPackage?.package.name || "Pase individual",
        // Campos adicionales para el frontend
        category: res.scheduledClass.classType.category || "",
        intensity: res.scheduledClass.classType.intensity || "",
        capacity: res.scheduledClass.maxCapacity || 0,
        description: res.scheduledClass.classType.description || "",
        bikeNumber: res.bikeNumber ?? null
      }
    })

    return NextResponse.json(formattedReservations)
  } catch (error) {
    console.error("Error fetching user reservations:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}