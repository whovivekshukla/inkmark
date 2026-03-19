# Inkmark — Build Progress

## Current phase: Phase 9 — Chrome Extension
## Status: In progress

---

## Phases

- [x] Phase 0 — Monorepo Bootstrap
- [x] Phase 1 — Prisma Schema + Database Setup
- [x] Phase 2 — Auth (Google OAuth + JWT)
- [x] Phase 3 — Clips
- [x] Phase 4 — Highlights
- [x] Phase 5 — Follows + Feed
- [x] Phase 6 — Users + Search
- [x] Phase 7 — Tags
- [x] Phase 7.5 — Personal Access Tokens (unplanned)
- [x] Phase 8 — MCP Server
- [ ] Phase 9 — Chrome Extension

---

## Phase 0 — Monorepo Bootstrap
**Status**: Complete
**Deliverables**:
- [x] `pnpm install` runs cleanly
- [x] `pnpm typecheck` passes across all packages (5 tasks, 5 successful)
- [x] `GET /health` returns 200 `{"status":"ok"}`
- [x] Logger writes to console in dev (Winston, colorized simple format in dev)

## Phase 1 — Prisma Schema + Database Setup
**Status**: Complete
**Deliverables**:
- [x] `prisma migrate dev` runs cleanly
- [x] `prisma studio` shows all tables
- [x] Search vector trigger fires on clip insert (CREATE TRIGGER confirmed)
- [x] Prisma client generates without errors

## Phase 2 — Auth (Google OAuth + JWT)
**Status**: Not started
**Deliverables**:
- [ ] Full OAuth flow works end-to-end
- [ ] `GET /api/v1/auth/me` with valid JWT returns user
- [ ] `GET /api/v1/auth/me` without JWT returns 401
- [ ] New user auto-registered on first Google login
- [ ] Returning user gets updated avatar/displayName
- [ ] AuditLog row written on every login

## Phase 3 — Clips
**Status**: Complete
**Deliverables**:
- [x] `POST /clips` creates clip and returns immediately
- [x] Duplicate URL for same user returns existing clip (idempotent)
- [x] Soft-deleted clip restored on re-save via atomic upsert
- [x] Tag add/remove works transactionally
- [x] All queries paginated with correct `meta` in response
- [x] AuditLog written on every mutation via dedicated auditLog module

## Phase 4 — Highlights
**Status**: Complete
**Deliverables**:
- [x] Highlights on a public clip visible to anyone with clip access
- [x] Highlights on a private clip only visible to owner
- [x] Soft delete works
- [x] AuditLog written on every mutation

## Phase 5 — Follows + Feed
**Status**: Complete
**Deliverables**:
- [x] Follow/unfollow works with correct conflict handling
- [x] Feed returns only public clips from followed users
- [x] Feed is paginated
- [x] No N+1 on feed query
- [x] Partial index migration applied

## Phase 6 — Users + Search
**Status**: Complete
**Deliverables**:
- [x] Full-text search returns ranked results using `ts_rank`
- [x] Raw query has comment explaining why Prisma ORM is bypassed
- [x] Public profile 404s correctly for unknown/deleted users
- [x] User search works case-insensitively

## Phase 7 — Tags
**Status**: Complete
**Deliverables**:
- [x] `GET /tags` returns tags with clip counts
- [x] `DELETE /tag` cascades to clip_tags
- [x] Tag names lowercased + trimmed on create
- [x] AuditLog on create and delete

## Phase 7.5 — Personal Access Tokens (unplanned)
**Status**: Complete
**Deliverables**:
- [x] `PersonalAccessToken` Prisma model + migration
- [x] `POST /api/v1/auth/tokens` — create PAT (JWT only, max 10 per user)
- [x] `GET /api/v1/auth/tokens` — list PATs (JWT only, no raw token)
- [x] `DELETE /api/v1/auth/tokens/:id` — revoke PAT (JWT only)
- [x] Auth middleware supports both JWT and PAT (`requireAuth` vs `requireJwt`)
- [x] Token format: `ink_` + 64 hex chars, stored as SHA-256 hash
- [x] Shared types: `PersonalAccessTokenModel`, `PersonalAccessTokenCreatedModel`
- [x] Postman collection updated with all 3 endpoints
- [x] AuditLog on create and revoke

