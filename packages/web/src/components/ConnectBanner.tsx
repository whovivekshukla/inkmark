import { useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'

/** Below this many clips, a new reader hasn't found their ingestion groove yet. */
export const CONNECT_BANNER_CLIP_THRESHOLD = 3

const DISMISS_KEY = 'inkmark.connectBannerDismissed'

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

interface ConnectBannerProps {
  totalClips: number
}

/**
 * Onboarding nudge shown to readers who haven't built a clipping habit yet.
 * Points at the dedicated Connect hub (browser extension, AI hosts, API).
 * Dismissible; the dismissal is remembered so we don't nag on every visit.
 */
export function ConnectBanner({ totalClips }: ConnectBannerProps): ReactElement | null {
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (dismissed || totalClips > CONNECT_BANNER_CLIP_THRESHOLD) return null

  const onDismiss = (): void => {
    setDismissed(true)
    try {
      window.localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* storage unavailable — banner just reappears next load */
    }
  }

  return (
    <div className="connect-banner" role="note">
      <div className="connect-banner-body">
        <p className="connect-banner-title">Get more into Inkmark, faster</p>
        <p className="connect-banner-text">
          Clip and highlight straight from your browser, Claude, Codex, and more — no copy-paste.
        </p>
      </div>
      <div className="connect-banner-actions">
        <Link to="/connect" className="btn btn--primary connect-banner-cta">
          Set up clipping
        </Link>
        <button
          type="button"
          className="connect-banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
