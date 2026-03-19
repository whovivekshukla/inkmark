import type { ClipModel, HighlightModel } from '@inkmark/shared'
import type { PaginatedResponse, SingleResponse } from '../types/api-client.types.js'

export class InkmarkApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText)
      throw new Error(`API ${res.status}: ${body}`)
    }

    return res.json() as Promise<T>
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
}
