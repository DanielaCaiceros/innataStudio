import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { verifyToken } from "@/lib/jwt" // Assuming you have verifyToken in jwt lib

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value
    if (!token) {
      // If not authenticated, they haven't purchased it in a way that's linked to their account
      return NextResponse.json({ hasPurchased: false })
    }

    let userId: number;
    try {
      const payload = await verifyToken(token)
      userId = Number.parseInt(payload.userId)
    } catch (error) {
      // Invalid token, treat as not authenticated for this check
      console.error("Invalid token:", error)
      return NextResponse.json({ hasPurchased: false })
    }

    const existingFirstTimePackage = await prisma.userPackage.findFirst({
      where: {
        userId: userId,
        package: {
          is_first_time_only: true,
        },
        // Optional: you might want to check if the package purchase was successful (e.g. paymentStatus: "paid")
        // paymentStatus: "paid", 
      },
    })

    if (existingFirstTimePackage) {
      return NextResponse.json({ hasPurchased: true })
    } else {
      return NextResponse.json({ hasPurchased: false })
    }
  } catch (error) {
    console.error("Error checking for first time package:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
