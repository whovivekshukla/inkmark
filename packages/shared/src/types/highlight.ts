export interface HighlightDTO {
  id: string
  clipId: string
  userId: string
  text: string
  contextBefore: string | null
  contextAfter: string | null
  color: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateHighlightDTO {
  clipId: string
  text: string
  contextBefore?: string
  contextAfter?: string
  color?: 'yellow' | 'green' | 'blue' | 'pink'
}
