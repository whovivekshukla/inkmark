import { auditLogRepository } from './audit-log.repository'
import { CreateAuditLogData } from './audit-log.types'
import { logger } from '@/lib/logger'

export const auditLogService = {
  // Fire-and-forget — audit log failure should never break the main operation
  async log(data: CreateAuditLogData): Promise<void> {
    try {
      await auditLogRepository.create(data)
    } catch (err) {
      logger.error('auditLogService.log failed', {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        error: err,
      })
    }
  },
}
