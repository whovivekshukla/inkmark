/** Compact host for UI chips (strip www., collapse common subdomains to registrable-style label). */
export function displayRootDomain(host: string | null | undefined): string {
  if (!host) return ''
  const h = host.trim().toLowerCase()
  if (!h) return host
  const s = h.startsWith('www.') ? h.slice(4) : h
  const parts = s.split('.')
  const n = parts.length
  if (n <= 2) return s

  const tld = parts[n - 1]!
  const sld = parts[n - 2]!

  // e.g. foo.co.uk, example.com.au
  if (tld.length === 2 && sld.length <= 3 && n >= 3) {
    return parts.slice(-3).join('.')
  }

  return parts.slice(-2).join('.')
}
