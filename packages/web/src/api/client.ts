/**
 * HTTP helpers — paths match `inkmark.postman_collection.json` (`{{baseUrl}}/…`).
 * Configure `VITE_API_URL` like Postman’s `baseUrl` (default includes `/api/v1`).
 */
import type {
  ClipModel,
  HighlightModel,
  PaginationMeta,
  UserModel,
  UserProfileModel,
} from '@inkmark/shared'

const TOKEN_KEY = 'inkmark_token'

const DEFAULT_BASE = 'http://localhost:3000/api/v1'

export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL ?? DEFAULT_BASE
  return raw.replace(/\/$/, '')
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface ErrorBody {
  success: false
  error: { code: string; message: string }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as { success: true; data: T } | ErrorBody
  if (!res.ok || !json.success) {
    const err = !json.success ? json.error : { code: 'UNKNOWN', message: `HTTP ${res.status}` }
    throw new ApiError(err.message, err.code)
  }
  return json.data
}

export async function fetchMe(token: string): Promise<UserModel> {
  const res = await fetch(`${getApiBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseResponse<UserModel>(res)
}

export async function fetchPublicProfile(token: string, username: string): Promise<UserProfileModel> {
  const res = await fetch(`${getApiBase()}/users/${encodeURIComponent(username)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseResponse<UserProfileModel>(res)
}

/** Postman: `GET {{baseUrl}}/clips?page=&limit=` — authenticated user's clips (all visibility). */
export async function fetchMyClips(
  token: string,
  page = 1,
  limit = 50,
): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
  const path = `/clips?page=${page}&limit=${limit}`
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = (await res.json()) as
    | { success: true; data: ClipModel[]; meta: PaginationMeta }
    | ErrorBody
  if (!res.ok || !json.success) {
    const err = !json.success ? json.error : { code: 'UNKNOWN', message: `HTTP ${res.status}` }
    throw new ApiError(err.message, err.code)
  }
  return { clips: json.data, meta: json.meta }
}

/** Postman: `GET {{baseUrl}}/users/{{username}}/clips?page=&limit=` */
export async function fetchPublicClips(
  token: string,
  username: string,
  page = 1,
  limit = 50,
): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
  const path = `/users/${encodeURIComponent(username)}/clips?page=${page}&limit=${limit}`
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = (await res.json()) as
    | { success: true; data: ClipModel[]; meta: PaginationMeta }
    | ErrorBody
  if (!res.ok || !json.success) {
    const err = !json.success ? json.error : { code: 'UNKNOWN', message: `HTTP ${res.status}` }
    throw new ApiError(err.message, err.code)
  }
  return { clips: json.data, meta: json.meta }
}

/** Postman: `GET {{baseUrl}}/clips/{{clipId}}/highlights` */
export async function fetchHighlightsForClip(token: string, clipId: string): Promise<HighlightModel[]> {
  const res = await fetch(`${getApiBase()}/clips/${encodeURIComponent(clipId)}/highlights`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseResponse<HighlightModel[]>(res)
}

/** Postman: "Initiate Google OAuth" — browser navigates to this URL */
export function googleAuthUrl(): string {
  return `${getApiBase()}/auth/google`
}
