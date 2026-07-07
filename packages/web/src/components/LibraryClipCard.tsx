import { Link } from 'react-router-dom'
import type { ClipModel } from '@inkmark/shared'
import { displayRootDomain } from '../lib/displayRootDomain'
import { formatShortRelative } from '../lib/formatRelative'
import { SourceBadge } from './SourceBadge'

const HL_SWATCH_CAP = 4

const HL_SWATCH = ['library-hl-swatch--amber', 'library-hl-swatch--orange', 'library-hl-swatch--blue'] as const

interface LibraryClipCardProps {
  clip: ClipModel
  linkState?: { from: string }
}

export function LibraryClipCard({ clip, linkState }: LibraryClipCardProps): React.ReactElement {
  const title = clip.title?.trim() || clip.domain || 'Untitled'
  const sourceLetter = clip.domain?.slice(0, 1).toUpperCase() ?? clip.source.slice(0, 1).toUpperCase()
  const saved = formatShortRelative(clip.savedAt)
  const count = clip.highlightCount ?? 0
  const dotCount = Math.min(HL_SWATCH_CAP, count)
  const overflow = count > HL_SWATCH_CAP ? count - HL_SWATCH_CAP : 0
  const domainLabel = displayRootDomain(clip.domain) || clip.source.toLowerCase()

  return (
    <Link
      className={`library-clip-card${count > 0 ? ' library-clip-card--highlighted' : ''}`}
      to={`/clips/${encodeURIComponent(clip.id)}`}
      state={linkState}
    >
      <div className="library-clip-card__source">
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
            {sourceLetter}
          </span>
        )}
        <span className="library-clip-card__domain">{domainLabel}</span>
        <SourceBadge source={clip.source} />
      </div>
      <h2 className="library-clip-card__title">{title}</h2>
      {clip.tags && clip.tags.length > 0 ? (
        <div className="library-clip-card__tags">
          {clip.tags.slice(0, 4).map((ct) => (
            <span key={ct.tagId} className="library-clip-card__tag">
              {ct.tag.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="library-clip-card__footer">
        <span className="library-clip-card__time">{saved}</span>
        {count > 0 ? (
          <span className="library-clip-card__hl">
            <span className="library-clip-card__hl-swatches" aria-hidden>
              {Array.from({ length: dotCount }, (_, i) => (
                <span key={i} className={`library-hl-swatch ${HL_SWATCH[i % 3]}`} />
              ))}
            </span>
            {overflow > 0 ? (
              <span className="library-clip-card__hl-overflow" aria-label={`${overflow} more highlights`}>
                +{overflow}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
