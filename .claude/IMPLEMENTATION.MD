# Inkmark — Full Implementation Plan (Prompt Document)

Use this document as a phase-by-phase prompt to implement the Inkmark backend. Each phase is self-contained and can be handed to an LLM as a prompt. Always include the **Global Rules** section with every phase prompt.

---

## Global Rules (include with every phase)

### Architecture Pattern
Follow strict **Controller → Service → Repository** separation:
- **Controller**: only route definition + request parsing + response sending. No business logic, no Prisma.
- **Service**: all business logic, orchestration, error throwing. No direct Prisma calls.
- **Repository**: only Prisma queries. No business logic. Returns raw Prisma types or mapped domain types.

### Code Standards
- TypeScript strict mode. Zero `any` without a justification comment.
- `interface` for object shapes, `enum` for fixed value sets.
- `async/await` only — no `.then()` mixing.
- `Promise.all()` for independent parallel async operations.
- No floating promises — always `await` or explicitly handle.
- No `console.log` — use the logger utility (Winston).
- No magic numbers — extract to `constants/` or config.
- Single responsibility per function. DRY across the codebase.
- Variable and function names are descriptive. Comments explain WHY, not WHAT.

### Error Handling
- All async operations wrapped in try/catch.
- Use custom `AppError` class with error codes. New codes must be documented in `constants/error-codes.ts`.
- Error messages must never leak sensitive info (no stack traces in API responses).
- Error logs must include: `userId` (if available), `requestId`, `method`, `path`, `errorCode`.

### API Standards
- All responses use `ApiResponseDTO` envelope: `{ data, meta?, error? }`.
- Correct HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 500 Internal Server Error.
- Plural nouns, kebab-case for routes. API versioned under `/api/v1/`.
- All inputs validated via Zod schemas in `*.schema.ts` files, enforced by `validate` middleware.
- Swagger/OpenAPI decorators on all endpoints. Include request/response examples and error responses.

### Database Standards
- No N+1 queries. Use Prisma `include` or batched queries.
- No DB calls inside loops. Batch everything.
- Use Prisma transactions for any multi-step atomic operations.
- Soft deletes where applicable (`deletedAt DateTime?`).
- Specific column selection — no implicit `select *`.
- Indexes on all frequently queried columns. Composite indexes for multi-column filters.
- After writing any complex query, note that `EXPLAIN ANALYZE` should be run in staging.
- All data mutations must write to an `AuditLog` table (userId, action, entity, entityId, metadata, createdAt).

### Env & Config
- All new env vars added to `.env.sample` with a comment describing what they are.
- Never hardcode secrets.

---

## Phase 0 — Monorepo Bootstrap

**Goal**: Scaffold the monorepo skeleton. No business logic — just config, tooling, and empty package shells.

### Tasks

1. **Root setup**
   - Init with `pnpm init`
   - Create `pnpm-workspace.yaml` pointing to `packages/*`
   - Root `package.json` with scripts: `dev`, `build`, `lint`, `typecheck`
   - Install root devDeps: `typescript`, `eslint`, `prettier`, `turbo`

2. **`tsconfig.base.json`** at root:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "outDir": "dist",
       "rootDir": "src"
     }
   }
   ```

3. **`turbo.json`** pipeline:
   - `build` depends on upstream `build`
   - `dev` runs in parallel
   - `typecheck` runs in parallel

4. **Create three packages** — each with `package.json` and `tsconfig.json` extending `../../tsconfig.base.json`:
   - `packages/shared` — no deps yet, just the scaffold
   - `packages/api` — deps: `express`, `zod`, `@prisma/client`, `passport`, `passport-google-oauth20`, `jsonwebtoken`, `winston`, `helmet`, `cors`, `morgan`
   - `packages/mcp` — deps: `@modelcontextprotocol/sdk`, reference to `shared`

5. **`packages/shared/src/types/api.ts`**:
   ```typescript
   export interface ApiResponse<T> {
     data?: T
     meta?: PaginationMeta
     error?: ApiError
   }

   export interface PaginationMeta {
     page: number
     limit: number
     total: number
     hasMore: boolean
   }

   export interface ApiError {
     code: string
     message: string
   }
   ```

6. **`packages/shared/src/types/`** — create empty typed interfaces for:
   - `user.ts` — `UserDTO`
   - `clip.ts` — `ClipDTO`, `CreateClipDTO`, `UpdateClipDTO`
   - `highlight.ts` — `HighlightDTO`, `CreateHighlightDTO`
   - `feed.ts` — `FeedItemDTO`
   - Export all from `packages/shared/src/index.ts`

7. **`packages/api/src/lib/logger.ts`** — Winston logger:
   - Transports: Console (dev), File (prod: `error.log`, `combined.log`)
   - Format: JSON with timestamp, level, message, metadata
   - Export singleton `logger`

8. **`packages/api/src/constants/`**:
   - `error-codes.ts` — enum `ErrorCode` with initial values: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`
   - `pagination.ts` — `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 100`

