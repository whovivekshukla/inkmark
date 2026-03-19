import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { authService } from '@/modules/auth/auth.service'
import { tokensRepository } from '@/modules/auth/tokens.repository'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'

// Accepts JWT or Personal Access Token.
// Use on all standard protected routes.
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(ErrorCode.AUTH_TOKEN_MISSING, 'Authentication required', 401)
  }

  const token = authHeader.slice(7)

  if (token.startsWith('ink_')) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const pat = await tokensRepository.findOne({ tokenHash })

    if (!pat || pat.revokedAt) {
      throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or revoked token', 401)
    }

    if (pat.expiresAt && pat.expiresAt < new Date()) {
      throw new AppError(ErrorCode.AUTH_TOKEN_INVALID, 'Token has expired', 401)
    }

    // Fire-and-forget — must not block the request
    void tokensRepository.updateLastUsed(pat.id)

    req.user = { userId: pat.userId }
    next()
    return
  }

  const payload = authService.verifyJwt(token)
  req.user = { userId: payload.userId }
  next()
}

// Accepts JWT only. Use on token management routes so PATs cannot create/revoke other PATs.
export function requireJwt(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(ErrorCode.AUTH_TOKEN_MISSING, 'Authentication required', 401)
  }

  const token = authHeader.slice(7)

  if (token.startsWith('ink_')) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Personal access tokens cannot manage other tokens', 403)
  }

  const payload = authService.verifyJwt(token)
  req.user = { userId: payload.userId }
  next()
}
