import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { ClipModel, HighlightWithUserModel } from '@inkmark/shared'
import {
  ApiError,
  addTagToClip,
  deleteClip,
  deleteHighlight,
  removeTagFromClip,
  fetchClipById,
  fetchHighlightsForClip,
  updateClip,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { clipBackFromState } from '../lib/clipBackNav'
import { displayRootDomain } from '../lib/displayRootDomain'
import { formatShortRelative } from '../lib/formatRelative'
import { SourceBadge } from '../components/SourceBadge'

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

function safeExternalUrl(url: string | null): string | null {
  if (!url) return null
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
  const navigate = useNavigate()
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

  // Owner-only clip management (edit title, toggle visibility, delete)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [visibilityBusy, setVisibilityBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deletingClip, setDeletingClip] = useState(false)
  const [manageError, setManageError] = useState<string | null>(null)

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

  const domainLabel = clip ? displayRootDomain(clip.domain) || clip.source.toLowerCase() : ''
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

  const startEditTitle = useCallback(() => {
    setManageError(null)
    setTitleDraft(clip?.title ?? '')
    setEditingTitle(true)
  }, [clip?.title])

  const onSaveTitle = useCallback(async () => {
    if (!token || !clipId || savingTitle) return
    const next = titleDraft.trim()
    if (!next) {
      setManageError('Title cannot be empty.')
      return
    }
    setSavingTitle(true)
    setManageError(null)
    try {
      const updated = await updateClip(token, clipId, { title: next })
      setClip((c) => (c ? { ...c, title: updated.title } : c))
      setEditingTitle(false)
    } catch (e) {
      setManageError(e instanceof ApiError ? e.message : 'Failed to update title')
    } finally {
      setSavingTitle(false)
    }
  }, [token, clipId, savingTitle, titleDraft])

  const onToggleVisibility = useCallback(async () => {
    if (!token || !clipId || visibilityBusy || !clip) return
    const nextPublic = !clip.isPublic
    setVisibilityBusy(true)
    setManageError(null)
    // Optimistic — reconcile from the server response.
    setClip((c) => (c ? { ...c, isPublic: nextPublic } : c))
    try {
      const updated = await updateClip(token, clipId, { isPublic: nextPublic })
      setClip((c) => (c ? { ...c, isPublic: updated.isPublic } : c))
    } catch (e) {
      setClip((c) => (c ? { ...c, isPublic: !nextPublic } : c))
      setManageError(e instanceof ApiError ? e.message : 'Failed to change visibility')
    } finally {
      setVisibilityBusy(false)
    }
  }, [token, clipId, visibilityBusy, clip])

  const onDeleteClip = useCallback(async () => {
    if (!token || !clipId || deletingClip) return
    setDeletingClip(true)
    setManageError(null)
    try {
      await deleteClip(token, clipId)
      navigate(backNav.to)
    } catch (e) {
      setManageError(e instanceof ApiError ? e.message : 'Failed to delete clip')
      setDeletingClip(false)
    }
  }, [token, clipId, deletingClip, navigate, backNav.to])

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
  const isOwner = Boolean(me?.id && me.id === clip.userId)
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
              <SourceBadge source={clip.source} />
            </div>
            {isOwner && editingTitle ? (
              <div className="clip-detail-title-edit">
                <input
                  type="text"
                  className="settings-input clip-detail-title-input"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  maxLength={500}
                  aria-label="Clip title"
                  autoFocus
                />
                <div className="clip-detail-title-edit-actions">
                  <button
                    type="button"
                    className="btn btn--primary clip-detail-title-save"
                    onClick={() => void onSaveTitle()}
                    disabled={savingTitle}
                  >
                    {savingTitle ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={() => {
                      setEditingTitle(false)
                      setManageError(null)
                    }}
                    disabled={savingTitle}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <h1 className="clip-detail-title">
                {title}
                {isOwner ? (
                  <button type="button" className="clip-detail-title-editbtn" onClick={startEditTitle}>
                    Edit
                  </button>
                ) : null}
              </h1>
            )}
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

          {isOwner ? (
            <div className="clip-detail-card clip-detail-manage">
              <h2 className="clip-detail-card-label">Manage clip</h2>
              <div className="clip-detail-manage-row">
                <div>
                  <p className="clip-detail-manage-state">{clip.isPublic ? 'Public' : 'Private'}</p>
                  <p className="clip-detail-manage-hint">
                    {clip.isPublic
                      ? 'Visible on your profile and followers’ feeds.'
                      : 'Only you can see this clip.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--secondary clip-detail-manage-toggle"
                  onClick={() => void onToggleVisibility()}
                  disabled={visibilityBusy}
                >
                  {clip.isPublic ? 'Make private' : 'Make public'}
                </button>
              </div>

              {confirmingDelete ? (
                <div className="clip-detail-manage-confirm">
                  <p className="clip-detail-manage-hint">Delete this clip and its highlights?</p>
                  <div className="clip-detail-manage-confirm-actions">
                    <button
                      type="button"
                      className="btn btn--danger clip-detail-manage-delete"
                      onClick={() => void onDeleteClip()}
                      disabled={deletingClip}
                    >
                      {deletingClip ? 'Deleting…' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deletingClip}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="clip-detail-manage-delete-link"
                  onClick={() => {
                    setManageError(null)
                    setConfirmingDelete(true)
                  }}
                >
                  Delete clip
                </button>
              )}

              {manageError ? <p className="clip-detail-action-error">{manageError}</p> : null}
            </div>
          ) : null}

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
