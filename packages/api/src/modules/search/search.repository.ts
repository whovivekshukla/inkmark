import { Prisma } from '@prisma/client'
import { ClipModel, HighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { SearchFilters } from './search.types'

function containsInsensitive(q: string) {
  return { contains: q, mode: 'insensitive' as const }
}

function dateRange(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined
  return {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  }
}

export const searchRepository = {
  async searchClips(
    userId: string,
    q: string,
    filters: SearchFilters,
  ): Promise<{ clips: ClipModel[]; total: number }> {
    try {
      const text = containsInsensitive(q.trim())
      const savedAt = dateRange(filters.from, filters.to)
      const where: Prisma.ClipWhereInput = {
        userId,
        deletedAt: null,
        ...(savedAt ? { savedAt } : {}),
        OR: [
          { title: text },
          { description: text },
          { url: text },
          { domain: text },
          {
            tags: {
              some: {
                tag: {
                  userId,
                  name: text,
                },
              },
            },
          },
          {
            highlights: {
              some: {
                userId,
                deletedAt: null,
                text,
              },
            },
          },
        ],
      }

      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          orderBy: { savedAt: 'desc' },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        prisma.clip.count({ where }),
      ])

      return { clips, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async searchHighlights(
    userId: string,
    q: string,
    filters: SearchFilters,
  ): Promise<{ highlights: HighlightModel[]; total: number }> {
    try {
      const createdAt = dateRange(filters.from, filters.to)
      const where: Prisma.HighlightWhereInput = {
        userId,
        deletedAt: null,
        text: containsInsensitive(q.trim()),
        clip: { deletedAt: null },
        ...(createdAt ? { createdAt } : {}),
      }

      const [highlights, total] = await Promise.all([
        prisma.highlight.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        prisma.highlight.count({ where }),
      ])

      return { highlights, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
