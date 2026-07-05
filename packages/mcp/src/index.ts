#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { InkmarkApiClient } from './lib/api-client.js'
import { registerTools, resolveSource } from './tools.js'

const BASE_URL = process.env.INKMARK_API_URL ?? 'https://inkmark.flaplabs.xyz'
const TOKEN = process.env.INKMARK_API_TOKEN

if (!TOKEN) {
  console.error('Fatal: INKMARK_API_TOKEN environment variable is required')
  process.exit(1)
}

// Identifies which AI surface the MCP server is wired to. Defaults to generic MCP
// when the host (Claude Desktop, ChatGPT desktop, Codex, etc.) is unknown.
const source = resolveSource(process.env.INKMARK_MCP_SOURCE)

const server = new McpServer({ name: 'inkmark', version: '0.1.0' })
registerTools(server, new InkmarkApiClient(BASE_URL, TOKEN), source)

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`Inkmark MCP server running on stdio (source=${source})`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
