/**
 * useSessions — Spec 1.5g.
 *
 * Loads the current user's active sessions from `GET /api/v1/sessions` and
 * exposes optimistic revoke actions. Plain `useState` + `useEffect` + native
 * fetch via the shared `apiFetch` wrapper — no React Query, no reactive
 * store (matches Spec 6.1's `usePrayerReceipt` pattern; see Plan
 * D-FetchPattern).
 *
 * Auth handling is centralized: apiFetch's 401 handler clears the token and
 * dispatches `wr:auth-invalidated`, which AuthContext picks up. This hook
 * only surfaces a user-facing error message — it does not handle the
 * redirect.
 */

import { useCallback, useEffect, useState } from 'react'

import {
  listSessionsApi,
  revokeAllOtherSessionsApi,
  revokeAllSessionsApi,
  revokeSessionApi,
} from '@/services/api/sessions-api'
import type { Session } from '@/types/api/sessions'

export interface UseSessionsResult {
  /** Current sessions list. Empty array means "loaded but no sessions". */
  sessions: Session[]
  /** True during the initial fetch. */
  loading: boolean
  /** Human-readable error string for surfacing to the user; null on success. */
  error: string | null
  /** Force a refetch — useful after revoke actions. */
  refetch: () => Promise<void>
  /** Revoke one session by id. Optimistically removes from the list, refetches on success. Returns false on failure. */
  revoke: (sessionId: string) => Promise<boolean>
  /** Revoke every session except the current one. Returns false on failure. */
  revokeOthers: () => Promise<boolean>
  /** Revoke every session including the current one. Caller handles the redirect. Returns false on failure. */
  revokeAll: () => Promise<boolean>
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    setError(null)
    try {
      const data = await listSessionsApi()
      setSessions(data)
    } catch {
      // apiFetch already handles 401 globally (clears the token + dispatches
      // wr:auth-invalidated, which AuthContext picks up to redirect). Surface
      // a friendly message here regardless of the underlying cause — the
      // AuthModal will take over the 401 flow before this string is visible.
      setError("Couldn't load sessions — try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  const revoke = useCallback(
    async (sessionId: string): Promise<boolean> => {
      // Optimistic: remove immediately so the UI reacts. Refetch on success so
      // server truth wins. Returns true on success, false on failure (caller
      // can use the boolean to gate any further action like a redirect).
      const previousSessions = sessions
      setSessions((current) => current.filter((s) => s.sessionId !== sessionId))
      try {
        await revokeSessionApi(sessionId)
        await fetchSessions()
        return true
      } catch {
        setSessions(previousSessions)
        setError("Couldn't sign out that session — try again.")
        return false
      }
    },
    [sessions, fetchSessions],
  )

  const revokeOthers = useCallback(async (): Promise<boolean> => {
    try {
      await revokeAllOtherSessionsApi()
      await fetchSessions()
      return true
    } catch {
      setError("Couldn't sign out other devices — try again.")
      return false
    }
  }, [fetchSessions])

  const revokeAll = useCallback(async (): Promise<boolean> => {
    // No refetch — current token is about to fail. Caller handles the redirect.
    try {
      await revokeAllSessionsApi()
      return true
    } catch {
      // Even on failure, the caller (SessionsPage) still proceeds with the
      // redirect — the server-side revoke may have succeeded before the
      // response failed, so the only safe move is to assume the token is
      // gone. Surface a soft error for visibility.
      setError("Couldn't confirm sign out — your local session was cleared anyway.")
      return false
    }
  }, [])

  return { sessions, loading, error, refetch: fetchSessions, revoke, revokeOthers, revokeAll }
}
