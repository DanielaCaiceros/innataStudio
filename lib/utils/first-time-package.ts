import type { Prisma, PrismaClient } from "@prisma/client"

// Un paquete marcado como `is_first_time_only` solo puede otorgarse una vez por
// usuario, sin importar el flujo que lo otorgue (checkout público o admin).
type PrismaLike = PrismaClient | Prisma.TransactionClient

export const FIRST_TIME_PACKAGE_ERROR =
  "El paquete PRIMERA VEZ solo puede ser adquirido una vez por usuario."

export async function hasFirstTimePackage(client: PrismaLike, userId: number): Promise<boolean> {
  const existing = await client.userPackage.findFirst({
    where: {
      userId: userId,
      package: {
        is_first_time_only: true,
      },
    },
    select: { id: true },
  })

  return existing !== null
}
