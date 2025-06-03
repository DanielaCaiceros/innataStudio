import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Debug endpoint para ver todas las clases programadas
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 DEBUG: Consultando todas las clases programadas...")

    const allScheduledClasses = await prisma.scheduledClass.findMany({
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

    console.log(`📊 Total de clases en BD: ${allScheduledClasses.length}`)

    // Mostrar información detallada de cada clase
    const debugInfo = allScheduledClasses.map((cls, index) => {
      const debugData = {
        index: index + 1,
        id: cls.id,
        className: cls.classType.name,
        instructor: `${cls.instructor.user.firstName} ${cls.instructor.user.lastName}`,
        date: {
          raw: cls.date,
          iso: cls.date.toISOString(),
          local: cls.date.toLocaleDateString('es-ES'),
          utc: cls.date.toUTCString()
        },
        time: {
          raw: cls.time,
          iso: cls.time.toISOString(),
          hours: cls.time.getUTCHours(),
          minutes: cls.time.getUTCMinutes(),
          formatted: `${cls.time.getUTCHours().toString().padStart(2, '0')}:${cls.time.getUTCMinutes().toString().padStart(2, '0')}`
        },
        capacity: {
          max: cls.maxCapacity,
          available: cls.availableSpots,
          enrolled: cls.reservations.length
        },
        status: cls.status
      }
      
      console.log(`📋 Clase ${index + 1}:`, debugData)
      return debugData
    })

    // Filtrar específicamente para el 4 de julio de 2025
    const july4Classes = allScheduledClasses.filter(cls => {
      const date = new Date(cls.date)
      return date.getUTCFullYear() === 2025 && 
             date.getUTCMonth() === 6 && // Julio es mes 6 (0-indexed)
             date.getUTCDate() === 4
    })

    console.log(`🎆 Clases específicas para 4 de julio 2025: ${july4Classes.length}`)
    july4Classes.forEach((cls, index) => {
      console.log(`🎆 Julio 4 - Clase ${index + 1}:`, {
        id: cls.id,
        name: cls.classType.name,
        time: `${cls.time.getUTCHours()}:${cls.time.getUTCMinutes().toString().padStart(2, '0')}`,
        available: cls.availableSpots
      })
    })

    return NextResponse.json({
      totalClasses: allScheduledClasses.length,
      july4Classes: july4Classes.length,
      allClasses: debugInfo,
      july4Detailed: july4Classes.map(cls => ({
        id: cls.id,
        className: cls.classType.name,
        date: cls.date.toISOString(),
        time: cls.time.toISOString(),
        timeFormatted: `${cls.time.getUTCHours()}:${cls.time.getUTCMinutes().toString().padStart(2, '0')}`,
        availableSpots: cls.availableSpots,
        maxCapacity: cls.maxCapacity
      }))
    })
    
  } catch (error) {
    console.error("❌ Error en debug endpoint:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}