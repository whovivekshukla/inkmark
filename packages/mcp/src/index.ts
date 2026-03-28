import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import type { ClipModel, HighlightModel } from '@inkmark/shared'
import { InkmarkApiClient } from './lib/api-client.js'

const BASE_URL = process.env.INKMARK_API_URL ?? 'https://inkmark.flaplabs.xyz'
const TOKEN = process.env.INKMARK_API_TOKEN

if (!TOKEN) {
  console.error('Fatal: INKMARK_API_TOKEN environment variable is required')
  process.exit(1)
}

const client = new InkmarkApiClient(BASE_URL, TOKEN)

const server = new McpServer({
  name: 'inkmark',
  version: '0.0.1',
})

// ─── Formatters ────────────────────────────────────────────────────────────

function formatClip(clip: ClipModel, index: number): string {
  const lines = [
    `${index}. **${clip.title ?? 'Untitled'}**`,
    `   URL: ${clip.url}`,
    `   Domain: ${clip.domain ?? 'unknown'}`,
    `   Saved: ${new Date(clip.savedAt).toLocaleDateString()}`,
  ]
  const tags = clip.tags?.map((t) => t.tag?.name ?? t.tagId).filter(Boolean)
  if (tags && tags.length > 0) lines.push(`   Tags: ${tags.join(', ')}`)
  lines.push(`   ID: ${clip.id}`)
  return lines.join('\n')
}

function formatHighlight(highlight: HighlightModel, index: number): string {
  const lines = [`${index}. [${highlight.color}] "${highlight.text}"`]
  if (highlight.contextBefore) lines.push(`   Context: ...${highlight.contextBefore}`)
  return lines.join('\n')
}

// ─── Tools ─────────────────────────────────────────────────────────────────

server.registerTool(
  'get_clips',
  {
    description:
      'Get your saved clips (bookmarked articles) from Inkmark. Returns a paginated list with titles, URLs, domains, tags, and clip IDs. Use the clip ID with get_highlights to fetch highlights on a specific article.',
    inputSchema: {
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe('Number of clips per page (default: 20, max: 50)'),
    },
  },
  async ({ page, limit }) => {
    try {
      const res = await client.getClips({ page, limit })
      const { data: clips, meta } = res

      if (clips.length === 0) {
        return { content: [{ type: 'text', text: 'No clips found.' }] }
      }

      const lines = [
        `Found ${meta.total} clips — showing page ${meta.page} of ${Math.ceil(meta.total / meta.limit)}:`,
        '',
        ...clips.map((clip, i) => formatClip(clip, i + 1)),
      ]

      if (meta.hasMore) {
        lines.push('', `Use page=${meta.page + 1} to see more.`)
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error fetching clips: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }
  },
)

server.registerTool(
  'get_highlights',
  {
    description:
      'Get all highlights (annotated text excerpts) for a specific saved clip. Pass the clip ID obtained from get_clips.',
    inputSchema: {
      clipId: z.string().min(1).describe('The clip ID to fetch highlights for'),
    },
  },
  async ({ clipId }) => {
    try {
      const res = await client.getHighlights(clipId)
      const highlights: HighlightModel[] = Array.isArray(res.data) ? res.data : []

      if (highlights.length === 0) {
        return { content: [{ type: 'text', text: 'No highlights found for this clip.' }] }
      }

      const lines = [
        `${highlights.length} highlight${highlights.length === 1 ? '' : 's'}:`,
        '',
        ...highlights.map((h, i) => formatHighlight(h, i + 1)),
      ]

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error fetching highlights: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }
  },
)

server.registerTool(
  'search_clips',
  {
    description:
      'Full-text search across your saved clips in Inkmark. Returns clips ranked by relevance. Useful for finding articles on a specific topic.',
    inputSchema: {
      q: z.string().min(1).describe('Search query'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('Number of results per page (default: 10, max: 50)'),
    },
  },
  async ({ q, page, limit }) => {
    try {
      const res = await client.searchClips({ q, page, limit })
      const { data: clips, meta } = res

      if (clips.length === 0) {
        return { content: [{ type: 'text', text: `No clips found matching "${q}".` }] }
      }

      const lines = [
        `${meta.total} result${meta.total === 1 ? '' : 's'} for "${q}" — page ${meta.page} of ${Math.ceil(meta.total / meta.limit)}:`,
        '',
        ...clips.map((clip, i) => formatClip(clip, i + 1)),
      ]

      if (meta.hasMore) {
        lines.push('', `Use page=${meta.page + 1} to see more results.`)
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] }
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error searching clips: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      }
    }
  },
)

// ─── Start ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('Inkmark MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
