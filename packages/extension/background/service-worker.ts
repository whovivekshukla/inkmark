import { getToken, getUserId, getCachedClipStatus, setCachedClipStatus, clearCachedClipStatus, getCachedHighlights, setCachedHighlights, clearCachedHighlights } from '../lib/storage'
import { ApiRequestError, getMe, getClipByUrl, getHighlightsForUrl, clipPage, createHighlight, deleteHighlight, deleteClip } from '../lib/api'
import { signInWithToken, signOut } from '../lib/auth'
import { canonicalizeUrl } from '../lib/url'
import type { HighlightWithUserModel } from '@inkmark/shared'
import type { HighlightForRestore } from '../types'

// ─── Badge ─────────────────────────────────────────────────────────────────

function updateBadge(tabId: number, clipped: boolean): void {
  // Fire-and-forget: badge updates are cosmetic and need not be awaited.
  void chrome.action.setBadgeText({ tabId, text: clipped ? '✓' : '' })
  void chrome.action.setBadgeBackgroundColor({ tabId, color: '#16a34a' })
}

// ─── Highlight mapping ─────────────────────────────────────────────────────

function toRestorePayload(highlights: HighlightWithUserModel[], currentUserId: string): HighlightForRestore[] {
  return highlights.map((h) => ({
    id: h.id,
    text: h.text,
    contextBefore: h.contextBefore,
    contextAfter: h.contextAfter,
    userId: h.userId,
    isOwn: h.userId === currentUserId,
    createdAt: String(h.createdAt),
    user: h.user,
  }))
}

function isAuthFailure(err: unknown): boolean {
  return err instanceof ApiRequestError && (err.status === 401 || err.status === 403)
}

// ─── Tab navigation handler ────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return

  const token = await getToken()
  if (!token) return

  const userId = await getUserId()
  if (!userId) return

  try {
    // Check clip status (cache first)
    const pageUrl = canonicalizeUrl(tab.url)
    let clipStatus = await getCachedClipStatus(pageUrl)
    if (!clipStatus) {
      clipStatus = await getClipByUrl(pageUrl, token)
      await setCachedClipStatus(pageUrl, clipStatus)
    }

    updateBadge(tabId, clipStatus.clipped)

    if (clipStatus.clipped) {
      // Notify content script that this page is clipped (enables highlight toolbar)
      void chrome.tabs.sendMessage(tabId, { type: 'PAGE_CLIPPED' })

      // Fetch highlights (cache first)
      let highlights = await getCachedHighlights<HighlightWithUserModel>(pageUrl)
      if (!highlights) {
        highlights = await getHighlightsForUrl(pageUrl, token)
        await setCachedHighlights(pageUrl, highlights)
      }

      if (highlights.length > 0) {
        void chrome.tabs.sendMessage(tabId, {
          type: 'RESTORE_HIGHLIGHTS',
          highlights: toRestorePayload(highlights, userId),
        })
      }
    }
  } catch (err) {
    if (isAuthFailure(err)) await signOut()
    // Non-critical — don't crash the service worker
  }
})

