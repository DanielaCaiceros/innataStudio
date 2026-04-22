import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET - Obtener clases de una semana completa con datos de coach
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const branchId = searchParams.get("branchId")

    let branchIdInt: number | null = null
    if (branchId !== null) {
      const parsed = parseInt(branchId, 10)
      if (!Number.isInteger(parsed) || parsed <= 0 || String(parsed) !== branchId.trim()) {
        return NextResponse.json({ error: "branchId debe ser un entero positivo" }, { status: 400 })
      }
      branchIdInt = parsed
    }

    // Default: semana actual (lunes a domingo UTC)
    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0=Dom, 1=Lun...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    let startDate: Date
    let endDate: Date

    if (startDateParam) {
      startDate = new Date(startDateParam + "T00:00:00.000Z")
    } else {
      startDate = new Date(now)
      startDate.setUTCDate(now.getUTCDate() + diffToMonday)
      startDate.setUTCHours(0, 0, 0, 0)
    }

    if (endDateParam) {
      endDate = new Date(endDateParam + "T23:59:59.999Z")
    } else {
      endDate = new Date(startDate)
      endDate.setUTCDate(startDate.getUTCDate() + 6)
      endDate.setUTCHours(23, 59, 59, 999)
    }

    const scheduledClasses = await prisma.scheduledClass.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        status: "scheduled",
        ...(branchIdInt ? { branch_id: branchIdInt } : {}),
      },
      include: {
        classType: true,
        instructor: {
          include: {
            user: {
              select: { firstName: true, lastName: true, profileImage: true },
            },
          },
        },
        coInstructors: {
          include: {
            instructor: {
              include: {
                user: { select: { firstName: true, lastName: true, profileImage: true } },
              },
            },
          },
        },
        reservations: {
          where: { status: "confirmed" },
          select: { id: true },
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    })

    const formatted = scheduledClasses.map((cls) => ({
      id: cls.id,
      classType: {
        id: cls.classType.id,
        name: cls.classType.name,
        duration: cls.classType.duration,
        description: cls.classType.description ?? null,
      },
      instructor: {
        id: cls.instructor.id,
        name: `${cls.instructor.user.firstName} ${cls.instructor.user.lastName}`,
        profileImage: cls.instructor.user.profileImage ?? null,
      },
      coInstructors: cls.coInstructors.map((ci) => ({
        id: ci.instructor.id,
        name: `${ci.instructor.user.firstName} ${ci.instructor.user.lastName}`,
        profileImage: ci.instructor.user.profileImage ?? null,
      })),
      date: cls.date.toISOString(),
      time: cls.time.toISOString(),
      maxCapacity: cls.maxCapacity,
      availableSpots: cls.availableSpots,
      enrolledCount: cls.reservations.length,
      isSpecial: cls.isSpecial,
      specialPrice: cls.specialPrice ? Number(cls.specialPrice) : null,
      specialMessage: cls.specialMessage ?? null,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching weekly classes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
