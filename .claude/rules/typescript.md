# TypeScript & Code Quality

## Strict mode
All packages run TypeScript strict mode. Zero tolerance for type errors.
`pnpm typecheck` must pass before any PR.

## No `any`
Never use `any` without a justification comment:
```typescript
// ✗
const data: any = response.body

// ✓ (only if truly unavoidable)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response.body  // external SDK returns untyped response
```

## `interface` vs `type`
- `interface` for object shapes (DTOs, domain models, API responses)
- `type` for unions, intersections, utility types
```typescript
interface ClipDTO { id: string; url: string; title: string | null }
type ClipStatus = 'active' | 'deleted'
```

## Enums
Use `enum` for fixed value sets — never magic strings:
```typescript
// ✓
enum HighlightColor { Yellow = 'yellow', Green = 'green', Blue = 'blue', Pink = 'pink' }

// ✗
color: 'yellow' | 'green' | 'blue' | 'pink'  // scattered across codebase
```

## Async
- `async/await` only — never mix with `.then()`
- `Promise.all()` for independent parallel operations
- No floating promises — always `await` or explicitly handle rejection
```typescript
// ✓
const [clips, followCount] = await Promise.all([
  clipRepo.findMany(userId),
  followRepo.countFollowers(userId),
])

// ✗ floating promise
clipService.updateMetadata(clipId, metadata)  // fire-and-forget must be explicit
void clipService.updateMetadata(clipId, metadata)  // ✓ explicit void
```

## Naming
- Variables/functions: `camelCase`, descriptive (`getUserClips` not `getData`)
- Interfaces/types: `PascalCase` with suffix (`ClipDTO`, `CreateClipSchema`)
- Enums: `PascalCase` (`ErrorCode`, `HighlightColor`)
- Files: `kebab-case.ts` for all files
- Constants: `SCREAMING_SNAKE_CASE` in `constants/` files

## Comments
Comments explain WHY, not WHAT. Code explains what:
```typescript
// ✗ — states the obvious
// increment the counter
count++

// ✓ — explains the reason
// offset by 1 because the API is 1-indexed but our pagination is 0-indexed
const apiPage = page + 1
```

## No console.log
Use `logger` from `packages/api/src/lib/logger.ts`:
```typescript
import { logger } from '@/lib/logger'
logger.info('Clip created', { clipId, userId })
logger.error('OG fetch failed', { url, error: err.message })
```
`console.log` will fail CI lint check.

## Constants
No magic numbers or strings inline. Extract to `constants/`:
```typescript
// ✗
if (tags.length > 10) throw new Error('too many tags')

// ✓
import { MAX_TAGS_PER_CLIP } from '@/constants/limits'
if (tags.length > MAX_TAGS_PER_CLIP) throw new AppError(...)
```

## Single responsibility
One function does one thing. If a function name contains "and", split it.
Functions longer than ~40 lines usually need splitting.

## Imports
Use path aliases (`@/`) not relative `../../`:
```typescript
// ✓
import { prisma } from '@/lib/prisma'

// ✗
import { prisma } from '../../../lib/prisma'
```