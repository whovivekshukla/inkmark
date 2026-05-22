import type { ClipModel, HighlightWithUserModel } from '@inkmark/shared'

const API_BASE = 'https://inkmark.flaplabs.xyz'

interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: { page: number; limit: number; total: number; hasMore: boolean }
}

interface ApiErrorResponse {
  success: false
  error: { code: string; message: string }
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  const json = (await res.json()) as ApiResponse<T>

  if (!res.ok || !json.success) {
    const errorMsg = !json.success ? json.error.message : `API error ${res.status}`
    throw new ApiRequestError(errorMsg, res.status)
  }

  return json.data
}

export async function getMe(token: string): Promise<{ id: string; username: string }> {
  return request<{ id: string; username: string }>('/api/v1/auth/me', token)
}

export async function getClipByUrl(url: string, token: string): Promise<{ clipped: boolean; clipId?: string }> {
  const params = new URLSearchParams({ url, page: '1', limit: '1' })
  const res = await fetch(`${API_BASE}/api/v1/clips?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const json = (await res.json()) as ApiResponse<ClipModel[]>

  if (!res.ok || !json.success) {
    const errorMsg = !json.success ? json.error.message : `API error ${res.status}`
    throw new ApiRequestError(errorMsg, res.status)
  }

  if (json.data.length > 0) {
    return { clipped: true, clipId: json.data[0].id }
  }

  return { clipped: false }
}

export async function clipPage(
  token: string,
  data: { url: string; title?: string; description?: string; ogImage?: string; faviconUrl?: string },
): Promise<ClipModel> {
  return request<ClipModel>('/api/v1/clips', token, {
    method: 'POST',
    body: JSON.stringify({ ...data, isPublic: true }),
  })
}

export async function getHighlightsForUrl(url: string, token: string): Promise<HighlightWithUserModel[]> {
  const params = new URLSearchParams({ url })
  return request<HighlightWithUserModel[]>(`/api/v1/highlights/by-url?${params}`, token)
}

export async function createHighlight(
  token: string,
  data: { clipId: string; text: string; contextBefore?: string; contextAfter?: string },
): Promise<{ id: string }> {
  return request<{ id: string }>('/api/v1/highlights', token, {
    method: 'POST',
    body: JSON.stringify({ ...data, color: 'yellow' }),
  })
}

export async function deleteHighlight(highlightId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/highlights/${encodeURIComponent(highlightId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Failed to delete highlight: ${res.status}`)
  }
}

export async function deleteClip(clipId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/clips/${encodeURIComponent(clipId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`Failed to delete clip: ${res.status}`)
  }
}
