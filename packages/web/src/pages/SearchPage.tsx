import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { ClipModel, HighlightModel, UserSummaryModel } from '@inkmark/shared'
import { ApiError, searchInkmark, searchUsers } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AvatarImg } from '../components/AvatarImg'
import { ClipGridCard } from '../components/ClipGridCard'

type SearchMode = 'content' | 'people'

export function SearchPage(): React.ReactElement {
  const { token } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [clips, setClips] = useState<ClipModel[]>([])
  const [highlights, setHighlights] = useState<HighlightModel[]>([])
  const [people, setPeople] = useState<UserSummaryModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchSeqRef = useRef(0)

  const qKey = (searchParams.get('q') ?? '').trim()
  const mode: SearchMode = searchParams.get('mode') === 'people' ? 'people' : 'content'

  const searchBackPath = useMemo(() => {
    const s = searchParams.toString()
    return s ? `/search?${s}` : '/search'
  }, [searchParams])

  // Keep the input aligned with the URL when it changes (submit, back/forward, shared link).
  useEffect(() => {
    setQ(searchParams.get('q') ?? '')
  }, [searchParams])

  const runSearch = useCallback(
    async (query: string, searchMode: SearchMode): Promise<void> => {
      if (!token) return
      const seq = searchSeqRef.current + 1
      searchSeqRef.current = seq
      setLoading(true)
      setError(null)
      try {
        if (searchMode === 'people') {
          const users = await searchUsers(token, query)
          if (seq !== searchSeqRef.current) return
          setPeople(users)
        } else {
          const result = await searchInkmark(token, query, 'all')
          if (seq !== searchSeqRef.current) return
          if (result.kind === 'all') {
            setClips(result.clips)
            setHighlights(result.highlights)
          }
        }
      } catch (e) {
        if (seq !== searchSeqRef.current) return
        setClips([])
        setHighlights([])
        setPeople([])
        setError(e instanceof ApiError ? e.message : 'Search failed')
      } finally {
        if (seq === searchSeqRef.current) setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!token) return
    if (!qKey) {
      searchSeqRef.current += 1
      setClips([])
      setHighlights([])
      setPeople([])
      setError(null)
      setLoading(false)
      return
    }
    void runSearch(qKey, mode)
  }, [token, qKey, mode, runSearch])

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const query = q.trim()
    if (!query) {
      const next = new URLSearchParams()
      if (mode === 'people') next.set('mode', 'people')
      setSearchParams(next, { replace: true })
      return
    }
    const next = new URLSearchParams({ q: query })
    if (mode === 'people') next.set('mode', 'people')
    setSearchParams(next, { replace: true })
  }

  const switchMode = (next: SearchMode): void => {
    if (next === mode) return
    const params = new URLSearchParams()
    const current = q.trim()
    if (current) params.set('q', current)
    if (next === 'people') params.set('mode', 'people')
    setSearchParams(params, { replace: true })
  }

  return (
    <div className="page-wide page-wide--search">
      <header className="page-header">
        <h1 className="page-title">Search</h1>
      </header>

      <div className="search-mode-tabs" role="tablist" aria-label="Search mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'content'}
          className={`search-mode-tab${mode === 'content' ? ' search-mode-tab--active' : ''}`}
          onClick={() => switchMode('content')}
        >
          Clips &amp; highlights
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'people'}
          className={`search-mode-tab${mode === 'people' ? ' search-mode-tab--active' : ''}`}
          onClick={() => switchMode('people')}
        >
          People
        </button>
      </div>

      <form className="search-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="search-q">
          {mode === 'people' ? 'Search people' : 'Search clips and highlights'}
        </label>
        <input
          id="search-q"
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === 'people' ? 'Search people by name or @username' : 'Search your clips and highlights'}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary search-submit" disabled={loading}>
          Search
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {loading && qKey ? <p className="app-boot-text">Searching</p> : null}

      {!loading && qKey && mode === 'people' ? (
        <section className="search-section" aria-label="People">
          <h2 className="section-rule-heading">People</h2>
          {people.length === 0 ? (
            <p className="empty-state empty-state--inline">No matching people.</p>
          ) : (
            <ul className="follow-list">
              {people.map((u) => (
                <li key={u.id}>
                  <Link className="follow-list-row" to={`/${u.username}`}>
                    {u.avatarUrl ? (
                      <AvatarImg className="follow-list-avatar" src={u.avatarUrl} alt="" width={36} height={36} />
                    ) : (
                      <span className="follow-list-avatar follow-list-avatar--placeholder" aria-hidden>
                        {u.displayName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="follow-list-text">
                      <span className="follow-list-name">{u.displayName}</span>
                      <span className="follow-list-handle">@{u.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!loading && qKey && mode === 'content' ? (
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
