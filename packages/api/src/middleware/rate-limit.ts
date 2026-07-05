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

// Keys are per-IP (express-rate-limit's default: req.ip, with `trust proxy` set).
// Keying must never derive from unauthenticated client-supplied data (e.g. the raw
// Authorization header) — that would let callers mint a fresh bucket per request.
// The hosted MCP server forwards each end-client's IP via X-Forwarded-For, so its
// users don't share the MCP container's bucket.

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
