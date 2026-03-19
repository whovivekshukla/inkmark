import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ClipModel, HighlightModel, UserProfileModel } from '@inkmark/shared'
import {
  ApiError,
  fetchHighlightsForClip,
  fetchMyClips,
  fetchPublicClips,
  fetchPublicProfile,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'

function highlightColorClass(color: string): string {
  const c = (color || 'yellow').toLowerCase()
  if (c === 'green' || c === 'blue' || c === 'pink' || c === 'yellow') return c
  return 'yellow'
}

export function ProfilePage(): React.ReactElement {
  const { username } = useParams<{ username: string }>()
  const { user: me, token, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfileModel | null>(null)
  const [clips, setClips] = useState<ClipModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [expandedClips, setExpandedClips] = useState<Set<string>>(() => new Set())
  const [highlightsByClip, setHighlightsByClip] = useState<
    Record<string, HighlightModel[] | undefined>
  >({})
  const [highlightsLoadingId, setHighlightsLoadingId] = useState<string | null>(null)
  const [highlightsErrorId, setHighlightsErrorId] = useState<string | null>(null)

  const safeUsername = username?.trim() ?? ''

  const loadHighlightsForClip = useCallback(
    async (clipId: string): Promise<void> => {
      if (!token) return
      setHighlightsLoadingId(clipId)
      setHighlightsErrorId(null)
      try {
        const list = await fetchHighlightsForClip(token, clipId)
        setHighlightsByClip((prev) => ({ ...prev, [clipId]: list }))
      } catch {
        setHighlightsByClip((prev) => ({ ...prev, [clipId]: [] }))
        setHighlightsErrorId(clipId)
      } finally {
        setHighlightsLoadingId(null)
      }
    },
    [token],
  )

  const toggleHighlights = useCallback(
    (clipId: string) => {
      const wasOpen = expandedClips.has(clipId)
      setExpandedClips((prev) => {
        const next = new Set(prev)
        if (next.has(clipId)) next.delete(clipId)
        else next.add(clipId)
        return next
      })
      if (!wasOpen && token && highlightsByClip[clipId] === undefined) {
        void loadHighlightsForClip(clipId)
      }
    },
    [expandedClips, highlightsByClip, loadHighlightsForClip, token],
  )

  useEffect(() => {
    if (!safeUsername || !token) {
      setLoading(false)
      setProfile(null)
      setClips([])
      return
    }

    const authToken = token
    /** Own profile: full clip list; later swap for followed-users feed. */
    const feedIsMine = me?.username === safeUsername

    let cancelled = false
    setLoading(true)
    setError(null)

    async function load(): Promise<void> {
      try {
        const [p, { clips: list }] = await Promise.all([
          fetchPublicProfile(authToken, safeUsername),
          feedIsMine
            ? fetchMyClips(authToken)
            : fetchPublicClips(authToken, safeUsername),
        ])
        if (!cancelled) {
          setProfile(p)
          setClips(list)
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : 'Failed to load profile'
          setError(msg)
          setProfile(null)
          setClips([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [safeUsername, token, me?.username])

  useEffect(() => {
    setExpandedClips(new Set())
    setHighlightsByClip({})
    setHighlightsErrorId(null)
  }, [safeUsername])

  if (!token) {
    return (
      <div className="shell shell--narrow">
        <p className="muted">Sign in to view profiles.</p>
        <Link className="btn btn--primary" to="/sign-in">
          Sign in
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="shell shell--narrow app-boot">
        <p className="app-boot-text">Loading</p>
      </div>
    )
  }

  if (error || !profile) {
    const homeTo = me ? `/${encodeURIComponent(me.username)}` : '/'
    return (
      <div className="shell shell--narrow">
        <p className="error">{error ?? 'Profile not found'}</p>
        <Link className="link-back" to={homeTo}>
          ← {me ? 'My feed' : 'Home'}
        </Link>
      </div>
    )
  }

  const isOwn = me?.username === profile.username
  const feedHome = me ? `/${encodeURIComponent(me.username)}` : '/'

  return (
    <div className="shell profile">
      <nav className="top-nav">
        <Link className="link-back" to={feedHome}>
          ← Inkmark
        </Link>
        {isOwn ? (
          <button type="button" className="btn btn--ghost" onClick={signOut}>
            Sign out
          </button>
        ) : null}
      </nav>

      <header className="profile-header">
        {profile.avatarUrl ? (
          <img className="avatar" src={profile.avatarUrl} alt="" width={72} height={72} />
        ) : (
          <div className="avatar avatar--placeholder" aria-hidden>
            {profile.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <h1>{profile.displayName}</h1>
          <p className="profile-handle muted">@{profile.username}</p>
          {profile.bio ? <p className="bio">{profile.bio}</p> : null}
        </div>
      </header>

      <section className="clips-section">
        <h2 className="section-label">{isOwn ? 'Feed' : 'Clips'}</h2>
        {clips.length === 0 ? (
          <p className="muted clips-empty">
            {isOwn ? 'Nothing in your feed yet. Clips you save will show up here.' : 'No public clips yet.'}
          </p>
        ) : (
          <ul className="clip-list">
            {clips.map((c) => {
              const open = expandedClips.has(c.id)
              const highlights = highlightsByClip[c.id]
              const loadingHl = highlightsLoadingId === c.id
              const hlError = highlightsErrorId === c.id

              return (
                <li key={c.id} className={`clip-card${open ? ' clip-card-expanded' : ''}`}>
                  <div className="clip-card-body">
                    {c.faviconUrl ? (
                      <img className="clip-favicon" src={c.faviconUrl} alt="" width={18} height={18} />
                    ) : null}
                    <div className="clip-text">
                      <a className="clip-title" href={c.url} target="_blank" rel="noopener noreferrer">
                        {c.title?.trim() || c.domain || 'Untitled'}
                      </a>
                      <span className="clip-domain muted">{c.domain}</span>
                      {c.description ? <p className="clip-desc">{c.description}</p> : null}

                      <div className="clip-toolbar">
                        <button
                          type="button"
                          className="clip-toggle-highlights"
                          aria-expanded={open}
                          onClick={() => toggleHighlights(c.id)}
                        >
                          <span className="clip-toggle-chevron" aria-hidden>
                            {open ? '▼' : '▶'}
                          </span>
                          {open ? 'Hide highlights' : 'Highlights'}
                          {typeof highlightsByClip[c.id]?.length === 'number' &&
                          (highlightsByClip[c.id]?.length ?? 0) > 0 ? (
                            <span className="clip-highlight-count">{highlightsByClip[c.id]!.length}</span>
                          ) : null}
                        </button>
                      </div>

                      {open ? (
                        <div className="clip-highlights-panel" role="region" aria-label="Highlights">
                          {loadingHl ? (
                            <p className="muted clip-highlights-status">Loading…</p>
                          ) : hlError ? (
                            <p className="error clip-highlights-status">Could not load highlights.</p>
                          ) : highlights && highlights.length === 0 ? (
                            <p className="muted clip-highlights-status">No highlights.</p>
                          ) : (
                            <ul className="clip-highlight-list">
                              {(highlights ?? []).map((h) => (
                                <li
                                  key={h.id}
                                  className={`clip-highlight-item color-${highlightColorClass(h.color)}`}
                                >
                                  <blockquote>{h.text}</blockquote>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
