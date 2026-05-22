const TRACKING_PARAM_PREFIXES = ['utm_']
const TRACKING_PARAMS = new Set(['fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid'])

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value)
    url.hash = ''
    const keys: string[] = []
    url.searchParams.forEach((_value, key) => keys.push(key))
    for (const key of keys) {
      if (TRACKING_PARAMS.has(key) || TRACKING_PARAM_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        url.searchParams.delete(key)
      }
    }
    url.searchParams.sort()
    return url.toString()
  } catch {
    return value
  }
}
