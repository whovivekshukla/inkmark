import type { HighlightForRestore } from '../types'

// ─── Current user cache ────────────────────────────────────────────────────

let currentUsername = 'you'
let pageIsClipped = false
/** Prevents double-restore when GET_PAGE_STATUS and RESTORE_HIGHLIGHTS both deliver the same highlights. */
let highlightsRestoredNonEmptyThisSession = false

chrome.storage.local.get('inkmark_username', (result) => {
  if (result.inkmark_username) currentUsername = result.inkmark_username
})

// ─── Constants ─────────────────────────────────────────────────────────────

const HIGHLIGHT_CLASS = 'inkmark-highlight'
const HIGHLIGHT_OWN_CLASS = 'inkmark-highlight-own'
const HIGHLIGHT_OTHER_CLASS = 'inkmark-highlight-other'
const TOOLBAR_ID = 'inkmark-toolbar'
const TOOLTIP_ID = 'inkmark-tooltip'
const TOAST_ID = 'inkmark-toast'
const AUTO_DISMISS_MS = 4000
const DEBOUNCE_MS = 300
const FADE_IN_MS = 150

// ─── Styles ────────────────────────────────────────────────────────────────

function injectStyles(): void {
  if (document.getElementById('inkmark-styles')) return
  const style = document.createElement('style')
  style.id = 'inkmark-styles'
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      border-radius: 2px;
      padding: 0 1px;
      cursor: pointer;
    }
    .${HIGHLIGHT_OWN_CLASS} {
      background-color: rgba(250, 204, 21, 0.4);
    }
    .${HIGHLIGHT_OTHER_CLASS} {
      background-color: rgba(96, 165, 250, 0.4);
    }
    .${HIGHLIGHT_OWN_CLASS}:hover {
      background-color: rgba(250, 204, 21, 0.6);
    }
    .${HIGHLIGHT_OTHER_CLASS}:hover {
      background-color: rgba(96, 165, 250, 0.6);
    }
    #${TOOLBAR_ID} {
      position: absolute;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 2px;
      background: #1a1a1a;
      border-radius: 6px;
      padding: 4px 6px;
      opacity: 0;
      transition: opacity ${FADE_IN_MS}ms ease;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #${TOOLBAR_ID}.visible {
      opacity: 1;
      pointer-events: auto;
    }
    #${TOOLBAR_ID} button {
      border: none;
      background: transparent;
      color: #fff;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      font-family: inherit;
    }
    #${TOOLBAR_ID} button:hover {
      background: rgba(255,255,255,0.15);
    }
    #${TOOLBAR_ID} .inkmark-sep {
      width: 1px;
      height: 16px;
      background: rgba(255,255,255,0.2);
    }
    #${TOOLTIP_ID} {
      position: absolute;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      gap: 8px;
      background: #1a1a1a;
      border-radius: 6px;
      padding: 6px 10px;
      opacity: 0;
      transition: opacity ${FADE_IN_MS}ms ease;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #ccc;
      font-size: 12px;
      white-space: nowrap;
    }
    #${TOOLTIP_ID}.visible {
      opacity: 1;
      pointer-events: auto;
    }
    #${TOOLTIP_ID} .inkmark-user {
      color: #fff;
      font-weight: 500;
    }
    #${TOOLTIP_ID} .inkmark-delete-btn {
      border: none;
      background: transparent;
      color: #ef4444;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1;
      font-family: inherit;
    }
    #${TOOLTIP_ID} .inkmark-delete-btn:hover {
      background: rgba(239,68,68,0.15);
    }
    #${TOAST_ID} {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2147483647;
      background: #1a1a1a;
      color: #fff;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      opacity: 0;
      transition: opacity 200ms ease;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #${TOAST_ID}.visible {
      opacity: 1;
    }
  `
  document.head.appendChild(style)
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function removeElement(id: string): void {
  document.getElementById(id)?.remove()
}

function positionAboveOrBelow(rect: DOMRect, elWidth: number, elHeight: number): { top: number; left: number } {
  const gap = 8
  let top = rect.top + window.scrollY - elHeight - gap
  // If no room above, place below
  if (rect.top - elHeight - gap < 0) {
    top = rect.bottom + window.scrollY + gap
  }
  let left = rect.left + window.scrollX + (rect.width - elWidth) / 2
  // Clamp to viewport
  left = Math.max(4, Math.min(left, document.documentElement.clientWidth - elWidth - 4))
  return { top, left }
}

function showToast(message: string): void {
  removeElement(TOAST_ID)
  const toast = document.createElement('div')
  toast.id = TOAST_ID
  toast.textContent = message
  document.body.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('visible'))
  setTimeout(() => {
    toast.classList.remove('visible')
    setTimeout(() => toast.remove(), 200)
  }, 2500)
}

// ─── Selection toolbar ─────────────────────────────────────────────────────

let selectionTimeout: ReturnType<typeof setTimeout> | null = null
let toolbarDismissTimeout: ReturnType<typeof setTimeout> | null = null

function dismissToolbar(): void {
  const el = document.getElementById(TOOLBAR_ID)
  if (el) {
    el.classList.remove('visible')
    setTimeout(() => el.remove(), FADE_IN_MS)
  }
  if (toolbarDismissTimeout) {
    clearTimeout(toolbarDismissTimeout)
    toolbarDismissTimeout = null
  }
}

function showToolbar(range: Range): void {
  dismissToolbar()
  removeElement(TOOLTIP_ID)

  const rect = range.getBoundingClientRect()
  const toolbar = document.createElement('div')
  toolbar.id = TOOLBAR_ID

  const highlightBtn = document.createElement('button')
  highlightBtn.textContent = 'Highlight'

  const sep = document.createElement('div')
  sep.className = 'inkmark-sep'

  const dismissBtn = document.createElement('button')
  dismissBtn.textContent = '✕'

  toolbar.appendChild(highlightBtn)
  toolbar.appendChild(sep)
  toolbar.appendChild(dismissBtn)
  document.body.appendChild(toolbar)

  const { top, left } = positionAboveOrBelow(rect, 120, 32)
  toolbar.style.top = `${top}px`
  toolbar.style.left = `${left}px`

  requestAnimationFrame(() => toolbar.classList.add('visible'))

  toolbarDismissTimeout = setTimeout(dismissToolbar, AUTO_DISMISS_MS)

  dismissBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    dismissToolbar()
    window.getSelection()?.removeAllRanges()
  })

  highlightBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    dismissToolbar()

    const selection = window.getSelection()
    const text = selection?.toString().trim() ?? ''
    if (text.length < 3) return

    // Optimistic UI — mark immediately
    let mark: HTMLElement | null = null
    try {
      mark = document.createElement('mark')
      mark.className = `${HIGHLIGHT_CLASS} ${HIGHLIGHT_OWN_CLASS}`
      mark.dataset.username = currentUsername
      mark.dataset.createdAt = new Date().toISOString()
      range.surroundContents(mark)
    } catch {
      selection?.removeAllRanges()
      showToast("Couldn't highlight this selection")
      return
    }

    selection?.removeAllRanges()

    const contextBefore = getContext(range, 50, 'before')
    const contextAfter = getContext(range, 50, 'after')

    chrome.runtime.sendMessage(
      {
        type: 'SAVE_HIGHLIGHT',
        payload: {
          text,
          ...(contextBefore ? { contextBefore } : {}),
          ...(contextAfter ? { contextAfter } : {}),
        },
      },
      (response) => {
        if (response?.success && mark) {
          mark.dataset.highlightId = response.highlightId
        } else if (!response?.success && mark) {
          // Fade out the optimistic marker
          mark.style.transition = 'opacity 300ms'
          mark.style.opacity = '0'
          setTimeout(() => {
            if (mark?.parentNode) {
              const parent = mark.parentNode
              while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
              parent.removeChild(mark)
            }
          }, 300)
          showToast("Couldn't save highlight")
        }
      },
    )
  })
}

document.addEventListener('mouseup', (e) => {
  // Don't trigger on clicks inside our own UI
  const target = e.target as HTMLElement
  if (target.closest(`#${TOOLBAR_ID}`) || target.closest(`#${TOOLTIP_ID}`)) return

  if (selectionTimeout) clearTimeout(selectionTimeout)

  selectionTimeout = setTimeout(() => {
    try {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (text.length < 3) return
      if (!pageIsClipped) return

      const range = selection.getRangeAt(0).cloneRange()
      showToolbar(range)
    } catch {
      // Noop
      // Noop
    }
  }, DEBOUNCE_MS)
})

