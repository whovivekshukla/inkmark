import type { ClipSource, ClipTagModel } from './clip'
import type { UserSummaryModel } from './user'

/** Optional preview snippets for card grids (profile, etc.). */
export interface FeedHighlightPreviewModel {
  id: string
  text: string
  color?: string
}

/** Earliest highlight on the clip (chronological) — used as the feed quote lead. */
export interface FeedFirstHighlightModel {
  id: string
  text: string
  userId: string
  color?: string
}

export interface FeedClipModel {
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
  tags?: ClipTagModel[]
  user: UserSummaryModel
  /** Live highlight count (non-deleted). */
  highlightCount?: number
  /** First highlight by `createdAt` — lead quote in feed when `highlightCount > 0`. */
  firstHighlight?: FeedFirstHighlightModel | null
  /** Highlights authored by the clip owner (for accent: amber vs blue). */
  authorHighlightCount?: number
  /** Highlights by other users on this clip. */
  otherHighlightCount?: number
}

export interface FeedHighlightModel {
  id: string
  clipId: string
  userId: string
  text: string
  contextBefore: string | null
  contextAfter: string | null
  color: string
  createdAt: Date
  updatedAt: Date
  user: UserSummaryModel
  clip: {
    id: string
    url: string | null
    title: string | null
    domain: string | null
    source: ClipSource
  }
}
