import { TagModel, TagWithCountModel } from '@inkmark/shared'
import { tagsRepository } from './tags.repository'
import { auditLogService } from '@/modules/audit-log'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { AuditAction } from '@/constants/audit-actions'
import { logger } from '@/lib/logger'

export const tagsService = {
  async getTags(userId: string): Promise<TagWithCountModel[]> {
    try {
      return await tagsRepository.findManyByUserId(userId)
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('tagsService.getTags failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch tags', 500)
    }
  },

  async createTag(userId: string, name: string): Promise<TagModel> {
    try {
      // Normalize name — duplicate after normalization returns 409 via P2002
      const normalized = name.toLowerCase().trim()
      const tag = await tagsRepository.create(userId, normalized)

      await auditLogService.log({
        userId,
        action: AuditAction.TAG_CREATED,
        entity: 'tags',
        entityId: tag.id,
        metadata: { name: tag.name },
      })

      return tag
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('tagsService.createTag failed', { userId, name, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create tag', 500)
    }
  },

  async deleteTag(userId: string, tagId: string): Promise<void> {
    try {
      // Ownership enforced in repository WHERE clause — P2025 if not found or not owner
      await tagsRepository.delete(tagId, userId)

      await auditLogService.log({
        userId,
        action: AuditAction.TAG_DELETED,
        entity: 'tags',
        entityId: tagId,
        metadata: {},
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('tagsService.deleteTag failed', { userId, tagId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete tag', 500)
    }
  },
}
