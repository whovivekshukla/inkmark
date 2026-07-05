import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { UserSummaryModel } from '@inkmark/shared'
import { ApiError, fetchFollowers, fetchFollowing } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { AvatarImg } from './AvatarImg'

interface FollowListModalProps {
  userId: string
  kind: 'followers' | 'following'
  onClose: () => void
}

export function FollowListModal({ userId, kind, onClose }: FollowListModalProps): React.ReactElement {
  const { token } = useAuth()
  const [users, setUsers] = useState<UserSummaryModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const fetcher = kind === 'followers' ? fetchFollowers : fetchFollowing
        const { users: list } = await fetcher(token, userId)
        if (!cancelled) setUsers(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'Failed to load list')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, userId, kind])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="follow-list-title">
        <h2 className="modal-title" id="follow-list-title">
          {kind === 'followers' ? 'Followers' : 'Following'}
        </h2>
        {loading ? (
          <p className="app-boot-text">Loading</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : users.length === 0 ? (
          <p className="empty-state">
            {kind === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
          </p>
        ) : (
          <ul className="follow-list">
            {users.map((u) => (
              <li key={u.id}>
                <Link className="follow-list-row" to={`/${u.username}`} onClick={onClose}>
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
      </div>
    </div>
  )
}
