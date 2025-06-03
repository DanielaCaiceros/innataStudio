import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from 'next/headers'

const prisma = new PrismaClient()

// GET - Exportar pagos a CSV
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación del admin usando cookies
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userData = JSON.parse(userCookie.value);
    if (!userData || userData.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener pagos con información relacionada
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            user_id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        userPackage: {
          select: {
            id: true,
            package: {
              select: {
                id: true,
                name: true,
                price: true,
                classCount: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Crear contenido CSV
    const csvHeaders = [
      'ID',
      'Cliente',
      'Email',
      'Paquete',
      'Monto',
      'Fecha',
      'Método de Pago',
      'Estado',
      'Stripe Payment Intent ID',
      'Metadata'
    ]

    const csvRows = payments.map(payment => [
      payment.id,
      `${payment.user.firstName} ${payment.user.lastName}`,
      payment.user.email,
      payment.userPackage?.package.name || 'N/A',
      Number(payment.amount),
      payment.createdAt?.toISOString().split('T')[0] || payment.paymentDate.toISOString().split('T')[0],
      payment.paymentMethod === 'stripe' ? 'Online (Stripe)' : 'Efectivo',
      payment.status,
      payment.stripePaymentIntentId || '',
      payment.metadata ? JSON.stringify(payment.metadata) : ''
    ])

    // Combinar headers y rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(cell => 
          // Escapar comas y comillas en el contenido
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',')
      )
    ].join('\n')

    // Crear respuesta con el archivo CSV
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="pagos-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

    return response

  } catch (error) {
    console.error("Error exporting payments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
