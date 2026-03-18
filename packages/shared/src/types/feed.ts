import type { ClipDTO } from './clip'
import type { HighlightDTO } from './highlight'

export type FeedItemType = 'clip' | 'highlight'

export interface FeedItemDTO {
  type: FeedItemType
  clip?: ClipDTO
  highlight?: HighlightDTO
  actorId: string
  actorUsername: string
  actorDisplayName: string
  actorAvatarUrl: string | null
  occurredAt: Date
}
