export interface ApiResponse<T> {
  data?: T
  meta?: PaginationMeta
  error?: ApiError
}

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