## Phase 8 — MCP Server
**Status**: Complete
**Deliverables**:
- [x] MCP server code with tools (get_clips, get_highlights, search_clips)
- [x] API client calls REST API with Bearer token auth
- [x] End-to-end test: create PAT → configure MCP → verify tools work
- [x] All tools handle API errors gracefully

## Phase 9 — Chrome Extension
**Status**: In progress
**Deliverables**:
- [x] New API endpoint: `GET /api/v1/highlights/by-url?url=` (highlights across all clips for a URL with user info)
- [x] Unified `highlightRepository.findMany(filters)` with `clipId`, `url`, `requestingUserId`, `includeUser` filters
- [x] `HighlightWithUserModel` added to shared types
- [x] `url` filter added to `GetClipsQuerySchema` (was missing, caused wrong clip matching)
- [x] Extension scaffold: manifest.json, vite.config.ts, tsconfig.json, package.json
- [x] `lib/auth.ts` — manual JWT token entry (Google OAuth deferred to web app phase)
- [x] `lib/api.ts` — typed API client (clips, highlights, auth, getMe, deleteHighlight)
- [x] `lib/storage.ts` — `chrome.storage.local` wrappers with 5-min TTL cache
- [x] `background/service-worker.ts` — tab navigation, badge, message handler, highlight delete
- [x] `content/content.ts` — floating toolbar UX for new highlights + hover tooltip with delete for existing
- [x] `popup/` — three states (token input, unclipped, clipped) + sign out
- [x] Placeholder icons generated
- [x] `pnpm typecheck` passes across all packages
- [x] Load unpacked in Chrome and test end-to-end
- [x] Clip, highlight, delete highlight all working
- [ ] Replace placeholder icons with real ones
- [ ] Wire Google OAuth via web app login (deferred)

---

## Decisions log
<!-- Agent and developer append decisions here as they are made. Never delete entries. -->

