import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ClipModel, PaginationMeta, TagWithCountModel } from '@inkmark/shared'
import { ApiError, fetchMyClipsFiltered, fetchTags } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ConnectBanner } from '../components/ConnectBanner'
import { LibraryClipCard } from '../components/LibraryClipCard'
import { NewClipModal } from '../components/NewClipModal'
import {
  buildLibrarySearchParams,
  LIBRARY_CLIPS_PER_PAGE,
  parseLibrarySearchParams,
  type LibraryFilterKey,
  type LibrarySortKey,
} from '../lib/libraryFiltersUrl'

export function LibraryPage(): React.ReactElement {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const init = parseLibrarySearchParams(searchParams)
  const [clips, setClips] = useState<ClipModel[]>([])
  const [tags, setTags] = useState<TagWithCountModel[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState(init.q)
  const [debouncedQuery, setDebouncedQuery] = useState(init.q)
  const [filterKey, setFilterKey] = useState<LibraryFilterKey>(init.filterKey)
  const [sort, setSort] = useState<LibrarySortKey>(init.sort)
  const [newClipOpen, setNewClipOpen] = useState(false)

  const queryRef = useRef(query)
  const debouncedRef = useRef(debouncedQuery)
  const prevFilterSigRef = useRef<string | null>(null)
  const nextPageRef = useRef(1)
  const appendInFlightRef = useRef(false)
  queryRef.current = query
  debouncedRef.current = debouncedQuery

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  // Sync state from URL before paint so the push effect below sees updated filters (back/forward, shared links).
  // Do not clobber the search field while the user is typing ahead of the debounced value.
  useLayoutEffect(() => {
    const parsed = parseLibrarySearchParams(searchParams)
    setFilterKey(parsed.filterKey)
    setSort(parsed.sort)

    if (parsed.q !== debouncedRef.current) {
      setQuery(parsed.q)
      setDebouncedQuery(parsed.q)
      return
    }
    if (queryRef.current.trim() !== parsed.q) {
      return
    }
    setQuery(parsed.q)
  }, [searchParams])

  // Push filters to URL when they change (not on Strict Mode duplicate runs).
  useEffect(() => {
    const sig = `${debouncedQuery}|${filterKey}|${sort}`
    if (prevFilterSigRef.current === null) {
      prevFilterSigRef.current = sig
      return
    }
    if (prevFilterSigRef.current === sig) return
    prevFilterSigRef.current = sig
    const next = buildLibrarySearchParams({ q: debouncedQuery, sort, filterKey })
    setSearchParams((prev) => {
      if (next.toString() === prev.toString()) return prev
      return next
    }, { replace: true })
  }, [debouncedQuery, filterKey, sort, setSearchParams])

  // Load top tags once
  useEffect(() => {
    if (!token) return
    void (async () => {
      try {
        const t = await fetchTags(token, { limit: 5, sort: 'highlights' })
        setTags(t)
      } catch {
        // Non-critical — pills just won't show
      }
    })()
  }, [token])

  const fetchClipPage = useCallback(
    async (pageNum: number, append: boolean): Promise<void> => {
      if (!token) return
      if (append) {
        if (appendInFlightRef.current) return
        appendInFlightRef.current = true
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const params: Parameters<typeof fetchMyClipsFiltered>[1] = {
          page: pageNum,
          limit: LIBRARY_CLIPS_PER_PAGE,
          sort,
        }
        if (debouncedQuery) params.q = debouncedQuery
        if (filterKey === 'highlighted') params.highlighted = true
        else if (filterKey.startsWith('tag:')) params.tag = filterKey.slice('tag:'.length)

        const result = await fetchMyClipsFiltered(token, params)
        setClips((prev) => (append ? [...prev, ...result.clips] : result.clips))
        setMeta(result.meta)
        nextPageRef.current = pageNum + 1
      } catch (e) {
        if (!append) {
          setClips([])
          setMeta(null)
          setError(e instanceof ApiError ? e.message : 'Failed to load library')
        }
      } finally {
        appendInFlightRef.current = false
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [token, debouncedQuery, filterKey, sort],
  )

  useEffect(() => {
    if (!token) return
    nextPageRef.current = 1
    void fetchClipPage(1, false)
  }, [token, debouncedQuery, filterKey, sort, fetchClipPage])

  const loadMore = useCallback((): void => {
    if (!meta?.hasMore || loadingMore || loading) return
    void fetchClipPage(nextPageRef.current, true)
  }, [meta?.hasMore, loadingMore, loading, fetchClipPage])

  const hasActiveFilters = useMemo(
    () =>
      query.trim() !== '' ||
      debouncedQuery !== '' ||
      filterKey !== 'all' ||
      sort !== 'recent',
    [query, debouncedQuery, filterKey, sort],
  )

  const clearFilters = useCallback((): void => {
    setQuery('')
    setDebouncedQuery('')
    setFilterKey('all')
    setSort('recent')
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const onClipCreated = useCallback((clip: ClipModel): void => {
    setNewClipOpen(false)
    // Prepend so the new clip is immediately visible without a refetch.
    setClips((prev) => [clip, ...prev.filter((c) => c.id !== clip.id)])
    setMeta((prev) => (prev ? { ...prev, total: prev.total + 1 } : prev))
  }, [])

  const totalClips = meta?.total ?? clips.length

  const libraryBackPath =
    searchParams.toString().length > 0 ? `/library?${searchParams.toString()}` : '/library'

  if (loading && clips.length === 0) {
    return (
      <div className="page-wide library-page">
        <p className="app-boot-text">Loading</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wide library-page">
        <p className="error">{error}</p>
      </div>
    )
  }

  return (
    <div className="page-wide library-page">
      <header className="library-page-header">
        <div>
          <h1 className="library-page-title">Library</h1>
          <p className="library-page-sub">
            {totalClips} clip{totalClips === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary library-new-clip"
          onClick={() => setNewClipOpen(true)}
        >
          + New clip
        </button>
      </header>

      {/* meta.total reflects active filters, so only treat it as library size when unfiltered. */}
      {!hasActiveFilters && <ConnectBanner totalClips={totalClips} />}

      <div className="library-search-wrap">
        <span className="library-search-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          className="library-search"
          placeholder="Search your clips and highlights…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="library-toolbar">
        <div className="library-filters" role="toolbar" aria-label="Filter library">
          <button
            type="button"
            className={`library-chip${filterKey === 'all' ? ' library-chip--active' : ''}`}
            onClick={() => setFilterKey('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`library-chip${filterKey === 'highlighted' ? ' library-chip--active' : ''}`}
            onClick={() => setFilterKey('highlighted')}
          >
            Highlighted
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`library-chip${filterKey === `tag:${t.name}` ? ' library-chip--active' : ''}`}
              onClick={() => setFilterKey(`tag:${t.name}`)}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="library-toolbar-controls">
          {hasActiveFilters ? (
            <button
              type="button"
              className="library-clear-filters"
              onClick={clearFilters}
              aria-label="Clear all filters and search"
            >
              × Clear filters
            </button>
          ) : null}
          <div className="library-sort">
            <label htmlFor="library-sort" className="sr-only">
              Sort clips
            </label>
            <select
              id="library-sort"
              className="library-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as LibrarySortKey)}
            >
              <option value="recent">Recent first</option>
              <option value="oldest">Oldest first</option>
              <option value="most_highlights">Most highlights</option>
            </select>
          </div>
        </div>
      </div>

      {clips.length === 0 ? (
        !debouncedQuery && filterKey === 'all' ? (
          <div className="empty-state library-empty">
            <p>No clips yet.</p>
            <p>
              Hit <button type="button" className="library-empty-link" onClick={() => setNewClipOpen(true)}>+ New clip</button> to
              save your first URL, install the browser extension, or connect Claude and other AI tools from{' '}
              <Link to="/settings">Settings</Link>.
            </p>
          </div>
        ) : (
          <p className="empty-state">No clips match your search or filters.</p>
        )
      ) : (
        <div className="clip-grid library-clip-grid">
          {clips.map((c) => (
            <LibraryClipCard key={c.id} clip={c} linkState={{ from: libraryBackPath }} />
          ))}
        </div>
      )}

      {clips.length > 0 && meta?.hasMore ? (
        <div className="library-load-more-wrap">
          <button
            type="button"
            className="library-load-more"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}

      {newClipOpen ? (
        <NewClipModal onClose={() => setNewClipOpen(false)} onCreated={onClipCreated} />
      ) : null}
    </div>
  )
}