9. **`packages/api/src/lib/errors.ts`** — `AppError extends Error`:
   ```typescript
   class AppError extends Error {
     constructor(
       public readonly code: ErrorCode,
       public readonly message: string,
       public readonly statusCode: number,
       public readonly metadata?: Record<string, unknown>
     )
   }
   ```

10. **`packages/api/src/middleware/error.ts`** — global Express error handler:
    - Catches `AppError` → structured response
    - Catches unknown errors → 500, generic message, full log internally
    - Never leaks stack traces in response

11. **`packages/api/src/middleware/validate.ts`** — Zod middleware factory:
    ```typescript
    validate(schema: ZodSchema) → RequestHandler
    ```
    Validates `req.body` (or `req.query`/`req.params` as specified). Throws `AppError(VALIDATION_ERROR, 400)` on failure.

12. **`packages/api/src/index.ts`** — bare Express app:
    - Middlewares: `helmet`, `cors`, `express.json()`, `morgan`
    - Mount `/api/v1` router (empty for now)
    - Mount global error handler last
    - Health check: `GET /health → 200 { status: 'ok' }`

### Deliverables
- `pnpm install` runs cleanly
- `pnpm typecheck` passes across all packages
- `GET /health` returns 200
- Logger writes to console in dev

---

## Phase 1 — Prisma Schema + Database Setup

**Goal**: Define the full database schema, run the initial migration, and set up the Prisma client singleton.

### Schema (`packages/api/prisma/schema.prisma`)

Implement the following models exactly:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── User ────────────────────────────────────────────────────────────────────

model User {
  id          String    @id @default(cuid())
  username    String    @unique
  email       String    @unique
  googleId    String    @unique @map("google_id")
  displayName String    @map("display_name")
  avatarUrl   String?   @map("avatar_url")
  bio         String?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // soft delete

  clips      Clip[]
  highlights Highlight[]
  followers  Follow[]    @relation("following")
  following  Follow[]    @relation("follower")
  tags       Tag[]
  auditLogs  AuditLog[]

  @@index([email])
  @@index([googleId])
  @@index([deletedAt])
  @@map("users")
}

// ─── Clip ────────────────────────────────────────────────────────────────────
// A "clip" is a saved article/URL by a user.

model Clip {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  url         String
  domain      String
  title       String?
  description String?
  ogImage     String?   @map("og_image")
  faviconUrl  String?   @map("favicon_url")
  isPublic    Boolean   @default(true) @map("is_public")
  savedAt     DateTime  @default(now()) @map("saved_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at") // soft delete

  // Full-text search vector — populated via PostgreSQL trigger on insert/update.
  // Using Unsupported because Prisma does not natively manage tsvector columns.
  searchVector Unsupported("tsvector")? @map("search_vector")

  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  highlights Highlight[]
  tags       ClipTag[]

  @@unique([userId, url]) // prevents duplicate clips per user
  @@index([userId])
  @@index([savedAt])
  @@index([domain])
  @@index([deletedAt])
  @@map("clips")
}

// ─── Highlight ───────────────────────────────────────────────────────────────

