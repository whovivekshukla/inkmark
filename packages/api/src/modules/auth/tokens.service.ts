import crypto from 'crypto'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { AuditAction } from '@/constants/audit-actions'
import { MAX_TOKENS_PER_USER } from '@/constants/limits'
import { logger } from '@/lib/logger'
import { auditLogService } from '@/modules/audit-log'
import { tokensRepository } from './tokens.repository'
import type { CreateTokenDTO } from './tokens.schema'
import type { PersonalAccessTokenCreatedModel, PersonalAccessTokenModel } from '@inkmark/shared'

function generateToken(): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString('hex')
  const raw = `ink_${random}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.substring(0, 12) // "ink_" + first 8 hex chars
  return { raw, hash, prefix }
}

export const tokensService = {
  async createToken(userId: string, dto: CreateTokenDTO): Promise<PersonalAccessTokenCreatedModel> {
    try {
      const activeCount = await tokensRepository.countActive(userId)
      if (activeCount >= MAX_TOKENS_PER_USER) {
        throw new AppError(
          ErrorCode.TOKEN_LIMIT_EXCEEDED,
          `Maximum of ${MAX_TOKENS_PER_USER} active tokens allowed`,
          409,
        )
      }

      const { raw, hash, prefix } = generateToken()

      const token = await tokensRepository.create({
        userId,
        name: dto.name,
        tokenHash: hash,
        prefix,
        expiresAt: dto.expiresAt,
      })

      // Fire-and-forget — audit log failure must never block token creation
      void auditLogService.log({
        userId,
        action: AuditAction.TOKEN_CREATED,
        entity: 'personal_access_tokens',
        entityId: token.id,
        metadata: { name: dto.name },
      })

      return {
        id: token.id,
        name: token.name,
        prefix: token.prefix,
        token: raw, // only time the raw token is returned
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('createToken failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create token', 500)
    }
  },

  async listTokens(userId: string): Promise<PersonalAccessTokenModel[]> {
    try {
      return await tokensRepository.findMany({ userId })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('listTokens failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to list tokens', 500)
    }
  },

  async revokeToken(userId: string, tokenId: string): Promise<void> {
    try {
      const token = await tokensRepository.findOne({ id: tokenId, userId })

      if (!token || token.revokedAt) {
        throw new AppError(ErrorCode.TOKEN_NOT_FOUND, 'Token not found', 404)
      }

      await tokensRepository.revoke(tokenId, userId)

      // Fire-and-forget — audit log failure must never block revocation
      void auditLogService.log({
        userId,
        action: AuditAction.TOKEN_REVOKED,
        entity: 'personal_access_tokens',
        entityId: tokenId,
        metadata: { name: token.name },
      })
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('revokeToken failed', { userId, tokenId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to revoke token', 500)
    }
  },
}
