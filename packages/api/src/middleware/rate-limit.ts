import rateLimit, { type Options } from 'express-rate-limit'
import { ErrorCode } from '@/constants/error-codes'
import {
  RATE_LIMIT_WINDOW_MS,
  GLOBAL_RATE_LIMIT_MAX,
  STRICT_RATE_LIMIT_MAX,
} from '@/constants/limits'

// Shared 429 handler so rate-limited responses use the standard ApiResponse envelope
// instead of express-rate-limit's default plaintext body.
const rateLimitHandler: Options['handler'] = (_req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: ErrorCode.RATE_LIMITED,
      message: 'Too many requests, please try again later',
    },
  })
}

// Generous baseline limiter for the entire /api/v1 surface.
export const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: GLOBAL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})

// Strict limiter for auth and write endpoints, which are the obvious abuse targets.
export const strictRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: STRICT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
})
