#!/usr/bin/env node
import express, { type Request, type Response } from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { InkmarkApiClient } from './lib/api-client.js'
import { registerTools, resolveSource } from './tools.js'

const BASE_URL = process.env.INKMARK_API_URL ?? 'https://inkmark.flaplabs.xyz'
const PORT = Number(process.env.PORT ?? process.env.INKMARK_MCP_PORT ?? 3001)

// JSON-RPC error envelope for transport-level failures (before the SDK takes over).
function rpcError(res: Response, status: number, code: number, message: string): void {
  res.status(status).json({ jsonrpc: '2.0', error: { code, message }, id: null })
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1].trim() : null
}

function querySource(req: Request): string | undefined {
  const raw = req.query.source
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0]
  return undefined
}

const app = express()
// Behind nginx: resolve req.ip from X-Forwarded-For so each end client keeps its
// own identity. It's re-forwarded to the REST API for per-user rate limiting.
app.set('trust proxy', 1)
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Streamable HTTP is stateless here: every request carries its own bearer token
// (a personal access token), so we build a fresh server + client per request and
// let the downstream REST API enforce auth and rate limits.
app.post('/mcp', async (req: Request, res: Response) => {
  const token = bearerToken(req)
  if (!token) {
    rpcError(res, 401, -32001, 'Missing or malformed Authorization: Bearer <token> header.')
    return
  }

  const source = resolveSource(querySource(req) ?? process.env.INKMARK_MCP_SOURCE)
  const server = new McpServer({ name: 'inkmark', version: '0.1.0' })
  registerTools(server, new InkmarkApiClient(BASE_URL, token, req.ip), source)

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

  res.on('close', () => {
    void transport.close()
    void server.close()
  })

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('MCP request failed:', err)
    if (!res.headersSent) {
      rpcError(res, 500, -32603, 'Internal server error.')
    }
  }
})

// Stateless mode has no server-initiated streams or sessions to resume/terminate.
function methodNotAllowed(_req: Request, res: Response): void {
  res.setHeader('Allow', 'POST')
  rpcError(res, 405, -32000, 'Method not allowed.')
}
app.get('/mcp', methodNotAllowed)
app.delete('/mcp', methodNotAllowed)

app.listen(PORT, () => {
  console.error(`Inkmark MCP server running on http://localhost:${PORT}/mcp (streamable HTTP)`)
})
