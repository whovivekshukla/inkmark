import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { ClipSource, type ClipModel, type HighlightModel } from '@inkmark/shared'
import type { InkmarkApiClient } from './lib/api-client.js'

/**
 * Resolves the clip source tag from a raw string (env var or query param).
 * Falls back to the generic MCP source when the host is unknown.
 */
export function resolveSource(raw: string | undefined | null): ClipSource {
  const upper = (raw ?? '').toUpperCase()
  return (Object.values(ClipSource) as string[]).includes(upper)
    ? (upper as ClipSource)
    : ClipSource.Mcp
}

// ─── Formatters ────────────────────────────────────────────────────────────

function formatClip(clip: ClipModel, index: number): string {
  const lines = [`${index}. **${clip.title ?? 'Untitled'}**`]
  if (clip.url) {
    lines.push(`   URL: ${clip.url}`)
    lines.push(`   Domain: ${clip.domain ?? 'unknown'}`)
  } else {
    lines.push(`   Source: ${clip.source}`)
  }
  lines.push(`   Saved: ${new Date(clip.savedAt).toLocaleDateString()}`)
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

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// ─── Tool registration ───────────────────────────────────────────────────────

/**
 * Registers all Inkmark tools on a server, bound to a specific API client and
 * clip source. Shared by the stdio entrypoint (one client per process) and the
 * HTTP entrypoint (one client per authenticated request).
 */
export function registerTools(server: McpServer, client: InkmarkApiClient, source: ClipSource): void {
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
          content: [{ type: 'text', text: `Error fetching clips: ${errorText(err)}` }],
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
          content: [{ type: 'text', text: `Error fetching highlights: ${errorText(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'search_clips',
    {
      description:
        'Keyword search across your saved clips in Inkmark. Matches the query against clip title, description, URL, domain, tag names, and highlight text (case-insensitive), returning the most recent matches first. Useful for finding articles on a specific topic.',
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
          content: [{ type: 'text', text: `Error searching clips: ${errorText(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'create_clip',
    {
      description:
        'Save a clip to Inkmark. Use this to bookmark a URL the user shared, or to capture a thought/snippet from this AI conversation (in which case omit url and supply title + description). Returns the new clip including its ID.',
      inputSchema: {
        title: z.string().min(1).max(500).describe('Clip title (required when url is omitted)').optional(),
        url: z.string().url().optional().describe('Source URL — omit for AI-conversation captures'),
        description: z.string().max(1000).optional().describe('Short summary or note'),
        tags: z.array(z.string().min(1).max(50)).optional().describe('Tags to attach (lowercased server-side)'),
        isPublic: z.boolean().optional().describe('Visibility on user profile (default: true)'),
      },
    },
    async ({ title, url, description, tags, isPublic }) => {
      if (!url && !title) {
        return {
          content: [{ type: 'text', text: 'Either url or title is required to create a clip.' }],
          isError: true,
        }
      }
      try {
        const res = await client.createClip({ source, title, url, description, tags, isPublic })
        return {
          content: [
            { type: 'text', text: `Saved clip ${res.data.id}.\n\n${formatClip(res.data, 1)}` },
          ],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error creating clip: ${errorText(err)}` }],
          isError: true,
        }
      }
    },
  )

  server.registerTool(
    'create_highlight',
    {
      description:
        'Save a text highlight to Inkmark. Pass clipId to attach to an existing clip, OR omit clipId and provide title/url to create a parent clip on the fly (useful for AI-conversation captures).',
      inputSchema: {
        text: z.string().min(1).max(5000).describe('The highlighted text'),
        clipId: z.string().min(1).optional().describe('Existing clip ID to attach to'),
        title: z.string().min(1).max(500).optional().describe('Title for a new parent clip (when clipId is omitted)'),
        url: z.string().url().optional().describe('Optional URL for the new parent clip'),
        color: z
          .enum(['yellow', 'green', 'blue', 'pink'])
          .optional()
          .describe('Highlight color (default: yellow)'),
        contextBefore: z.string().max(200).optional(),
        contextAfter: z.string().max(200).optional(),
      },
    },
    async ({ text, clipId, title, url, color, contextBefore, contextAfter }) => {
      try {
        let parentClipId = clipId
        if (!parentClipId) {
          if (!title && !url) {
            return {
              content: [
                { type: 'text', text: 'Provide clipId, or title/url to create a new parent clip.' },
              ],
              isError: true,
            }
          }
          const clipRes = await client.createClip({ source, title, url })
          parentClipId = clipRes.data.id
        }

        const res = await client.createHighlight({
          clipId: parentClipId,
          text,
          color,
          contextBefore,
          contextAfter,
        })

        return {
          content: [
            {
              type: 'text',
              text: `Saved highlight ${res.data.id} on clip ${parentClipId}.\n\n${formatHighlight(res.data, 1)}`,
            },
          ],
        }
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Error creating highlight: ${errorText(err)}` }],
          isError: true,
        }
      }
    },
  )
}
