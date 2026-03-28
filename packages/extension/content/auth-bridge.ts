// Runs only on inkmark.flaplabs.xyz — listens for the auth event fired by the
// frontend after Google OAuth and forwards the token to the service worker.
window.addEventListener('inkmark:auth', (e) => {
  const token = (e as CustomEvent<{ token: string }>).detail?.token
  if (!token) return
  chrome.runtime.sendMessage({ type: 'SET_TOKEN', token })
})
