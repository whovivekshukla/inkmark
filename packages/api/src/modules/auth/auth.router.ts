import { Router } from 'express'
import passport from 'passport'
import { authController } from './auth.controller'
import { requireAuth, requireJwt } from '@/middleware/auth'
import { validate } from '@/middleware/validate'
import { GoogleTokenSchema, UpdateProfileSchema } from './auth.schema'
import { CreateTokenSchema, TokenIdParamSchema } from './tokens.schema'

const router = Router()

// Redirect to Google OAuth consent screen
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
)

// Google callback — passport verifies and sets req.user, controller issues JWT redirect
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback,
)

// Exchange Google access token for Inkmark JWT (Chrome extension implicit OAuth flow)
router.post('/google/token', validate(GoogleTokenSchema), authController.googleToken)

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
