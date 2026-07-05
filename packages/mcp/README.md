# @inkmark/mcp

MCP (Model Context Protocol) server for [Inkmark](https://github.com/whovivekshukla/inkmark) — a social reading app for clipping URLs, saving highlights, and following other readers.

This server lets AI hosts like **Claude Desktop** and **Claude Code** create clips, add highlights, and search your Inkmark library on your behalf. It talks only to the Inkmark REST API — it never touches a database directly.

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

## Local development

From the monorepo root:

```bash
pnpm --filter @inkmark/mcp dev     # run with tsx against src
pnpm --filter @inkmark/mcp build   # bundle to dist/ with tsup
```

The build inlines `@inkmark/shared` into a single ESM file so the published package has no workspace dependencies.

## Publishing (maintainers)

The package is prepared for a standalone publish — `@inkmark/shared` is bundled, so it is **not** published separately.

```bash
pnpm --filter @inkmark/mcp build     # also runs automatically via prepublishOnly
cd packages/mcp
npm publish                          # publishConfig.access is already "public"
```