// ─── Message handler ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_STATUS') {
    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ authenticated: false })
        return
      }
      try {
        await getMe(token)
        sendResponse({ authenticated: true })
      } catch (err) {
        if (isAuthFailure(err)) await signOut()
        sendResponse({ authenticated: false })
      }
    })
    return true // async response
  }

  if (message.type === 'GET_PAGE_STATUS') {
    const url = canonicalizeUrl(message.url as string)
    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ clipped: false })
        return
      }
      try {
        const userId = await getUserId()
        let clipStatus = await getCachedClipStatus(url)
        if (!clipStatus) {
          clipStatus = await getClipByUrl(url, token)
          await setCachedClipStatus(url, clipStatus)
        }
        if (!clipStatus.clipped || !userId) {
          sendResponse({ clipped: false })
          return
        }
        let highlights = await getCachedHighlights<HighlightWithUserModel>(url)
        if (!highlights) {
          highlights = await getHighlightsForUrl(url, token)
          await setCachedHighlights(url, highlights)
        }
        sendResponse({
          clipped: true,
          highlights: toRestorePayload(highlights, userId),
        })
      } catch (err) {
        if (isAuthFailure(err)) await signOut()
        sendResponse({ clipped: false })
      }
    })
    return true
  }

  if (message.type === 'GET_CLIP_STATUS') {
    const url = canonicalizeUrl(message.url as string)
    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ clipped: false })
        return
      }
      try {
        let status = await getCachedClipStatus(url)
        if (!status) {
          status = await getClipByUrl(url, token)
          await setCachedClipStatus(url, status)
        }
        sendResponse(status)
      } catch (err) {
        if (isAuthFailure(err)) await signOut()
        sendResponse({ clipped: false })
      }
    })
    return true
  }

  if (message.type === 'CLIP_PAGE') {
    const payload = message.payload as {
      url: string
      title?: string
      description?: string
      ogImage?: string
      faviconUrl?: string
      tabId?: number
    }
    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ success: false, error: 'Not authenticated' })
        return
      }
      try {
        const pageUrl = canonicalizeUrl(payload.url)
        const { tabId, ...clipPayload } = payload
        const clip = await clipPage(token, { ...clipPayload, url: pageUrl })
        await setCachedClipStatus(pageUrl, { clipped: true, clipId: clip.id })
        if (tabId) {
          updateBadge(tabId, true)
          void chrome.tabs.sendMessage(tabId, { type: 'PAGE_CLIPPED' })
        }
        sendResponse({ success: true, clipId: clip.id })
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to clip' })
      }
    })
    return true
  }

  if (message.type === 'SAVE_HIGHLIGHT') {
    const payload = message.payload as {
      text: string
      contextBefore?: string
      contextAfter?: string
    }
    const tabUrl = sender.tab?.url ? canonicalizeUrl(sender.tab.url) : undefined
    if (!tabUrl) {
      sendResponse({ success: false, error: 'No tab URL' })
      return true
    }

    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ success: false, error: 'Not authenticated' })
        return
      }
      try {
        // Page must already be clipped — content script gates toolbar on pageIsClipped
        let clipStatus = await getCachedClipStatus(tabUrl)
        if (!clipStatus?.clipId) {
          // Cache miss or expired — re-check API
          clipStatus = await getClipByUrl(tabUrl, token)
          if (clipStatus.clipped) await setCachedClipStatus(tabUrl, clipStatus)
        }
        const clipId = clipStatus?.clipId
        if (!clipId) {
          sendResponse({ success: false, error: 'Page not clipped' })
          return
        }

        const highlight = await createHighlight(token, { clipId, ...payload })
        // Invalidate highlight cache so next page load re-fetches
        await chrome.storage.local.remove(`inkmark_hl_${tabUrl}`)
        sendResponse({ success: true, highlightId: highlight.id })
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to save highlight' })
      }
    })
    return true
  }

  if (message.type === 'DELETE_HIGHLIGHT') {
    const highlightId = message.highlightId as string
    const tabUrl = sender.tab?.url ? canonicalizeUrl(sender.tab.url) : undefined

    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ success: false, error: 'Not authenticated' })
        return
      }
      try {
        await deleteHighlight(highlightId, token)
        if (tabUrl) {
          await chrome.storage.local.remove(`inkmark_hl_${tabUrl}`)
        }
        sendResponse({ success: true })
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to delete' })
      }
    })
    return true
  }

  if (message.type === 'DELETE_CLIP') {
    const url = canonicalizeUrl(message.url as string)
    const tabId = typeof message.tabId === 'number' ? (message.tabId as number) : sender.tab?.id

    void getToken().then(async (token) => {
      if (!token) {
        sendResponse({ success: false, error: 'Not authenticated' })
        return
      }
      try {
        const clipStatus = await getClipByUrl(url, token)
        if (!clipStatus.clipped || !clipStatus.clipId) {
          sendResponse({ success: false, error: 'Clip not found' })
          return
        }
        await deleteClip(clipStatus.clipId, token)
        await clearCachedClipStatus(url)
        await clearCachedHighlights(url)

        // Tell the originating tab to strip all highlight marks from the page
        if (tabId) {
          updateBadge(tabId, false)
          void chrome.tabs.sendMessage(tabId, { type: 'REMOVE_ALL_HIGHLIGHTS' })
        }

        sendResponse({ success: true })
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to delete clip' })
      }
    })
    return true
  }

  if (message.type === 'SET_TOKEN') {
    const token = message.token as string
    signInWithToken(token)
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }))
    return true
  }

  if (message.type === 'CLEAR_TOKEN') {
    signOut()
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }))
    return true
  }

  return false
})
