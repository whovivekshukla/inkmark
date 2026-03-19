import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { Prisma } from '@prisma/client'
import { TokenFilter } from './tokens.types'

export const tokensRepository = {
  async create(data: {
    userId: string
    name: string
    tokenHash: string
    prefix: string
    expiresAt?: Date
  }) {
    try {
      return await prisma.personalAccessToken.create({
        data: {
          userId: data.userId,
          name: data.name,
          tokenHash: data.tokenHash,
          prefix: data.prefix,
          expiresAt: data.expiresAt ?? null,
        },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findOne(filter: TokenFilter) {
    try {
      return await prisma.personalAccessToken.findFirst({
        where: filter,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findMany(filter: TokenFilter) {
    try {
      return await prisma.personalAccessToken.findMany({
        where: filter,
        select: {
          id: true,
          name: true,
          prefix: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async countActive(userId: string) {
    try {
      return await prisma.personalAccessToken.count({
        where: {
          userId,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async revoke(id: string, userId: string) {
    try {
      return await prisma.personalAccessToken.update({
        where: { id, userId } as Prisma.PersonalAccessTokenWhereUniqueInput,
        data: { revokedAt: new Date() },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async updateLastUsed(id: string) {
    try {
      return await prisma.personalAccessToken.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
