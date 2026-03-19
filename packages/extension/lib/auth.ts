import { getMe } from './api'
import { setToken, removeToken, getToken, setUserId, removeUserId, clearAllInkmarkUrlCaches } from './storage'

export async function signInWithToken(jwt: string): Promise<void> {
  // Validate token by calling the API — also fetches username
  await setToken(jwt)
  try {
    const user = await getMe(jwt)
    await clearAllInkmarkUrlCaches()
    await setUserId(user.id)
    await chrome.storage.local.set({ inkmark_username: user.username })
  } catch {
    await removeToken()
    throw new Error('Invalid token')
  }
}

export async function signOut(): Promise<void> {
  await removeToken()
  await removeUserId()
  await chrome.storage.local.remove('inkmark_username')
  await clearAllInkmarkUrlCaches()
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken()
  return token !== null
}
