import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// GET - Obtener detalles de una reservación específica
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Obtener la reservación con información relacionada
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        scheduledClass: {
          include: {
            classType: true,
            instructor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
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
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    // Formatear los datos para la respuesta
    const formattedReservation = {
      id: reservation.id,
      user: `${reservation.user.firstName} ${reservation.user.lastName}`,
      userId: reservation.user.user_id,
      email: reservation.user.email,
      phone: reservation.user.phone || "",
      class: reservation.scheduledClass.classType.name,
      classId: reservation.scheduledClass.classType.id,
      instructor: `${reservation.scheduledClass.instructor.user.firstName} ${reservation.scheduledClass.instructor.user.lastName}`,
      date: reservation.scheduledClass.date.toISOString().split('T')[0],
      time: reservation.scheduledClass.time.toTimeString().slice(0, 5),
      status: reservation.status,
      package: reservation.userPackage?.package.name || "PASE INDIVIDUAL",
      packageId: reservation.userPackage?.packageId,
      remainingClasses: reservation.userPackage?.classesRemaining || 0,
      paymentStatus: reservation.userPackage?.paymentStatus || "pending",
      paymentMethod: reservation.userPackage?.paymentMethod || "pending",
      cancellationReason: reservation.cancellationReason || "",
      cancelledAt: reservation.cancelledAt || null,
      createdAt: reservation.createdAt
    };

    return NextResponse.json(formattedReservation);
  } catch (error) {
    console.error("Error al obtener detalles de reservación:", error);
    return NextResponse.json({ error: "Error al obtener detalles de reservación" }, { status: 500 });
  }
}

// PUT - Actualizar una reservación
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación (admin)
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "No tiene permisos de administrador" }, { status: 403 });
    }

    const reservationId = parseInt(params.id);
    if (isNaN(reservationId)) {
      return NextResponse.json({ error: "ID de reservación no válido" }, { status: 400 });
    }

    // Obtener la reservación existente
    const existingReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        scheduledClass: {
          include: {
            classType: true
          }
        },
        userPackage: true
      }
    });

    if (!existingReservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { class: className, date, time, status } = body;

    // Si cambiamos la clase o la fecha/hora, debemos verificar disponibilidad
    if ((className && className !== existingReservation.scheduledClass.classType.name) ||
        (date && date !== existingReservation.scheduledClass.date.toISOString().split('T')[0]) ||
        (time && time !== existingReservation.scheduledClass.time.toTimeString().slice(0, 5))) {
      
      // Implementación para cambiar la clase/fecha/hora
      // Esto requeriría:
      // 1. Encontrar la nueva clase programada
      // 2. Verificar disponibilidad
      // 3. Actualizar espacios disponibles en ambas clases
      // 4. Actualizar la reserva
      
      // Esta es una implementación básica que asume que el cambio es válido
      // En una implementación completa, se verificaría la disponibilidad
      
      // TODO: Implementar cambio de clase/fecha/hora
      return NextResponse.json({ 
        error: "Cambio de clase/fecha/hora no implementado aún. Por favor, cancele esta reservación y cree una nueva." 
      }, { status: 501 });
    }

    // Actualizar el estado de la reservación
    if (status && status !== existingReservation.status) {
      await prisma.reservation.update({
        where: { id: reservationId },
        data: { status }
      });
    }

    // Obtener la reservación actualizada
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        scheduledClass: {
          include: {
            classType: true,
          }
        },
        userPackage: {
          include: {
            package: true
          }
        }
      }
    });

    if (!updatedReservation) {
      return NextResponse.json({ error: "Error al obtener la reservación actualizada" }, { status: 500 });
    }

    // Formatear la respuesta
    const formattedReservation = {
      id: updatedReservation.id,
      user: `${updatedReservation.user.firstName} ${updatedReservation.user.lastName}`,
      email: updatedReservation.user.email,
      phone: updatedReservation.user.phone || "",
      class: updatedReservation.scheduledClass.classType.name,
      date: updatedReservation.scheduledClass.date.toISOString().split('T')[0],
      time: updatedReservation.scheduledClass.time.toTimeString().slice(0, 5),
      status: updatedReservation.status,
      package: updatedReservation.userPackage?.package.name || "PASE INDIVIDUAL",
      remainingClasses: updatedReservation.userPackage?.classesRemaining || 0,
      paymentStatus: updatedReservation.userPackage?.paymentStatus || "pending",
      paymentMethod: updatedReservation.userPackage?.paymentMethod || "pending",
    };

    return NextResponse.json(formattedReservation);
  } catch (error) {
    console.error("Error al actualizar reservación:", error);
    return NextResponse.json({ error: "Error al actualizar reservación" }, { status: 500 });
  }
}