// Dismiss toolbar on click elsewhere (but not on the initial mousedown of a new selection)
document.addEventListener('mousedown', (e) => {
  const target = e.target as HTMLElement
  if (target.closest(`#${TOOLBAR_ID}`)) return
  // Only dismiss if toolbar is currently visible — don't interfere with new selections
  const toolbar = document.getElementById(TOOLBAR_ID)
  if (toolbar?.classList.contains('visible')) {
    dismissToolbar()
  }
})

// ─── Highlight tooltip (click existing highlight) ──────────────────────────

function dismissTooltip(): void {
  const el = document.getElementById(TOOLTIP_ID)
  if (el) {
    el.classList.remove('visible')
    setTimeout(() => el.remove(), FADE_IN_MS)
  }
}

let tooltipTarget: HTMLElement | null = null

document.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement
  const mark = target.closest(`.${HIGHLIGHT_CLASS}`) as HTMLElement | null

  if (!mark || mark === tooltipTarget) return
  if (target.closest(`#${TOOLTIP_ID}`)) return

  dismissTooltip()
  tooltipTarget = mark

  const highlightId = mark.dataset.highlightId
  const username = mark.dataset.username ?? 'unknown'
  const createdAt = mark.dataset.createdAt ?? ''
  const isOwn = mark.classList.contains(HIGHLIGHT_OWN_CLASS)

  const tooltip = document.createElement('div')
  tooltip.id = TOOLTIP_ID

  const info = document.createElement('span')
  const userSpan = document.createElement('span')
  userSpan.className = 'inkmark-user'
  userSpan.textContent = isOwn ? 'You' : username
  info.appendChild(userSpan)
  info.appendChild(document.createTextNode(` · ${timeAgo(createdAt)}`))
  tooltip.appendChild(info)

  if (isOwn && highlightId) {
    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'inkmark-delete-btn'
    deleteBtn.textContent = '🗑'
    deleteBtn.title = 'Delete highlight'

    deleteBtn.addEventListener('click', (ev) => {
      ev.stopPropagation()
      dismissTooltip()

      // Optimistic removal
      mark.style.transition = 'background-color 200ms'
      mark.style.backgroundColor = 'transparent'
      setTimeout(() => {
        if (mark.parentNode) {
          const parent = mark.parentNode
          while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
          parent.removeChild(mark)
        }
      }, 200)

      chrome.runtime.sendMessage(
        { type: 'DELETE_HIGHLIGHT', highlightId },
        (response) => {
          if (!response?.success) {
            showToast("Couldn't delete highlight")
          }
        },
      )
    })

    tooltip.appendChild(deleteBtn)
  }

  document.body.appendChild(tooltip)

  const rect = mark.getBoundingClientRect()
  const { top, left } = positionAboveOrBelow(rect, 160, 32)
  tooltip.style.top = `${top}px`
  tooltip.style.left = `${left}px`

  requestAnimationFrame(() => tooltip.classList.add('visible'))
})

