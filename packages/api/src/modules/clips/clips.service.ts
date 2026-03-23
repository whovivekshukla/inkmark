import { ClipModel, ClipTagModel, ClipDomainModel, PaginationMeta } from '@inkmark/shared'
import { clipRepository } from './clips.repository'
import { CreateClipModel, UpdateClipModel, GetClipsFilters, UpdateClipData } from './clips.types'
import { auditLogService } from '@/modules/audit-log'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { AuditAction } from '@/constants/audit-actions'
import { logger } from '@/lib/logger'

function assertOwnership(clip: { userId: string }, userId: string): void {
  if (clip.userId !== userId) {
    throw new AppError(ErrorCode.CLIP_FORBIDDEN, 'Access denied', 403)
  }
}

export const clipService = {
  async createClip(userId: string, dto: CreateClipModel): Promise<ClipModel> {
    try {
      let domain: string
      try {
        domain = new URL(dto.url).hostname
      } catch {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Invalid URL', 400)
      }

      const clip = await clipRepository.create({
        userId,
        url: dto.url,
        domain,
        isPublic: dto.isPublic ?? true,
        title: dto.title,
        description: dto.description,
        ogImage: dto.ogImage,
        faviconUrl: dto.faviconUrl,
      })

      // Set tags separately — clip must exist before ClipTag rows can be created
      if (dto.tags?.length) {
        clip.tags = await clipRepository.setTags(userId, clip.id, dto.tags)
      }

      await auditLogService.log({
        userId,
        action: AuditAction.CLIP_CREATED,
        entity: 'clips',
        entityId: clip.id,
        metadata: { url: clip.url },
      })

      return clip
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.createClip failed', { userId, url: dto.url, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create clip', 500)
    }
  },

  async getClips(
    userId: string,
    filters: GetClipsFilters,
  ): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
    try {
      const { clips, total } = await clipRepository.getAll(userId, filters)
      return {
        clips,
        meta: {
          page: filters.page,
          limit: filters.limit,
          total,
          hasMore: filters.page * filters.limit < total,
        },
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.getClips failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch clips', 500)
    }
  },

  async getClipById(requestingUserId: string, clipId: string): Promise<ClipModel> {
    try {
      const clip = await clipRepository.findById(clipId)
      if (!clip) throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
      if (clip.userId !== requestingUserId && !clip.isPublic) {
        throw new AppError(ErrorCode.CLIP_FORBIDDEN, 'Access denied', 403)
      }
      return clip
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.getClipById failed', { requestingUserId, clipId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch clip', 500)
    }
  },

  async updateClip(userId: string, clipId: string, dto: UpdateClipModel): Promise<ClipModel> {
    try {
      const clip = await clipRepository.findById(clipId)
      if (!clip) throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
      assertOwnership(clip, userId)

      const updated = await clipRepository.update(clipId, dto as UpdateClipData)

      await auditLogService.log({
        userId,
        action: AuditAction.CLIP_UPDATED,
        entity: 'clips',
        entityId: clipId,
        metadata: { title: dto.title, isPublic: dto.isPublic },
      })

      return updated
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.updateClip failed', { userId, clipId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update clip', 500)
    }
  },

  async deleteClip(userId: string, clipId: string): Promise<void> {
    try {
      const clip = await clipRepository.findById(clipId)
      if (!clip) throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
      assertOwnership(clip, userId)

      await clipRepository.delete(clipId)

      await auditLogService.log({
        userId,
        action: AuditAction.CLIP_DELETED,
        entity: 'clips',
        entityId: clipId,
        metadata: { url: clip.url },
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.deleteClip failed', { userId, clipId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete clip', 500)
    }
  },

  async addTagToClip(userId: string, clipId: string, tagName: string): Promise<ClipTagModel> {
    try {
      const clip = await clipRepository.findById(clipId)
      if (!clip) throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
      assertOwnership(clip, userId)
      return clipRepository.addTag(userId, clipId, tagName)
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.addTagToClip failed', { userId, clipId, tagName, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to add tag', 500)
    }
  },

  async removeTagFromClip(userId: string, clipId: string, tagId: string): Promise<void> {
    try {
      const clip = await clipRepository.findById(clipId)
      if (!clip) throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
      assertOwnership(clip, userId)
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.removeTagFromClip failed', { userId, clipId, tagId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to remove tag', 500)
    }

    // Outside try/catch — P2025 (tag not on clip) bubbles to global handler → 404
    await clipRepository.removeTag(clipId, tagId)
  },

  async getTopDomains(userId: string, limit = 5): Promise<ClipDomainModel[]> {
    try {
      return await clipRepository.getTopDomains(userId, limit)
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('clipService.getTopDomains failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch domains', 500)
    }
  },
}
