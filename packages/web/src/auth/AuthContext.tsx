import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserModel } from '@inkmark/shared'
import {
  clearStoredToken,
  fetchMe,
  getStoredToken,
  setStoredToken,
} from '../api/client'

interface AuthState {
  user: UserModel | null
  token: string | null
  ready: boolean
}

interface AuthContextValue extends AuthState {
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [user, setUser] = useState<UserModel | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function init(): Promise<void> {
      const params = new URLSearchParams(window.location.search)
      const urlToken = params.get('token')
      const fromOAuth = Boolean(urlToken)

      if (urlToken) {
        setStoredToken(urlToken)
        window.history.replaceState({}, '', `${window.location.pathname}`)
      }

      const stored = getStoredToken()
      if (!stored) {
        if (!cancelled) {
          setToken(null)
          setUser(null)
          setReady(true)
        }
        return
      }

      try {
        const me = await fetchMe(stored)
        if (!cancelled) {
          setToken(stored)
          setUser(me)
          if (fromOAuth) {
            navigate(`/${encodeURIComponent(me.username)}`, { replace: true })
          }
        }
      } catch {
        clearStoredToken()
        if (!cancelled) {
          setToken(null)
          setUser(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const signOut = useCallback(() => {
    clearStoredToken()
    setToken(null)
    setUser(null)
    navigate('/', { replace: true })
  }, [navigate])

  const value = useMemo(
    () => ({ user, token, ready, signOut }),
    [user, token, ready, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
