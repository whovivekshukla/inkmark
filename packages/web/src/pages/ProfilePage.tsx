import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { ClipModel, UserProfileModel } from '@inkmark/shared'
import {
  ApiError,
  fetchFollowCounts,
  fetchPublicClips,
  fetchPublicProfile,
} from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AvatarImg } from '../components/AvatarImg'
import { ClipGridCard } from '../components/ClipGridCard'

export function ProfilePage(): React.ReactElement {
  const { username } = useParams<{ username: string }>()
  const { user: me, token, signOut } = useAuth()
  const [profile, setProfile] = useState<UserProfileModel | null>(null)
  const [clips, setClips] = useState<ClipModel[]>([])
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const safeUsername = username?.trim() ?? ''

  useEffect(() => {
    if (!token || !safeUsername) {
      setLoading(false)
      setProfile(null)
      setClips([])
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
        const [{ clips: list }, counts] = await Promise.all([
          fetchPublicClips(token, safeUsername, 1, 100),
          fetchFollowCounts(token, p.id),
        ])
        if (!cancelled) {
          setClips(list)
          setFollowerCount(counts.followerCount)
          setFollowingCount(counts.followingCount)
        }
      } catch (e) {
        if (!cancelled) {
          setProfile(null)
          setClips([])
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
              width={56}
              height={56}
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
            <div className="profile-stat">
              <span className="profile-stat-num">{followerCount}</span>
              <span className="profile-stat-label">followers</span>
            </div>
            <div className="profile-stat">
              <span className="profile-stat-num">{followingCount}</span>
              <span className="profile-stat-label">following</span>
            </div>
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
        ) : null}
      </header>

      <section className="profile-clips" aria-label="Public clips">
        <h2 className="section-rule-heading">Clips</h2>
        {clips.length === 0 ? (
          <p className="empty-state">No public clips yet.</p>
        ) : (
          <div className="clip-grid">
            {clips.map((c) => (
              <ClipGridCard key={c.id} clip={c} linkState={{ from: `/${safeUsername}` }} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
