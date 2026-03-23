import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'inkmark-theme'

function readDocumentTheme(): Theme | null {
  if (typeof document === 'undefined') return null
  const a = document.documentElement.getAttribute('data-theme')
  if (a === 'light' || a === 'dark') return a
  return null
}

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return null
}

function systemPrefersLight(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

function initialTheme(): Theme {
  const fromDom = readDocumentTheme()
  if (fromDom) return fromDom
  const stored = readStored()
  if (stored) return stored
  return systemPrefersLight() ? 'light' : 'dark'
}

interface ThemeContextValue {
  theme: Theme
  /** Set light or dark explicitly (persists to `localStorage`). */
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setThemeExplicit = useCallback((t: Theme) => {
    setTheme(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme: setThemeExplicit, toggleTheme }),
    [theme, setThemeExplicit, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
