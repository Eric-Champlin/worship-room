import { useCallback, useState } from 'react'
import type { MutesData } from '@/types/dashboard'
import { useAuth } from '@/hooks/useAuth'
import {
  EMPTY_MUTES_DATA,
  getMutesData,
  saveMutesData,
  muteUser as storageMuteUser,
  unmuteUser as storageUnmuteUser,
  isMuted as storageIsMuted,
} from '@/services/mutes-storage'
import { isBackendMutesEnabled } from '@/lib/env'
import { getStoredToken } from '@/lib/auth-storage'
import { muteUserApi, unmuteUserApi } from '@/services/api/mutes-api'

/**
 * Spec 2.5.7 dual-write guard. Returns true when:
 * - VITE_USE_BACKEND_MUTES === 'true' (env flag), AND
 * - getStoredToken() returns a non-null JWT.
 *
 * The token check is load-bearing (mirrors useFriends.shouldDualWrite).
 */
function shouldDualWriteMutes(): boolean {
  return isBackendMutesEnabled() && getStoredToken() !== null
}

export function useMutes(): {
  muted: string[]
  isMuted: (userId: string) => boolean
  muteUser: (userId: string) => void
  unmuteUser: (userId: string) => void
} {
  const { isAuthenticated } = useAuth()

  const [data, setData] = useState<MutesData>(() => {
    if (!isAuthenticated) return EMPTY_MUTES_DATA
    return getMutesData()
  })

  const persist = useCallback((newData: MutesData) => {
    setData(newData)
    saveMutesData(newData)
  }, [])

  const mute = useCallback(
    (userId: string) => {
      if (!isAuthenticated) return
      persist(storageMuteUser(data, userId))
      if (shouldDualWriteMutes()) {
        muteUserApi(userId).catch((err) =>
          console.warn('[useMutes] backend muteUser dual-write failed:', err),
        )
      }
    },
    [isAuthenticated, data, persist],
  )

  const unmute = useCallback(
    (userId: string) => {
      if (!isAuthenticated) return
      persist(storageUnmuteUser(data, userId))
      if (shouldDualWriteMutes()) {
        unmuteUserApi(userId).catch((err) =>
          console.warn('[useMutes] backend unmuteUser dual-write failed:', err),
        )
      }
    },
    [isAuthenticated, data, persist],
  )

  const isMutedFn = useCallback(
    (userId: string) => storageIsMuted(data, userId),
    [data],
  )

  return {
    muted: data.muted,
    isMuted: isMutedFn,
    muteUser: mute,
    unmuteUser: unmute,
  }
}
