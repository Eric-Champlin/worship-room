import { useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const SOUND_GRID_HINT_KEY = 'wr_music_hint_sound_grid'
const PILL_HINT_KEY = 'wr_music_hint_pill'

function getStorageKey(userId: string) {
  return `wr_music_hints_${userId}`
}

function isDismissed(
  storageKey: string,
  hintKey: string,
): boolean {
  try {
    const data = localStorage.getItem(storageKey)
    if (!data) return false
    const parsed = JSON.parse(data)
    return !!parsed[hintKey]
  } catch (_e) {
    // Corrupted localStorage data — treat as not dismissed
    return false
  }
}

function persistDismissed(
  storageKey: string,
  hintKey: string,
): void {
  try {
    const data = localStorage.getItem(storageKey)
    const parsed = data ? JSON.parse(data) : {}
    parsed[hintKey] = true
    localStorage.setItem(storageKey, JSON.stringify(parsed))
  } catch (_e) {
    // localStorage may be unavailable or quota exceeded
  }
}

export function useMusicHints(): {
  showSoundGridHint: boolean
  showPillHint: boolean
  dismissSoundGridHint: () => void
  dismissPillHint: () => void
} {
  const { user, isAuthenticated } = useAuth()

  const [showSoundGridHint, setShowSoundGridHint] = useState(() => {
    if (!isAuthenticated || !user?.id) return true
    return !isDismissed(getStorageKey(user.id), SOUND_GRID_HINT_KEY)
  })
  const [showPillHint, setShowPillHint] = useState(() => {
    if (!isAuthenticated || !user?.id) return true
    return !isDismissed(getStorageKey(user.id), PILL_HINT_KEY)
  })

  const dismissSoundGridHint = useCallback(() => {
    setShowSoundGridHint(false)
    if (isAuthenticated && user?.id) {
      persistDismissed(getStorageKey(user.id), SOUND_GRID_HINT_KEY)
    }
  }, [isAuthenticated, user?.id])

  const dismissPillHint = useCallback(() => {
    setShowPillHint(false)
    if (isAuthenticated && user?.id) {
      persistDismissed(getStorageKey(user.id), PILL_HINT_KEY)
    }
  }, [isAuthenticated, user?.id])

  return {
    showSoundGridHint,
    showPillHint,
    dismissSoundGridHint,
    dismissPillHint,
  }
}
