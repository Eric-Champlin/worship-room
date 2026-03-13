import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storageService } from '@/services/storage-service'
import type { SessionState } from '@/types/storage'

export function useSessionPersistence() {
  const { isLoggedIn } = useAuth()
  const [sessionState, setSessionState] = useState<SessionState | null>(null)

  // Load and auto-clear expired sessions on mount
  useEffect(() => {
    storageService.setAuthState(isLoggedIn)
    if (!isLoggedIn) {
      setSessionState(null)
      return
    }
    const state = storageService.getSessionState() // auto-clears expired
    setSessionState(state)
  }, [isLoggedIn])

  const hasValidSession = sessionState !== null

  const saveSession = useCallback(
    (state: SessionState) => {
      if (!isLoggedIn) return
      storageService.saveSessionState(state)
      setSessionState(state)
    },
    [isLoggedIn],
  )

  const clearSession = useCallback(() => {
    storageService.clearSessionState()
    setSessionState(null)
  }, [])

  return { sessionState, hasValidSession, saveSession, clearSession }
}