model Highlight {
  id            String    @id @default(cuid())
  clipId        String    @map("clip_id")
  userId        String    @map("user_id")
  text          String
  contextBefore String?   @map("context_before") // ~50 chars before selection
  contextAfter  String?   @map("context_after")  // ~50 chars after selection
  color         String    @default("yellow")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  clip Clip @relation(fields: [clipId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([clipId])
  @@index([userId])
  @@index([deletedAt])
  @@map("highlights")
}

// ─── Tag ─────────────────────────────────────────────────────────────────────

model Tag {
  id     String @id @default(cuid())
  userId String @map("user_id")
  name   String

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  clips ClipTag[]

  @@unique([userId, name])
  @@index([userId])
  @@map("tags")
}

// ─── ClipTag (join table) ─────────────────────────────────────────────────────

model ClipTag {
  clipId String @map("clip_id")
  tagId  String @map("tag_id")

  clip Clip @relation(fields: [clipId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([clipId, tagId])
  @@map("clip_tags")
}

// ─── Follow ───────────────────────────────────────────────────────────────────

model Follow {
  followerId  String   @map("follower_id")
  followingId String   @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower  User @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  following User @relation("following", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId])
  @@map("follows")
}

// ─── AuditLog ────────────────────────────────────────────────────────────────
// Immutable record of all data mutations. Never update or delete rows here.

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?  @map("user_id") // null for system actions
  action    String   // e.g. "clip.created", "highlight.deleted"
  entity    String   // table name e.g. "clips"
  entityId  String   @map("entity_id")
  metadata  Json?    // diff, extra context
  createdAt DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### Additional Tasks

1. **Custom migration** — after `prisma migrate dev --name init`, create a second migration file manually for the full-text search trigger:

```sql
-- Migration: add_clips_search_vector_trigger
-- Populates search_vector on clips using title + description for fast full-text search.
-- Using pg_catalog.english dictionary for stemming.

CREATE INDEX clips_search_vector_idx ON clips USING GIN(search_vector);

CREATE OR REPLACE FUNCTION clips_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clips_search_vector_trigger
BEFORE INSERT OR UPDATE ON clips
FOR EACH ROW EXECUTE FUNCTION clips_search_vector_update();
```

2. **`packages/api/src/lib/prisma.ts`** — Prisma singleton:
   ```typescript
   // Singleton pattern prevents multiple PrismaClient instances in dev (hot reload issue)
   const prisma = globalThis.prisma ?? new PrismaClient({ log: ['error', 'warn'] })
   if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma
   export default prisma
   ```

3. **`.env.sample`**:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/inkmark
   ```

### Deliverables
- `prisma migrate dev` runs cleanly
- `prisma studio` shows all tables
- Search vector trigger fires on clip insert (verify manually)
- Prisma client generates without errors

---

## Phase 2 — Auth (Google OAuth + JWT)

**Goal**: Implement Google OAuth 2.0 login. On success, upsert the user and issue a signed JWT. Protect all subsequent routes with a JWT middleware.

### New env vars (add to `.env.sample`)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLIENT_REDIRECT_URL=http://localhost:5173  # frontend URL after login
```

### Files to create

**`packages/api/src/modules/auth/auth.router.ts`**
```
GET  /api/v1/auth/google           → redirect to Google OAuth consent
GET  /api/v1/auth/google/callback  → handle OAuth callback, issue JWT, redirect to frontend
GET  /api/v1/auth/me               → protected, returns current user
POST /api/v1/auth/logout           → client drops token; server returns 204
```

**`packages/api/src/modules/auth/auth.service.ts`**
- `upsertUserFromGoogle(profile: GoogleProfile): Promise<User>`
  - If `googleId` exists → update `displayName`, `avatarUrl`
  - If not → create user, auto-generate `username` from email prefix + random suffix (ensure uniqueness)
  - Write `AuditLog` entry: `auth.login` or `auth.register`
- `generateJwt(userId: string): string`
- `verifyJwt(token: string): JwtPayload`

**`packages/api/src/modules/auth/auth.repository.ts`**
- `findByGoogleId(googleId: string): Promise<User | null>`
- `findById(id: string): Promise<User | null>`
- `upsertGoogleUser(data: UpsertGoogleUserDTO): Promise<User>`
  - Select only: `id`, `username`, `email`, `displayName`, `avatarUrl`, `bio`, `createdAt`

**`packages/api/src/middleware/auth.ts`** — JWT guard middleware:
- Reads `Authorization: Bearer <token>` header
- Verifies JWT, attaches decoded `{ userId }` to `req.user`
- Throws `AppError(UNAUTHORIZED, 401)` if missing or invalid
- Export as `requireAuth`

**`packages/api/src/modules/auth/auth.controller.ts`**
- `GET /google` — passport.authenticate('google', { scope: ['profile', 'email'] })
- `GET /google/callback` — passport.authenticate callback → call `auth.service.upsertUserFromGoogle` → sign JWT → redirect to `CLIENT_REDIRECT_URL?token=<jwt>`
- `GET /me` — protected by `requireAuth` → return `req.user` profile from DB
- `POST /logout` → 204 (stateless — client drops the token)

**Passport setup** (`packages/api/src/lib/passport.ts`):
- Configure `GoogleStrategy` with env vars
- `passReqToCallback: true` — pass request through for logging
- Call `authService.upsertUserFromGoogle` inside the verify callback

### Error codes to add
- `AUTH_GOOGLE_FAILED` — OAuth callback returned an error
- `AUTH_TOKEN_INVALID` — JWT malformed or expired
- `AUTH_TOKEN_MISSING` — no Authorization header

### Swagger annotations
Document all four endpoints. Include:
- 401 response example for protected routes
- Redirect behaviour note on `/google/callback`

### Deliverables
- Full OAuth flow works end-to-end (test with browser)
- `GET /api/v1/auth/me` with valid JWT returns user
- `GET /api/v1/auth/me` without JWT returns 401
- New user auto-registered on first Google login
- Returning user gets updated avatar/displayName
- AuditLog row written on every login

---

## Phase 3 — Clips

**Goal**: Full CRUD for clips. Includes OG metadata fetching on create, soft deletes, full-text search, and tag management.

### New env vars
```
METADATA_FETCH_TIMEOUT_MS=5000  # timeout for OG fetch on clip create
```

### Endpoints

```
POST   /api/v1/clips                    requireAuth
GET    /api/v1/clips                    requireAuth  (your own clips, paginated)
GET    /api/v1/clips/:id                requireAuth
PATCH  /api/v1/clips/:id                requireAuth
DELETE /api/v1/clips/:id                requireAuth  (soft delete)

POST   /api/v1/clips/:id/tags           requireAuth
DELETE /api/v1/clips/:id/tags/:tagId    requireAuth
```

### `clips.schema.ts` (Zod)

```typescript
CreateClipSchema = z.object({
  url: z.string().url(),
  isPublic: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional(), // tag names, not IDs
})

UpdateClipSchema = z.object({
  title: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
})

GetClipsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  tag: z.string().optional(),
  domain: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
```

### `clips.service.ts`

- `createClip(userId, dto)`:
  1. Check `@@unique([userId, url])` — if exists and not soft-deleted, throw `AppError(CONFLICT, 409)`
  2. If soft-deleted, restore it (set `deletedAt = null`)
  3. Extract `domain` from URL
  4. Insert clip with available data
  5. Fire-and-forget OG metadata fetch (`lib/metadata.ts`) — update clip after fetch resolves (do NOT block the response)
  6. If `tags` provided, upsert tags and create `ClipTag` rows — all in one transaction
  7. Write AuditLog: `clip.created`
  8. Return created clip

- `getClips(userId, query)`: paginated, filtered by tag/domain/date range. Exclude soft-deleted.

- `getClipById(userId, clipId)`: include highlights. 404 if not found or soft-deleted. 403 if `clip.userId !== userId` and `clip.isPublic === false`.

- `updateClip(userId, clipId, dto)`: 404/403 guards. Write AuditLog: `clip.updated`.

- `deleteClip(userId, clipId)`: soft delete (`deletedAt = now()`). Write AuditLog: `clip.deleted`.

- `addTagToClip(userId, clipId, tagName)`: upsert tag, create ClipTag. Transaction.

- `removeTagFromClip(userId, clipId, tagId)`: delete ClipTag row.

### `lib/metadata.ts`

- `fetchOgMetadata(url: string): Promise<OgMetadata>`
- Use `node-fetch` + parse `<meta og:*>` tags from HTML
- Respect `METADATA_FETCH_TIMEOUT_MS` — abort if exceeded
- Return partial data on failure (never throw — this is fire-and-forget)
- Extract: `title`, `description`, `ogImage`, `faviconUrl`, `domain`

### `clips.repository.ts`

- All queries select specific columns — never implicit select *
- `findByUserIdAndUrl`: used for upsert check
- `findManyByUserId(userId, filters, pagination)`: use `where` + `orderBy savedAt desc`
- `findByIdWithHighlights`: include highlights where `deletedAt = null`
- `softDelete(clipId)`: `update({ where: { id }, data: { deletedAt: new Date() } })`
- `updateMetadata(clipId, metadata)`: called after OG fetch resolves

### Error codes to add
- `CLIP_NOT_FOUND`
- `CLIP_ALREADY_EXISTS`
- `CLIP_FORBIDDEN`
- `TAG_NOT_FOUND`

### Deliverables
- `POST /clips` creates clip, returns immediately, metadata fills in async
- Duplicate URL for same user returns 409
- Soft-deleted clip restored on re-save
- Tag add/remove works transactionally
- All queries paginated with correct `meta` in response
- AuditLog written on every mutation

---

## Phase 4 — Highlights

**Goal**: Create, update, and delete highlights anchored to clips.

### Endpoints

```
POST   /api/v1/highlights               requireAuth
GET    /api/v1/clips/:clipId/highlights requireAuth (or public if clip is public)
PATCH  /api/v1/highlights/:id           requireAuth
DELETE /api/v1/highlights/:id           requireAuth (soft delete)
```

### `highlights.schema.ts`

```typescript
CreateHighlightSchema = z.object({
  clipId: z.string().cuid(),
  text: z.string().min(1).max(5000),
  contextBefore: z.string().max(200).optional(),
  contextAfter: z.string().max(200).optional(),
  color: z.enum(['yellow', 'green', 'blue', 'pink']).default('yellow'),
})

UpdateHighlightSchema = z.object({
  color: z.enum(['yellow', 'green', 'blue', 'pink']).optional(),
  text: z.string().min(1).max(5000).optional(),
})
```

### `highlights.service.ts`

- `createHighlight(userId, dto)`:
  1. Verify clip exists and is accessible (not deleted, not private unless owner)
  2. Create highlight
  3. Write AuditLog: `highlight.created`

- `getHighlightsByClip(requestingUserId, clipId)`:
  - If clip is public → return all highlights for that clip (all users — this is the social part)
  - If clip is private → only return if requestingUserId === clip.userId
  - Order by `createdAt asc`

- `updateHighlight(userId, highlightId, dto)`: ownership check. AuditLog: `highlight.updated`.

- `deleteHighlight(userId, highlightId)`: soft delete. AuditLog: `highlight.deleted`.

### Error codes to add
- `HIGHLIGHT_NOT_FOUND`
- `HIGHLIGHT_FORBIDDEN`
- `CLIP_NOT_ACCESSIBLE`

### Deliverables
- Highlights on a public clip visible to anyone with clip access
- Highlights on a private clip only visible to owner
- Soft delete works
- AuditLog written on every mutation

---

## Phase 5 — Follows + Feed

**Goal**: Follow/unfollow users. Serve a paginated feed of clips and highlights from followed users.

### Endpoints

```
POST   /api/v1/follows/:userId            requireAuth  (follow)
DELETE /api/v1/follows/:userId            requireAuth  (unfollow)
GET    /api/v1/follows/:userId/followers  requireAuth
GET    /api/v1/follows/:userId/following  requireAuth

GET    /api/v1/feed                       requireAuth  (clips from followed users)
GET    /api/v1/feed/highlights            requireAuth  (highlights from followed users)
```

### `follows.service.ts`

- `followUser(followerId, followingId)`:
  - Guard: cannot follow yourself → `AppError(VALIDATION_ERROR, 400)`
  - Guard: already following → `AppError(CONFLICT, 409)`
  - Write AuditLog: `follow.created`

- `unfollowUser(followerId, followingId)`:
  - Guard: not following → `AppError(NOT_FOUND, 404)`
  - Write AuditLog: `follow.deleted`

- `getFollowers(userId, pagination)`: paginated list of users following `userId`
- `getFollowing(userId, pagination)`: paginated list of users `userId` follows

### `feed.service.ts`

- `getFeed(userId, pagination)`:
  - Get list of `followingIds` for userId
  - Fetch paginated public clips from those users, ordered by `savedAt desc`
  - Use `Promise.all` if fetching supplementary data per clip
  - Never N+1 — single query with `whereIn followingIds`

- `getFeedHighlights(userId, pagination)`:
  - Same pattern but for highlights
  - Only return highlights on public clips

### Performance note
The feed query joins `follows` → `clips`. Add this composite index in a migration:
```sql
-- Speeds up feed query: find all public clips from a set of users ordered by savedAt
CREATE INDEX clips_user_public_saved_idx ON clips(user_id, is_public, saved_at DESC)
WHERE deleted_at IS NULL;
```
This is a partial index — only covers non-deleted clips. Note this in schema.prisma with a comment.

### Error codes to add
- `FOLLOW_ALREADY_EXISTS`
- `FOLLOW_NOT_FOUND`
- `CANNOT_FOLLOW_SELF`

### Deliverables
- Follow/unfollow works with correct conflict handling
- Feed returns only public clips from followed users
- Feed is paginated
- No N+1 on feed query
- Partial index migration applied

---

## Phase 6 — Users + Search

**Goal**: Public user profiles, user search, and full-text search across clips.

### Endpoints

```
GET  /api/v1/users/:username              public
GET  /api/v1/users/:username/clips        public (only isPublic clips)
GET  /api/v1/users/:username/highlights   public (only highlights on public clips)
GET  /api/v1/users/search?q=             requireAuth

GET  /api/v1/search?q=&type=clips|highlights|all&from=&to=  requireAuth
```

### `search.service.ts`

- `searchClips(userId, query, filters)`:
  - Use PostgreSQL full-text search via raw query (Prisma does not support `@@> tsvector` natively — use `prisma.$queryRaw`)
  - Add comment explaining why raw query is used here
  - Query: `WHERE search_vector @@ plainto_tsquery('english', $query) AND user_id = $userId AND deleted_at IS NULL`
  - Order by `ts_rank(search_vector, query) DESC`
  - Paginate

- `searchUsers(query)`:
  - `WHERE username ILIKE $pattern OR display_name ILIKE $pattern`
  - Limit to 20 results

### `users.service.ts`

- `getPublicProfile(username)`: 404 if not found or soft-deleted
- `getUserPublicClips(username, pagination)`: only `isPublic = true`, not deleted
- `getUserPublicHighlights(username, pagination)`: highlights on public clips only

### Deliverables
- Full-text search returns ranked results using `ts_rank`
- Raw query has comment explaining why Prisma ORM is bypassed
- Public profile 404s correctly for unknown/deleted users
- User search works case-insensitively

---

## Phase 7 — Tags

**Goal**: Tag management — CRUD for user's own tags.

### Endpoints

```
GET    /api/v1/tags          requireAuth  (your tags with clip counts)
POST   /api/v1/tags          requireAuth
DELETE /api/v1/tags/:id      requireAuth  (also removes ClipTag rows via cascade)
```

### Notes
- `GET /tags` returns each tag with `_count: { clips }` — use Prisma's `include _count`
- `DELETE /tag` cascades to `clip_tags` via DB constraint (already defined in schema)
- Tag names are lowercased + trimmed on create
- AuditLog on create and delete

---

## Phase 8 — MCP Server

**Goal**: Implement the MCP server in `packages/mcp`. All tools call the REST API internally via a typed API client — the MCP server has no direct DB access.

### `packages/mcp/src/lib/api-client.ts`

A typed wrapper around the REST API:
```typescript
class InkmarkApiClient {
  constructor(private baseUrl: string, private token: string) {}

  async getClips(params): Promise<PaginatedResponse<ClipDTO>>
  async createClip(dto): Promise<ClipDTO>
  async getFeed(params): Promise<PaginatedResponse<FeedItemDTO>>
  async getHighlights(clipId): Promise<HighlightDTO[]>
  async searchClips(query, filters): Promise<ClipDTO[]>
  async getFollowing(): Promise<UserDTO[]>
  async getSimilarReaders(): Promise<UserDTO[]>
  async getTodaySummaryData(): Promise<TodaySummaryDTO>
}
```

### Tools to implement

| Tool | Description | Calls |
|---|---|---|
| `summarize_today` | Returns all clips + highlights from the last 24h, structured for LLM summarization | `GET /mcp/today` |
| `get_feed` | Returns paginated feed from followed users | `GET /feed` |
| `search_clips` | Full-text search across user's clips | `GET /search` |
| `get_highlights` | All highlights for a given URL or clipId | `GET /clips/:id/highlights` |
| `get_user_clips` | Clips from a specific followed user | `GET /users/:username/clips` |
| `who_reads_like_me` | Users with the most overlapping clipped URLs | `GET /mcp/who-reads-like-me` |
| `add_clip` | Saves a URL on behalf of the user | `POST /clips` |

### MCP-specific REST endpoints (add to api)

```
GET  /api/v1/mcp/today               requireAuth
GET  /api/v1/mcp/who-reads-like-me   requireAuth
```

`today` returns: clips saved in last 24h + their highlights, structured as:
```typescript
{
  clips: Array<ClipDTO & { highlights: HighlightDTO[] }>
  totalClips: number
  totalHighlights: number
  topDomains: Array<{ domain: string; count: number }>
}
```

`who-reads-like-me` returns users who have clipped 3+ of the same URLs as the requesting user, ordered by overlap count descending.

### Tool input/output schemas

Each MCP tool must define:
- `name`: snake_case
- `description`: clear natural language — this is what the LLM reads to decide which tool to call
- `inputSchema`: JSON Schema (Zod → JSON Schema via `zod-to-json-schema`)
- `handler`: async function returning structured text or JSON

### Deliverables
- MCP server starts and lists tools correctly
- Each tool calls the API and returns structured data
- `summarize_today` returns data an LLM can summarize without further calls
- All tools handle API errors gracefully (never crash the MCP server)

---

## Checklist (run before marking any phase complete)

- [ ] Controllers have no Prisma calls and no business logic
- [ ] Services have no Prisma calls
- [ ] Repositories select specific columns only
- [ ] No N+1 queries
- [ ] No DB calls inside loops
- [ ] Transactions used for multi-step mutations
- [ ] AuditLog written for every mutation
- [ ] Soft deletes implemented where noted
- [ ] All async operations have try/catch
- [ ] All inputs validated via Zod middleware
- [ ] No `any` without comment
- [ ] No `console.log`
- [ ] All new env vars in `.env.sample`
- [ ] Error responses never leak sensitive info
- [ ] Swagger annotations on all endpoints
- [ ] Build passes with zero TypeScript errors
- [ ] Pagination used on all list endpoints
- [ ] `ApiResponseDTO` envelope on all responses



# Inkmark Chrome Extension — Implementation Plan

Add this to `.claude/IMPLEMENTATION.md` as **Phase 9 — Chrome Extension**.

---

## Phase 9 — Chrome Extension

### Overview
Manifest V3 Chrome extension. Pure capture + visual feedback tool — no feed, no settings UI beyond auth.
Lives in `packages/extension/`.

**Features:**
- One-click clip current page
- Select text → save as highlight (auto-clips page if not already clipped)
- Revisit a clipped page → your highlights restored in yellow, followed users' highlights in blue
- Extension icon badge indicates if current page is already clipped
- Google OAuth login inside popup

---

### Folder structure

```
packages/extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── content/
│   └── content.ts          # injected into every page
├── background/
│   └── service-worker.ts   # Manifest V3 service worker
├── lib/
│   ├── api.ts              # typed API client (fetch wrapper)
│   ├── auth.ts             # OAuth helpers + token storage
│   └── storage.ts          # chrome.storage.local wrappers
├── types/
│   └── index.ts
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── tsconfig.json
├── package.json
└── vite.config.ts          # builds popup + content + background as separate bundles
```

---

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Inkmark",
  "version": "0.1.0",
  "description": "Clip articles and highlight text",
  "permissions": [
    "activeTab",
    "storage",
    "identity",
    "contextMenus",
    "scripting"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "dist/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content/content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID",
    "scopes": ["openid", "email", "profile"]
  }
}
```

---

### Auth flow (`lib/auth.ts`)

**Implemented:** user pastes an Inkmark JWT (from the web app after Google OAuth). `signInWithToken` stores the token, calls `GET /api/v1/auth/me` to validate, clears URL-keyed clip/highlight caches (so account switches cannot reuse another user’s cache), and stores `userId` + username.

**Not implemented:** exchanging a raw Google access token for a JWT in the API (`POST /auth/google/token`) — that approach requires strict audience / tokeninfo validation for the extension’s OAuth client; the team deferred Chrome `launchWebAuthFlow` until a vetted design exists.

---

### `lib/api.ts` — typed API client

```typescript
class InkmarkClient {
  constructor(private baseUrl: string, private token: string) {}

  async clipPage(data: CreateClipPayload): Promise<ClipModel>
  async getClipByUrl(url: string): Promise<ClipModel | null>
  async createHighlight(data: CreateHighlightPayload): Promise<HighlightModel>
  async getHighlightsForUrl(url: string): Promise<HighlightWithUserModel[]>
}

interface CreateClipPayload {
  url: string
  title: string
  description?: string
  ogImage?: string
  faviconUrl?: string
  isPublic: boolean
}

interface CreateHighlightPayload {
  clipId: string
  text: string
  contextBefore?: string
  contextAfter?: string
  color: 'yellow'  // always yellow for own highlights
}

interface HighlightWithUserModel {
  id: string
  text: string
  contextBefore: string | null
  contextAfter: string | null
  color: string
  isOwn: boolean   // true if highlight.userId === current user
  user: { username: string; avatarUrl: string | null }
}
```

**New API endpoint needed:**
```
GET /api/v1/clips/by-url?url=<encoded>
→ Returns clip + isOwn flag if current user has clipped this URL
→ 404 if not clipped by anyone the user can see
```

**Update existing endpoint:**
```
GET /api/v1/clips/:id/highlights
→ Add isOwn: boolean to each highlight in response
→ Include user summary (username, avatarUrl)
→ Return highlights from owner + followed users (currently returns all — verify this)
```

---

### `lib/storage.ts`

Thin wrappers around `chrome.storage.local`:

```typescript
// Cache highlights per URL to avoid re-fetching on every page load
async function getCachedHighlights(url: string): Promise<HighlightWithUserModel[] | null>
async function setCachedHighlights(url: string, highlights: HighlightWithUserModel[]): Promise<void>
async function clearCachedHighlights(url: string): Promise<void>

// Cache clip status per URL
async function getCachedClipStatus(url: string): Promise<{ clipped: boolean; clipId?: string } | null>
async function setCachedClipStatus(url: string, status: { clipped: boolean; clipId?: string }): Promise<void>
```

Cache TTL: 5 minutes. After 5 minutes, re-fetch from API.
Store cache entries with a `cachedAt` timestamp and check on read.

---

### `background/service-worker.ts`

Handles:
1. **Tab updates** — when user navigates to a new URL, check clip status + fetch highlights, send to content script
2. **Messages from popup** — clip page action
3. **Messages from content script** — highlight saved, request highlights
4. **Badge update** — green badge if page is clipped, no badge if not

```typescript
// On tab update (navigation complete)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  const token = await getStoredToken()
  if (!token) return  // not logged in, do nothing

  // Check if page is clipped (use cache first)
  const clipStatus = await checkClipStatus(tab.url, token)
  updateBadge(tabId, clipStatus.clipped)

  if (clipStatus.clipped) {
    // Fetch highlights and send to content script
    const highlights = await getHighlightsForUrl(tab.url, token)
    chrome.tabs.sendMessage(tabId, {
      type: 'RESTORE_HIGHLIGHTS',
      highlights,
    })
  }
})

