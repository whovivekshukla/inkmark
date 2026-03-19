import prisma from '@/lib/prisma'
import { CreateAuditLogData } from './audit-log.types'

export const auditLogRepository = {
  async create(data: CreateAuditLogData): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        metadata: data.metadata,
      },
    })
  },
}
