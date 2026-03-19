import { FeedClipModel, FeedHighlightModel, PaginationMeta } from '@inkmark/shared'
import { feedRepository } from './feed.repository'
import { followRepository } from '@/modules/follows/follows.repository'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { logger } from '@/lib/logger'
import { GetFeedQuery } from './feed.types'

export const feedService = {
  async getFeed(
    userId: string,
    query: GetFeedQuery,
  ): Promise<{ clips: FeedClipModel[]; meta: PaginationMeta }> {
    try {
      const followingIds = await followRepository.getFollowingIds(userId)
      const { clips, total } = await feedRepository.getClipFeed(followingIds, query.page, query.limit)
      return {
        clips,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          hasMore: query.page * query.limit < total,
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
    query: GetFeedQuery,
  ): Promise<{ highlights: FeedHighlightModel[]; meta: PaginationMeta }> {
    try {
      const followingIds = await followRepository.getFollowingIds(userId)
      const { highlights, total } = await feedRepository.getHighlightFeed(
        followingIds,
        query.page,
        query.limit,
      )
      return {
        highlights,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          hasMore: query.page * query.limit < total,
        },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('feedService.getFeedHighlights failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch feed highlights', 500)
    }
  },
}
