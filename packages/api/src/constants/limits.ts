export const MAX_TOKENS_PER_USER = 10
export const MAX_TAGS_PER_CLIP = 10

// Rate limiting — shared window, per-IP request ceilings.
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
export const GLOBAL_RATE_LIMIT_MAX = 300 // generous baseline for the whole /api/v1 surface
export const STRICT_RATE_LIMIT_MAX = 30 // auth + write endpoints — the obvious abuse targets
