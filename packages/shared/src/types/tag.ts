export interface TagModel {
  id: string
  userId: string
  name: string
}

export interface TagWithCountModel extends TagModel {
  _count: { clips: number }
  highlightCount: number
}
