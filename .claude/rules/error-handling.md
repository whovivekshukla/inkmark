# Error Handling & Validation

## AppError
Always throw `AppError` from `packages/api/src/lib/errors.ts` — never throw raw `Error`:
```typescript
// ✓
throw new AppError(ErrorCode.CLIP_NOT_FOUND, 'Clip not found', 404)
throw new AppError(ErrorCode.CLIP_FORBIDDEN, 'Access denied', 403, { clipId })

// ✗
throw new Error('not found')
res.status(404).json({ message: 'not found' })  // never send errors from controllers directly
```

## Error codes
All error codes live in `packages/api/src/constants/error-codes.ts` as an enum.
When adding a new code, add it to the enum with a comment:

```typescript
enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  AUTH_GOOGLE_FAILED = 'AUTH_GOOGLE_FAILED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',

  // Clips
  CLIP_NOT_FOUND = 'CLIP_NOT_FOUND',
  CLIP_ALREADY_EXISTS = 'CLIP_ALREADY_EXISTS',
  CLIP_FORBIDDEN = 'CLIP_FORBIDDEN',

  // ... document new codes here
}
```

## Global error handler
The global error handler in `src/middleware/error.ts` catches all errors.
Controllers never send error responses directly — always throw and let the handler deal with it.
The handler:
- `AppError` → sends `{ error: { code, message } }` with the AppError's statusCode
- Unknown errors → logs full error internally, sends generic `{ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }` with 500
- Never sends stack traces in responses

## Try/catch
All async service and repository methods are wrapped in try/catch.
Controllers don't need try/catch — they throw and the global handler catches.

```typescript
// ✓ service with try/catch
async createClip(userId: string, dto: CreateClipDTO): Promise<ClipDTO> {
  try {
    const existing = await this.clipRepo.findByUserIdAndUrl(userId, dto.url)
    if (existing && !existing.deletedAt) {
      throw new AppError(ErrorCode.CLIP_ALREADY_EXISTS, 'Already clipped', 409)
    }
    // ...
  } catch (err) {
    if (err instanceof AppError) throw err  // re-throw known errors
    logger.error('createClip failed', { userId, url: dto.url, error: err })
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create clip', 500)
  }
}
```

## Validation
Use `validate()` middleware in routers — never validate in controllers or services:
```typescript
// ✓ in router
router.post('/clips', requireAuth, validate(CreateClipSchema), clipController.create)

// ✗ in controller
const result = CreateClipSchema.safeParse(req.body)
if (!result.success) { ... }
```

Validate query params separately:
```typescript
router.get('/clips', requireAuth, validate(GetClipsQuerySchema, 'query'), clipController.list)
```

## Error log context
Every `logger.error` call must include enough context to reproduce the issue:
```typescript
logger.error('Failed to fetch OG metadata', {
  url,
  userId,           // who triggered it
  error: err.message,
  stack: err.stack, // internal logs only, never in API response
})
```
Minimum context: what failed, who triggered it, relevant IDs.

## Security
Error messages sent to clients must never reveal:
- Internal implementation details ("Prisma query failed")
- File paths or stack traces
- Database structure
- Third-party service details

Use generic messages for 500s. Specific messages are fine for 4xx client errors.