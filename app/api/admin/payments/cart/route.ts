import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { db } from "@/lib/db"
import { getUnlimitedWeekExpiryDate } from "@/lib/utils/unlimited-week"

interface CartItem {
  packageId: number
  quantity: number
  selectedWeek?: string // ISO date string for unlimited week Monday
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, branch_id, items, notes } = body

    if (!user_id || !branch_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Faltan campos requeridos: user_id, branch_id, items" }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { user_id } })
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })

    const branch = await db.branch.findUnique({ where: { id: branch_id } })
    if (!branch) return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 })

    const results = await db.$transaction(async (tx) => {
      const created: { paymentId: number; packageName: string; amount: number }[] = []

      for (const item of items as CartItem[]) {
        const { packageId, quantity, selectedWeek } = item
        if (!packageId || !quantity || quantity < 1) continue

        const packageData = await tx.package.findUnique({ where: { id: packageId } })
        if (!packageData) throw new Error(`Paquete ${packageId} no encontrado`)

        const branchPrice = await tx.package_prices.findFirst({
          where: { package_id: packageId, branch_id, is_active: true },
        })
        const unitPrice = branchPrice ? Number(branchPrice.price) : Number(packageData.price)

        const isUnlimited = packageId === 3

        for (let i = 0; i < quantity; i++) {
          let purchaseDate = new Date()
          let expiryDate = new Date()

          if (isUnlimited && selectedWeek) {
            const [y, m, d] = selectedWeek.split("-").map(Number)
            purchaseDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
            expiryDate = getUnlimitedWeekExpiryDate(purchaseDate)
          } else {
            expiryDate.setUTCDate(expiryDate.getUTCDate() + packageData.validityDays)
          }

          const userPackage = await tx.userPackage.create({
            data: {
              userId: user_id,
              packageId,
              purchaseDate,
              expiryDate,
              classesRemaining: packageData.classCount,
              isActive: true,
              paymentStatus: "completed",
              paymentMethod: "cash",
              branch_id,
            },
          })

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const metadata: any = { created_by: "admin" }
          if (notes) metadata.notes = notes
          if (isUnlimited && selectedWeek) {
            metadata.unlimitedWeek = {
              start: purchaseDate.toISOString().slice(0, 10),
              end: expiryDate.toISOString().slice(0, 10),
            }
          }

          const payment = await tx.payment.create({
            data: {
              userId: user_id,
              amount: unitPrice,
              paymentMethod: "cash",
              status: "completed",
              userPackageId: userPackage.id,
              paymentDate: new Date(),
              metadata,
            },
          })

          created.push({ paymentId: payment.id, packageName: packageData.name, amount: unitPrice })
        }
      }

      return created
    })

    const total = results.reduce((s, r) => s + r.amount, 0)

    return NextResponse.json(
      {
        message: "Carrito procesado exitosamente",
        count: results.length,
        total,
        items: results,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error processing admin cart:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
