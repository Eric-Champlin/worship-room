/**
 * AuthContext — real JWT-backed authentication with legacy-mock fallback.
 *
 * Public shape (extended additively from the pre-1.9 version):
 *   - isAuthenticated, user (extended fields; .name alias retained)
 *   - isAuthResolving (NEW) — true during boot /users/me hydration
 *   - login(credentials) (SIGNATURE CHANGE — was login(name))
 *   - register(request) (NEW) — register + auto-login
 *   - logout() (now async)
 *   - simulateLegacyAuth(name) (NEW) — transitional mock helper for
 *       WelcomeWizard onboarding + DevAuthToggle
 *
 * Introduced by Spec 1.9 (Frontend AuthContext JWT Migration, Phase 1).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  AuthError,
  ApiError,
  type AuthUser,
  type LoginCredentials,
  type RegisterRequest,
} from '@/types/auth'
import {
  getStoredToken,
  clearStoredLegacyAuth,
  LEGACY_KEYS,
} from '@/lib/auth-storage'
import { AUTH_INVALIDATED_EVENT } from '@/lib/api-client'
import {
  loginUser,
  logoutUser,
  registerUser,
  getCurrentUser,
} from '@/services/auth-service'

export interface AuthContextValue {
  isAuthenticated: boolean
  isAuthResolving: boolean
  user: AuthUser | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  simulateLegacyAuth: (name: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface InternalState {
  isAuthenticated: boolean
  isAuthResolving: boolean
  user: AuthUser | null
}

/**
 * Legacy fallback state read on mount. Order-of-precedence:
 *   1. wr_jwt_token present → real mode (isAuthResolving=true until /users/me settles)
 *   2. wr_auth_simulated === 'true' → mock mode (reads wr_user_name + wr_user_id)
 *   3. unauthenticated
 *
 * Mock mode keeps ~32 legacy-seed test files green. It is not exposed to
 * consumers as a separate boolean — callers see isAuthenticated=true with
 * a synthetic AuthUser derived from wr_user_name / wr_user_id.
 */
function readInitialState(): InternalState {
  try {
    const token = getStoredToken()
    if (token) {
      return { isAuthenticated: false, isAuthResolving: true, user: null }
    }
    const isMockAuth = localStorage.getItem(LEGACY_KEYS.simulated) === 'true'
    if (isMockAuth) {
      const name = localStorage.getItem(LEGACY_KEYS.userName) || 'User'
      const id = localStorage.getItem(LEGACY_KEYS.userId) || ''
      return {
        isAuthenticated: true,
        isAuthResolving: false,
        user: buildLegacyUser(id, name),
      }
    }
    return { isAuthenticated: false, isAuthResolving: false, user: null }
  } catch {
    return { isAuthenticated: false, isAuthResolving: false, user: null }
  }
}

function buildLegacyUser(id: string, name: string): AuthUser {
  return {
    id,
    name,
    displayName: name,
    email: '',
    firstName: name,
    lastName: '',
    isAdmin: false,
    timezone: null,
    isEmailVerified: false,
  }
}

