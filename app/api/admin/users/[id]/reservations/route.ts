import { NextResponse, type NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/jwt";
import { formatAdminDate, formatAdminTime } from '@/lib/utils/admin-date';

const prisma = new PrismaClient();

// GET - Obtener todas las reservaciones de un usuario específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "ID de usuario no válido" }, { status: 400 });
    }

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // upcoming/past/all
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Construir filtros de fecha y status según el status
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    let dateFilter = {};
    let statusFilter = {};
    if (status === "upcoming") {
      dateFilter = { gte: today };
      statusFilter = { in: ["confirmed", "pending"] };
    } else if (status === "past") {
      dateFilter = { lt: today };
    } else if (status === "cancelled") {
      statusFilter = "cancelled";
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Obtener las reservaciones del usuario
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: userId,
        ...(status === "cancelled"
          ? { status: statusFilter }
          : { scheduledClass: { date: dateFilter }, ...(Object.keys(statusFilter).length ? { status: statusFilter } : {}) }
        )
      },
      include: {
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
      },
      orderBy: {
        scheduledClass: {
          date: status === "past" ? 'desc' : 'asc'
        }
      },
      take: limit,
      skip: offset
    });

    // Obtener el total de reservaciones para paginación
    const totalReservations = await prisma.reservation.count({
      where: {
        userId: userId,
        ...(status === "cancelled"
          ? { status: statusFilter }
          : { scheduledClass: { date: dateFilter }, ...(Object.keys(statusFilter).length ? { status: statusFilter } : {}) }
        )
      }
    });

    // Formatear las reservaciones
    const formattedReservations = reservations.map((reservation) => {
      const formattedDate = formatAdminDate(reservation.scheduledClass.date);
      const formattedTime = formatAdminTime(reservation.scheduledClass.time);
      
      // Determinar nombre del paquete
      let packageName = "PASE INDIVIDUAL";
      if (reservation.userPackage?.package?.name) {
        packageName = reservation.userPackage.package.name;
      }

      // Determinar método de pago
      let paymentMethod = reservation.paymentMethod || "package";
      if (paymentMethod === "stripe") {
        paymentMethod = "online";
      }

      return {
        id: reservation.id,
        className: reservation.scheduledClass.classType.name,
        instructor: `${reservation.scheduledClass.instructor.user.firstName} ${reservation.scheduledClass.instructor.user.lastName}`,
        date: formattedDate,
        time: formattedTime,
        status: reservation.status,
        package: packageName,
        paymentMethod: paymentMethod,
        bikeNumber: reservation.bikeNumber,
        checkedIn: reservation.status === "attended",
        checkedInAt: reservation.checked_in_at,
        cancelledAt: reservation.cancelledAt,
        createdAt: reservation.createdAt,
        scheduledClassId: reservation.scheduledClassId
      };
    });

    // Calcular estadísticas
    const upcomingCount = await prisma.reservation.count({
      where: {
        userId: userId,
        scheduledClass: {
          date: { gte: today }
        },
        status: { in: ["confirmed", "pending"] }
      }
    });

    const pastCount = await prisma.reservation.count({
      where: {
        userId: userId,
        scheduledClass: {
          date: { lt: today }
        }
      }
    });

    const cancelledCount = await prisma.reservation.count({
      where: {
        userId: userId,
        status: "cancelled"
      }
    });

    const attendedCount = await prisma.reservation.count({
      where: {
        userId: userId,
        status: "attended"
      }
    });

    return NextResponse.json({
      user: {
        id: user.user_id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone || "No registrado"
      },
      reservations: formattedReservations,
      pagination: {
        page,
        limit,
        total: totalReservations,
        totalPages: Math.ceil(totalReservations / limit)
      },
      statistics: {
        upcoming: upcomingCount,
        past: pastCount,
        cancelled: cancelledCount,
        attended: attendedCount,
        total: totalReservations
      }
    });

  } catch (error) {
    console.error("Error al obtener reservaciones del usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
} 