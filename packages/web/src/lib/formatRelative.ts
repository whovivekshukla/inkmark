/** Compact relative time for clip cards (e.g. "2d ago"). */
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
  if (day < 14) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 8) return `${wk}w ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  const yr = Math.floor(day / 365)
  return `${yr}y ago`
}