function mapToAuthError(err: unknown): AuthError {
  if (err instanceof AuthError) return err
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'INVALID_CREDENTIALS':
      case 'VALIDATION_FAILED':
      case 'RATE_LIMITED':
      case 'ACCOUNT_LOCKED':
      case 'NETWORK_ERROR':
        return new AuthError(err.code, err.message, err.fieldErrors)
      default:
        return new AuthError('UNKNOWN', err.message, err.fieldErrors)
    }
  }
  return new AuthError('UNKNOWN', 'Something went wrong.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState>(readInitialState)
  const bootHydrationRanRef = useRef(false)

  // Transitional — removed in Phase 2 cutover.
  // Mirror the real-authed user into the 3 legacy localStorage keys so
  // Phase-2-not-yet-migrated systems (useFaithPoints, activity engine,
  // badges, ListenTracker's readAuthFromStorage) keep working for
  // JWT-authed users until their Phase 2 migration specs land. Each of
  // those subsystems reads wr_auth_simulated / wr_user_name / wr_user_id
  // directly; writing them keeps the legacy read paths accurate. The
  // mirror is cleared on logout by clearStoredLegacyAuth().
  const mirrorToLegacyKeys = useCallback((user: AuthUser) => {
    try {
      localStorage.setItem(LEGACY_KEYS.simulated, 'true')
      localStorage.setItem(LEGACY_KEYS.userName, user.displayName)
      localStorage.setItem(LEGACY_KEYS.userId, user.id)
    } catch {
      /* no-op */
    }
  }, [])

  // Boot-time /users/me hydration when a JWT is present
  useEffect(() => {
    if (bootHydrationRanRef.current) return
    bootHydrationRanRef.current = true
    const token = getStoredToken()
    if (!token) return
    getCurrentUser()
      .then((user) => {
        mirrorToLegacyKeys(user) // Transitional — removed in Phase 2 cutover
        setState({ isAuthenticated: true, isAuthResolving: false, user })
      })
      .catch(() => {
        // apiFetch already cleared the token on 401 and fired
        // AUTH_INVALIDATED_EVENT; network errors degrade silently.
        setState({ isAuthenticated: false, isAuthResolving: false, user: null })
      })
  }, [mirrorToLegacyKeys])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const user = await loginUser(credentials)
        mirrorToLegacyKeys(user) // Transitional — removed in Phase 2 cutover
        setState({ isAuthenticated: true, isAuthResolving: false, user })
      } catch (err) {
        throw mapToAuthError(err)
      }
    },
    [mirrorToLegacyKeys],
  )

  const register = useCallback(
    async (request: RegisterRequest) => {
      try {
        await registerUser(request)
      } catch (err) {
        throw mapToAuthError(err)
      }
      // Auto-login with the same credentials. Wrap in its own try to surface
      // AUTO_LOGIN_FAILED distinctly in the UI.
      try {
        const user = await loginUser({
          email: request.email,
          password: request.password,
        })
        mirrorToLegacyKeys(user) // Transitional — removed in Phase 2 cutover
        setState({ isAuthenticated: true, isAuthResolving: false, user })
      } catch (err) {
        // Anti-enumeration caveat: if the email already existed AND password
        // mismatches, this throws INVALID_CREDENTIALS. Surface it as
        // AUTO_LOGIN_FAILED so the user sees "please log in manually" rather
        // than "creds don't match" (which would reveal the account exists).
        const mapped = mapToAuthError(err)
        if (mapped.code === 'INVALID_CREDENTIALS') {
          throw new AuthError(
            'AUTO_LOGIN_FAILED',
            'Your account is ready. Please log in to continue.',
          )
        }
        throw mapped
      }
    },
    [mirrorToLegacyKeys],
  )

  const logout = useCallback(async () => {
    await logoutUser()
    clearStoredLegacyAuth()
    setState({ isAuthenticated: false, isAuthResolving: false, user: null })
  }, [])

  const simulateLegacyAuth = useCallback((name: string) => {
    // Transitional helper for pre-backend mock flows (WelcomeWizard onboarding
    // name setter, DevAuthToggle). Writes the 3 legacy keys directly so
    // existing tests + mock paths continue to work. Replaced when those flows
    // integrate real registration in Phase 3+.
    try {
      localStorage.setItem(LEGACY_KEYS.simulated, 'true')
      localStorage.setItem(LEGACY_KEYS.userName, name)
      let id = localStorage.getItem(LEGACY_KEYS.userId)
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(LEGACY_KEYS.userId, id)
      }
      setState({
        isAuthenticated: true,
        isAuthResolving: false,
        user: buildLegacyUser(id, name),
      })
    } catch {
      /* no-op */
    }
  }, [])

  // Cross-tab sync — listen to both JWT and legacy-simulated keys
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'wr_jwt_token') {
        const token = getStoredToken()
        if (!token) {
          setState({
            isAuthenticated: false,
            isAuthResolving: false,
            user: null,
          })
        } else {
          setState((prev) => ({ ...prev, isAuthResolving: true }))
          getCurrentUser()
            .then((user) => {
              mirrorToLegacyKeys(user) // Transitional — removed in Phase 2 cutover
              setState({
                isAuthenticated: true,
                isAuthResolving: false,
                user,
              })
            })
            .catch(() =>
              setState({
                isAuthenticated: false,
                isAuthResolving: false,
                user: null,
              }),
            )
        }
      } else if (e.key === LEGACY_KEYS.simulated) {
        setState(readInitialState())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [mirrorToLegacyKeys])

  // 401 invalidation event (fired by apiFetch on any 401 from an authenticated request)
  useEffect(() => {
    function handleInvalidated() {
      clearStoredLegacyAuth()
      setState({ isAuthenticated: false, isAuthResolving: false, user: null })
    }
    window.addEventListener(AUTH_INVALIDATED_EVENT, handleInvalidated)
    return () =>
      window.removeEventListener(AUTH_INVALIDATED_EVENT, handleInvalidated)
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      logout,
      simulateLegacyAuth,
    }),
    [state, login, register, logout, simulateLegacyAuth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook co-located with AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
