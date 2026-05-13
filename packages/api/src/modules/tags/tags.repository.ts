import { TagModel, TagWithCountModel } from '@inkmark/shared'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'

export type TagSortKey = 'name' | 'clips' | 'highlights'

export interface FindTagsOptions {
  limit?: number
  sort?: TagSortKey
}

interface TagCountRow {
  id: string
  userId: string
  name: string
  clipCount: number
  highlightCount: number
}

function tagOrderBy(sort: TagSortKey | undefined): Prisma.Sql {
  if (sort === 'clips') {
    return Prisma.sql`ORDER BY "clipCount" DESC, "highlightCount" DESC, t.name ASC`
  }
  if (sort === 'highlights') {
    return Prisma.sql`ORDER BY "highlightCount" DESC, "clipCount" DESC, t.name ASC`
  }
  return Prisma.sql`ORDER BY t.name ASC`
}

export const tagsRepository = {
  async findManyByUserId(userId: string, options: FindTagsOptions = {}): Promise<TagWithCountModel[]> {
    try {
      const limitClause = options.limit ? Prisma.sql`LIMIT ${options.limit}` : Prisma.empty
      const rows = await prisma.$queryRaw<TagCountRow[]>`
        SELECT
          t.id,
          t.user_id AS "userId",
          t.name,
          COUNT(DISTINCT c.id)::int AS "clipCount",
          COUNT(h.id)::int AS "highlightCount"
        FROM tags t
        LEFT JOIN clip_tags ct ON ct.tag_id = t.id
        LEFT JOIN clips c ON c.id = ct.clip_id
          AND c.user_id = ${userId}
          AND c.deleted_at IS NULL
        LEFT JOIN highlights h ON h.clip_id = c.id
          AND h.deleted_at IS NULL
        WHERE t.user_id = ${userId}
        GROUP BY t.id, t.user_id, t.name
        ${tagOrderBy(options.sort)}
        ${limitClause}
      `

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        _count: { clips: Number(row.clipCount) },
        highlightCount: Number(row.highlightCount),
      }))
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async create(userId: string, name: string): Promise<TagModel> {
    try {
      return await prisma.tag.create({
        data: { userId, name },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async delete(tagId: string, userId: string): Promise<void> {
    try {
      // userId in where ensures users can only delete their own tags — P2025 if not found or not owner
      await prisma.tag.delete({
        where: { id: tagId, userId },
      })
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
