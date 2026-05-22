import { HighlightModel, CreateHighlightModel, UpdateHighlightModel, HighlightColor } from '@inkmark/shared'
import { highlightRepository } from './highlights.repository'
import { clipRepository } from '@/modules/clips/clips.repository'
import { auditLogService } from '@/modules/audit-log'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { AuditAction } from '@/constants/audit-actions'
import { logger } from '@/lib/logger'

function assertOwnership(highlight: { userId: string }, userId: string): void {
  if (highlight.userId !== userId) {
    throw new AppError(ErrorCode.HIGHLIGHT_FORBIDDEN, 'Access denied', 403)
  }
}

export const highlightService = {
  async createHighlight(userId: string, dto: CreateHighlightModel): Promise<HighlightModel> {
    try {
      const clip = await clipRepository.findById(dto.clipId)
      if (!clip) {
        throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
      }
      if (!clip.isPublic && clip.userId !== userId) {
        throw new AppError(ErrorCode.CLIP_NOT_ACCESSIBLE, 'Clip is not accessible', 403)
      }

      const highlight = await highlightRepository.create({
        clipId: dto.clipId,
        userId,
        text: dto.text,
        contextBefore: dto.contextBefore,
        contextAfter: dto.contextAfter,
        color: dto.color ?? HighlightColor.Yellow,
      })

      await auditLogService.log({
        userId,
        action: AuditAction.HIGHLIGHT_CREATED,
        entity: 'highlights',
        entityId: highlight.id,
        metadata: { clipId: dto.clipId },
      })

      return highlight
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('highlightService.createHighlight failed', { userId, clipId: dto.clipId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create highlight', 500)
    }
  },

  async getHighlights(
    requestingUserId: string,
    filters: { clipId?: string; url?: string; includeUser?: boolean },
  ): Promise<HighlightModel[]> {
    try {
      if (filters.clipId) {
        const clip = await clipRepository.findById(filters.clipId)
        if (!clip) {
          throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
        }
        if (!clip.isPublic && clip.userId !== requestingUserId) {
          throw new AppError(ErrorCode.CLIP_NOT_ACCESSIBLE, 'Clip is not accessible', 403)
        }
      }

      return await highlightRepository.findMany({
        clipId: filters.clipId,
        url: filters.url,
        requestingUserId,
        includeUser: filters.includeUser,
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('highlightService.getHighlights failed', { requestingUserId, filters, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch highlights', 500)
    }
  },

  async updateHighlight(userId: string, highlightId: string, dto: UpdateHighlightModel): Promise<HighlightModel> {
    try {
      const highlight = await highlightRepository.findById(highlightId)
      if (!highlight) {
        throw new AppError(ErrorCode.HIGHLIGHT_NOT_FOUND, 'Highlight not found', 404)
      }
      assertOwnership(highlight, userId)

      const updated = await highlightRepository.update(highlightId, {
        color: dto.color,
        text: dto.text,
      })

      await auditLogService.log({
        userId,
        action: AuditAction.HIGHLIGHT_UPDATED,
        entity: 'highlights',
        entityId: highlightId,
        metadata: { color: dto.color, text: dto.text },
      })

      return updated
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('highlightService.updateHighlight failed', { userId, highlightId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update highlight', 500)
    }
  },

  async deleteHighlight(userId: string, highlightId: string): Promise<void> {
    try {
      const highlight = await highlightRepository.findById(highlightId)
      if (!highlight) {
        throw new AppError(ErrorCode.HIGHLIGHT_NOT_FOUND, 'Highlight not found', 404)
      }
      assertOwnership(highlight, userId)

      await highlightRepository.delete(highlightId)

      await auditLogService.log({
        userId,
        action: AuditAction.HIGHLIGHT_DELETED,
        entity: 'highlights',
        entityId: highlightId,
        metadata: { clipId: highlight.clipId },
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('highlightService.deleteHighlight failed', { userId, highlightId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete highlight', 500)
    }
  },
}
