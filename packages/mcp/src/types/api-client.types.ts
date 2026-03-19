import type { PaginationMeta } from '@inkmark/shared'

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: PaginationMeta
}

export interface SingleResponse<T> {
  success: boolean
  data: T
}
