import { FeedClipModel, FeedHighlightModel, PaginationMeta, PaginationQuery } from '@inkmark/shared'
import { feedRepository } from './feed.repository'
import { followRepository } from '@/modules/follows/follows.repository'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { logger } from '@/lib/logger'
import { MAX_PAGE_SIZE } from '@/constants/pagination'

/** Clamp pagination — route validation should already enforce; this guards direct callers. */
function clampPagination(q: PaginationQuery): { page: number; limit: number } {
  const page = Number.isFinite(q.page) && q.page >= 1 ? Math.floor(q.page) : 1
  const limitRaw = Number.isFinite(q.limit) ? Math.floor(q.limit) : 20
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, limitRaw))
  return { page, limit }
}

export const feedService = {
  async getFeed(
    userId: string,
    query: PaginationQuery,
  ): Promise<{ clips: FeedClipModel[]; meta: PaginationMeta }> {
    try {
      const { page, limit } = clampPagination(query)
      const followingIds = await followRepository.getFollowingIds(userId)
      const { clips, total } = await feedRepository.getClipFeed(userId, followingIds, page, limit)
      return {
        clips,
        meta: {
          page,
          limit,
          total,
          hasMore: page * limit < total,
        },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('feedService.getFeed failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch feed', 500)
    }
  },

  async getFeedHighlights(
    userId: string,
    query: PaginationQuery,
  ): Promise<{ highlights: FeedHighlightModel[]; meta: PaginationMeta }> {
    try {
      const { page, limit } = clampPagination(query)
      const followingIds = await followRepository.getFollowingIds(userId)
      const { highlights, total } = await feedRepository.getHighlightFeed(
        userId,
        followingIds,
        page,
        limit,
      )
      return {
        highlights,
        meta: {
          page,
          limit,
          total,
          hasMore: page * limit < total,
        },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('feedService.getFeedHighlights failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch feed highlights', 500)
    }
  },
}
