import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const AUTH_KEY = 'wr_auth_simulated'
const NAME_KEY = 'wr_user_name'
const ID_KEY = 'wr_user_id'

export interface AuthContextValue {
  isAuthenticated: boolean
  user: { name: string; id: string } | null
  login: (name: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readAuthState(): { isAuthenticated: boolean; user: { name: string; id: string } | null } {
  try {
    const isAuth = localStorage.getItem(AUTH_KEY) === 'true'
    if (!isAuth) return { isAuthenticated: false, user: null }
    const name = localStorage.getItem(NAME_KEY) || 'User'
    const id = localStorage.getItem(ID_KEY) || ''
    return { isAuthenticated: true, user: { name, id } }
  } catch {
    return { isAuthenticated: false, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(readAuthState)

  const login = useCallback((name: string) => {
    try {
      localStorage.setItem(AUTH_KEY, 'true')
      localStorage.setItem(NAME_KEY, name)
      let id = localStorage.getItem(ID_KEY)
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(ID_KEY, id)
      }
      setState({ isAuthenticated: true, user: { name, id } })
    } catch {
      // localStorage unavailable — stay logged out
    }
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(NAME_KEY)
      // Preserve wr_user_id and all other wr_* keys
    } catch {
      // localStorage unavailable
    }
    setState({ isAuthenticated: false, user: null })
  }, [])

  // Cross-tab sync
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === AUTH_KEY) {
        setState(readAuthState())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
