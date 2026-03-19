import type { ClipTagModel } from './clip'
import type { UserSummaryModel } from './user'

export interface FeedClipModel {
  id: string
  userId: string
  url: string
  domain: string
  title: string | null
  description: string | null
  ogImage: string | null
  faviconUrl: string | null
  isPublic: boolean
  savedAt: Date
  updatedAt: Date
  tags?: ClipTagModel[]
  user: UserSummaryModel
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
    url: string
    title: string | null
    domain: string
  }
}
