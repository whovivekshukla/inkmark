import type { ClipModel, ClipSource, HighlightModel } from '@inkmark/shared'
import type { PaginatedResponse, SingleResponse } from '../types/api-client.types.js'

export interface CreateClipInput {
  source: ClipSource
  url?: string
  title?: string
  description?: string
  isPublic?: boolean
  tags?: string[]
}

export interface CreateHighlightInput {
  clipId: string
  text: string
  color?: string
  contextBefore?: string
  contextAfter?: string
}

export class InkmarkApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`API ${res.status}: ${text}`)
    }

    return res.json() as Promise<T>
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async getClips(params: { page: number; limit: number }): Promise<PaginatedResponse<ClipModel>> {
    return this.get(`/api/v1/clips?page=${params.page}&limit=${params.limit}`)
  }

  async getHighlights(clipId: string): Promise<SingleResponse<HighlightModel[]>> {
    return this.get(`/api/v1/clips/${encodeURIComponent(clipId)}/highlights`)
  }

  async searchClips(params: {
    q: string
    page: number
    limit: number
  }): Promise<PaginatedResponse<ClipModel>> {
    return this.get(
      `/api/v1/search?q=${encodeURIComponent(params.q)}&type=clips&page=${params.page}&limit=${params.limit}`,
    )
  }

  async createClip(input: CreateClipInput): Promise<SingleResponse<ClipModel>> {
    return this.request('POST', '/api/v1/clips', input)
  }

  async createHighlight(input: CreateHighlightInput): Promise<SingleResponse<HighlightModel>> {
    return this.request('POST', '/api/v1/highlights', input)
  }
}
