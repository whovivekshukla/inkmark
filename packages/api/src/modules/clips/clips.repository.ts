import { ClipModel, ClipTagModel, ClipDomainModel } from '@inkmark/shared'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'
import { CreateClipData, UpdateClipData, UpdateClipMetadataData, GetClipsFilters } from './clips.types'

/** Row shape from raw FTS SELECT — mirrors ClipModel without tags (hydrated after). */
interface ClipFtsRow {
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

function orderByForLibrary(sort: 'recent' | 'oldest' | 'most_highlights' | undefined): Prisma.ClipOrderByWithRelationInput[] {
  const s = sort ?? 'recent'
  if (s === 'oldest') return [{ savedAt: 'asc' }]
  if (s === 'most_highlights') return [{ highlights: { _count: 'desc' } }, { savedAt: 'desc' }]
  return [{ savedAt: 'desc' }]
}

/**
 * Full-text search: clip title/description (`clips.search_vector`) OR your highlight text
 * (`to_tsvector` on `highlights.text` per row). Same filters as list.
 * Raw SQL required: Prisma does not support `tsvector @@ plainto_tsquery`.
 */
async function getAllWithFullTextSearch(
  userId: string,
  filters: GetClipsFilters,
  q: string,
): Promise<{ clips: ClipModel[]; total: number }> {
  const sort = filters.sort ?? 'recent'
  const offset = (filters.page - 1) * filters.limit

  const urlClause = filters.url ? Prisma.sql`AND c.url = ${filters.url}` : Prisma.empty
  const domainClause = filters.domain ? Prisma.sql`AND c.domain = ${filters.domain}` : Prisma.empty

  const tagName = filters.tag?.trim().toLowerCase()
  const tagClause = tagName
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM clip_tags ct
        INNER JOIN tags t ON t.id = ct.tag_id
        WHERE ct.clip_id = c.id AND t.user_id = ${userId} AND t.name = ${tagName}
      )`
    : Prisma.empty

  const highlightedClause = filters.highlighted
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM highlights h
        WHERE h.clip_id = c.id AND h.deleted_at IS NULL
      )`
    : Prisma.empty

  const fromClause = filters.from ? Prisma.sql`AND c.saved_at >= ${filters.from}` : Prisma.empty
  const toClause = filters.to ? Prisma.sql`AND c.saved_at <= ${filters.to}` : Prisma.empty

  const orderSql =
    sort === 'oldest'
      ? Prisma.sql`ORDER BY c.saved_at ASC`
      : sort === 'most_highlights'
        ? Prisma.sql`ORDER BY (
            SELECT COUNT(*)::int FROM highlights h
            WHERE h.clip_id = c.id AND h.deleted_at IS NULL
          ) DESC, c.saved_at DESC`
        : Prisma.sql`ORDER BY c.saved_at DESC`

  const whereFts = Prisma.sql`
    (
      c.search_vector @@ plainto_tsquery('english', ${q})
      OR EXISTS (
        SELECT 1 FROM highlights h
        WHERE h.clip_id = c.id
          AND h.deleted_at IS NULL
          AND h.user_id = ${userId}
          AND to_tsvector('english', h.text) @@ plainto_tsquery('english', ${q})
      )
    )
    AND c.user_id = ${userId}
    AND c.deleted_at IS NULL
    ${urlClause}
    ${domainClause}
    ${tagClause}
    ${highlightedClause}
    ${fromClause}
    ${toClause}
  `

  try {
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<ClipFtsRow[]>`
        SELECT
          c.id,
          c.user_id        AS "userId",
          c.url,
          c.domain,
          c.title,
          c.description,
          c.og_image       AS "ogImage",
          c.favicon_url    AS "faviconUrl",
          c.is_public      AS "isPublic",
          c.saved_at       AS "savedAt",
          c.updated_at     AS "updatedAt"
        FROM clips c
        WHERE ${whereFts}
        ${orderSql}
        LIMIT ${filters.limit}
        OFFSET ${offset}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint AS count
        FROM clips c
        WHERE ${whereFts}
      `,
    ])

    const total = Number(countRows[0].count)
    if (rows.length === 0) {
      return { clips: [], total }
    }

    const ids = rows.map((r) => r.id)
    const withTags = await prisma.clip.findMany({
      where: { id: { in: ids } },
      include: { tags: { include: { tag: true } } },
    })
    const byId = new Map(withTags.map((c) => [c.id, c]))
    const clips = ids.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => c != null) as ClipModel[]

    return { clips, total }
  } catch (err) {
    throw handlePrismaError(err)
  }
}

