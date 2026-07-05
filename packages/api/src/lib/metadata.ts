import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { isSafeHttpUrl, SafeHttpUrlSchema } from '@/lib/url'
import { logger } from '@/lib/logger'

/**
 * Server-side Open Graph / HTML metadata fetching with mandatory SSRF protection.
 *
 * The public entry point is {@link fetchMetadata}. Everything here is written to
 * fail closed: any hostname that resolves to a private/reserved IP, any non-HTML
 * response, or any transport error yields an empty result rather than throwing —
 * clip creation must never fail because metadata could not be fetched.
 */

export interface ClipMetadata {
  title?: string
  description?: string
  ogImage?: string
  faviconUrl?: string
}

const FETCH_TIMEOUT_MS = 5_000
const MAX_REDIRECTS = 3
const MAX_BODY_BYTES = 512 * 1024 // 512 KB cap on the HTML we will read/parse

/**
 * True if an already-parsed IP string sits in a private, loopback, link-local,
 * or otherwise reserved range that must never be reachable from a server-side
 * fetch. Covers both IPv4 and IPv6 (including IPv4-mapped IPv6).
 */
export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) return isPrivateIpv4(ip)
  if (family === 6) return isPrivateIpv6(ip)
  return true // not a valid IP → treat as unsafe
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = parts
  if (a === 0) return true // 0.0.0.0/8 "this host"
  if (a === 10) return true // 10.0.0.0/8
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
  if (a === 192 && b === 168) return true // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a >= 224) return true // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false
}

function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase()
  if (addr === '::1' || addr === '::') return true // loopback / unspecified
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded v4 address
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return isPrivateIpv4(mapped[1])
  if (addr.startsWith('fe80')) return true // link-local
  // Unique local addresses fc00::/7 → first byte 0xfc or 0xfd
  const firstByte = parseInt(addr.split(':')[0].padStart(4, '0').slice(0, 2), 16)
  if (firstByte === 0xfc || firstByte === 0xfd) return true
  return false
}

/**
 * Resolves a hostname and returns true only if EVERY resolved address is a
 * public, routable IP. Rejects on lookup failure. Called before each fetch hop.
 */
async function resolvesToPublicHost(hostname: string): Promise<boolean> {
  // A bare IP literal in the URL still needs the private-range check.
  if (isIP(hostname)) return !isPrivateIp(hostname)
  try {
    const records = await lookup(hostname, { all: true })
    if (records.length === 0) return false
    return records.every((r) => !isPrivateIp(r.address))
  } catch {
    return false
  }
}

/**
 * Fetch a URL with SSRF guards and return its raw HTML, or null if the URL is
 * unsafe, non-HTML, too large, or errors. Redirects are followed manually so
 * every hop's host is re-validated against private IP ranges.
 */
async function fetchHtml(startUrl: string): Promise<{ html: string; finalUrl: string } | null> {
  let currentUrl = startUrl

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isSafeHttpUrl(currentUrl)) return null
    const { hostname } = new URL(currentUrl)
    if (!(await resolvesToPublicHost(hostname))) {
      logger.warn('metadata fetch blocked: host resolves to private range', { url: currentUrl })
      return null
    }

    let res: Response
    try {
      res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: 'text/html', 'user-agent': 'InkmarkBot/1.0 (+metadata)' },
      })
    } catch (err) {
      logger.warn('metadata fetch failed', { url: currentUrl, error: (err as Error).message })
      return null
    }

    // Manual redirect handling — re-validate the next hop on the next iteration.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return null
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }

    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('text/html')) return null

    const html = await readCappedBody(res)
    if (html === null) return null
    return { html, finalUrl: currentUrl }
  }

  logger.warn('metadata fetch exceeded max redirects', { url: startUrl })
  return null
}

/** Reads a response body as UTF-8 text, aborting once MAX_BODY_BYTES is exceeded. */
async function readCappedBody(res: Response): Promise<string | null> {
  const reader = res.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.byteLength
        if (total > MAX_BODY_BYTES) {
          await reader.cancel()
          break // parse whatever we have — <head> is near the top
        }
        chunks.push(value)
      }
    }
  } catch {
    return null
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8')
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Finds `<meta property="og:x">` / `<meta name="og:x">` content, order-independent. */
function extractMetaContent(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // property/name may come before or after content; try both attribute orders.
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeEntities(m[1])
  }
  return undefined
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m?.[1] ? decodeEntities(m[1]) : undefined
}

/** Finds the first `<link rel="...icon...">` href. */
function extractFavicon(html: string): string | undefined {
  const linkTags = html.match(/<link[^>]+>/gi) ?? []
  for (const tag of linkTags) {
    if (!/rel=["'][^"']*icon[^"']*["']/i.test(tag)) continue
    const href = tag.match(/href=["']([^"']+)["']/i)
    if (href?.[1]) return decodeEntities(href[1])
  }
  return undefined
}

/** Resolves a possibly-relative URL against the page URL; keeps it only if safe. */
function resolveSafeUrl(value: string | undefined, base: string): string | undefined {
  if (!value) return undefined
  try {
    const resolved = new URL(value, base).toString()
    return SafeHttpUrlSchema.safeParse(resolved).success ? resolved : undefined
  } catch {
    return undefined
  }
}

/**
 * Fetch and parse Open Graph / HTML metadata for a URL. Returns an empty object
 * on any failure (unsafe host, non-HTML, transport error, parse miss). Never throws.
 */
export async function fetchMetadata(url: string): Promise<ClipMetadata> {
  const result = await fetchHtml(url)
  if (!result) return {}
  const { html, finalUrl } = result
  const head = html.slice(0, MAX_BODY_BYTES)

  const title = extractMetaContent(head, 'og:title') ?? extractTitle(head)
  const description =
    extractMetaContent(head, 'og:description') ?? extractMetaContent(head, 'description')
  const ogImage = resolveSafeUrl(extractMetaContent(head, 'og:image'), finalUrl)
  const faviconUrl = resolveSafeUrl(extractFavicon(head), finalUrl)

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(ogImage ? { ogImage } : {}),
    ...(faviconUrl ? { faviconUrl } : {}),
  }
}
