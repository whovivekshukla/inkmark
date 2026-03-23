import { Prisma } from '@prisma/client'
import { FeedClipModel, FeedHighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'

const USER_SUMMARY_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

/** Batch counts: highlights by clip author vs other users (for feed accent). */
async function highlightAuthorOtherCountsByClipIds(
  clipIds: string[],
): Promise<Map<string, { author: number; other: number }>> {
  if (clipIds.length === 0) return new Map()
  const rows = await prisma.$queryRaw<Array<{ clip_id: string; author_n: number; other_n: number }>>`
    SELECT h.clip_id AS clip_id,
      (COUNT(*) FILTER (WHERE h.user_id = c.user_id))::int AS author_n,
      (COUNT(*) FILTER (WHERE h.user_id <> c.user_id))::int AS other_n
    FROM highlights h
    INNER JOIN clips c ON c.id = h.clip_id
    WHERE h.clip_id IN (${Prisma.join(clipIds)}) AND h.deleted_at IS NULL
    GROUP BY h.clip_id
  `
  const m = new Map<string, { author: number; other: number }>()
  for (const r of rows) {
    m.set(r.clip_id, { author: r.author_n, other: r.other_n })
  }
  return m
}

export const feedRepository = {
  /** Viral clips: viewer’s own (any visibility) + followed users’ public clips only. */
  async getClipFeed(
    viewerId: string,
    followingIds: string[],
    page: number,
    limit: number,
  ): Promise<{ clips: FeedClipModel[]; total: number }> {
    try {
      const where = {
        deletedAt: null,
        OR: [{ userId: viewerId }, { userId: { in: followingIds }, isPublic: true }],
      }

      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
          where,
          include: {
            user: { select: USER_SUMMARY_SELECT },
            tags: { include: { tag: true } },
            highlights: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { id: true, text: true, userId: true, color: true },
            },
            _count: {
              select: {
                highlights: { where: { deletedAt: null } },
              },
            },
          },
          orderBy: { savedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.clip.count({ where }),
      ])

      const clipIds = clips.map((c) => c.id)
      const countMap = await highlightAuthorOtherCountsByClipIds(clipIds)

      const mapped: FeedClipModel[] = clips.map((c) => {
        const { highlights, _count, ...rest } = c
        const first = highlights[0]
        const split = countMap.get(c.id) ?? { author: 0, other: 0 }
        return {
          ...rest,
          highlightCount: _count.highlights,
          firstHighlight: first
            ? { id: first.id, text: first.text, userId: first.userId, color: first.color }
            : null,
          authorHighlightCount: split.author,
          otherHighlightCount: split.other,
        }
      })
      return { clips: mapped, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  /** Highlights by people you follow, plus your own. */
  async getHighlightFeed(
    viewerId: string,
    followingIds: string[],
    page: number,
    limit: number,
  ): Promise<{ highlights: FeedHighlightModel[]; total: number }> {
    try {
      const where = {
        deletedAt: null,
        OR: [{ userId: viewerId }, { userId: { in: followingIds } }],
        clip: {
          deletedAt: null,
          OR: [{ isPublic: true }, { userId: viewerId }],
        },
      }

      const [highlights, total] = await Promise.all([
        prisma.highlight.findMany({
          where,
          include: {
            user: { select: USER_SUMMARY_SELECT },
            clip: { select: { id: true, url: true, title: true, domain: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.highlight.count({ where }),
      ])

      return { highlights, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },
}
