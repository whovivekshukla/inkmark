export type LibrarySortKey = 'recent' | 'oldest' | 'most_highlights'

export type LibraryFilterKey = 'all' | 'highlighted' | `domain:${string}`

export const LIBRARY_CLIPS_PER_PAGE = 9

export function parseLibrarySearchParams(searchParams: URLSearchParams): {
  q: string
  sort: LibrarySortKey
  filterKey: LibraryFilterKey
} {
  const q = (searchParams.get('q') ?? '').trim()
  const sortRaw = searchParams.get('sort')
  const sort: LibrarySortKey =
    sortRaw === 'oldest' || sortRaw === 'most_highlights' ? sortRaw : 'recent'
  const filter = searchParams.get('filter')
  const domain = (searchParams.get('domain') ?? '').trim()
  let filterKey: LibraryFilterKey = 'all'
  if (filter === 'highlighted') filterKey = 'highlighted'
  else if (filter === 'domain' && domain) filterKey = `domain:${domain}` as LibraryFilterKey

  return { q, sort, filterKey }
}

export function buildLibrarySearchParams(d: {
  q: string
  sort: LibrarySortKey
  filterKey: LibraryFilterKey
}): URLSearchParams {
  const p = new URLSearchParams()
  if (d.q) p.set('q', d.q)
  if (d.sort !== 'recent') p.set('sort', d.sort)
  if (d.filterKey === 'highlighted') p.set('filter', 'highlighted')
  else if (d.filterKey.startsWith('domain:')) {
    p.set('filter', 'domain')
    p.set('domain', d.filterKey.slice('domain:'.length))
  }
  return p
}
