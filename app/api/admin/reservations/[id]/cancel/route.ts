import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();
const UNLIMITED_WEEK_PACKAGE_ID = 3; // ID del paquete "Semana Ilimitada"

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

      // 3. Lógica de Reembolso Condicional
      let performRefund = false;
      if (reservation.userPackageId && reservation.userPackage?.packageId !== UNLIMITED_WEEK_PACKAGE_ID) {
        performRefund = true;
      }

      if (performRefund) {
        // Si es un paquete y NO es Semana Ilimitada, proceder con el reembolso
        await prisma.userPackage.update({
          where: { id: reservation.userPackageId! }, // userPackageId es !null aquí
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
        // Asegurarse que userAccountBalance exista o manejar el caso
        const userAccountBalance = await prisma.userAccountBalance.findUnique({
          where: { userId: reservation.userId },
        });

        if (userAccountBalance) {
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
        } else {
          // Opcional: Crear el UserAccountBalance si no existe y se espera que exista
          // Para este caso, si no existe, simplemente no se puede actualizar.
          // Podría ser un log o un manejo de error específico si es un estado inesperado.
          console.warn(`UserAccountBalance no encontrado para userId: ${reservation.userId} durante el reembolso.`);
        }
        

        // 5. Registrar la transacción en el balance del usuario
        await prisma.balanceTransaction.create({
          data: {
            userId: reservation.userId,
            type: "refund",
            amount: 1, // Representa una clase devuelta
            description: `Reembolso por cancelación administrativa: ${reason}`,
            relatedReservationId: reservationId,
            createdBy: parseInt(payload.userId) // payload.userId es string, convertir a int
          }
        });
      }
      // Si es Semana Ilimitada (UNLIMITED_WEEK_PACKAGE_ID), no se hace reembolso de clase.
      // Si no usó paquete (reservation.userPackageId es null), tampoco se hace reembolso de paquete.

      // 6. Notificar al usuario
      await prisma.notifications.create({
        data: {
          user_id: reservation.userId,
          type: "reservation_cancelled",
          title: "Reservación cancelada",
          message: `Tu reservación ha sido cancelada por un administrador. Motivo: ${reason}`,
          data: {
            reservationId: reservationId,
            refunded: performRefund // Usar la variable para reflejar si el reembolso ocurrió
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