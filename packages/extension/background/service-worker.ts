import { getToken, getUserId, getCachedClipStatus, setCachedClipStatus, clearCachedClipStatus, getCachedHighlights, setCachedHighlights, clearCachedHighlights } from '../lib/storage'
import { getClipByUrl, getHighlightsForUrl, clipPage, createHighlight, deleteHighlight, deleteClip } from '../lib/api'
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
        // Update badge on the sender tab
        if (sender.tab?.id) {
          updateBadge(sender.tab.id, true)
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
        // Get or create clip for this URL
        let clipStatus = await getCachedClipStatus(tabUrl)
        if (!clipStatus || !clipStatus.clipped) {
          clipStatus = await getClipByUrl(tabUrl, token)
        }

        let clipId = clipStatus.clipId
        if (!clipId) {
          // Auto-clip the page
          const clip = await clipPage(token, { url: tabUrl, title: sender.tab?.title })
          clipId = clip.id
          await setCachedClipStatus(tabUrl, { clipped: true, clipId })
          if (sender.tab?.id) {
            updateBadge(sender.tab.id, true)
          }
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
        sendResponse({ success: true })
      } catch (err) {
        sendResponse({ success: false, error: err instanceof Error ? err.message : 'Failed to delete clip' })
      }
    })
    return true
  }

  return false
})
