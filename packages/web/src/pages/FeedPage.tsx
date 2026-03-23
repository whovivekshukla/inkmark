import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FeedClipModel } from '@inkmark/shared'
import { ApiError, fetchClipFeed } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { FeedClipCard } from '../components/FeedClipCard'
import { FeedTimelineEntry } from '../components/FeedTimelineEntry'
import { formatShortRelative } from '../lib/formatRelative'

const PAGE_SIZE = 20

type FeedTab = 'all' | 'clips' | 'highlights'

function filterClips(clips: FeedClipModel[], tab: FeedTab): FeedClipModel[] {
  if (tab === 'all') return clips
  const n = (c: FeedClipModel) => c.highlightCount ?? 0
  if (tab === 'clips') return clips.filter((c) => n(c) === 0)
  return clips.filter((c) => n(c) > 0)
}

export function FeedPage(): React.ReactElement {
  const { token } = useAuth()
  const [feedTab, setFeedTab] = useState<FeedTab>('all')

  const [clips, setClips] = useState<FeedClipModel[]>([])
  const [clipsPage, setClipsPage] = useState(1)
  const [clipsHasMore, setClipsHasMore] = useState(false)
  const [clipsLoading, setClipsLoading] = useState(true)
  const [clipsLoadingMore, setClipsLoadingMore] = useState(false)
  const [clipsError, setClipsError] = useState<string | null>(null)

  const clipsInFlightRef = useRef(false)

  const loadClips = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!token) return
      if (append) {
        if (clipsInFlightRef.current) return
        clipsInFlightRef.current = true
        setClipsLoadingMore(true)
      } else setClipsLoading(true)
      setClipsError(null)
      try {
        const { clips: list, meta } = await fetchClipFeed(token, nextPage, PAGE_SIZE)
        setClips((prev) => (append ? [...prev, ...list] : list))
        setClipsHasMore(meta.hasMore)
        setClipsPage(nextPage)
      } catch (e) {
        if (!append) setClips([])
        setClipsError(e instanceof ApiError ? e.message : 'Failed to load feed')
      } finally {
        clipsInFlightRef.current = false
        setClipsLoading(false)
        setClipsLoadingMore(false)
      }
    },
    [token],
  )

  useEffect(() => {
    if (!token) return
    setClipsPage(1)
    setClips([])
    void loadClips(1, false)
  }, [token, loadClips])

  const visibleClips = useMemo(() => filterClips(clips, feedTab), [clips, feedTab])

  const handleLoadMore = (): void => {
    if (!clipsHasMore || clipsLoadingMore || clipsLoading) return
    void loadClips(clipsPage + 1, true)
  }

  const loading = clipsLoading && clips.length === 0
  const empty = !clipsLoading && clips.length === 0
  const filteredEmpty = !clipsLoading && clips.length > 0 && visibleClips.length === 0

  return (
    <div className="page-wide feed-page">
      <header className="page-header feed-page__header">
        <h1 className="page-title">Feed</h1>
        <p className="page-lede feed-page__lede">Clips and highlights from people you follow.</p>

        <div className="feed-filter-bar">
          <div className="feed-filter-row" role="tablist" aria-label="Feed filters">
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'all'}
              className={`feed-filter-chip${feedTab === 'all' ? ' feed-filter-chip--active' : ''}`}
              onClick={() => setFeedTab('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'clips'}
              className={`feed-filter-chip${feedTab === 'clips' ? ' feed-filter-chip--active' : ''}`}
              onClick={() => setFeedTab('clips')}
            >
              Clips
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feedTab === 'highlights'}
              className={`feed-filter-chip${feedTab === 'highlights' ? ' feed-filter-chip--active' : ''}`}
              onClick={() => setFeedTab('highlights')}
            >
              Highlights
            </button>
          </div>
        </div>
      </header>

      {clipsError ? <p className="error">{clipsError}</p> : null}

      {loading ? (
        <p className="app-boot-text">Loading</p>
      ) : empty ? (
        <p className="empty-state">No clips yet. Save a clip or follow readers for their public clips.</p>
      ) : filteredEmpty ? (
        <p className="empty-state">
          {feedTab === 'clips'
            ? 'No clips without highlights in this view. Try All or Highlights.'
            : 'No clips with highlights in this view. Try All or Clips.'}
        </p>
      ) : (
        <>
          <div className="feed-timeline">
            {visibleClips.map((c) => (
              <FeedTimelineEntry key={c.id} user={c.user} timeLabel={formatShortRelative(c.savedAt)}>
                <FeedClipCard clip={c} linkState={{ from: '/feed' }} />
              </FeedTimelineEntry>
            ))}
          </div>
          {clipsHasMore ? (
            <div className="feed-load-more-wrap">
              <button
                type="button"
                className="feed-load-more"
                disabled={clipsLoadingMore}
                onClick={handleLoadMore}
              >
                {clipsLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
