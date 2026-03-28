import { getToken, getUserId, getCachedClipStatus, setCachedClipStatus, clearCachedClipStatus, getCachedHighlights, setCachedHighlights, clearCachedHighlights } from '../lib/storage'
import { getClipByUrl, getHighlightsForUrl, clipPage, createHighlight, deleteHighlight, deleteClip } from '../lib/api'
import { signInWithToken, signOut } from '../lib/auth'
import type { HighlightWithUserModel } from '@inkmark/shared'
import type { HighlightForRestore } from '../types'

// ─── Badge ─────────────────────────────────────────────────────────────────

function updateBadge(tabId: number, clipped: boolean): void {
  chrome.action.setBadgeText({ tabId, text: clipped ? '✓' : '' })
  chrome.action.setBadgeBackgroundColor({ tabId, color: '#16a34a' })
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
    let clipStatus = await getCachedClipStatus(tab.url)
    if (!clipStatus) {
      clipStatus = await getClipByUrl(tab.url, token)
      await setCachedClipStatus(tab.url, clipStatus)
    }

    updateBadge(tabId, clipStatus.clipped)

    if (clipStatus.clipped) {
      // Notify content script that this page is clipped (enables highlight toolbar)
      chrome.tabs.sendMessage(tabId, { type: 'PAGE_CLIPPED' })

      // Fetch highlights (cache first)
      let highlights = await getCachedHighlights<HighlightWithUserModel>(tab.url)
      if (!highlights) {
        highlights = await getHighlightsForUrl(tab.url, token)
        await setCachedHighlights(tab.url, highlights)
      }

      if (highlights.length > 0) {
        chrome.tabs.sendMessage(tabId, {
          type: 'RESTORE_HIGHLIGHTS',
          highlights: toRestorePayload(highlights, userId),
        })
      }
    }
  } catch {
    // Non-critical — don't crash the service worker
  }
})

// ─── Message handler ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_STATUS') {
    getToken().then((token) => {
      sendResponse({ authenticated: token !== null })
    })
    return true // async response
  }

  if (message.type === 'GET_PAGE_STATUS') {
    const url = message.url as string
    getToken().then(async (token) => {
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
      } catch {
        sendResponse({ clipped: false })
      }
    })
    return true
  }

  if (message.type === 'GET_CLIP_STATUS') {
    const url = message.url as string
    getToken().then(async (token) => {
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
      } catch {
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
    }
    getToken().then(async (token) => {
      if (!token) {
        sendResponse({ success: false, error: 'Not authenticated' })
        return
      }
      try {
        const clip = await clipPage(token, payload)
        await setCachedClipStatus(payload.url, { clipped: true, clipId: clip.id })
        // Update badge and notify content script on the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          updateBadge(tab.id, true)
          chrome.tabs.sendMessage(tab.id, { type: 'PAGE_CLIPPED' })
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
    const tabUrl = sender.tab?.url
    if (!tabUrl) {
      sendResponse({ success: false, error: 'No tab URL' })
      return true
    }

    getToken().then(async (token) => {
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
    const tabUrl = sender.tab?.url

    getToken().then(async (token) => {
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
    const url = message.url as string

    getToken().then(async (token) => {
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

        // Tell content script to strip all highlight marks from the page
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        if (tab?.id) {
          updateBadge(tab.id, false)
          chrome.tabs.sendMessage(tab.id, { type: 'REMOVE_ALL_HIGHLIGHTS' })
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
