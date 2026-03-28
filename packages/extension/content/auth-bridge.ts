// Runs only on inkmark.flaplabs.xyz — listens for auth events fired by the
// frontend and forwards them to the service worker.
function sendToken(token: string) {
  chrome.runtime.sendMessage({ type: 'SET_TOKEN', token })
}

// Listen for auth event dispatched by frontend after OAuth
window.addEventListener('inkmark:auth', (e) => {
  const token = (e as CustomEvent<{ token: string }>).detail?.token
  if (token) sendToken(token)
})

// Listen for signout event
window.addEventListener('inkmark:signout', () => {
  chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' })
})

// Fallback: check localStorage on page load (handles existing sessions)
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('inkmark_token')
  if (token) sendToken(token)
})
