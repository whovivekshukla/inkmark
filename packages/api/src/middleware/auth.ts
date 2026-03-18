import { Request, Response, NextFunction } from 'express'
import { authService } from '@/modules/auth/auth.service'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(ErrorCode.AUTH_TOKEN_MISSING, 'Authentication required', 401)
  }

  const token = authHeader.slice(7) // strip "Bearer "
  const payload = authService.verifyJwt(token)
  req.user = { userId: payload.userId }
  next()
}