// Badge: green dot if clipped
function updateBadge(tabId: number, clipped: boolean) {
  chrome.action.setBadgeText({ tabId, text: clipped ? '✓' : '' })
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#16a34a' })
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CLIP_PAGE') { ... }
  if (message.type === 'HIGHLIGHT_SAVED') { ... }
  if (message.type === 'GET_AUTH_STATUS') { ... }
})
```

---

### `content/content.ts`

Injected into every page. Responsibilities:
1. Listen for `RESTORE_HIGHLIGHTS` message from service worker → apply highlight marks to DOM
2. Listen for text selection → on mouseup, if text selected, save as highlight → send `HIGHLIGHT_SAVED` to service worker
3. Apply highlight styles without breaking page layout

```typescript
// Text selection handler
document.addEventListener('mouseup', async () => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return

  const text = selection.toString().trim()
  if (text.length < 3) return  // ignore tiny selections

  // Get surrounding context (50 chars before/after)
  const range = selection.getRangeAt(0)
  const contextBefore = getContextBefore(range, 50)
  const contextAfter = getContextAfter(range, 50)

  chrome.runtime.sendMessage({
    type: 'SAVE_HIGHLIGHT',
    payload: { text, contextBefore, contextAfter }
  })
})

// Restore highlights on page
function restoreHighlights(highlights: HighlightWithUserModel[]) {
  for (const highlight of highlights) {
    const color = highlight.isOwn ? 'rgba(250, 204, 21, 0.4)' : 'rgba(96, 165, 250, 0.4)'
    markTextOnPage(highlight.text, color, highlight.id)
  }
}

