import { Link } from 'react-router-dom'
import type { UserSummaryModel } from '@inkmark/shared'
import { AvatarImg } from './AvatarImg'

export function FeedAttribution({
  user,
  timeLabel,
}: {
  user: UserSummaryModel
  /** Relative time for the newest item in this group (e.g. “4m ago”). */
  timeLabel?: string
}): React.ReactElement {
  return (
    <div className="feed-attribution">
      {user.avatarUrl ? (
        <AvatarImg className="feed-attribution-avatar" src={user.avatarUrl} alt="" width={32} height={32} />
      ) : (
        <span className="feed-attribution-placeholder" aria-hidden>
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <Link className="feed-attribution-name" to={`/${encodeURIComponent(user.username)}`}>
        {user.displayName}
      </Link>
      {timeLabel ? (
        <>
          <span className="feed-attribution-sep" aria-hidden>
            ·
          </span>
          <span className="feed-attribution-time">{timeLabel}</span>
        </>
      ) : null}
    </div>
  )
}
