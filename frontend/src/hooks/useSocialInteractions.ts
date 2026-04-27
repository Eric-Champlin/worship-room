import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getSocialInteractions,
  saveSocialInteractions,
  canEncourage as storageCanEncourage,
  canNudge as storageCanNudge,
  getEncouragementCountToday,
  isRecapDismissedThisWeek,
  addNotification,
} from '@/services/social-storage'
import { getFriendsData } from '@/services/friends-storage'
import { getCurrentWeekStart } from '@/utils/date'
import { isBackendSocialEnabled } from '@/lib/env'
import { getStoredToken } from '@/lib/auth-storage'
import {
  sendEncouragementApi,
  sendNudgeApi,
  sendRecapDismissalApi,
} from '@/services/api/social-api'

/**
 * Spec 2.5.4b dual-write guard. Mirrors useFriends.shouldDualWrite().
 * Returns true when:
 *   - VITE_USE_BACKEND_SOCIAL === 'true' (env flag), AND
 *   - getStoredToken() returns a non-null JWT.
 *
 * The token check prevents AUTH_INVALIDATED_EVENT loops for simulated-auth
 * users (same rationale as the friends dual-write guard).
 */
function shouldDualWriteSocial(): boolean {
  return isBackendSocialEnabled() && getStoredToken() !== null
}

export interface UseSocialInteractions {
  // Encouragements
  sendEncouragement: (toUserId: string, toName: string, message: string) => void
  canEncourage: (toUserId: string) => boolean
  getEncouragementCount: (toUserId: string) => number

  // Nudges
  sendNudge: (toUserId: string, toName: string) => void
  canNudge: (toUserId: string) => boolean
  wasNudged: (toUserId: string) => boolean

  // Recap
  isRecapDismissed: boolean
  dismissRecap: () => void
}

export function useSocialInteractions(): UseSocialInteractions {
  const { isAuthenticated, user } = useAuth()
  const [, forceUpdate] = useState(0)

  const userId = user?.id ?? ''
  const userName = user?.name ?? 'Someone'

  const sendEncouragement = useCallback(
    (toUserId: string, _toName: string, message: string) => {
      if (!isAuthenticated || !userId) return
      if (!storageCanEncourage(userId, toUserId)) return

      // Validate friend still exists
      const friendsData = getFriendsData()
      if (!friendsData.friends.some((f) => f.id === toUserId)) return

      const data = getSocialInteractions()
      data.encouragements.push({
        id: `enc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        fromUserId: userId,
        toUserId,
        message,
        timestamp: new Date().toISOString(),
      })
      saveSocialInteractions(data)

      addNotification({
        type: 'encouragement',
        message: `${userName} sent: ${message}`,
      })

      forceUpdate((n) => n + 1)

      if (shouldDualWriteSocial()) {
        sendEncouragementApi(toUserId, message).catch((err) => {
          console.warn('[useSocialInteractions] backend sendEncouragement dual-write failed:', err)
        })
      }
    },
    [isAuthenticated, userId, userName],
  )

  const canEncourage = useCallback(
    (toUserId: string) => {
      if (!isAuthenticated || !userId) return false
      return storageCanEncourage(userId, toUserId)
    },
    [isAuthenticated, userId],
  )

  const getEncouragementCount = useCallback(
    (toUserId: string) => {
      if (!userId) return 0
      return getEncouragementCountToday(userId, toUserId)
    },
    [userId],
  )

  const sendNudge = useCallback(
    (toUserId: string, _toName: string) => {
      if (!isAuthenticated || !userId) return
      if (!storageCanNudge(userId, toUserId)) return

      const data = getSocialInteractions()
      data.nudges.push({
        id: `nudge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        fromUserId: userId,
        toUserId,
        timestamp: new Date().toISOString(),
      })
      saveSocialInteractions(data)

      addNotification({
        type: 'nudge',
        message: `${userName} is thinking of you`,
      })

      forceUpdate((n) => n + 1)

      if (shouldDualWriteSocial()) {
        sendNudgeApi(toUserId).catch((err) => {
          console.warn('[useSocialInteractions] backend sendNudge dual-write failed:', err)
        })
      }
    },
    [isAuthenticated, userId, userName],
  )

  const canNudge = useCallback(
    (toUserId: string) => {
      if (!isAuthenticated || !userId) return false
      return storageCanNudge(userId, toUserId)
    },
    [isAuthenticated, userId],
  )

  const wasNudged = useCallback(
    (toUserId: string) => {
      if (!userId) return false
      return !storageCanNudge(userId, toUserId)
    },
    [userId],
  )

  const isRecapDismissed = isRecapDismissedThisWeek()

  const dismissRecap = useCallback(() => {
    if (!isAuthenticated) return
    const data = getSocialInteractions()
    const weekStart = getCurrentWeekStart()
    if (!data.recapDismissals.includes(weekStart)) {
      data.recapDismissals.push(weekStart)
      saveSocialInteractions(data)
    }
    forceUpdate((n) => n + 1)

    if (shouldDualWriteSocial()) {
      sendRecapDismissalApi(weekStart).catch((err) => {
        console.warn('[useSocialInteractions] backend dismissRecap dual-write failed:', err)
      })
    }
  }, [isAuthenticated])

  return {
    sendEncouragement,
    canEncourage,
    getEncouragementCount,
    sendNudge,
    canNudge,
    wasNudged,
    isRecapDismissed,
    dismissRecap,
  }
}
