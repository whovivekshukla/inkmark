// Runs only on inkmark.flaplabs.xyz — listens for auth events fired by the
// frontend and forwards them to the service worker.
window.addEventListener('inkmark:auth', (e) => {
  const token = (e as CustomEvent<{ token: string }>).detail?.token
  if (!token) return
  chrome.runtime.sendMessage({ type: 'SET_TOKEN', token })
})

window.addEventListener('inkmark:signout', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' })
})
