# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Inkmark is a social reading app: users clip articles/URLs, highlight text, and follow other readers. It's a pnpm + Turborepo monorepo. "Inkmark" is a temporary name.

## Stack

- Node.js + TypeScript (strict everywhere)
- API: Express 4, Prisma 5 + PostgreSQL, Zod, Winston
- Auth: Google OAuth 2.0 → JWT (stateless) + Personal Access Tokens for programmatic clients
- Web: React 18 + Vite + react-router
- MCP: `@modelcontextprotocol/sdk` (stdio server)
- Deploy: Docker images on GHCR behind nginx; secrets via Infisical

## Packages

| Package | Purpose |
|---|---|
| `packages/api` | REST API. **Owns the Prisma schema and all migrations.** |
| `packages/web` | React SPA frontend (Vite). |
| `packages/mcp` | MCP server. Calls the REST API via `lib/api-client.ts` — **never touches the DB directly.** |
| `packages/shared` | Shared TS types/DTOs consumed by all other packages (`@inkmark/shared`). |
| `packages/extension` | Chrome extension (Manifest V3) — clip + highlight from the browser. Talks to the REST API only; API base is build-time configurable. |
| `packages/nginx` | Reverse-proxy config for deployment. |

## Commands

Run from repo root (Turborepo fans out to all packages):

```bash
pnpm dev          # run all packages in parallel
pnpm build        # build all (respects ^build dependency order)
pnpm typecheck    # tsc --noEmit across all packages — must pass before any PR
pnpm lint         # eslint across all packages
```

Per-package (use `pnpm --filter <name> <script>`, e.g. `pnpm --filter @inkmark/api dev`):

```bash
# packages/api
pnpm --filter @inkmark/api dev       # ts-node-dev, auto-runs prisma generate first
pnpm --filter @inkmark/api migrate   # prisma migrate dev --name <name>
pnpm --filter @inkmark/api studio    # prisma studio
pnpm --filter @inkmark/api generate  # prisma generate (also runs on postinstall)

# packages/web
pnpm --filter @inkmark/web dev       # vite dev server (default :5173)
```

**Use pnpm only — never npm or yarn.** Package manager is pinned (`pnpm@10.32.1`).

**Tests:** there is no test suite yet. There is no test runner configured — do not assume `pnpm test` works.

## Architecture

### API: strict Controller → Service → Repository

Every API module under `packages/api/src/modules/<name>/` follows the same anatomy and layering. No exceptions:

- `*.router.ts` — route definitions, attaches `requireAuth`/`validate()` middleware
- `*.controller.ts` — request parsing + response only. **No Prisma, no business logic.**
- `*.service.ts` — all business logic. **No Prisma calls.** Wraps async methods in try/catch (see error-handling rules).
- `*.repository.ts` — DB queries only, explicit column selection always. Wraps every method in try/catch + `handlePrismaError()`.
- `*.schema.ts` — Zod schemas for body/query/params
- `*.types.ts` — module-local types
- `index.ts` — re-exports the router

Modules: `auth`, `clips`, `highlights`, `tags`, `follows`, `feed`, `users`, `search`, `audit-log`.

Routes are wired in `src/index.ts` under a single `/api/v1` router. The global error handler is mounted last; `express-async-errors` forwards async throws to it.

### Auth (two mechanisms)

- `requireAuth` (`src/middleware/auth.ts`) — accepts **JWT or Personal Access Token**. Use on all standard protected routes. Attaches `{ userId }` to `req.user`.
- `requireJwt` — JWT **only**. Used on token-management routes (`/auth/tokens`) so PATs cannot mint or revoke other PATs.
- OAuth flow: `GET /auth/google` → callback → frontend redirect; SPAs complete via `POST /auth/exchange` (code exchange).
- PATs are SHA-256 hashed in `PersonalAccessToken`; the MCP server authenticates with one via `INKMARK_API_TOKEN`.
- **Never trust `userId` from the request body — always use `req.user.userId`.**

### Domain models (Prisma)

`User`, `Clip`, `Highlight`, `Tag`, `ClipTag` (join), `Follow`, `AuditLog`, `PersonalAccessToken`. `ClipSource` enum tracks where a clip originated (web, MCP, extension, etc.).

- `User`, `Clip`, `Highlight` use **soft deletes** (`deletedAt`). Queries must filter `where: { deletedAt: null }` unless explicitly fetching deleted rows. Never hard-delete these.
- Write an `AuditLog` row on **every data mutation** (`entity.verb` action format). AuditLog rows are immutable.

### Shared types as the contract

`packages/shared` is the single source of truth for cross-package types. API responses always use the `ApiResponse<T>` envelope (`packages/shared/src/types/api.ts`): `{ data, meta? }` on success, `{ error: { code, message } }` on failure. The web client and MCP client both consume these types — changing a DTO ripples across packages, so update `shared` first.

### MCP server

`packages/mcp` is a stdio MCP server that exposes Inkmark to AI hosts (Claude Desktop, etc.). It talks **only** to the REST API via `InkmarkApiClient`. Configured via env: `INKMARK_API_URL`, `INKMARK_API_TOKEN` (a PAT, required), `INKMARK_MCP_SOURCE` (tags clips with the originating AI surface).

## Project rules (read these — they are enforced)

Detailed conventions live in `.claude/rules/` and override defaults:

- `.claude/rules/api-conventions.md` — routing, status codes, `ApiResponse` envelope, pagination (`?page=&limit=`, max 100), thin controllers, Swagger annotations.
- `.claude/rules/database.md` — Prisma singleton, explicit `select`, N+1 prevention, `$transaction` for atomic multi-step mutations, soft deletes, AuditLog, indexes, raw-query policy, migration workflow.
- `.claude/rules/error-handling.md` — always throw `AppError` (never raw `Error` or direct `res.status().json()` from controllers); error codes enum in `src/constants/error-codes.ts`; repo/service try/catch patterns; `validate()` middleware only.
- `.claude/rules/typescript.md` — strict mode, no `any` (without justification), `interface` for shapes / `type` for unions, enums over magic strings, `async/await` only (no floating promises), path aliases (`@/`), no `console.log` (use `logger`), constants in `constants/`.

## Conventions quick-reference

- All routes under `/api/v1/`; resources are plural kebab-case nouns; nest only one level deep.
- Path alias `@/` maps to `packages/api/src/` — never use `../../` relative imports.
- Files are `kebab-case.ts`.
- Constants live in `src/constants/` (`error-codes`, `audit-actions`, `limits`, `pagination`) — no inline magic values.
- Env vars documented in `packages/api/.env.sample`.

## Domain language (use these exact terms)

- **Clip** — a saved article/URL (not "save" or "bookmark").
- **Highlight** — selected text anchored to a clip.
- **Feed** — paginated clips/highlights from followed users.