// Dismiss tooltip when mouse leaves both the highlight and the tooltip
document.addEventListener('mouseout', (e) => {
  const related = (e as MouseEvent).relatedTarget as HTMLElement | null
  if (related?.closest(`.${HIGHLIGHT_CLASS}`) || related?.closest(`#${TOOLTIP_ID}`)) return
  // Small delay so user can move from highlight to tooltip
  setTimeout(() => {
    const hovered = document.querySelectorAll(':hover')
    let insideHighlight = false
    hovered.forEach((el) => {
      if (el.closest(`.${HIGHLIGHT_CLASS}`) || el.closest(`#${TOOLTIP_ID}`)) insideHighlight = true
    })
    if (!insideHighlight) {
      dismissTooltip()
      tooltipTarget = null
    }
  }, 100)
})

// Dismiss tooltip on scroll
document.addEventListener('scroll', () => { dismissTooltip(); tooltipTarget = null }, { passive: true })

// ─── Text matching + restore ───────────────────────────────────────────────

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

interface TextMatch {
  node: Text
  start: number
  end: number
}

/** Occurrences of `search` in text nodes outside existing Inkmark marks (document order). */
function collectDocumentTextMatches(search: string): TextMatch[] {
  const out: TextMatch[] = []
  if (!search) return out

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if ((node as Text).parentElement?.closest(`.${HIGHLIGHT_CLASS}`)) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  let n: Node | null
  while ((n = walker.nextNode())) {
    const textNode = n as Text
    const content = textNode.textContent ?? ''
    let pos = 0
    while (pos <= content.length - search.length) {
      const idx = content.indexOf(search, pos)
      if (idx === -1) break
      out.push({ node: textNode, start: idx, end: idx + search.length })
      pos = idx + search.length
    }
  }
  return out
}

