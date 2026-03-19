import { HighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { CreateHighlightData, UpdateHighlightData, FindHighlightsFilter, HighlightWithUserRaw } from './highlights.types'

export const highlightRepository = {
  async findById(highlightId: string): Promise<HighlightModel | null> {
    try {
      return await prisma.highlight.findFirst({
        where: { id: highlightId, deletedAt: null },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findMany(filters: FindHighlightsFilter): Promise<(HighlightModel | HighlightWithUserRaw)[]> {
    try {
      const where: Record<string, unknown> = { deletedAt: null }

      if (filters.clipId) {
        where.clipId = filters.clipId
      }

      if (filters.url) {
        where.clip = {
          url: filters.url,
          deletedAt: null,
          ...(filters.requestingUserId
            ? { OR: [{ userId: filters.requestingUserId }, { isPublic: true }] }
            : { isPublic: true }),
        }
      }

      return await prisma.highlight.findMany({
        where,
        ...(filters.includeUser
          ? { include: { user: { select: { username: true, avatarUrl: true } } } }
          : {}),
        orderBy: { createdAt: 'asc' },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async create(data: CreateHighlightData): Promise<HighlightModel> {
    try {
      return await prisma.highlight.create({ data })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async update(highlightId: string, data: UpdateHighlightData): Promise<HighlightModel> {
    try {
      return await prisma.highlight.update({
        where: { id: highlightId },
        data,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(highlightId: string): Promise<void> {
    try {
      await prisma.highlight.update({
        where: { id: highlightId },
        data: { deletedAt: new Date() },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
