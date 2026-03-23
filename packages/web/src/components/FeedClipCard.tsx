import { Link } from 'react-router-dom'
import type { FeedClipModel } from '@inkmark/shared'
import { displayRootDomain } from '../lib/displayRootDomain'
import { formatShortRelative } from '../lib/formatRelative'

const HL_DOT_CAP = 4

function feedAccent(clip: FeedClipModel): 'amber' | 'blue' | null {
  const n = clip.highlightCount ?? 0
  const o = clip.otherHighlightCount ?? 0
  if (n === 0) return null
  return o > 0 ? 'blue' : 'amber'
}

function accentTopClass(accent: 'amber' | 'blue' | null): string {
  if (accent === 'amber') return 'feed-clip-card--accent-amber'
  if (accent === 'blue') return 'feed-clip-card--accent-blue'
  return ''
}

function quotePanelClass(accent: 'amber' | 'blue' | null): string {
  if (accent === 'amber') return 'feed-clip-card__quote-panel feed-clip-card__quote-panel--own'
  if (accent === 'blue') return 'feed-clip-card__quote-panel feed-clip-card__quote-panel--other'
  return ''
}

interface FeedClipCardProps {
  clip: FeedClipModel
  linkState?: { from: string }
}

export function FeedClipCard({ clip, linkState }: FeedClipCardProps): React.ReactElement {
  const count = clip.highlightCount ?? 0
  const hasHighlights = count > 0 && clip.firstHighlight != null
  const accent = feedAccent(clip)
  const saved = formatShortRelative(clip.savedAt)
  const domainLabel = displayRootDomain(clip.domain)
  const title = clip.title?.trim() || clip.domain || 'Untitled'
  const attribution = `${title} — ${domainLabel}`

  const dotCount = Math.min(HL_DOT_CAP, count)
  const overflow = count > HL_DOT_CAP ? count - HL_DOT_CAP : 0
  const moreExtra = count > 1 ? count - 1 : 0
  const morePillLabel =
    moreExtra === 1 ? '+1 more highlight' : moreExtra > 1 ? `+${moreExtra} more highlights` : ''

  const swatchClass = accent === 'blue' ? 'library-hl-swatch--blue' : 'library-hl-swatch--amber'

  return (
    <Link
      className={`feed-clip-card ${accentTopClass(accent)}`.trim()}
      to={`/clips/${encodeURIComponent(clip.id)}`}
      state={linkState}
    >
      {hasHighlights ? (
        <>
          <div className={quotePanelClass(accent)}>
            <p className="feed-clip-card__quote">{clip.firstHighlight!.text}</p>
            {moreExtra > 0 ? <span className="feed-clip-card__more-pill">{morePillLabel}</span> : null}
          </div>
          <p className="feed-clip-card__attr">{attribution}</p>
        </>
      ) : (
        <div className="feed-clip-card__minimal">
          <span className="feed-clip-card__minimal-domain">{domainLabel}</span>
          <h2 className="feed-clip-card__minimal-title">{title}</h2>
        </div>
      )}

      <div className="feed-clip-card__footer">
        <span className="feed-clip-card__time">clipped {saved}</span>
        {count > 0 ? (
          <span className="feed-clip-card__hl">
            <span className="feed-clip-card__hl-label">
              {count === 1 ? '1 highlight' : `${count} highlights`}
            </span>
            <span className="feed-clip-card__hl-swatches" aria-hidden>
              {Array.from({ length: dotCount }, (_, i) => (
                <span key={i} className={`library-hl-swatch ${swatchClass}`} />
              ))}
            </span>
            {overflow > 0 ? (
              <span className="feed-clip-card__hl-overflow" aria-label={`${overflow} more highlights`}>
                +{overflow}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
