import { Prisma } from '@prisma/client'
import { AuditAction } from '@/constants/audit-actions'

export interface CreateAuditLogData {
  userId: string | null
  action: AuditAction
  entity: string
  entityId: string
  metadata?: Prisma.InputJsonValue
}