export const clipRepository = {
  async getAll(
    userId: string,
    filters: GetClipsFilters,
  ): Promise<{ clips: ClipModel[]; total: number }> {
    try {
      const q = filters.q?.trim() ?? ''
      if (q.length > 0) {
        return getAllWithFullTextSearch(userId, filters, q)
      }

      const sort = filters.sort ?? 'recent'
      const where = {
        userId,
        deletedAt: null,
        ...(filters.url ? { url: filters.url } : {}),
        ...(filters.tag
          ? { tags: { some: { tag: { userId, name: filters.tag.toLowerCase() } } } }
          : {}),
        ...(filters.domain ? { domain: filters.domain } : {}),
        ...(filters.highlighted ? { highlights: { some: { deletedAt: null } } } : {}),
        ...(filters.from || filters.to
          ? {
              savedAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      }

      const orderBy = orderByForLibrary(sort)

      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          orderBy,
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

  async findById(clipId: string): Promise<ClipModel | null> {
    try {
      return await prisma.clip.findFirst({
        where: { id: clipId, deletedAt: null },
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async findByUserIdAndUrl(userId: string, url: string): Promise<ClipModel | null> {
    try {
      return await prisma.clip.findFirst({
        where: { userId, url, deletedAt: null },
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async create(data: CreateClipData): Promise<ClipModel> {
    try {
      const { userId, url, domain, ...rest } = data
      return await prisma.clip.create({
        data: { userId, url, domain, ...rest },
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async update(clipId: string, data: UpdateClipData): Promise<ClipModel> {
    try {
      return await prisma.clip.update({
        where: { id: clipId },
        data,
        include: { tags: { include: { tag: true } } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(clipId: string): Promise<void> {
    try {
      await prisma.clip.update({
        where: { id: clipId },
        data: { deletedAt: new Date() },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async updateMetadata(clipId: string, data: UpdateClipMetadataData): Promise<void> {
    try {
      await prisma.clip.update({
        where: { id: clipId },
        data,
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async setTags(userId: string, clipId: string, tagNames: string[]): Promise<ClipTagModel[]> {
    try {
      const normalized = tagNames.map((n) => n.toLowerCase().trim()).filter(Boolean)
      if (normalized.length === 0) return []

      return await prisma.$transaction(async (tx) => {
        await tx.tag.createMany({
          data: normalized.map((name) => ({ userId, name })),
          skipDuplicates: true,
        })
        const tags = await tx.tag.findMany({
          where: { userId, name: { in: normalized } },
        })
        await tx.clipTag.createMany({
          data: tags.map((tag) => ({ clipId, tagId: tag.id })),
          skipDuplicates: true,
        })
        return tx.clipTag.findMany({
          where: { clipId, tagId: { in: tags.map((t) => t.id) } },
          include: { tag: true },
        })
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async addTag(userId: string, clipId: string, tagName: string): Promise<ClipTagModel> {
    try {
      const name = tagName.toLowerCase().trim()
      return await prisma.$transaction(async (tx) => {
        const tag = await tx.tag.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name },
        })
        return tx.clipTag.upsert({
          where: { clipId_tagId: { clipId, tagId: tag.id } },
          update: {},
          create: { clipId, tagId: tag.id },
          include: { tag: true },
        })
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getTopDomains(userId: string, limit: number): Promise<ClipDomainModel[]> {
    try {
      const results = await prisma.clip.groupBy({
        by: ['domain'],
        where: { userId, deletedAt: null },
        _count: { domain: true },
        orderBy: { _count: { domain: 'desc' } },
        take: limit,
      })
      return results.map((r) => ({ domain: r.domain, count: r._count.domain }))
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async removeTag(clipId: string, tagId: string): Promise<void> {
    try {
      await prisma.clipTag.delete({
        where: { clipId_tagId: { clipId, tagId } },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
