export interface CreateHighlightData {
  clipId: string
  userId: string
  text: string
  contextBefore?: string
  contextAfter?: string
  color: string
}

export interface UpdateHighlightData {
  color?: string
  text?: string
}

// Raw Prisma result when including user relation
export interface HighlightWithUserRaw {
  id: string
  clipId: string
  userId: string
  text: string
  contextBefore: string | null
  contextAfter: string | null
  color: string
  createdAt: Date
  updatedAt: Date
  user: {
    username: string
    avatarUrl: string | null
  }
}

export interface FindHighlightsFilter {
  clipId?: string
  url?: string
  requestingUserId?: string
  includeUser?: boolean
}
