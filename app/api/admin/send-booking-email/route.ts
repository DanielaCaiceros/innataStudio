import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { sendBookingConfirmationEmail, BookingEmailDetails } from "@/lib/email"; // Assuming BookingEmailDetails is exported or defined in email.ts


const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    
    const payload = await verifyToken(token);
    const adminUser = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(payload.userId) },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado. Se requiere rol de administrador." }, { status: 403 });
    }

    const body = await request.json();
    const { userEmail, userName, details } = body;

    if (!userEmail || !userName || !details) {
      return NextResponse.json({ error: "Faltan datos para enviar el correo (userEmail, userName, details)" }, { status: 400 });
    }

    // Validate details structure (basic check)
    if (
      !details.className ||
      !details.date ||
      !details.time ||
      !details.instructor ||
      !details.confirmationCode
    ) {
      return NextResponse.json({ error: "Faltan detalles esenciales en la información de la reserva para el correo." }, { status: 400 });
    }
    
    // Type assertion for details if BookingEmailDetails is correctly imported/defined
    const emailDetails: BookingEmailDetails = details;

    await sendBookingConfirmationEmail(userEmail, userName, emailDetails);

    return NextResponse.json({ success: true, message: "Correo de confirmación de reserva enviado." });

  } catch (error) {
    console.error("Error en API /api/admin/send-booking-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor al enviar correo.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
