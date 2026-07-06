import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClipModel, HighlightModel } from '@inkmark/shared'
import { ApiError, searchInkmark } from '../api/client'
import { useAuth } from '../auth/AuthContext'

interface SearchOverlayContextValue {
  open: () => void
  close: () => void
  isOpen: boolean
}

const SearchOverlayContext = createContext<SearchOverlayContextValue | null>(null)

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = useContext(SearchOverlayContext)
  if (!ctx) throw new Error('useSearchOverlay must be used within SearchOverlayProvider')
  return ctx
}

function initial(title: string, domain: string | null, source: string): string {
  const base = (title || domain || source || '?').trim()
  return (base.slice(0, 1) || '?').toUpperCase()
}

export function SearchOverlayProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen])

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
      {isOpen ? <SearchOverlay onClose={close} /> : null}
    </SearchOverlayContext.Provider>
  )
}

function SearchOverlay({ onClose }: { onClose: () => void }): React.ReactElement {
  const { token } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const seqRef = useRef(0)

  const [query, setQuery] = useState('')
  const [clips, setClips] = useState<ClipModel[]>([])
  const [highlights, setHighlights] = useState<HighlightModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced live search over title + domain + highlight text (server FTS).
  useEffect(() => {
    const q = query.trim()
    if (!token || !q) {
      seqRef.current += 1
      setClips([])
      setHighlights([])
      setError(null)
      setLoading(false)
      return
    }
    const seq = seqRef.current + 1
    seqRef.current = seq
    setLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchInkmark(token, q, 'all')
        if (seq !== seqRef.current) return
        if (result.kind === 'all') {
          setClips(result.clips)
          setHighlights(result.highlights)
          setActiveIndex(0)
        }
        setError(null)
      } catch (e) {
        if (seq !== seqRef.current) return
        setClips([])
        setHighlights([])
        setError(e instanceof ApiError ? e.message : 'Search failed')
      } finally {
        if (seq === seqRef.current) setLoading(false)
      }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [query, token])

  const goToClip = useCallback(
    (clipId: string) => {
      onClose()
      navigate(`/clips/${encodeURIComponent(clipId)}`)
    },
    [navigate, onClose],
  )

  // A flat list of navigable clip targets (clips first, then highlights' clips).
  const targets = useMemo(
    () => [...clips.map((c) => c.id), ...highlights.map((h) => h.clipId)],
    [clips, highlights],
  )

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, Math.max(targets.length - 1, 0)))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = targets[activeIndex]
      if (target) goToClip(target)
    }
  }

  const q = query.trim()
  const hasResults = clips.length > 0 || highlights.length > 0

  return (
    <div
      className="cmdk-scrim"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="cmdk-panel" role="dialog" aria-modal="true" aria-label="Search">
        <div className="cmdk-input-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            className="cmdk-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search your clips and highlights…"
            aria-label="Search your clips and highlights"
            autoComplete="off"
          />
          <span className="keycap">Esc</span>
        </div>

        <div className="cmdk-results">
          {error ? <p className="cmdk-empty">{error}</p> : null}
          {!error && q && !loading && !hasResults ? (
            <p className="cmdk-empty">No clips match “{q}”.</p>
          ) : null}
          {!error && !q ? <p className="cmdk-empty">Type to search your clips and highlights.</p> : null}

          {clips.length > 0 ? (
            <>
              <p className="cmdk-section-label">Clips</p>
              {clips.map((c, i) => {
                const title = c.title?.trim() || c.domain || 'Untitled'
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`cmdk-result${activeIndex === i ? ' cmdk-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => goToClip(c.id)}
                  >
                    <span className="cmdk-result__badge" aria-hidden>
                      {initial(title, c.domain, c.source)}
                    </span>
                    <span className="cmdk-result__text">
                      <span className="cmdk-result__title">{title}</span>
                      {c.domain ? <span className="cmdk-result__domain">{c.domain}</span> : null}
                    </span>
                    {c.highlightCount && c.highlightCount > 0 ? (
                      <span className="cmdk-result__dot" aria-hidden />
                    ) : null}
                  </button>
                )
              })}
            </>
          ) : null}

          {highlights.length > 0 ? (
            <>
              <p className="cmdk-section-label">Highlights</p>
              {highlights.map((h, i) => {
                const idx = clips.length + i
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`cmdk-result${activeIndex === idx ? ' cmdk-result--active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => goToClip(h.clipId)}
                  >
                    <span className="cmdk-result__dot" aria-hidden />
                    <span className="cmdk-result__text">
                      <span className="cmdk-result__title">{h.text}</span>
                    </span>
                  </button>
                )
              })}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
