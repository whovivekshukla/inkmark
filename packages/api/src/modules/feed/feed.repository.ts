import { FeedClipModel, FeedHighlightModel } from '@inkmark/shared'
import prisma from '@/lib/prisma'
import { handlePrismaError } from '@/lib/prisma-error'

const USER_SUMMARY_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const

export const feedRepository = {
  async getClipFeed(
    followingIds: string[],
    page: number,
    limit: number,
  ): Promise<{ clips: FeedClipModel[]; total: number }> {
    if (followingIds.length === 0) return { clips: [], total: 0 }

    try {
      const where = { userId: { in: followingIds }, isPublic: true, deletedAt: null }

      // EXPLAIN ANALYZE should be run in staging — this query uses clips_user_public_saved_idx
      const [clips, total] = await Promise.all([
        prisma.clip.findMany({
          where,
          include: {
            user: { select: USER_SUMMARY_SELECT },
            tags: { include: { tag: true } },
          },
          orderBy: { savedAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.clip.count({ where }),
      ])

      return { clips, total }
    } catch (err) {
      throw handlePrismaError(err)
    }
  },

  async getHighlightFeed(
    followingIds: string[],
    page: number,
    limit: number,
  ): Promise<{ highlights: FeedHighlightModel[]; total: number }> {
    if (followingIds.length === 0) return { highlights: [], total: 0 }

    try {
      const where = {
        userId: { in: followingIds },
        deletedAt: null,
        clip: { isPublic: true, deletedAt: null },
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
