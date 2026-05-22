// Messages between service worker, content script, and popup
export interface ClipPageMessage {
  type: 'CLIP_PAGE'
  payload: {
    url: string
    title?: string
    description?: string
    ogImage?: string
    faviconUrl?: string
    tabId?: number
  }
}

export interface SaveHighlightMessage {
  type: 'SAVE_HIGHLIGHT'
  payload: {
    text: string
    contextBefore?: string
    contextAfter?: string
  }
}

export interface DeleteHighlightMessage {
  type: 'DELETE_HIGHLIGHT'
  highlightId: string
}

export interface RestoreHighlightsMessage {
  type: 'RESTORE_HIGHLIGHTS'
  highlights: HighlightForRestore[]
}

export interface GetAuthStatusMessage {
  type: 'GET_AUTH_STATUS'
}

export interface AuthStatusResponse {
  authenticated: boolean
}

export interface ClipStatusMessage {
  type: 'GET_CLIP_STATUS'
  url: string
}

export interface DeleteClipMessage {
  type: 'DELETE_CLIP'
  url: string
  tabId?: number
}

export interface ClipStatusResponse {
  clipped: boolean
  clipId?: string
}

export interface HighlightForRestore {
  id: string
  text: string
  contextBefore: string | null
  contextAfter: string | null
  userId: string
  isOwn: boolean
  createdAt: string
  user: {
    username: string
    avatarUrl: string | null
  }
}

export type ExtensionMessage =
  | ClipPageMessage
  | SaveHighlightMessage
  | DeleteHighlightMessage
  | RestoreHighlightsMessage
  | GetAuthStatusMessage
  | ClipStatusMessage
  | DeleteClipMessage
