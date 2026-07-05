import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ClipModel } from '@inkmark/shared'
import { ApiError, createClip } from '../api/client'
import { useAuth } from '../auth/AuthContext'

interface NewClipModalProps {
  onClose: () => void
  onCreated: (clip: ClipModel) => void
}

/** Splits a comma-separated tag string into trimmed, de-duplicated, non-empty names. */
function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (name) seen.add(name)
  }
  return [...seen]
}

export function NewClipModal({ onClose, onCreated }: NewClipModalProps): React.ReactElement {
  const { token } = useAuth()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    urlRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!token || submitting) return
    const trimmedUrl = url.trim()
    const trimmedTitle = title.trim()
    if (!trimmedUrl && !trimmedTitle) {
      setError('Add a URL or a title.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const tags = parseTags(tagsInput)
      const clip = await createClip(token, {
        ...(trimmedUrl ? { url: trimmedUrl } : {}),
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
        ...(tags.length ? { tags } : {}),
      })
      onCreated(clip)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CLIP_ALREADY_EXISTS') {
        setError('Already in your library.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to create clip')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-clip-title">
        <h2 className="modal-title" id="new-clip-title">
          New clip
        </h2>
        <form className="settings-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="settings-field">
            <label className="settings-label" htmlFor="new-clip-url">
              URL
            </label>
            <input
              ref={urlRef}
              id="new-clip-url"
              type="url"
              className="settings-input"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label" htmlFor="new-clip-title">
              Title <span className="settings-hint">(optional — fetched from the page if blank)</span>
            </label>
            <input
              id="new-clip-title"
              type="text"
              className="settings-input"
              placeholder="Optional title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="settings-field">
            <label className="settings-label" htmlFor="new-clip-tags">
              Tags <span className="settings-hint">(optional, comma-separated)</span>
            </label>
            <input
              id="new-clip-tags"
              type="text"
              className="settings-input"
              placeholder="reading, ai, longform"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          {error ? <p className="error settings-alert">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary modal-submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save clip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
