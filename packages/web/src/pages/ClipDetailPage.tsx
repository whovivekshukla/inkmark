import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { ClipModel, HighlightWithUserModel } from '@inkmark/shared'
import {
  ApiError,
  addTagToClip,
  deleteHighlight,
  removeTagFromClip,
  fetchClipById,
  fetchHighlightsForClip,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { clipBackFromState } from '../lib/clipBackNav'
import { displayRootDomain } from '../lib/displayRootDomain'
import { formatShortRelative } from '../lib/formatRelative'

function navPreview(text: string, max = 60): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function sortByCreatedDesc<T extends { createdAt: Date | string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ta = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.getTime()
    const tb = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.getTime()
    return tb - ta
  })
}

function scrollToHighlight(id: string): void {
  document.getElementById(`highlight-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

export function ClipDetailPage(): React.ReactElement {
  const { clipId } = useParams<{ clipId: string }>()
  const location = useLocation()
  const { token, user: me } = useAuth()
  const backNav = clipBackFromState(location.state)

  const [clip, setClip] = useState<ClipModel | null>(null)
  const [highlights, setHighlights] = useState<HighlightWithUserModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [tagBusy, setTagBusy] = useState(false)
  const [removingTagId, setRemovingTagId] = useState<string | null>(null)
  const [tagError, setTagError] = useState<string | null>(null)
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [tagDraft, setTagDraft] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)
  const tagErrorRef = useRef<string | null>(null)

  useEffect(() => {
    tagErrorRef.current = tagError
  }, [tagError])

  useEffect(() => {
    if (!token || !clipId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [c, hl] = await Promise.all([
          fetchClipById(token, clipId),
          fetchHighlightsForClip(token, clipId),
        ])
        if (!cancelled) {
          setClip(c)
          setHighlights(hl)
        }
      } catch (e) {
        if (!cancelled) {
          setClip(null)
          setHighlights([])
          setError(e instanceof ApiError ? e.message : 'Failed to load clip')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, clipId])

  useEffect(() => {
    if (!tagInputOpen) return
    const el = tagInputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [tagInputOpen])

  const { mine, others, orderedForNav } = useMemo(() => {
    const m: HighlightWithUserModel[] = []
    const o: HighlightWithUserModel[] = []
    for (const h of highlights) {
      if (me?.id === h.userId) m.push(h)
      else o.push(h)
    }
    const mineSorted = sortByCreatedDesc(m)
    const othersSorted = sortByCreatedDesc(o)
    return {
      mine: mineSorted,
      others: othersSorted,
      orderedForNav: [...mineSorted, ...othersSorted],
    }
  }, [highlights, me?.id])

  const domainLabel = clip ? displayRootDomain(clip.domain) : ''
  const domainLetter = domainLabel.replace(/[^a-z0-9]/gi, '').slice(0, 1).toUpperCase() || '?'

  const onDeleteHighlight = useCallback(
    async (highlightId: string) => {
      if (!token) return
      setDeletingId(highlightId)
      setDeleteError(null)
      try {
        await deleteHighlight(token, highlightId)
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
      } catch (e) {
        setDeleteError(e instanceof ApiError ? e.message : 'Failed to delete highlight')
      } finally {
        setDeletingId(null)
      }
    },
    [token],
  )

  const submitTag = useCallback(async () => {
    if (!token || !clipId || tagBusy) return
    const name = tagDraft.trim()
    if (!name) return
    setTagBusy(true)
    setTagError(null)
    try {
      const row = await addTagToClip(token, clipId, name)
      setClip((c) => {
        if (!c) return c
        const existing = c.tags ?? []
        if (existing.some((t) => t.tagId === row.tagId)) return c
        return { ...c, tags: [...existing, row] }
      })
      setTagDraft('')
      setTagInputOpen(false)
    } catch (e) {
      setTagError(e instanceof ApiError ? e.message : 'Could not add tag')
    } finally {
      setTagBusy(false)
    }
  }, [token, clipId, tagBusy, tagDraft])

  const closeTagInput = useCallback(() => {
    setTagInputOpen(false)
    setTagDraft('')
    setTagError(null)
  }, [])

  const onTagInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void submitTag()
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        closeTagInput()
      }
    },
    [submitTag, closeTagInput],
  )

  const onRemoveTag = useCallback(
    async (tagId: string) => {
      if (!token || !clipId || removingTagId) return
      setRemovingTagId(tagId)
      setTagError(null)
      try {
        await removeTagFromClip(token, clipId, tagId)
        setClip((c) => {
          if (!c) return c
          const existing = c.tags ?? []
          return { ...c, tags: existing.filter((t) => t.tagId !== tagId) }
        })
      } catch (e) {
        setTagError(e instanceof ApiError ? e.message : 'Could not remove tag')
      } finally {
        setRemovingTagId(null)
      }
    },
    [token, clipId, removingTagId],
  )

  if (loading) {
    return (
      <div className="page-wide clip-detail-page">
        <p className="app-boot-text">Loading</p>
      </div>
    )
  }

  if (error || !clip) {
    return (
      <div className="page-wide clip-detail-page">
        <p className="error">{error ?? 'Clip not found'}</p>
        <Link className="link-back" to={backNav.to}>
          ← {backNav.label}
        </Link>
      </div>
    )
  }

  const title = clip.title?.trim() || clip.domain || 'Untitled'
  const desc = clip.description?.trim()
  const tags = clip.tags ?? []
  const showAlsoLabel = mine.length > 0 && others.length > 0
  const readOriginalUrl = safeExternalUrl(clip.url)

  return (
    <div className="page-wide clip-detail-page">
      <p className="clip-detail-back">
        <Link className="link-back" to={backNav.to}>
          ← {backNav.label}
        </Link>
      </p>

      <div className="clip-detail-layout">
        <div className="clip-detail-main">
          <header className="clip-detail-metadata">
            <div className="clip-detail-source">
              {clip.faviconUrl ? (
                <img
                  src={clip.faviconUrl}
                  alt=""
                  className="library-clip-card__favicon"
                  width={20}
                  height={20}
                  loading="lazy"
                />
              ) : (
                <span className="library-clip-card__favicon library-clip-card__favicon--placeholder" aria-hidden>
                  {domainLetter}
                </span>
              )}
              <span className="clip-detail-domain-label">{domainLabel}</span>
            </div>
            <h1 className="clip-detail-title">{title}</h1>
            {desc ? <p className="clip-detail-desc">{desc}</p> : null}
            <div className="clip-detail-divider" role="presentation" />
          </header>

          <section className="clip-detail-highlights" aria-label="Highlights">
            <h2 className="clip-detail-section-label">Your highlights</h2>
            {deleteError ? <p className="clip-detail-action-error">{deleteError}</p> : null}

            {highlights.length === 0 ? (
              <p className="clip-detail-empty">
                No highlights yet. Select text on the original article to save a highlight.
              </p>
            ) : (
              <>
                {mine.map((h) => (
                  <HighlightCard
                    key={h.id}
                    h={h}
                    isMine
                    onDelete={onDeleteHighlight}
                    deleting={deletingId === h.id}
                  />
                ))}

                {showAlsoLabel ? (
                  <h3 className="clip-detail-subsection-label">Also highlighted by</h3>
                ) : null}

                {others.map((h) => (
                  <HighlightCard key={h.id} h={h} isMine={false} onDelete={onDeleteHighlight} deleting={false} />
                ))}
              </>
            )}
          </section>
        </div>

        <aside className="clip-detail-aside" aria-label="Clip actions">
          <div className="clip-detail-card clip-detail-card--actions">
            {readOriginalUrl ? (
              <a className="btn btn--primary clip-detail-read-original" href={readOriginalUrl} target="_blank" rel="noopener noreferrer">
                Read original
              </a>
            ) : (
              <span className="btn btn--primary clip-detail-read-original" aria-disabled="true">
                Read original unavailable
              </span>
            )}
            <p className="clip-detail-actions-meta">
              Saved {formatShortRelative(clip.savedAt)} · {domainLabel}
            </p>
          </div>

          <div className="clip-detail-card">
            <h2 className="clip-detail-card-label">Tags</h2>
            <div className="clip-detail-tags-row">
              {tags.map((ct) => (
                <span key={ct.tagId} className="clip-detail-tag-pill">
                  <span className="clip-detail-tag-name">{ct.tag.name}</span>
                  <button
                    type="button"
                    className="clip-detail-tag-remove"
                    onClick={() => void onRemoveTag(ct.tagId)}
                    disabled={removingTagId === ct.tagId}
                    aria-label={`Remove tag ${ct.tag.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tagInputOpen ? (
                <input
                  ref={tagInputRef}
                  type="text"
                  className="clip-detail-tag-input"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={onTagInputKeyDown}
                  onBlur={() => {
                    window.setTimeout(() => {
                      if (document.activeElement === tagInputRef.current) return
                      if (tagErrorRef.current) return
                      closeTagInput()
                    }, 0)
                  }}
                  placeholder="Tag name"
                  maxLength={50}
                  autoComplete="off"
                  disabled={tagBusy}
                  aria-label="New tag name"
                />
              ) : (
                <button
                  type="button"
                  className="clip-detail-add-tag"
                  onClick={() => {
                    setTagError(null)
                    setTagInputOpen(true)
                  }}
                  disabled={tagBusy}
                >
                  + Add tag
                </button>
              )}
            </div>
            {tagError ? <p className="clip-detail-tag-error">{tagError}</p> : null}
          </div>

          {orderedForNav.length > 0 ? (
            <div className="clip-detail-card">
              <h2 className="clip-detail-card-label">
                {orderedForNav.length} {orderedForNav.length === 1 ? 'highlight' : 'highlights'}
              </h2>
              <ul className="clip-detail-nav-list">
                {orderedForNav.map((h) => {
                  const isOwn = me?.id === h.userId
                  return (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="clip-detail-nav-item"
                        onClick={() => scrollToHighlight(h.id)}
                      >
                        <span
                          className={
                            isOwn ? 'clip-detail-nav-dot clip-detail-nav-dot--mine' : 'clip-detail-nav-dot clip-detail-nav-dot--other'
                          }
                          aria-hidden
                        />
                        <span className="clip-detail-nav-text">{navPreview(h.text)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

function HighlightCard({
  h,
  isMine,
  onDelete,
  deleting,
}: {
  h: HighlightWithUserModel
  isMine: boolean
  onDelete: (id: string) => void
  deleting: boolean
}): React.ReactElement {
  const who = isMine ? 'You' : h.user ? `@${h.user.username}` : 'Someone'
  const when = formatShortRelative(h.createdAt)
  const mod = isMine ? 'clip-detail-hl-card--mine' : 'clip-detail-hl-card--other'

  return (
    <article id={`highlight-${h.id}`} className={`clip-detail-hl-card ${mod}`}>
      <p className="clip-detail-hl-text">{h.text}</p>
      <div className="clip-detail-hl-footer">
        <span className="clip-detail-hl-meta">
          {who} · {when}
        </span>
        {isMine ? (
          <button
            type="button"
            className="clip-detail-hl-delete"
            onClick={() => onDelete(h.id)}
            disabled={deleting}
            aria-label="Delete highlight"
          >
            Delete
          </button>
        ) : null}
      </div>
    </article>
  )
}
