import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// GET - Obtener clases programadas
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol de admin
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(payload.userId) },
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const branchId = searchParams.get("branchId")

    const whereClause: any = {};
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate + "T00:00:00.000Z"),
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }
    if (branchId) {
      const branchIdInt = parseInt(branchId, 10);
      if (!isNaN(branchIdInt)) {
        whereClause.branch_id = branchIdInt;
      }
    }

    const scheduledClassesRaw = await prisma.scheduledClass.findMany({
      where: whereClause,
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
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        waitlist: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        branches: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    })

    // Calculate totalReservations, cancelledReservations, availableSpots for each class
    const scheduledClasses = scheduledClassesRaw.map(cls => {
      const totalReservations = cls.reservations.filter(r => r.status !== 'cancelled').length;
      const cancelledReservations = cls.reservations.filter(r => r.status === 'cancelled').length;
      const availableSpots = cls.maxCapacity - totalReservations;
      return {
        ...cls,
        totalReservations,
        cancelledReservations,
        availableSpots,
      };
    });

    return NextResponse.json(scheduledClasses)
  } catch (error) {
    console.error("Error fetching scheduled classes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Crear nueva clase programada
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol de admin
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(payload.userId) },
    })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { classTypeId, instructorId, date, time, maxCapacity, branchId } = body

    if (!branchId) {
      return NextResponse.json({ error: "branchId es requerido" }, { status: 400 })
    }

    const branchIdInt = parseInt(branchId, 10)
    if (!Number.isInteger(branchIdInt) || branchIdInt <= 0 || String(branchIdInt) !== String(branchId).trim()) {
      return NextResponse.json({ error: "branchId debe ser un entero positivo" }, { status: 400 })
    }

    // Verificar que la sucursal existe
    const branch = await prisma.branch.findUnique({ where: { id: branchIdInt } })
    if (!branch) {
      return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 })
    }

    // Validar que no haya solapamiento de horarios en la misma sucursal
    const utcDate = new Date(date + "T00:00:00.000Z");
    const classTime = new Date(`1970-01-01T${time}:00.000Z`)

    const existingClass = await prisma.scheduledClass.findFirst({
      where: {
        date: utcDate,
        time: classTime,
        branch_id: branchIdInt,
      },
    })

    if (existingClass) {
      return NextResponse.json({ error: "Ya existe una clase programada en este horario para esta sucursal" }, { status: 400 })
    }

    // Verificar que el instructor existe
    const instructor = await prisma.instructor.findUnique({
      where: { id: Number.parseInt(instructorId) },
    })

    if (!instructor) {
      return NextResponse.json({ error: "Instructor no encontrado" }, { status: 404 })
    }

    // Verificar que el tipo de clase existe
    const classType = await prisma.classType.findUnique({
      where: { id: Number.parseInt(classTypeId) },
    })

    if (!classType) {
      return NextResponse.json({ error: "Tipo de clase no encontrado" }, { status: 404 })
    }

    // Crear la clase programada
    const scheduledClass = await prisma.scheduledClass.create({
      data: {
        classTypeId: Number.parseInt(classTypeId),
        instructorId: Number.parseInt(instructorId),
        date: utcDate,
        time: classTime,
        maxCapacity: Number.parseInt(maxCapacity) || 13,
        availableSpots: Number.parseInt(maxCapacity) || 13,
        status: "scheduled",
        branch_id: branchIdInt,
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
        waitlist: true,
      },
    })

    console.log("Created scheduled class:", scheduledClass)

    return NextResponse.json(scheduledClass, { status: 201 })
  } catch (error) {
    console.error("Error creating scheduled class:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
