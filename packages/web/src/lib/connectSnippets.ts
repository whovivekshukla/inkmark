import { getApiBase } from '../api/client'

/** Placeholder shown in snippets before the user has generated a token. */
export const TOKEN_PLACEHOLDER = 'ink_your_token_here'

// The API/MCP host without the `/api/v1` suffix.
export function apiHost(): string {
  return getApiBase().replace(/\/api\/v1\/?$/, '')
}

/** Hosted streamable-HTTP MCP endpoint. */
export function mcpUrl(): string {
  return `${apiHost()}/mcp`
}

/** Native remote-MCP config: the host connects directly by URL with a bearer header. */
export function mcpUrlConfig(url: string, token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        inkmark: {
          url,
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    },
    null,
    2,
  )
}

/** stdio bridge (mcp-remote) for hosts that don't support remote URLs yet. */
export function mcpRemoteConfig(url: string, token: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        inkmark: {
          command: 'npx',
          args: ['-y', 'mcp-remote', url, '--header', `Authorization: Bearer ${token}`],
        },
      },
    },
    null,
    2,
  )
}

/** Claude Code CLI, HTTP transport. */
export function claudeCodeHttpCommand(url: string, token: string): string {
  return [
    'claude mcp add --transport http inkmark \\',
    `  ${url} \\`,
    `  --header "Authorization: Bearer ${token}"`,
  ].join('\n')
}
