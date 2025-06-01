import { type NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt"; // Assuming verifyToken is in this path

const prisma = new PrismaClient();

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { user_id: Number.parseInt(payload.userId as string) }, // Ensure payload.userId is treated as string
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const classTypeId = parseInt(params.id, 10);
    if (isNaN(classTypeId)) {
      return NextResponse.json({ error: "ID de tipo de clase inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, duration, intensity, category, capacity } = body;

    // Basic validation
    if (!name || !duration || !intensity || !category || !capacity) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const updatedClassType = await prisma.classType.update({
      where: { id: classTypeId },
      data: {
        name,
        description,
        duration: Number.parseInt(duration as string), // Ensure duration is parsed as number
        intensity,
        category,
        capacity: Number.parseInt(capacity as string), // Ensure capacity is parsed as number
        updatedAt: new Date(), // Explicitly set updatedAt
      },
    });

    return NextResponse.json(updatedClassType);
  } catch (error: any) {
    console.error("Error updating class type:", error);
    if (error.code === 'P2025') { // Prisma error code for record not found
        return NextResponse.json({ error: "Tipo de clase no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Add a basic GET handler for testing purposes if needed, or if a specific GET by ID is required.
// For now, only PUT and later DELETE will be implemented here.

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    // Ensure payload.userId is treated as string before parsing
    const userId = parseInt(payload.userId as string, 10); 
    if (isNaN(userId)) {
        return NextResponse.json({ error: "ID de usuario inválido en el token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const classTypeId = await parseInt(params.id, 10);
    if (isNaN(classTypeId)) {
      return NextResponse.json({ error: "ID de tipo de clase inválido" }, { status: 400 });
    }

    // Check if the class type exists before attempting to delete
    const classTypeExists = await prisma.classType.findUnique({
      where: { id: classTypeId },
    });

    if (!classTypeExists) {
      return NextResponse.json({ error: "Tipo de clase no encontrado" }, { status: 404 });
    }

    await prisma.classType.delete({
      where: { id: classTypeId },
    });

    return NextResponse.json({ message: "Tipo de clase eliminado exitosamente" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting class type:", error);
    // Prisma's P2025 error (Record to delete does not exist) should be caught by the explicit check above.
    // If other constraints exist, specific error codes (e.g., P2003 for foreign key constraint violation) might need handling.
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
