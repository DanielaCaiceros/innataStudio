import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

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
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Definir filtro para las reservaciones según el status
    const dateFilter = status === "past" 
      ? { lt: today } // Para reservaciones pasadas
      : { gte: today } // Para reservaciones futuras

    // Obtener las reservaciones del usuario
    const reservations = await prisma.reservation.findMany({
      where: { 
        userId,
        scheduledClass: {
          date: dateFilter
        }
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
          date: status === "past" ? 'desc' : 'asc'
        }
      }
    })

    // Formatear los datos para la respuesta
    const formattedReservations = reservations.map(res => {
      const instructorName = `${res.scheduledClass.instructor.user.firstName} ${res.scheduledClass.instructor.user.lastName}`
      
      return {
        id: res.id,
        className: res.scheduledClass.classType.name,
        instructor: instructorName,
        date: res.scheduledClass.date.toISOString().split('T')[0],
        time: res.scheduledClass.time.toTimeString().slice(0, 5),
        duration: `${res.scheduledClass.classType.duration} min`,
        location: "Sala Principal",
        status: res.status,
        canCancel: status !== "past" && res.status !== "cancelled",
        package: res.userPackage?.package.name || "Pase individual"
      }
    })

    return NextResponse.json(formattedReservations)
  } catch (error) {
    console.error("Error fetching user reservations:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
