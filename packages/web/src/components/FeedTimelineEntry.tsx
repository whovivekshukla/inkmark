import { Link } from 'react-router-dom'
import type { UserSummaryModel } from '@inkmark/shared'
import { AvatarImg } from './AvatarImg'

const AVATAR_TINTS = [
  'feed-timeline-avatar--violet',
  'feed-timeline-avatar--green',
  'feed-timeline-avatar--amber',
  'feed-timeline-avatar--blue',
  'feed-timeline-avatar--rose',
] as const

function avatarTintClass(userId: string): string {
  let n = 0
  for (let i = 0; i < userId.length; i++) n = (n + userId.charCodeAt(i)) % 997
  return AVATAR_TINTS[n % AVATAR_TINTS.length]
}

export function FeedTimelineEntry({
  user,
  timeLabel,
  children,
}: {
  user: UserSummaryModel
  timeLabel: string
  children: React.ReactNode
}): React.ReactElement {
  const tint = user.avatarUrl ? '' : avatarTintClass(user.id)

  return (
    <article className="feed-timeline-item">
      <div className="feed-timeline-item__rail">
        <span className="feed-timeline-item__stem" aria-hidden />
        <div className={['feed-timeline-item__avatar', tint].filter(Boolean).join(' ')}>
          {user.avatarUrl ? (
            <AvatarImg className="feed-timeline-item__avatar-img" src={user.avatarUrl} alt="" width={32} height={32} />
          ) : (
            <span className="feed-timeline-item__avatar-placeholder" aria-hidden>
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <div className="feed-timeline-item__body">
        <div className="feed-timeline-item__meta">
          <Link className="feed-timeline-item__name" to={`/${encodeURIComponent(user.username)}`}>
            {user.displayName}
          </Link>
          <span className="feed-timeline-item__sep" aria-hidden>
            ·
          </span>
          <span className="feed-timeline-item__time">{timeLabel}</span>
        </div>
        {children}
      </div>
    </article>
  )
}
