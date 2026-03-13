import { useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storageService } from '@/services/storage-service'
import type { ListeningSession } from '@/types/storage'

export function useListeningHistory() {
  const { isLoggedIn } = useAuth()

  // Sync auth state with storageService
  storageService.setAuthState(isLoggedIn)

  const logSession = useCallback(
    (session: Omit<ListeningSession, 'id'>) => {
      if (!isLoggedIn) return
      storageService.logListeningSession(session)
    },
    [isLoggedIn],
  )

  const getLastSession = useCallback((): ListeningSession | null => {
    if (!isLoggedIn) return null
    const sessions = storageService.getRecentSessions(1)
    return sessions.length > 0 ? sessions[0] : null
  }, [isLoggedIn])

  const getRecentSessions = useCallback(
    (limit: number): ListeningSession[] => {
      if (!isLoggedIn) return []
      return storageService.getRecentSessions(limit)
    },
    [isLoggedIn],
  )

  return { logSession, getLastSession, getRecentSessions }
}
