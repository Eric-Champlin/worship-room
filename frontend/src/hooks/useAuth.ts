// TODO(phase-3): replace with AuthContext.
// Important: consumers depend on a stable object reference (useMemo or context value).
// When converting to a real provider, ensure the returned object is referentially stable.
export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface AuthState {
  user: AuthUser | null
  isLoggedIn: boolean
}

export function useAuth(): AuthState {
  return {
    user: null,
    isLoggedIn: false,
  }
}
