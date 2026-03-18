import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { authService } from '@/modules/auth/auth.service'
import { logger } from '@/lib/logger'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL ?? '',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await authService.upsertUserFromGoogle(profile)
        // Pass only userId — this becomes req.user throughout the request lifecycle
        done(null, { userId: user.id })
      } catch (err) {
        logger.error('Google OAuth strategy error', { profileId: profile.id, error: err })
        done(err as Error)
      }
    },
  ),
)

export default passport
