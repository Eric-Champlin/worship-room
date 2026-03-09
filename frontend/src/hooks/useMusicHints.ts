import { useCallback, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const SOUND_GRID_HINT_KEY = 'music-hint-sound-grid'
const PILL_HINT_KEY = 'music-hint-pill'

function getStorageKey(userId: string) {
  return `music-hints-${userId}`
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
  } catch {
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
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function useMusicHints() {
  const { user, isLoggedIn } = useAuth()

  const [showSoundGridHint, setShowSoundGridHint] = useState(() => {
    if (!isLoggedIn || !user?.id) return true
    return !isDismissed(getStorageKey(user.id), SOUND_GRID_HINT_KEY)
  })
  const [showPillHint, setShowPillHint] = useState(() => {
    if (!isLoggedIn || !user?.id) return true
    return !isDismissed(getStorageKey(user.id), PILL_HINT_KEY)
  })

  const dismissSoundGridHint = useCallback(() => {
    setShowSoundGridHint(false)
    if (isLoggedIn && user?.id) {
      persistDismissed(getStorageKey(user.id), SOUND_GRID_HINT_KEY)
    }
  }, [isLoggedIn, user?.id])

  const dismissPillHint = useCallback(() => {
    setShowPillHint(false)
    if (isLoggedIn && user?.id) {
      persistDismissed(getStorageKey(user.id), PILL_HINT_KEY)
    }
  }, [isLoggedIn, user?.id])

  return {
    showSoundGridHint,
    showPillHint,
    dismissSoundGridHint,
    dismissPillHint,
  }
}
