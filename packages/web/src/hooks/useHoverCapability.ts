import { useEffect, useState } from 'react'

function initialHover(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(hover: hover)').matches
}

/** False on most phones / touch-primary devices where hover tooltips are unreliable. */
export function useHoverCapability(): boolean {
  const [canHover, setCanHover] = useState(initialHover)

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)')
    const sync = (): void => setCanHover(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return canHover
}
