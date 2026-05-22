import { Router } from 'express'
import crypto from 'crypto'
import passport from 'passport'
import { authController } from './auth.controller'
import { requireAuth, requireJwt } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { ExchangeOAuthCodeSchema, UpdateProfileSchema } from './auth.schema'
import { CreateTokenSchema, TokenIdParamSchema } from './tokens.schema'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'

const router = Router()
const OAUTH_STATE_COOKIE = 'inkmark_oauth_state'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: OAUTH_STATE_TTL_MS,
    path: '/api/v1/auth/google/callback',
  }
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  const prefix = `${name}=`
  const part = header.split(';').map((p) => p.trim()).find((p) => p.startsWith(prefix))
  if (!part) return undefined
  try {
    return decodeURIComponent(part.slice(prefix.length))
  } catch {
    return undefined
  }
}

// Redirect to Google OAuth consent screen
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('base64url')
  res.cookie(OAUTH_STATE_COOKIE, state, cookieOptions())
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next)
})

// Google callback — passport verifies and sets req.user, controller issues JWT redirect
router.get(
  '/google/callback',
  (req, res, next) => {
    const expectedState = readCookie(req.headers.cookie, OAUTH_STATE_COOKIE)
    const actualState = typeof req.query.state === 'string' ? req.query.state : undefined
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/v1/auth/google/callback' })

    if (!expectedState || !actualState || expectedState !== actualState) {
      next(new AppError(ErrorCode.FORBIDDEN, 'Invalid OAuth state', 403))
      return
    }

    next()
  },
  passport.authenticate('google', { session: false }),
  authController.googleCallback,
)

router.post('/exchange', validate(ExchangeOAuthCodeSchema), authController.exchangeOAuthCode)

// Returns the currently authenticated user
router.get('/me', requireAuth, authController.getMe)

// Updates the authenticated user's profile (username, displayName, bio)
router.patch('/me', requireAuth, validate(UpdateProfileSchema), authController.updateMe)

// Stateless logout — client drops the token; server has nothing to invalidate
router.post('/logout', requireAuth, authController.logout)

// ─── Personal Access Tokens (JWT only — PATs cannot manage other PATs) ───────

// Creates a new PAT; returns raw token once — store it immediately
router.post('/tokens', requireJwt, validate(CreateTokenSchema), authController.createToken)

// Lists all PATs for the authenticated user (no raw token in response)
router.get('/tokens', requireJwt, authController.listTokens)

// Revokes a PAT by ID
router.delete('/tokens/:id', requireJwt, validate(TokenIdParamSchema, 'params'), authController.revokeToken)

export default router
