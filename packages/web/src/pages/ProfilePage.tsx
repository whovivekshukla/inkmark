import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ClipModel, PaginationMeta, UserProfileModel } from '@inkmark/shared'
import {
  ApiError,
  fetchFollowCounts,
  fetchPublicClips,
  fetchPublicProfile,
  followUser,
  unfollowUser,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AvatarImg } from '../components/AvatarImg'
import { ClipGridCard } from '../components/ClipGridCard'
import { FollowListModal } from '../components/FollowListModal'
import './profile.css'

export function ProfilePage(): React.ReactElement {
  const { username } = useParams<{ username: string }>()
  const { user: me, token, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfileModel | null>(null)
  const [clips, setClips] = useState<ClipModel[]>([])
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [clipsMeta, setClipsMeta] = useState<PaginationMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [followList, setFollowList] = useState<'followers' | 'following' | null>(null)

  const safeUsername = username?.trim() ?? ''

  useEffect(() => {
    if (!token || !safeUsername) {
      setLoading(false)
      setProfile(null)
      setClips([])
      setClipsMeta(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const p = await fetchPublicProfile(token, safeUsername)
        if (cancelled) return
        setProfile(p)
        const [{ clips: list, meta }, counts] = await Promise.all([
          fetchPublicClips(token, safeUsername, 1, 100),
          fetchFollowCounts(token, p.id),
        ])
        if (!cancelled) {
          setClips(list)
          setClipsMeta(meta)
          setFollowerCount(counts.followerCount)
          setFollowingCount(counts.followingCount)
        }
      } catch (e) {
        if (!cancelled) {
          setProfile(null)
          setClips([])
          setClipsMeta(null)
          setFollowerCount(null)
          setFollowingCount(null)
          setError(e instanceof ApiError ? e.message : 'Failed to load profile')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [safeUsername, token])

  const loadMoreClips = async (): Promise<void> => {
    if (!token || !safeUsername || !clipsMeta?.hasMore || loadingMore) return
    setLoadingMore(true)
    setError(null)
    try {
      const nextPage = clipsMeta.page + 1
      const { clips: list, meta } = await fetchPublicClips(token, safeUsername, nextPage, clipsMeta.limit)
      setClips((prev) => [...prev, ...list])
      setClipsMeta(meta)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load more clips')
    } finally {
      setLoadingMore(false)
    }
  }

  const onToggleFollow = async (): Promise<void> => {
    if (!token || !profile || followBusy) return
    const wasFollowing = profile.viewerFollows
    setFollowBusy(true)
    setError(null)
    // Optimistic — flip state and adjust the follower count, reconcile on error.
    setProfile((p) => (p ? { ...p, viewerFollows: !wasFollowing } : p))
    setFollowerCount((n) => (n === null ? n : n + (wasFollowing ? -1 : 1)))
    try {
      if (wasFollowing) await unfollowUser(token, profile.id)
      else await followUser(token, profile.id)
    } catch (e) {
      setProfile((p) => (p ? { ...p, viewerFollows: wasFollowing } : p))
      setFollowerCount((n) => (n === null ? n : n + (wasFollowing ? 1 : -1)))
      setError(e instanceof ApiError ? e.message : 'Failed to update follow')
    } finally {
      setFollowBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page-narrow app-boot">
        <p className="app-boot-text">Loading</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="page-narrow">
        <p className="error">{error ?? 'Profile not found'}</p>
        <Link className="link-back" to="/library">
          ← Library
        </Link>
      </div>
    )
  }

  const isOwn = me?.username === profile.username

  return (
    <div className="page-wide profile-public">
      <header className="profile-public-header">
        <div className="profile-public-identity">
          {profile.avatarUrl ? (
            <AvatarImg
              className="profile-public-avatar"
              src={profile.avatarUrl}
              alt=""
              width={76}
              height={76}
            />
          ) : (
            <div className="profile-public-avatar profile-public-avatar--placeholder" aria-hidden>
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="profile-public-text">
            <h1 className="profile-public-name">{profile.displayName}</h1>
            <p className="profile-public-handle">@{profile.username}</p>
            {profile.bio ? <p className="profile-public-bio">{profile.bio}</p> : null}
          </div>
        </div>

        {followerCount !== null && followingCount !== null ? (
          <div className="profile-stats" aria-label="Follow stats">
            <button
              type="button"
              className="profile-stat profile-stat--button"
              onClick={() => setFollowList('followers')}
            >
              <span className="profile-stat-num">{followerCount}</span>
              <span className="profile-stat-label">followers</span>
            </button>
            <button
              type="button"
              className="profile-stat profile-stat--button"
              onClick={() => setFollowList('following')}
            >
              <span className="profile-stat-num">{followingCount}</span>
              <span className="profile-stat-label">following</span>
            </button>
            {clipsMeta?.total !== undefined ? (
              <div className="profile-stat">
                <span className="profile-stat-num">{clipsMeta.total}</span>
                <span className="profile-stat-label">clips</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {isOwn ? (
          <p className="profile-own-actions">
            <Link className="link-quiet-signout profile-own-link" to="/settings">
              Settings
            </Link>
            <button type="button" className="link-quiet-signout" onClick={signOut}>
              Sign out
            </button>
          </p>
        ) : (
          <button
            type="button"
            className={`btn profile-follow-btn ${profile.viewerFollows ? 'btn--secondary' : 'btn--primary'}`}
            onClick={() => void onToggleFollow()}
            disabled={followBusy}
          >
            {profile.viewerFollows ? 'Following' : 'Follow'}
          </button>
        )}
      </header>

      {followList ? (
        <FollowListModal userId={profile.id} kind={followList} onClose={() => setFollowList(null)} />
      ) : null}

      <section className="profile-clips" aria-label="Public clips">
        <h2 className="section-rule-heading">Public clips</h2>
        {clips.length === 0 ? (
          <p className="empty-state">No public clips yet.</p>
        ) : (
          <>
            <div className="clip-grid">
              {clips.map((c) => (
                <ClipGridCard key={c.id} clip={c} linkState={{ from: `/${safeUsername}` }} />
              ))}
            </div>
            {clipsMeta?.hasMore ? (
              <div className="library-load-more-wrap">
                <button
                  type="button"
                  className="library-load-more"
                  disabled={loadingMore}
                  onClick={() => void loadMoreClips()}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
