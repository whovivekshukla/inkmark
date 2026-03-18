import { PrismaClient } from '@prisma/client'

// Singleton pattern prevents multiple PrismaClient instances in dev (hot reload issue)
const prisma = (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma
  ?? new PrismaClient({ log: ['error', 'warn'] })

if (process.env.NODE_ENV !== 'production') {
  (globalThis as typeof globalThis & { prisma?: PrismaClient }).prisma = prisma
}

export default prisma
