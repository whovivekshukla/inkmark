/**
 * HTTP helpers — paths match `inkmark.postman_collection.json` (`{{baseUrl}}/…`).
 * Configure `VITE_API_URL` like Postman’s `baseUrl` (default includes `/api/v1`).
 */
import type {
  ClipModel,
  ClipTagModel,
  FeedClipModel,
  FeedHighlightModel,
  HighlightModel,
  HighlightWithUserModel,
  PaginationMeta,
  PersonalAccessTokenCreatedModel,
  PersonalAccessTokenModel,
  TagWithCountModel,
  UserModel,
  UserProfileModel,
  UserSummaryModel,
} from "@inkmark/shared";

const TOKEN_KEY = "inkmark_token";

const DEFAULT_BASE = "http://localhost:3000/api/v1";

export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL ?? DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface ErrorBody {
  success: false;
  error: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as { success: true; data: T } | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return json.data;
}

export async function fetchMe(token: string): Promise<UserModel> {
  const res = await fetch(`${getApiBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<UserModel>(res);
}

export async function exchangeOAuthCode(code: string): Promise<string> {
  const res = await fetch(`${getApiBase()}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await parseResponse<{ token: string }>(res);
  return data.token;
}

/** Browser session uses Google JWT; PATs start with `ink_` and cannot call token-management routes. */
export function isSessionJwt(token: string | null): boolean {
  return Boolean(token && !token.startsWith("ink_"));
}

export interface UpdateProfileBody {
  username?: string;
  displayName?: string;
  bio?: string;
}

export async function updateProfile(
  token: string,
  body: UpdateProfileBody,
): Promise<UserModel> {
  const res = await fetch(`${getApiBase()}/auth/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return parseResponse<UserModel>(res);
}

export async function listPersonalAccessTokens(
  token: string,
): Promise<PersonalAccessTokenModel[]> {
  const res = await fetch(`${getApiBase()}/auth/tokens`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<PersonalAccessTokenModel[]>(res);
}

export async function createPersonalAccessToken(
  token: string,
  body: { name: string; expiresAt?: string },
): Promise<PersonalAccessTokenCreatedModel> {
  const res = await fetch(`${getApiBase()}/auth/tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as
    | { success: true; data: PersonalAccessTokenCreatedModel }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return json.data;
}

export async function revokePersonalAccessToken(
  token: string,
  id: string,
): Promise<void> {
  const res = await fetch(
    `${getApiBase()}/auth/tokens/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (res.status === 204) return;
  let message = `HTTP ${res.status}`;
  try {
    const json = (await res.json()) as ErrorBody;
    if (!json.success) message = json.error.message;
  } catch {
    /* ignore */
  }
  throw new ApiError(message, "UNKNOWN");
}

export async function fetchPublicProfile(
  token: string,
  username: string,
): Promise<UserProfileModel> {
  const res = await fetch(
    `${getApiBase()}/users/${encodeURIComponent(username)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseResponse<UserProfileModel>(res);
}

/** Postman: `GET {{baseUrl}}/clips?page=&limit=` — authenticated user's clips (all visibility). */
export async function fetchMyClips(
  token: string,
  page = 1,
  limit = 50,
): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
  const path = `/clips?page=${page}&limit=${limit}`;
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as
    | { success: true; data: ClipModel[]; meta: PaginationMeta }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return { clips: json.data, meta: json.meta };
}

/** Postman: `GET {{baseUrl}}/users/{{username}}/clips?page=&limit=` */
export async function fetchPublicClips(
  token: string,
  username: string,
  page = 1,
  limit = 50,
): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
  const path = `/users/${encodeURIComponent(username)}/clips?page=${page}&limit=${limit}`;
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as
    | { success: true; data: ClipModel[]; meta: PaginationMeta }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return { clips: json.data, meta: json.meta };
}

/** `GET /clips/:id/highlights` — includes `user` for each row (username, avatarUrl). */
export async function fetchHighlightsForClip(
  token: string,
  clipId: string,
): Promise<HighlightWithUserModel[]> {
  const res = await fetch(
    `${getApiBase()}/clips/${encodeURIComponent(clipId)}/highlights`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseResponse<HighlightWithUserModel[]>(res);
}

export async function fetchClipById(
  token: string,
  clipId: string,
): Promise<ClipModel> {
  const res = await fetch(
    `${getApiBase()}/clips/${encodeURIComponent(clipId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return parseResponse<ClipModel>(res);
}

export async function addTagToClip(
  token: string,
  clipId: string,
  name: string,
): Promise<ClipTagModel> {
  const res = await fetch(
    `${getApiBase()}/clips/${encodeURIComponent(clipId)}/tags`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );
  return parseResponse<ClipTagModel>(res);
}

export async function removeTagFromClip(
  token: string,
  clipId: string,
  tagId: string,
): Promise<void> {
  const res = await fetch(
    `${getApiBase()}/clips/${encodeURIComponent(clipId)}/tags/${encodeURIComponent(tagId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (res.status === 204) return;
  let message = `HTTP ${res.status}`;
  try {
    const json = (await res.json()) as ErrorBody;
    if (!json.success) message = json.error.message;
  } catch {
    /* ignore */
  }
  throw new ApiError(message, "UNKNOWN");
}

export async function deleteHighlight(
  token: string,
  highlightId: string,
): Promise<void> {
  const res = await fetch(
    `${getApiBase()}/highlights/${encodeURIComponent(highlightId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (res.status === 204) return;
  let message = `HTTP ${res.status}`;
  try {
    const json = (await res.json()) as ErrorBody;
    if (!json.success) message = json.error.message;
  } catch {
    /* ignore */
  }
  throw new ApiError(message, "UNKNOWN");
}

export async function fetchClipFeed(
  token: string,
  page = 1,
  limit = 20,
): Promise<{ clips: FeedClipModel[]; meta: PaginationMeta }> {
  const path = `/feed?page=${page}&limit=${limit}`;
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as
    | { success: true; data: FeedClipModel[]; meta: PaginationMeta }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return { clips: json.data, meta: json.meta };
}

export async function fetchFeedHighlights(
  token: string,
  page = 1,
  limit = 20,
): Promise<{ highlights: FeedHighlightModel[]; meta: PaginationMeta }> {
  const path = `/feed/highlights?page=${page}&limit=${limit}`;
  const res = await fetch(`${getApiBase()}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as
    | { success: true; data: FeedHighlightModel[]; meta: PaginationMeta }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return { highlights: json.data, meta: json.meta };
}

export async function fetchFollowCounts(
  token: string,
  userId: string,
): Promise<{ followerCount: number; followingCount: number }> {
  const headers = { Authorization: `Bearer ${token}` };
  const base = `${getApiBase()}/follows/${encodeURIComponent(userId)}`;
  const [resF, resG] = await Promise.all([
    fetch(`${base}/followers?page=1&limit=1`, { headers }),
    fetch(`${base}/following?page=1&limit=1`, { headers }),
  ]);
  const jsonF = (await resF.json()) as
    | { success: true; data: UserSummaryModel[]; meta: PaginationMeta }
    | ErrorBody;
  const jsonG = (await resG.json()) as
    | { success: true; data: UserSummaryModel[]; meta: PaginationMeta }
    | ErrorBody;
  if (!resF.ok || !jsonF.success) {
    const err = !jsonF.success
      ? jsonF.error
      : { code: "UNKNOWN", message: `HTTP ${resF.status}` };
    throw new ApiError(err.message, err.code);
  }
  if (!resG.ok || !jsonG.success) {
    const err = !jsonG.success
      ? jsonG.error
      : { code: "UNKNOWN", message: `HTTP ${resG.status}` };
    throw new ApiError(err.message, err.code);
  }
  return { followerCount: jsonF.meta.total, followingCount: jsonG.meta.total };
}

export type SearchResult =
  | { kind: "all"; clips: ClipModel[]; highlights: HighlightModel[] }
  | { kind: "clips"; clips: ClipModel[]; meta: PaginationMeta }
  | { kind: "highlights"; highlights: HighlightModel[]; meta: PaginationMeta };

export async function searchInkmark(
  token: string,
  q: string,
  type: "all" | "clips" | "highlights" = "all",
  page = 1,
  limit = 20,
): Promise<SearchResult> {
  const params = new URLSearchParams({
    q,
    type,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`${getApiBase()}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as
    | {
        success: true;
        data:
          | ClipModel[]
          | HighlightModel[]
          | { clips: ClipModel[]; highlights: HighlightModel[] };
        meta?: PaginationMeta;
      }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  if (
    type === "all" &&
    json.data &&
    !Array.isArray(json.data) &&
    "clips" in json.data
  ) {
    return {
      kind: "all",
      clips: json.data.clips,
      highlights: json.data.highlights,
    };
  }
  if (type === "clips" && Array.isArray(json.data) && json.meta) {
    return { kind: "clips", clips: json.data as ClipModel[], meta: json.meta };
  }
  if (type === "highlights" && Array.isArray(json.data) && json.meta) {
    return {
      kind: "highlights",
      highlights: json.data as HighlightModel[],
      meta: json.meta,
    };
  }
  throw new ApiError("Unexpected search response", "UNKNOWN");
}

export async function fetchTags(
  token: string,
  params: { limit?: number; sort?: "name" | "clips" | "highlights" } = {},
): Promise<TagWithCountModel[]> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.sort) qs.set("sort", params.sort);
  const query = qs.toString();
  const res = await fetch(`${getApiBase()}/tags${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseResponse<TagWithCountModel[]>(res);
}

export interface FetchClipsParams {
  page?: number;
  limit?: number;
  tag?: string;
  q?: string;
  highlighted?: boolean;
  sort?: "recent" | "oldest" | "most_highlights";
}

export async function fetchMyClipsFiltered(
  token: string,
  params: FetchClipsParams = {},
): Promise<{ clips: ClipModel[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  if (params.tag) qs.set("tag", params.tag);
  if (params.q) qs.set("q", params.q);
  if (params.highlighted) qs.set("highlighted", "true");
  if (params.sort) qs.set("sort", params.sort);

  const res = await fetch(`${getApiBase()}/clips?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = (await res.json()) as
    | { success: true; data: ClipModel[]; meta: PaginationMeta }
    | ErrorBody;
  if (!res.ok || !json.success) {
    const err = !json.success
      ? json.error
      : { code: "UNKNOWN", message: `HTTP ${res.status}` };
    throw new ApiError(err.message, err.code);
  }
  return { clips: json.data, meta: json.meta };
}

/** Postman: "Initiate Google OAuth" — browser navigates to this URL */
export function googleAuthUrl(): string {
  return `${getApiBase()}/auth/google`;
}
