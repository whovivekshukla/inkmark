import type { ClipModel } from './clip'
import type { HighlightModel } from './highlight'

export type FeedItemType = 'clip' | 'highlight'

export interface FeedItemModel {
  type: FeedItemType
  clip?: ClipModel
  highlight?: HighlightModel
  actorId: string
  actorUsername: string
  actorDisplayName: string
  actorAvatarUrl: string | null
  occurredAt: Date
}
