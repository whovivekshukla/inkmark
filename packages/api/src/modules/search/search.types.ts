import { DateRangeQuery } from '@inkmark/shared'

export type SearchType = 'clips' | 'highlights' | 'all'

export interface SearchQuery extends DateRangeQuery {
  q: string
  type: SearchType
}

// DateRangeQuery subset passed to repository methods — excludes q and type
export type SearchFilters = DateRangeQuery
