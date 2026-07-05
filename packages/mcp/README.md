# @inkmark/mcp

MCP (Model Context Protocol) server for [Inkmark](https://github.com/whovivekshukla/inkmark) — a social reading app for clipping URLs, saving highlights, and following other readers.

This server lets AI hosts like **Claude Desktop** and **Claude Code** create clips, add highlights, and search your Inkmark library on your behalf. It talks only to the Inkmark REST API — it never touches a database directly.

## Two ways to run it

| Transport | Entrypoint | Auth | When to use |
|---|---|---|---|
| **stdio** | `inkmark-mcp` (`dist/index.js`) | `INKMARK_API_TOKEN` env var | The host launches the server locally via `npx`. One process = one user. |
| **Streamable HTTP** | `inkmark-mcp-http` (`dist/http.js`) | `Authorization: Bearer <token>` per request | A hosted endpoint (e.g. `https://inkmark.flaplabs.xyz/mcp`) that any host connects to over HTTP. No local install. Multi-tenant: each request carries its own token. |

The HTTP server is **stateless** — every request builds a fresh MCP server bound to the bearer token on that request, and the downstream REST API enforces auth and rate limits. Nothing is stored in the MCP process.

## Requirements

- Node.js 18+
- An Inkmark account and a **Personal Access Token** (create one in Inkmark → Settings → Access tokens; it starts with `ink_`).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `INKMARK_API_TOKEN` | **Yes** | — | Your Inkmark Personal Access Token (`ink_...`). The server exits immediately if this is missing. |
| `INKMARK_API_URL` | No | `https://inkmark.flaplabs.xyz` | Base URL of the Inkmark API (include the host only; the client appends `/api/v1`). |
| `INKMARK_MCP_SOURCE` | No | `MCP` | Tags clips with the originating AI surface. One of `WEB`, `EXTENSION`, `MCP`, `CLAUDE`, `CHATGPT`, `CODEX`, `API`. Use `CLAUDE` for Claude Desktop/Code. |

## Use with Claude Desktop

Add this to your `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "inkmark": {
      "command": "npx",
      "args": ["-y", "@inkmark/mcp"],
      "env": {
        "INKMARK_API_URL": "https://inkmark.flaplabs.xyz",
        "INKMARK_API_TOKEN": "ink_your_token_here",
        "INKMARK_MCP_SOURCE": "CLAUDE"
      }
    }
  }
}
```

Restart Claude Desktop; the Inkmark tools appear in the tool picker.

## Use with Claude Code

```bash
claude mcp add inkmark \
  --env INKMARK_API_URL=https://inkmark.flaplabs.xyz \
  --env INKMARK_API_TOKEN=ink_your_token_here \
  --env INKMARK_MCP_SOURCE=CLAUDE \
  -- npx -y @inkmark/mcp
```

## Use over Streamable HTTP (hosted)

Once the HTTP server is deployed at `https://inkmark.flaplabs.xyz/mcp`, hosts connect by URL with the token in a header — no `npx`, no local Node. For hosts that support remote MCP natively:

```json
{
  "mcpServers": {
    "inkmark": {
      "url": "https://inkmark.flaplabs.xyz/mcp",
      "headers": {
        "Authorization": "Bearer ink_your_token_here"
      }
    }
  }
}
```

For hosts that only speak stdio, bridge with [`mcp-remote`](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "inkmark": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://inkmark.flaplabs.xyz/mcp",
        "--header",
        "Authorization: Bearer ink_your_token_here"
      ]
    }
  }
}
```

The clip source defaults to `MCP`; append `?source=CLAUDE` (etc.) to the URL to override it, since there's no per-host env var over HTTP.

### Running the HTTP server

| Variable | Default | Description |
|---|---|---|
| `PORT` / `INKMARK_MCP_PORT` | `3001` | Port the HTTP server listens on. |
| `INKMARK_API_URL` | `https://inkmark.flaplabs.xyz` | Base URL of the Inkmark REST API. |

```bash
pnpm --filter @inkmark/mcp build      # produces dist/http.js
pnpm --filter @inkmark/mcp start:http # node dist/http.js
# or, in dev:
pnpm --filter @inkmark/mcp dev:http   # tsx watch src/http.ts
```

`GET /health` returns `{ "status": "ok" }` for load-balancer checks. `POST /mcp` requires a bearer token; `GET`/`DELETE /mcp` return `405` (stateless — no sessions to resume).

## Local development

From the monorepo root:

```bash
pnpm --filter @inkmark/mcp dev     # run the stdio server with tsx against src
pnpm --filter @inkmark/mcp build   # bundle both entrypoints to dist/ with tsup
```

The build inlines `@inkmark/shared` into a single ESM file so the published package has no workspace dependencies.

## Publishing (maintainers)

The package is prepared for a standalone publish — `@inkmark/shared` is bundled, so it is **not** published separately.

```bash
pnpm --filter @inkmark/mcp build     # also runs automatically via prepublishOnly
cd packages/mcp
npm publish                          # publishConfig.access is already "public"
```
