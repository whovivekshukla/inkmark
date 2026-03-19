export enum HighlightColor {
  Yellow = 'yellow',
  Green = 'green',
  Blue = 'blue',
  Pink = 'pink',
}

export interface HighlightModel {
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

export interface CreateHighlightModel {
  clipId: string
  text: string
  contextBefore?: string
  contextAfter?: string
  color?: HighlightColor
}

export interface UpdateHighlightModel {
  color?: HighlightColor
  text?: string
}
