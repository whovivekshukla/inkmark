/** React Router location.state for "where the user opened this clip from". */
export interface ClipLocationState {
  from?: string
}

/** Single-segment routes that are not user profiles. */
const RESERVED_SINGLE = new Set([
  '/library',
  '/feed',
  '/search',
  '/settings',
  '/sign-in',
  '/clips',
])

/** Resolve back link + label from optional navigation state (defaults to Library). */
export function clipBackFromState(state: unknown): { to: string; label: string } {
  const raw =
    typeof state === 'object' && state !== null && 'from' in state
      ? String((state as ClipLocationState).from ?? '').trim()
      : ''
  if (!raw.startsWith('/')) {
    return { to: '/library', label: 'Library' }
  }

  if (raw === '/feed' || raw.startsWith('/feed?')) return { to: raw, label: 'Feed' }
  if (raw === '/library' || raw.startsWith('/library?')) return { to: raw, label: 'Library' }
  if (raw === '/search' || raw.startsWith('/search?')) return { to: raw, label: 'Search' }
  if (raw === '/settings') return { to: '/settings', label: 'Settings' }

  // Profile: /:username (not a reserved app route)
  if (/^\/[^/]+$/.test(raw) && !RESERVED_SINGLE.has(raw)) {
    return { to: raw, label: 'Profile' }
  }

  return { to: '/library', label: 'Library' }
}
