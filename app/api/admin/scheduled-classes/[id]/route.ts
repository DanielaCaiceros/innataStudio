import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt"

const prisma = new PrismaClient()

// Función auxiliar para verificar el token y el rol de admin
async function authenticateAdmin(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return { error: 'No autenticado' };
  }

  try {
    const payload = await verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(payload.userId) },
      select: { role: true },
    });

    if (!user || user.role !== "admin") {
      return { error: 'Acceso denegado' };
    }

    return { user: user };
  } catch (error) {
    console.error('Error autenticando admin:', error);
    return { error: 'Token inválido o error de verificación' };
  }
}

// PUT - Actualizar una clase programada
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json()

    if (!body.classTypeId || !body.instructorId || !body.date || !body.time) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      )
    }

    const existingClass = await prisma.scheduledClass.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existingClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 })
    }

    const utcDate = new Date(body.date + "T00:00:00.000Z");
    const classTime = new Date(`1970-01-01T${body.time}:00.000Z`)

    const conflict = await prisma.scheduledClass.findFirst({
      where: {
        id: { not: parseInt(id) },
        date: utcDate,
        time: classTime,
        instructorId: parseInt(body.instructorId),
        status: "scheduled",
      },
    })

    if (conflict) {
      return NextResponse.json(
        { error: "El instructor ya tiene una clase programada en este horario" },
        { status: 400 }
      )
    }

    const confirmedReservations = await prisma.reservation.count({
      where: {
        scheduledClassId: parseInt(id),
        status: "confirmed",
      },
    })

    const newMax = parseInt(body.maxCapacity)
    if (confirmedReservations > newMax) {
      return NextResponse.json({
        error: "Hay más reservas confirmadas que la nueva capacidad",
      }, { status: 400 })
    }

    const updatedClass = await prisma.scheduledClass.update({
      where: { id: parseInt(id) },
      data: {
        classTypeId: parseInt(body.classTypeId),
        instructorId: parseInt(body.instructorId),
        date: utcDate,
        time: classTime,
        maxCapacity: newMax,
        availableSpots: newMax - confirmedReservations,
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
          where: { status: "confirmed" },
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedClass)
  } catch (error) {
    console.error("Error updating scheduled class:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


// DELETE - Eliminar una clase programada
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Verificar si la clase existe
    const existingClass = await prisma.scheduledClass.findUnique({
      where: { id: parseInt(id) },
      include: {
        reservations: true,
      },
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: "Clase no encontrada" },
        { status: 404 }
      )
    }

    // Verificar si hay reservas confirmadas
    if (existingClass.reservations.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una clase con reservas confirmadas" },
        { status: 400 }
      )
    }

    // Eliminar la clase
    await prisma.scheduledClass.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ message: "Clase eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting scheduled class:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET - Obtener una clase programada por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await authenticateAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const scheduledClass = await prisma.scheduledClass.findUnique({
      where: { id: parseInt(id) },
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
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        waitlist: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    })

    if (!scheduledClass) {
      return NextResponse.json(
        { error: "Clase no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(scheduledClass)
  } catch (error) {
    console.error("Error fetching scheduled class by ID:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
