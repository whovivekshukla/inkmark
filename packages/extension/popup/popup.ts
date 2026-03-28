import { signOut } from '../lib/auth'
import type { ClipStatusResponse } from '../types'

const stateLogin = document.getElementById('state-login')!
const stateUnclipped = document.getElementById('state-unclipped')!
const stateClipped = document.getElementById('state-clipped')!
const stateLoading = document.getElementById('state-loading')!
const btnLogin = document.getElementById('btn-login')!
const btnClip = document.getElementById('btn-clip')!
const btnLogout = document.getElementById('btn-logout')!
const btnLogout2 = document.getElementById('btn-logout-2')!
const btnUnclip = document.getElementById('btn-unclip')!
const highlightCount = document.getElementById('highlight-count')!

function showState(state: 'login' | 'unclipped' | 'clipped' | 'loading'): void {
  stateLogin.classList.add('hidden')
  stateUnclipped.classList.add('hidden')
  stateClipped.classList.add('hidden')
  stateLoading.classList.add('hidden')

  switch (state) {
    case 'login':
      stateLogin.classList.remove('hidden')
      break
    case 'unclipped':
      stateUnclipped.classList.remove('hidden')
      break
    case 'clipped':
      stateClipped.classList.remove('hidden')
      break
    case 'loading':
      stateLoading.classList.remove('hidden')
      break
  }
}

async function getCurrentTabUrl(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.url ?? null
}

async function init(): Promise<void> {
  showState('loading')

  const authResponse = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' })

  if (!authResponse?.authenticated) {
    showState('login')
    return
  }

  const url = await getCurrentTabUrl()
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    showState('unclipped')
    return
  }

  const clipStatus = (await chrome.runtime.sendMessage({ type: 'GET_CLIP_STATUS', url })) as ClipStatusResponse

  if (clipStatus.clipped) {
    showState('clipped')
    highlightCount.textContent = 'Select text on this page to highlight it'
    return
  }

  // Auto-clip the page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const response = await chrome.runtime.sendMessage({
    type: 'CLIP_PAGE',
    payload: { url: tab.url, title: tab.title },
  })

  if (response?.success) {
    showState('clipped')
    highlightCount.textContent = 'Select text on this page to highlight it'
  } else {
    // Fall back to manual clip on failure
    showState('unclipped')
  }
}

// ─── Event listeners ───────────────────────────────────────────────────────

btnLogin.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://inkmark.flaplabs.xyz/sign-in' })
  window.close()
})

async function handleLogout(): Promise<void> {
  await signOut()
  showState('login')
}

btnLogout.addEventListener('click', handleLogout)
btnLogout2.addEventListener('click', handleLogout)

btnClip.addEventListener('click', async () => {
  btnClip.setAttribute('disabled', 'true')
  btnClip.textContent = 'Clipping...'

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) return

  const response = await chrome.runtime.sendMessage({
    type: 'CLIP_PAGE',
    payload: {
      url: tab.url,
      title: tab.title,
    },
  })

  if (response?.success) {
    showState('clipped')
    highlightCount.textContent = 'Select text on this page to highlight it'
  } else {
    btnClip.removeAttribute('disabled')
    btnClip.textContent = 'Clip this page'
  }
})

btnUnclip.addEventListener('click', async () => {
  const url = await getCurrentTabUrl()
  if (!url) return

  btnUnclip.setAttribute('disabled', 'true')
  btnUnclip.textContent = 'Removing...'

  const response = await chrome.runtime.sendMessage({ type: 'DELETE_CLIP', url })

  if (response?.success) {
    showState('unclipped')
  } else {
    btnUnclip.removeAttribute('disabled')
    btnUnclip.textContent = 'Remove clip'
  }
})

init()
