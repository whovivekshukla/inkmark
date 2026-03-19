import { Prisma } from '@prisma/client'
import { ClipModel, HighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { SearchFilters } from './search.types'

// Clip shape returned by the raw FTS query — mirrors ClipModel without tags
interface ClipSearchRow {
  id: string
  userId: string
  url: string
  domain: string
  title: string | null
  description: string | null
  ogImage: string | null
  faviconUrl: string | null
  isPublic: boolean
  savedAt: Date
  updatedAt: Date
}

export const searchRepository = {
  async searchClips(
    userId: string,
    q: string,
    filters: SearchFilters,
  ): Promise<{ clips: ClipModel[]; total: number }> {
    try {
      const offset = (filters.page - 1) * filters.limit

      // Raw query required: Prisma does not support the tsvector @@ plainto_tsquery operator.
      // Results are ranked by ts_rank so most relevant clips appear first.
      const fromClause = filters.from ? Prisma.sql`AND saved_at >= ${filters.from}` : Prisma.empty
      const toClause = filters.to ? Prisma.sql`AND saved_at <= ${filters.to}` : Prisma.empty

      const [rows, countRows] = await Promise.all([
        prisma.$queryRaw<ClipSearchRow[]>`
          SELECT
            id,
            user_id        AS "userId",
            url,
            domain,
            title,
            description,
            og_image       AS "ogImage",
            favicon_url    AS "faviconUrl",
            is_public      AS "isPublic",
            saved_at       AS "savedAt",
            updated_at     AS "updatedAt"
          FROM clips
          WHERE search_vector @@ plainto_tsquery('english', ${q})
            AND user_id    =  ${userId}
            AND deleted_at IS NULL
            ${fromClause}
            ${toClause}
          ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${q})) DESC
          LIMIT  ${filters.limit}
          OFFSET ${offset}
        `,
        prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*) AS count
          FROM clips
          WHERE search_vector @@ plainto_tsquery('english', ${q})
            AND user_id    =  ${userId}
            AND deleted_at IS NULL
            ${fromClause}
            ${toClause}
        `,
      ])

      // Raw query rows don't include tags — return as ClipModel with empty tags array
      const clips = rows.map((r) => ({ ...r, tags: [] })) as ClipModel[]
      return { clips, total: Number(countRows[0].count) }
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
      const where = {
        userId,
        deletedAt: null,
        text: { contains: q, mode: 'insensitive' as const },
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
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
