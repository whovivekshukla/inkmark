import { Link } from 'react-router-dom'
import type { ClipModel, FeedHighlightPreviewModel } from '@inkmark/shared'
import { formatShortRelative } from '../lib/formatRelative'
import { SourceBadge } from './SourceBadge'

interface ClipGridCardProps {
  clip: ClipModel & { highlightPreviews?: FeedHighlightPreviewModel[] }
  /** Passed as router state so clip detail can show the right “back to …” link. */
  linkState?: { from: string }
}

export function ClipGridCard({ clip, linkState }: ClipGridCardProps): React.ReactElement {
  const title = clip.title?.trim() || clip.domain || 'Untitled'
  const saved = formatShortRelative(clip.savedAt)

  return (
    <Link className="clip-grid-card" to={`/clips/${encodeURIComponent(clip.id)}`} state={linkState}>
      <span className="clip-grid-domain">{clip.domain ?? clip.source.toLowerCase()}</span>
      <h2 className="clip-grid-title">{title}</h2>
      <div className="clip-grid-meta">
        <span>{saved}</span>
        {clip.tags && clip.tags.length > 0 ? (
          <span className="clip-grid-meta-tags" aria-hidden>
            {' '}
            · {clip.tags.length} tag{clip.tags.length === 1 ? '' : 's'}
          </span>
        ) : null}
        <SourceBadge source={clip.source} />
      </div>
      {clip.highlightPreviews && clip.highlightPreviews.length > 0 ? (
        <div className="clip-grid-previews">
          {clip.highlightPreviews.map((h) => (
            <p key={h.id} className="clip-grid-preview-quote">
              {h.text}
            </p>
          ))}
        </div>
      ) : null}
      {clip.tags && clip.tags.length > 0 ? (
        <div className="clip-grid-pills">
          {clip.tags.slice(0, 4).map((ct) => (
            <span key={ct.tagId} className="clip-grid-pill">
              {ct.tag.name}
            </span>
          ))}
          {clip.tags.length > 4 ? (
            <span className="clip-grid-pill clip-grid-pill--more">+{clip.tags.length - 4}</span>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}
