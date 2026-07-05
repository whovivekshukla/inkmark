# Inkmark

Inkmark is a social reading app: users **clip** articles/URLs, **highlight** text within them, and
**follow** other readers to see a **feed** of what they're saving and highlighting. It ships as a
REST API, a React web app, a Chrome extension, and an MCP server that exposes your library to AI
hosts.

> "Inkmark" is a temporary name.

## Monorepo layout

pnpm workspaces + Turborepo. Packages:

| Package | Purpose |
|---|---|
| [`packages/api`](packages/api) | REST API (Express + Prisma + PostgreSQL). **Owns the Prisma schema and all migrations.** |
| [`packages/web`](packages/web) | React 18 + Vite SPA frontend. |
| [`packages/mcp`](packages/mcp) | MCP (Model Context Protocol) stdio server. Talks to the REST API only — never the DB. |
| [`packages/shared`](packages/shared) | Shared TS types/DTOs consumed by all packages (`@inkmark/shared`). |
| [`packages/extension`](packages/extension) | Chrome extension (Manifest V3) — clip + highlight from the browser. |
| [`packages/nginx`](packages/nginx) | Reverse-proxy config for deployment. |

## Stack

Node.js + TypeScript (strict). API: Express 4, Prisma 5 + PostgreSQL, Zod, Winston. Auth: Google
OAuth 2.0 → JWT, plus Personal Access Tokens for programmatic clients. Web: React 18 + Vite +
react-router. Deploy: Docker images on GHCR behind nginx; secrets via Infisical.

## Prerequisites

- **Node.js 22** (see [`.nvmrc`](.nvmrc) — `nvm use`)
- **pnpm 10.32.1** — enable via corepack: `corepack enable && corepack prepare pnpm@10.32.1 --activate`
- **PostgreSQL 14+** running locally (or a connection string to one)

Use **pnpm only** — npm/yarn are not supported; the package manager is pinned.

## Local setup

```bash
# 1. Install dependencies (runs `prisma generate` via postinstall)
pnpm install

# 2. Configure the API
cp packages/api/.env.sample packages/api/.env
#   then edit packages/api/.env — set DATABASE_URL, Google OAuth creds, and JWT_SECRET
#   (see packages/api/.env.sample for the full list and descriptions)

# 3. Create the database schema
pnpm --filter @inkmark/api migrate

# 4. Run everything in parallel (API on :3000, web on :5173)
pnpm dev
```

Useful per-package commands:

```bash
pnpm --filter @inkmark/api dev       # API only (ts-node-dev, auto-generates Prisma client)
pnpm --filter @inkmark/api studio    # Prisma Studio
pnpm --filter @inkmark/web dev       # web SPA only
```

## Repo-wide checks

Run from the root — Turborepo fans out to every package:

```bash
pnpm build        # build all (respects build dependency order)
pnpm typecheck    # tsc --noEmit everywhere — must pass before any PR
pnpm lint         # eslint everywhere
```

## MCP server

`packages/mcp` is a stdio MCP server exposing your Inkmark library to AI hosts (Claude Desktop,
etc.). It authenticates with a **Personal Access Token** and calls the REST API only. Configure it
via environment variables:

| Env var | Required | Description |
|---|---|---|
| `INKMARK_API_TOKEN` | yes | A Personal Access Token (create one via `POST /api/v1/auth/tokens`, JWT-authenticated). |
| `INKMARK_API_URL` | no | API base URL. Defaults to the production host. |
| `INKMARK_MCP_SOURCE` | no | Tags clips with the originating AI surface (e.g. `CLAUDE`, `CHATGPT`, `CODEX`). Defaults to `MCP`. |

Build it (`pnpm --filter @inkmark/mcp build`) and point your host's MCP config at
`packages/mcp/dist/index.js` with the env vars above.

## Chrome extension

Build the Manifest V3 extension, then load the `packages/extension` directory unpacked in Chrome. It
talks to production by default; point it at a local API with `INKMARK_EXT_API_URL`. Full
build/load/dev instructions live in [`packages/extension/README.md`](packages/extension/README.md).

## Conventions

Architecture and coding rules are enforced and documented in [`CLAUDE.md`](CLAUDE.md) and
[`.claude/rules/`](.claude/rules) — controller → service → repository layering, the `ApiResponse<T>`
envelope, `AppError`-only error handling, soft deletes + audit logging, and TypeScript standards.
Read them before contributing.
