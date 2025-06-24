import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { sendPackagePurchaseConfirmationEmail } from "@/lib/email";

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
    const { userEmail, userName, packageDetails } = body;

    if (!userEmail || !userName || !packageDetails) {
      return NextResponse.json({ error: "Faltan datos para enviar el correo (userEmail, userName, packageDetails)" }, { status: 400 });
    }

    // Basic validation for packageDetails structure
    if (
      !packageDetails.packageName ||
      typeof packageDetails.classCount !== 'number' ||
      !packageDetails.expiryDate ||
      !packageDetails.purchaseDate ||
      typeof packageDetails.price !== 'number'
    ) {
      return NextResponse.json({ error: "Faltan detalles esenciales en la información del paquete para el correo." }, { status: 400 });
    }

    // The 'packageDetails' object from the request body should already match the
    // structure expected by sendPackagePurchaseConfirmationEmail.
    // No explicit type assertion to a named interface is needed here anymore.
    await sendPackagePurchaseConfirmationEmail(userEmail, userName, packageDetails);

    return NextResponse.json({ success: true, message: "Correo de confirmación de paquete enviado." });

  } catch (error) {
    console.error("Error en API /api/admin/send-package-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor al enviar correo de paquete.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
