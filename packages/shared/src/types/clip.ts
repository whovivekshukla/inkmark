// Const-object enum: stays compatible with Prisma's generated string-union
// `$Enums.ClipSource` while preserving the `ClipSource.Web` member API.
export const ClipSource = {
  Web: 'WEB',
  Extension: 'EXTENSION',
  Mcp: 'MCP',
  Claude: 'CLAUDE',
  Chatgpt: 'CHATGPT',
  Codex: 'CODEX',
  Api: 'API',
} as const
export type ClipSource = (typeof ClipSource)[keyof typeof ClipSource]

export interface ClipModel {
  id: string
  userId: string
  url: string | null
  domain: string | null
  source: ClipSource
  title: string | null
  description: string | null
  ogImage: string | null
  faviconUrl: string | null
  isPublic: boolean
  savedAt: Date
  updatedAt: Date
  /** Present on list responses when the server includes counts. */
  highlightCount?: number
  tags?: ClipTagModel[]
}

export interface ClipTagModel {
  clipId: string
  tagId: string
  tag: {
    id: string
    name: string
  }
}

export interface CreateClipModel {
  url?: string
  source: ClipSource
  title?: string
  description?: string
  ogImage?: string
  faviconUrl?: string
  isPublic?: boolean
  tags?: string[]
}

export interface UpdateClipModel {
  title?: string
  isPublic?: boolean
}
