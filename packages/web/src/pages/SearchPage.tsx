import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ClipModel, HighlightModel } from '@inkmark/shared'
import { ApiError, searchInkmark } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { ClipGridCard } from '../components/ClipGridCard'

export function SearchPage(): React.ReactElement {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [clips, setClips] = useState<ClipModel[]>([])
  const [highlights, setHighlights] = useState<HighlightModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const qKey = (searchParams.get('q') ?? '').trim()

  const searchBackPath = useMemo(() => {
    const s = searchParams.toString()
    return s ? `/search?${s}` : '/search'
  }, [searchParams])

  // Keep the input aligned with the URL when it changes (submit, back/forward, shared link).
  useEffect(() => {
    setQ(searchParams.get('q') ?? '')
  }, [searchParams])

  const runSearch = useCallback(
    async (query: string): Promise<void> => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const result = await searchInkmark(token, query, 'all')
        if (result.kind === 'all') {
          setClips(result.clips)
          setHighlights(result.highlights)
        }
      } catch (e) {
        setClips([])
        setHighlights([])
        setError(e instanceof ApiError ? e.message : 'Search failed')
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!token) return
    if (!qKey) {
      setClips([])
      setHighlights([])
      setError(null)
      return
    }
    void runSearch(qKey)
  }, [token, qKey, runSearch])

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const query = q.trim()
    if (!query) {
      setSearchParams(new URLSearchParams(), { replace: true })
      return
    }
    setSearchParams(new URLSearchParams({ q: query }), { replace: true })
  }

  return (
    <div className="page-wide page-wide--search">
      <header className="page-header">
        <h1 className="page-title">Search</h1>
      </header>

      <form className="search-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="search-q">
          Search clips and highlights
        </label>
        <input
          id="search-q"
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your clips and highlights"
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary search-submit" disabled={loading}>
          Search
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {loading && qKey ? <p className="app-boot-text">Searching</p> : null}

      {!loading && qKey ? (
        <>
          <section className="search-section" aria-label="Clips">
            <h2 className="section-rule-heading">Clips</h2>
            {clips.length === 0 ? (
              <p className="empty-state empty-state--inline">No matching clips.</p>
            ) : (
              <div className="clip-grid clip-grid--compact-top">
                {clips.map((c) => (
                  <ClipGridCard key={c.id} clip={c} linkState={{ from: searchBackPath }} />
                ))}
              </div>
            )}
          </section>
          <section className="search-section" aria-label="Highlights">
            <h2 className="section-rule-heading">Highlights</h2>
            {highlights.length === 0 ? (
              <p className="empty-state empty-state--inline">No matching highlights.</p>
            ) : (
              <ul className="search-highlight-list">
                {highlights.map((h) => (
                  <li key={h.id}>
                    <Link
                      className="search-highlight-row"
                      to={`/clips/${encodeURIComponent(h.clipId)}`}
                      state={{ from: searchBackPath }}
                    >
                      <blockquote className="search-highlight-text">{h.text}</blockquote>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
