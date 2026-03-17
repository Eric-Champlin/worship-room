import { useCallback, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { storageService } from '@/services/storage-service'
import type { ListeningSession } from '@/types/storage'

export function useListeningHistory() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    storageService.setAuthState(isAuthenticated)
  }, [isAuthenticated])

  const logSession = useCallback(
    (session: Omit<ListeningSession, 'id'>) => {
      if (!isAuthenticated) return
      storageService.logListeningSession(session)
    },
    [isAuthenticated],
  )

  const getLastSession = useCallback((): ListeningSession | null => {
    if (!isAuthenticated) return null
    const sessions = storageService.getRecentSessions(1)
    return sessions.length > 0 ? sessions[0] : null
  }, [isAuthenticated])

  const getRecentSessions = useCallback(
    (limit: number): ListeningSession[] => {
      if (!isAuthenticated) return []
      return storageService.getRecentSessions(limit)
    },
    [isAuthenticated],
  )

  return { logSession, getLastSession, getRecentSessions }
}
