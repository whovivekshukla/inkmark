# Inkmark

Monorepo social reading app. Users clip articles, highlight text, follow others.
Temp name — rename at deployment.

## Stack
- Runtime: Node.js, TypeScript (strict)
- Framework: Express
- ORM: Prisma + PostgreSQL
- Monorepo: pnpm workspaces + Turborepo
- Validation: Zod
- Auth: Google OAuth 2.0 + JWT (stateless)
- Logging: Winston

## Packages
- `packages/api`     → REST API (owns Prisma schema + migrations)
- `packages/mcp`     → MCP server (calls API via api-client, no direct DB access)
- `packages/shared`  → shared TypeScript types + DTOs
- `packages/extension` → Chrome extension (placeholder)

## Architecture
Strict **Controller → Service → Repository** pattern. No exceptions.
- Controllers: request parsing + response only. No Prisma, no business logic.
- Services: all business logic. No Prisma calls.
- Repositories: DB queries only. No logic. Specific column selection always.

See `.claude/rules/api-conventions.md` for full API rules.
See `.claude/rules/database.md` for Prisma + query rules.
See `.claude/rules/typescript.md` for code quality rules.
See `.claude/rules/error-handling.md` for error + validation rules.

## Key conventions
- All routes under `/api/v1/`
- All responses use `ApiResponse<T>` envelope — see `packages/shared/src/types/api.ts`
- Soft deletes via `deletedAt` on `User`, `Clip`, `Highlight`
- `AuditLog` written on every data mutation
- `validate()` Zod middleware on all inputs — never trust raw req.body
- pnpm only — never npm or yarn

## Domain language
- **Clip**: a saved article/URL (not "save", not "bookmark")
- **Highlight**: selected text anchored to a clip
- **Feed**: paginated clips/highlights from followed users

## Commands
```bash
pnpm dev              # run all packages in parallel (turbo)
pnpm build            # build all packages
pnpm typecheck        # tsc --noEmit across all packages
pnpm lint             # eslint across all packages

# from packages/api:
pnpm migrate          # prisma migrate dev
pnpm studio           # prisma studio
pnpm generate         # prisma generate
```

## Env
All env vars documented in `packages/api/.env.sample`. Never hardcode secrets.