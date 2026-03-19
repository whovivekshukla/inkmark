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
