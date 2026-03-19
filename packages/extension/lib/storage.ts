const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  cachedAt: number
}

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('inkmark_token')
  return result.inkmark_token ?? null
}

export async function setToken(token: string): Promise<void> {
  await chrome.storage.local.set({ inkmark_token: token })
}

export async function removeToken(): Promise<void> {
  await chrome.storage.local.remove('inkmark_token')
}

export async function getUserId(): Promise<string | null> {
  const result = await chrome.storage.local.get('inkmark_user_id')
  return result.inkmark_user_id ?? null
}

export async function setUserId(userId: string): Promise<void> {
  await chrome.storage.local.set({ inkmark_user_id: userId })
}

export async function removeUserId(): Promise<void> {
  await chrome.storage.local.remove('inkmark_user_id')
}

async function getCached<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(key)
  const entry = result[key] as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    await chrome.storage.local.remove(key)
    return null
  }
  return entry.data
}

async function setCached<T>(key: string, data: T): Promise<void> {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() }
  await chrome.storage.local.set({ [key]: entry })
}

function clipCacheKey(url: string): string {
  return `inkmark_clip_${url}`
}

function highlightCacheKey(url: string): string {
  return `inkmark_hl_${url}`
}

export async function getCachedClipStatus(url: string): Promise<{ clipped: boolean; clipId?: string } | null> {
  return getCached(clipCacheKey(url))
}

export async function setCachedClipStatus(url: string, status: { clipped: boolean; clipId?: string }): Promise<void> {
  await setCached(clipCacheKey(url), status)
}

export async function clearCachedClipStatus(url: string): Promise<void> {
  await chrome.storage.local.remove(clipCacheKey(url))
}

export async function getCachedHighlights<T>(url: string): Promise<T[] | null> {
  return getCached(highlightCacheKey(url))
}

export async function setCachedHighlights<T>(url: string, highlights: T[]): Promise<void> {
  await setCached(highlightCacheKey(url), highlights)
}

export async function clearCachedHighlights(url: string): Promise<void> {
  await chrome.storage.local.remove(highlightCacheKey(url))
}
