import {
  UserProfileModel,
  UserSummaryModel,
  ClipModel,
  HighlightModel,
  PaginationMeta,
  PaginationQuery,
} from '@inkmark/shared'
import { usersRepository } from './users.repository'
import { followRepository } from '@/modules/follows/follows.repository'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { logger } from '@/lib/logger'

export const usersService = {
  async getPublicProfile(username: string, viewerId: string): Promise<UserProfileModel> {
    try {
      const user = await usersRepository.findByUsername(username)
      if (!user) throw new AppError(ErrorCode.USER_NOT_FOUND, 'User not found', 404)
      const viewerFollows =
        viewerId !== user.id ? await followRepository.isFollowing(viewerId, user.id) : false
      return { ...user, viewerFollows }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('usersService.getPublicProfile failed', { username, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user profile', 500)
    }
  },

  async getUserPublicClips(
    username: string,
    query: PaginationQuery,
  ): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
    try {
      const { clips, total } = await usersRepository.getUserPublicClips(
        username,
        query.page,
        query.limit,
      )
      return {
        clips,
        meta: { page: query.page, limit: query.limit, total, hasMore: query.page * query.limit < total },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('usersService.getUserPublicClips failed', { username, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user clips', 500)
    }
  },

  async getUserPublicHighlights(
    username: string,
    query: PaginationQuery,
  ): Promise<{ highlights: HighlightModel[]; meta: PaginationMeta }> {
    try {
      const { highlights, total } = await usersRepository.getUserPublicHighlights(
        username,
        query.page,
        query.limit,
      )
      return {
        highlights,
        meta: { page: query.page, limit: query.limit, total, hasMore: query.page * query.limit < total },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('usersService.getUserPublicHighlights failed', { username, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user highlights', 500)
    }
  },

  async searchUsers(query: string): Promise<UserSummaryModel[]> {
    try {
      return await usersRepository.searchUsers(query)
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('usersService.searchUsers failed', { query, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to search users', 500)
    }
  },
}
