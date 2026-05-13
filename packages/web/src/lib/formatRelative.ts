function formatClippedDate(d: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/** Compact clipped time for clip cards; dates older than a week become calendar dates. */
export function formatShortRelative(iso: Date | string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const ms = Date.now() - d.getTime()
  const sec = Math.max(0, Math.floor(ms / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day <= 7) return `${day}d ago`
  return formatClippedDate(d)
}
