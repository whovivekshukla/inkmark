export interface ClipModel {
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
  url: string
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