- `cuid()` used for all primary keys (not uuid)
- JWT stateless — no session table
- OG metadata fetch is fire-and-forget, non-blocking response
- Google OAuth only — no email/password auth
- Monorepo via pnpm workspaces + Turborepo
- MCP server calls REST API only — no direct DB access
- Temp project name: Inkmark (rename at deployment)
- Phase 0: Per-package tsconfigs use `"module": "CommonJS"` / `"moduleResolution": "Node"` to support path aliases (`@/`) with tsconfig-paths at runtime. The root tsconfig.base.json retains NodeNext as spec'd; packages override for Express/CommonJS compatibility.
- Phase 0: `packageManager: "pnpm@9.12.3"` added to root package.json — required by turbo v2 for workspace resolution.
- Phase 0: `packages/shared` points main/types at `./src/index.ts` for dev (ts-node-dev resolves TypeScript directly); build step compiles to dist/ in later phases.
- Phase 0: Health check mounted at `/health` (outside `/api/v1/`) so load balancers can reach it without auth.
- Phase 1: `AuditAction` implemented as TypeScript enum (`constants/audit-actions.ts`) not a Postgres enum — avoids `ALTER TYPE` migrations every time a new action is added during active development, and in prod.
- Phase 1: `searchVector` kept in schema using `Unsupported("tsvector")` — Prisma manages the column in migrations but never reads/writes it; populated exclusively via Postgres trigger on clip insert/update.
- Phase 3: Duplicate clip save is idempotent — returns existing active clip rather than 409. Soft-deleted clips restored via atomic upsert on `[userId, url]` unique constraint.
- Phase 3: OG metadata fetching dropped — Chrome extension sends title/description/ogImage/faviconUrl in the POST body directly (already has the page open).
- Phase 3: `auditLogService` module created — all services call `auditLogService.log()` instead of Prisma directly. Audit log failures are caught and logged, never propagated.
- Phase 3: Module barrel exports (`index.ts`) added to each module — imports use `@/modules/audit-log` not deep paths.
- Phase 3: Partial index `clips_user_active_saved_idx ON clips(user_id, saved_at DESC) WHERE deleted_at IS NULL` added for getAll query performance.
- Phase 4: Renamed all `*DTO` types to `*Model` across shared package and API consumers.
- Phase 4: Added `HighlightColor` enum to shared types — used in schemas via `z.nativeEnum()`.
- Phase 4: `createHighlight` does NOT pre-check clip existence — relies on DB FK constraint (P2003 → global handler → 400).
- Phase 4: `GET /clips/:id/highlights` mounted on clips router (nested resource); POST/PATCH/DELETE on `/highlights` router.
- Phase 4: Repository methods have no try/catch and no explicit select — follows clips.repository.ts pattern.
- Phase 4: Updated `.claude/rules/error-handling.md` — repositories no longer require try/catch.
- Phase 5: `followUser` relies on DB unique PK constraint for duplicate detection (P2002 → 409); `unfollowUser` relies on P2025 for not-found (→ 404). No pre-checks.
- Phase 5: `UserSummaryModel` added to shared — public user info (no email) for follower lists and feed contexts.
- Phase 5: `FeedClipModel` and `FeedHighlightModel` added to shared — include nested `user` and `clip` fields for feed responses.
- Phase 5: Feed query uses `clips_user_public_saved_idx` partial index (migration `20260319130000_add_feed_partial_index`).
- Phase 5: Feed service calls `followRepository.getFollowingIds` then queries clips/highlights in one batch — no N+1.
- Phase 6: `DateRangeQuery extends PaginationQuery` added to shared — all module query types now extend shared base types instead of duplicating page/limit.
- Phase 6: `UserProfileModel` added to shared — public user profile (no email) for profile pages.
- Phase 6: Clip search uses `prisma.$queryRaw` with `Prisma.sql` for conditional date filters — safe from injection.
- Phase 6: Highlight search uses Prisma `contains + mode: insensitive` (ILIKE) — no tsvector on highlights.
- Phase 6: `/users/search` route defined before `/:username` in the router to avoid Express route shadowing.
- Phase 6: `handlePrismaError` used in all new repositories — consistent with established pattern.
- Phase 7.5: PAT added outside original scope to enable MCP server auth — Google OAuth not viable for headless CLI tools.
- Phase 7.5: `requireJwt` middleware prevents PATs from managing other PATs — only JWT (Google OAuth) can create/list/revoke tokens.
- Phase 7.5: Token repositories use generic `findOne(filter)` / `findMany(filter)` instead of per-field finders — reduces method count.
- Phase 7.5: `isActive` not stored or returned — frontend computes from `revokedAt` and `expiresAt`.
- Phase 9: Extension auth is manual JWT entry against `GET /auth/me` (no `POST /auth/google/token` — that flow was removed to avoid token-audience pitfalls with Google userinfo-only verification).
- Phase 9: No `GET /clips/by-url` endpoint — extension reuses existing `GET /clips?url=<encoded>` filter on the list endpoint.
- Phase 9: `highlightRepository.findManyByClipId` replaced with generic `findMany(filters)` accepting `clipId`, `url`, `requestingUserId`, `includeUser` — single method for all highlight queries.
- Phase 9: `isOwn` computed client-side by comparing `highlight.userId` to stored user ID — not returned by API.
- Phase 9: Extension uses Vite with manual rollup inputs (not `@crxjs/vite-plugin`) for popup/content/background entry points.
- Phase 9: Highlight cache + clip status cache use 5-minute TTL in `chrome.storage.local` — avoids redundant API calls on navigation.
- Phase 9: Content script auto-clips the page if a user selects text on an unclipped page — seamless highlight-first workflow.

---

## Notes
<!-- Anything the agent should know that doesn't fit elsewhere -->