// Find text in DOM and wrap in <mark> element
// Use TreeWalker to traverse text nodes — never use innerHTML manipulation
function markTextOnPage(text: string, color: string, highlightId: string) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  )

  // Walk text nodes, find match, wrap with <mark>
  // Handle edge case: text spans multiple DOM nodes (use Range API)
}
```

**Highlight mark styles** (injected via content script):
```css
.inkmark-highlight {
  border-radius: 2px;
  padding: 0 1px;
  cursor: pointer;
}
.inkmark-highlight-own {
  background-color: rgba(250, 204, 21, 0.4);  /* yellow */
}
.inkmark-highlight-other {
  background-color: rgba(96, 165, 250, 0.4);  /* blue */
}
```

---

### `popup/popup.html` + `popup.ts`

Minimal. Three states:

**State 1 — Not logged in:**
```
[Inkmark logo]
[Sign in with Google button]
```

**State 2 — Logged in, page not clipped:**
```
[Inkmark logo]
[Clip this page button]  ← primary action
```

**State 3 — Logged in, page already clipped:**
```
[Inkmark logo]
[✓ Clipped]  ← disabled/success state
[X highlights on this page]
```

No navigation, no feed, no settings — just this. Keep popup.html under 50 lines.

---

### Build setup (`vite.config.ts`)

Vite with `@crxjs/vite-plugin` — handles MV3 service worker bundling correctly:

```typescript
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        popup: 'popup/popup.html',
      }
    }
  }
})
```

`@crxjs/vite-plugin` automatically handles content script + service worker bundling from manifest.json entries.

---

### New API endpoints required (add to `packages/api` before building extension)

```
GET /api/v1/highlights/by-url?url=     # highlights for a URL (with user summary)
```

Use existing `GET /api/v1/clips?url=<encoded>` (list filter) for clip-by-URL checks — no separate `/clips/by-url` route.

Update existing (optional / incremental):
```
GET /api/v1/clips/:id/highlights       # add isOwn + user fields to response
```

---

### Build order

1. Add `GET /highlights/by-url` + any clip query tweaks first
2. Scaffold `packages/extension/` with manifest + vite config
3. `lib/auth.ts` + `lib/api.ts` + `lib/storage.ts`
4. `background/service-worker.ts`
5. `content/content.ts` — highlight restoration + selection saving
6. `popup/` — three states
7. Load unpacked in Chrome → test end to end

---

### Deliverables
- [ ] Extension loads in Chrome without errors
- [ ] Google OAuth login works from popup
- [ ] Clicking "Clip this page" creates a clip via API
- [ ] Selecting text on any page saves a highlight
- [ ] Badge turns green on clipped pages
- [ ] Revisiting a clipped page restores own highlights (yellow) and followed users' highlights (blue)
- [ ] Popup shows correct state (not clipped / clipped + highlight count)
- [ ] Auth token stored in `chrome.storage.local`, never localStorage
- [ ] Cache prevents redundant API calls on every navigation

---

### Key constraints to follow
- Never use `localStorage` or `sessionStorage` — always `chrome.storage.local`
- Never use `innerHTML` for DOM manipulation — use DOM APIs or Range API
- Content script must not break page layout on any site
- Service worker has no DOM access — all DOM work happens in content script
- MV3 service workers are ephemeral — never store state in module-level variables, always use `chrome.storage`