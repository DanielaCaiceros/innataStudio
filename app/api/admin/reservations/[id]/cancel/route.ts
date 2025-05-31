import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// POST - Cancelar una reservación
export async function POST(
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

    // Obtener la reservación
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        scheduledClass: true,
        userPackage: true
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    if (reservation.status === "cancelled") {
      return NextResponse.json({ error: "Esta reservación ya ha sido cancelada" }, { status: 400 });
    }

    // Obtener datos adicionales del cuerpo de la solicitud
    const body = await request.json();
    const { reason = "Cancelado por administrador" } = body;

    // Iniciar transacción para asegurar que todas las operaciones se completen o ninguna
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Actualizar el estado de la reservación
      const updatedReservation = await prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: "cancelled",
          cancellationReason: reason,
          cancelledAt: new Date(),
          canRefund: true
        }
      });

      // 2. Incrementar espacios disponibles en la clase programada
      await prisma.scheduledClass.update({
        where: { id: reservation.scheduledClassId },
        data: {
          availableSpots: {
            increment: 1
          }
        }
      });

      // 3. Si la reservación usó un paquete de clases, devolver la clase al balance
      if (reservation.userPackageId) {
        await prisma.userPackage.update({
          where: { id: reservation.userPackageId },
          data: {
            classesRemaining: {
              increment: 1
            },
            classesUsed: {
              decrement: 1
            }
          }
        });

        // 4. Actualizar el balance de clases del usuario
        await prisma.userAccountBalance.update({
          where: { userId: reservation.userId },
          data: {
            classesAvailable: {
              increment: 1
            },
            classesUsed: {
              decrement: 1
            }
          }
        });

        // 5. Registrar la transacción en el balance del usuario
        await prisma.balanceTransaction.create({
          data: {
            userId: reservation.userId,
            type: "refund",
            amount: 1, // Representa una clase devuelta
            description: `Reembolso por cancelación: ${reason}`,
            relatedReservationId: reservationId,
            createdBy: parseInt(payload.userId)
          }
        });
      }

      // 6. Notificar al usuario
      await prisma.notifications.create({
        data: {
          user_id: reservation.userId,
          type: "reservation_cancelled",
          title: "Reservación cancelada",
          message: `Tu reservación ha sido cancelada. Motivo: ${reason}`,
          data: {
            reservationId: reservationId,
            refunded: reservation.userPackageId ? true : false
          }
        }
      });

      return updatedReservation;
    });

    return NextResponse.json({
      success: true,
      message: "Reservación cancelada con éxito",
      reservation: {
        id: result.id,
        status: result.status,
        cancellationReason: result.cancellationReason,
        cancelledAt: result.cancelledAt
      }
    });
  } catch (error) {
    console.error("Error al cancelar reservación:", error);
    return NextResponse.json({ error: "Error al cancelar reservación" }, { status: 500 });
  }
}