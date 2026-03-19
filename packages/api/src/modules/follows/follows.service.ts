import { UserSummaryModel, PaginationMeta, PaginationQuery } from '@inkmark/shared'
import { followRepository } from './follows.repository'
import { auditLogService } from '@/modules/audit-log'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { AuditAction } from '@/constants/audit-actions'
import { logger } from '@/lib/logger'

export const followService = {
  async followUser(followerId: string, followingId: string): Promise<void> {
    try {
      if (followerId === followingId) {
        throw new AppError(ErrorCode.CANNOT_FOLLOW_SELF, 'Cannot follow yourself', 400)
      }

      // Duplicate follow → P2002 (unique PK constraint) → global handler → 409
      await followRepository.create(followerId, followingId)

      await auditLogService.log({
        userId: followerId,
        action: AuditAction.FOLLOW_CREATED,
        entity: 'follows',
        entityId: followingId,
        metadata: { followingId },
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('followService.followUser failed', { followerId, followingId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to follow user', 500)
    }
  },

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      // Not following → P2025 (record not found) → global handler → 404
      await followRepository.delete(followerId, followingId)

      await auditLogService.log({
        userId: followerId,
        action: AuditAction.FOLLOW_DELETED,
        entity: 'follows',
        entityId: followingId,
        metadata: { followingId },
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('followService.unfollowUser failed', { followerId, followingId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to unfollow user', 500)
    }
  },

  async getFollowers(
    userId: string,
    query: PaginationQuery,
  ): Promise<{ users: UserSummaryModel[]; meta: PaginationMeta }> {
    try {
      const { users, total } = await followRepository.getFollowers(userId, query.page, query.limit)
      return {
        users,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          hasMore: query.page * query.limit < total,
        },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('followService.getFollowers failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch followers', 500)
    }
  },

  async getFollowing(
    userId: string,
    query: PaginationQuery,
  ): Promise<{ users: UserSummaryModel[]; meta: PaginationMeta }> {
    try {
      const { users, total } = await followRepository.getFollowing(userId, query.page, query.limit)
      return {
        users,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          hasMore: query.page * query.limit < total,
        },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('followService.getFollowing failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch following', 500)
    }
  },
}
