import jwt from 'jsonwebtoken'
import { Profile as GoogleProfile } from 'passport-google-oauth20'
import { UserModel } from '@inkmark/shared'
import { authRepository } from './auth.repository'
import { JwtPayload } from './auth.types'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { AuditAction } from '@/constants/audit-actions'
import { logger } from '@/lib/logger'
import { buildUsername } from '@/lib/utils'
import { auditLogService } from '@/modules/audit-log'
import prisma from '@/lib/prisma'

export const authService = {
  async upsertUserFromGoogle(profile: GoogleProfile): Promise<UserModel> {
    try {
      const googleId = profile.id
      const email = profile.emails?.[0]?.value ?? ''
      const displayName = profile.displayName ?? ''
      const avatarUrl = profile.photos?.[0]?.value ?? null

      // Single atomic upsert on googleId — avoids the read-then-write race condition
      // where concurrent OAuth callbacks for the same account both pass the existence
      // check and one fails with a unique constraint violation on create.
      const username = buildUsername(email.split('@')[0])

      const { isNewUser, ...user } = await prisma.$transaction(async (tx) => {
        const upserted = await tx.user.upsert({
          where: { googleId },
          // deletedAt: null restores soft-deleted accounts on re-login,
          // keeping login behavior consistent with findById's deletedAt: null filter in /auth/me
          update: { displayName, avatarUrl, deletedAt: null },
          create: { googleId, email, username, displayName, avatarUrl },
          // Include updatedAt to detect create vs update — not exposed in the returned model
          select: { id: true, username: true, email: true, displayName: true, avatarUrl: true, bio: true, createdAt: true, updatedAt: true },
        })

        // createdAt === updatedAt only on a fresh insert (Prisma sets both to the same instant).
        // On an update, updatedAt is bumped, making them diverge.
        const isNewUser = upserted.createdAt.getTime() === upserted.updatedAt.getTime()

        // Strip updatedAt — not part of UserModel
        const { updatedAt: _discarded, ...userModel } = upserted
        return { isNewUser, ...userModel }
      })

      await auditLogService.log({
        userId: user.id,
        action: isNewUser ? AuditAction.AUTH_REGISTER : AuditAction.AUTH_LOGIN,
        entity: 'users',
        entityId: user.id,
        metadata: isNewUser ? { googleId, email } : { googleId },
      })

      return user
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('authService.upsertUserFromGoogle failed', { profileId: profile.id, error: err })
      throw new AppError(ErrorCode.AUTH_GOOGLE_FAILED, 'Authentication failed', 500)
    }
  },

  generateJwt(userId: string): string {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new AppError(ErrorCode.INTERNAL_ERROR, 'JWT secret not configured', 500)
    // JWT_EXPIRES_IN_SECONDS defaults to 7 days; using seconds avoids StringValue type issues
    const expiresIn = parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? String(60 * 60 * 24 * 7), 10)
    return jwt.sign({ userId }, secret, { expiresIn })
  },

  verifyJwt(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new AppError(ErrorCode.INTERNAL_ERROR, 'JWT secret not configured', 500)
    try {
      return jwt.verify(token, secret) as JwtPayload
    } catch {
      throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired token', 401)
    }
  },

  async getMe(userId: string): Promise<UserModel> {
    try {
      const user = await authRepository.findById(userId)
      if (!user) throw new AppError(ErrorCode.UNAUTHORIZED, 'User not found', 401)
      return user
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('authService.getMe failed', { userId, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch user', 500)
    }
  },
}
