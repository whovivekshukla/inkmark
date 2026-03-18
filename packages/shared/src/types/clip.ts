export interface ClipDTO {
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
  tags?: ClipTagDTO[]
}

export interface ClipTagDTO {
  id: string
  name: string
}

export interface CreateClipDTO {
  url: string
  isPublic?: boolean
  tags?: string[]
}

export interface UpdateClipDTO {
  title?: string
  isPublic?: boolean
}