const CONTEXT_WINDOW = 120

function scoreContextMatch(h: HighlightForRestore, beforeWindow: string, afterWindow: string): number {
  const wantB = normalizeWs(h.contextBefore ?? '')
  const wantA = normalizeWs(h.contextAfter ?? '')
  if (!wantB && !wantA) return 0

  const gotB = normalizeWs(beforeWindow)
  const gotA = normalizeWs(afterWindow)
  let score = 0
  if (wantB) {
    if (gotB.endsWith(wantB)) score += wantB.length + 2
    else if (gotB.includes(wantB)) score += wantB.length
  }
  if (wantA) {
    if (gotA.startsWith(wantA)) score += wantA.length + 2
    else if (gotA.includes(wantA)) score += wantA.length
  }
  return score
}

function markTextOnPage(highlight: HighlightForRestore): void {
  const search = highlight.text
  const candidates = collectDocumentTextMatches(search)
  if (candidates.length === 0) return

  let bestI = 0
  let bestScore = -1
  for (let i = 0; i < candidates.length; i++) {
    const { node, start, end } = candidates[i]
    const full = node.textContent ?? ''
    const beforeWindow = full.slice(Math.max(0, start - CONTEXT_WINDOW), start)
    const afterWindow = full.slice(end, Math.min(full.length, end + CONTEXT_WINDOW))
    const s = scoreContextMatch(highlight, beforeWindow, afterWindow)
    if (s > bestScore) {
      bestScore = s
      bestI = i
    }
  }

  const { node, start, end } = candidates[bestI]

  try {
    const range = document.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)

    const mark = document.createElement('mark')
    mark.className = `${HIGHLIGHT_CLASS} ${highlight.isOwn ? HIGHLIGHT_OWN_CLASS : HIGHLIGHT_OTHER_CLASS}`
    mark.dataset.highlightId = highlight.id
    mark.dataset.username = highlight.user.username
    mark.dataset.createdAt = highlight.createdAt

    range.surroundContents(mark)
  } catch {
    // Range manipulation can fail on complex DOM — skip silently
  }
}

function restoreHighlights(highlights: HighlightForRestore[]): void {
  if (highlights.length === 0) return
  if (highlightsRestoredNonEmptyThisSession) return
  highlightsRestoredNonEmptyThisSession = true
  for (const h of highlights) {
    markTextOnPage(h)
  }
}

// ─── Context helpers ───────────────────────────────────────────────────────

function getContext(range: Range, chars: number, direction: 'before' | 'after'): string {
  try {
    const contextRange = range.cloneRange()
    const container = range.commonAncestorContainer
    const textContent = container.textContent ?? ''
    const parentNode = container.nodeType === Node.TEXT_NODE ? container : container.firstChild

    if (!parentNode || !parentNode.textContent) return ''

    if (direction === 'before') {
      const startOffset = Math.max(0, range.startOffset - chars)
      contextRange.setStart(parentNode, startOffset)
      contextRange.setEnd(parentNode, range.startOffset)
    } else {
      const endOffset = Math.min(textContent.length, range.endOffset + chars)
      contextRange.setStart(parentNode, range.endOffset)
      contextRange.setEnd(parentNode, endOffset)
    }

    return contextRange.toString()
  } catch {
    return ''
  }
}

// ─── Listen for restore messages from service worker ───────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RESTORE_HIGHLIGHTS') {
    pageIsClipped = true
    restoreHighlights(message.highlights as HighlightForRestore[])
  }

  if (message.type === 'PAGE_CLIPPED') {
    pageIsClipped = true
  }

  if (message.type === 'REMOVE_ALL_HIGHLIGHTS') {
    pageIsClipped = false
    highlightsRestoredNonEmptyThisSession = false
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((mark) => {
      const parent = mark.parentNode
      if (!parent) return
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
    })
    dismissTooltip()
  }
})

// Inject styles immediately so toolbar/tooltip/highlights work on any page
injectStyles()

// Request clip status + highlights from service worker on init
// (content script may load after onUpdated fires, so we pull instead of relying on push)
chrome.runtime.sendMessage({ type: 'GET_PAGE_STATUS', url: window.location.href }, (response) => {
  if (response?.clipped) {
    pageIsClipped = true
    if (response.highlights?.length > 0) {
      restoreHighlights(response.highlights as HighlightForRestore[])
    }
  }
})
