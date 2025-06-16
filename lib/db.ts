import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Configuración específica para desarrollo
    ...(process.env.NODE_ENV === 'development' && {
      errorFormat: 'pretty',
    })
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Manejo de cierre de conexiones
const cleanup = async () => {
  await db.$disconnect()
}

process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)