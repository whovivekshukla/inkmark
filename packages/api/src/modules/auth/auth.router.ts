import { Router } from 'express'
import passport from 'passport'
import { authController } from './auth.controller'
import { requireAuth } from '@/middleware/auth'

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

// Returns the currently authenticated user
router.get('/me', requireAuth, authController.getMe)

// Stateless logout — client drops the token; server has nothing to invalidate
router.post('/logout', requireAuth, authController.logout)

export default router
