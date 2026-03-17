import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storageService } from '@/services/storage-service'
import type { SessionState } from '@/types/storage'

export function useSessionPersistence() {
  const { isAuthenticated } = useAuth()
  const [sessionState, setSessionState] = useState<SessionState | null>(null)

  // Load and auto-clear expired sessions on mount
  useEffect(() => {
    storageService.setAuthState(isAuthenticated)
    if (!isAuthenticated) {
      setSessionState(null)
      return
    }
    const state = storageService.getSessionState() // auto-clears expired
    setSessionState(state)
  }, [isAuthenticated])

  const hasValidSession = sessionState !== null

  const saveSession = useCallback(
    (state: SessionState) => {
      if (!isAuthenticated) return
      storageService.saveSessionState(state)
      setSessionState(state)
    },
    [isAuthenticated],
  )

  const clearSession = useCallback(() => {
    storageService.clearSessionState()
    setSessionState(null)
  }, [])

  return { sessionState, hasValidSession, saveSession, clearSession }
}
