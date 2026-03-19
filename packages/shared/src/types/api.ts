export type ApiResponse<T> =
  | { success: true; data: T; meta?: PaginationMeta }
  | { success: false; error: ApiError }

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export interface ApiError {
  code: string
  message: string
}

export interface PaginationQuery {
  page: number
  limit: number
}

export interface DateRangeQuery extends PaginationQuery {
  from?: Date
  to?: Date
}
