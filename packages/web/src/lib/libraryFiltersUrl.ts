export type LibrarySortKey = 'recent' | 'oldest' | 'most_highlights'

export type LibraryFilterKey = 'all' | 'highlighted' | `tag:${string}`

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
  const tag = (searchParams.get('tag') ?? '').trim()
  let filterKey: LibraryFilterKey = 'all'
  if (filter === 'highlighted') filterKey = 'highlighted'
  else if (filter === 'tag' && tag) filterKey = `tag:${tag}` as LibraryFilterKey

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
  else if (d.filterKey.startsWith('tag:')) {
    p.set('filter', 'tag')
    p.set('tag', d.filterKey.slice('tag:'.length))
  }
  return p
}
