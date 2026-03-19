# Inkmark — Build Progress

## Current phase: Phase 3 — Clips
## Status: Complete

---

## Phases

- [x] Phase 0 — Monorepo Bootstrap
- [x] Phase 1 — Prisma Schema + Database Setup
- [x] Phase 2 — Auth (Google OAuth + JWT)
- [x] Phase 3 — Clips
- [ ] Phase 3 — Clips
- [ ] Phase 4 — Highlights
- [ ] Phase 5 — Follows + Feed
- [ ] Phase 6 — Users + Search
- [ ] Phase 7 — Tags
- [ ] Phase 8 — MCP Server

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
**Status**: Not started
**Deliverables**:
- [ ] Highlights on a public clip visible to anyone with clip access
- [ ] Highlights on a private clip only visible to owner
- [ ] Soft delete works
- [ ] AuditLog written on every mutation

## Phase 5 — Follows + Feed
**Status**: Not started
**Deliverables**:
- [ ] Follow/unfollow works with correct conflict handling
- [ ] Feed returns only public clips from followed users
- [ ] Feed is paginated
- [ ] No N+1 on feed query
- [ ] Partial index migration applied

## Phase 6 — Users + Search
**Status**: Not started
**Deliverables**:
- [ ] Full-text search returns ranked results using `ts_rank`
- [ ] Raw query has comment explaining why Prisma ORM is bypassed
- [ ] Public profile 404s correctly for unknown/deleted users
- [ ] User search works case-insensitively

## Phase 7 — Tags
**Status**: Not started
**Deliverables**:
- [ ] `GET /tags` returns tags with clip counts
- [ ] `DELETE /tag` cascades to clip_tags
- [ ] Tag names lowercased + trimmed on create
- [ ] AuditLog on create and delete

## Phase 8 — MCP Server
**Status**: Not started
**Deliverables**:
- [ ] MCP server starts and lists tools correctly
- [ ] Each tool calls the API and returns structured data
- [ ] `summarize_today` returns data an LLM can summarize without further calls
- [ ] All tools handle API errors gracefully

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

---

## Notes
<!-- Anything the agent should know that doesn't fit elsewhere -->
