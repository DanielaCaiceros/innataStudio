import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";

const prisma = new PrismaClient();

// POST - Procesar pago para una reservación
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
        user: true,
        userPackage: true,
        scheduledClass: {
          include: {
            classType: true
          }
        }
      }
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservación no encontrada" }, { status: 404 });
    }

    const body = await request.json();
    const { paymentMethod, amount } = body;

    if (!paymentMethod) {
      return NextResponse.json({ error: "Método de pago requerido" }, { status: 400 });
    }

    // Si la reservación está asociada a un paquete, actualizar el estado de pago del paquete
    if (reservation.userPackageId) {
      await prisma.userPackage.update({
        where: { id: reservation.userPackageId },
        data: {
          paymentStatus: "paid",
          paymentMethod: paymentMethod
        }
      });
    }

    // IMPORTANTE: Actualizar también la reservación misma
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentMethod: paymentMethod === "cash" ? "cash" : paymentMethod,
        status: "confirmed" // Asegurar que esté confirmada después del pago
      }
    });

    // Crear un registro de pago para la transacción
    const payment = await prisma.payment.create({
      data: {
        userId: reservation.userId,
        userPackageId: reservation.userPackageId,
        amount: amount || 0,
        paymentMethod: paymentMethod,
        status: "completed",
        transactionId: `ADMIN-${Date.now()}`, // Generar un ID de transacción para referencia
        metadata: {
          processedBy: payload.userId,
          reservationId: reservationId,
          note: "Pago procesado por administrador"
        }
      }
    });

    // Registrar la transacción en el balance del usuario
    await prisma.balanceTransaction.create({
      data: {
        userId: reservation.userId,
        type: "payment",
        amount: 1, // Representa una clase pagada
        description: `Pago por clase: ${reservation.scheduledClass.classType.name}`,
        relatedReservationId: reservation.id,
        relatedPaymentId: payment.id,
        createdBy: parseInt(payload.userId)
      }
    });

    // Si es apropiado, enviar una notificación al usuario
    await prisma.notifications.create({
      data: {
        user_id: reservation.userId,
        type: "payment_confirmation",
        title: "Pago procesado con éxito",
        message: `Tu pago para la clase ${reservation.scheduledClass.classType.name} ha sido procesado correctamente.`,
        data: {
          reservationId: reservation.id,
          paymentMethod: paymentMethod,
          amount: amount || 0
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Pago procesado con éxito",
      paymentId: payment.id,
      paymentMethod: paymentMethod,
      reservationId: reservation.id
    });
  } catch (error) {
    console.error("Error al procesar pago:", error);
    return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
  }
}