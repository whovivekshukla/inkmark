import { DateRangeQuery } from '@inkmark/shared'

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

export interface CreateClipData {
  userId: string
  url: string
  domain: string
  isPublic: boolean
  title?: string
  description?: string
  ogImage?: string
  faviconUrl?: string
}

export interface UpdateClipData {
  title?: string
  isPublic?: boolean
  deletedAt?: Date | null
  savedAt?: Date
}

export interface UpdateClipMetadataData {
  title?: string | null
  description?: string | null
  ogImage?: string | null
  faviconUrl?: string | null
}

export interface GetClipsFilters extends DateRangeQuery {
  url?: string
  tag?: string
  domain?: string
}
