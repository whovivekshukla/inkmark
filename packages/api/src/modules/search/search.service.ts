import { ClipModel, HighlightModel, PaginationMeta } from '@inkmark/shared'
import { searchRepository } from './search.repository'
import { AppError } from '@/lib/errors'
import { ErrorCode } from '@/constants/error-codes'
import { logger } from '@/lib/logger'
import { SearchQuery, SearchFilters } from './search.types'

function buildMeta(filters: SearchFilters, total: number): PaginationMeta {
  return {
    page: filters.page,
    limit: filters.limit,
    total,
    hasMore: filters.page * filters.limit < total,
  }
}

export const searchService = {
  async search(
    userId: string,
    query: SearchQuery,
  ): Promise<
    | { data: ClipModel[]; meta: PaginationMeta }
    | { data: HighlightModel[]; meta: PaginationMeta }
    | { data: { clips: ClipModel[]; highlights: HighlightModel[] } }
  > {
    const filters: SearchFilters = { page: query.page, limit: query.limit, from: query.from, to: query.to }

    try {
      if (query.type === 'clips') {
        const { clips, total } = await searchRepository.searchClips(userId, query.q, filters)
        return { data: clips, meta: buildMeta(filters, total) }
      }

      if (query.type === 'highlights') {
        const { highlights, total } = await searchRepository.searchHighlights(userId, query.q, filters)
        return { data: highlights, meta: buildMeta(filters, total) }
      }

      // type === 'all' — run both in parallel; meta is omitted as pagination applies to each type separately
      const [clipsResult, highlightsResult] = await Promise.all([
        searchRepository.searchClips(userId, query.q, filters),
        searchRepository.searchHighlights(userId, query.q, filters),
      ])
      return { data: { clips: clipsResult.clips, highlights: highlightsResult.highlights } }
    } catch (err) {
      if (err instanceof AppError) throw err
      logger.error('searchService.search failed', { userId, q: query.q, type: query.type, error: err })
      throw new AppError(ErrorCode.INTERNAL_ERROR, 'Search failed', 500)
    }
  },
}
