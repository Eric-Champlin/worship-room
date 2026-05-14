import { useEffect, useSyncExternalStore } from 'react'
import {
  subscribe,
  getSnapshot,
  togglePraying,
  toggleBookmark,
  toggleCandle,
  togglePraising,
  configure,
  init,
} from '@/lib/prayer-wall/reactionsStore'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import type { PrayerReaction } from '@/types/prayer-wall'

function getServerSnapshot(): Record<string, PrayerReaction> {
  return {}
}

export function usePrayerReactions(): {
  reactions: Record<string, PrayerReaction>
  togglePraying: (prayerId: string) => boolean
  toggleBookmark: (prayerId: string) => void
  toggleCandle: (prayerId: string) => boolean
  /** Spec 6.6 — Answered Wall praising-reaction toggle. */
  togglePraising: (prayerId: string) => boolean
} {
  const reactions = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )
  const { user } = useAuth()
  const { showToast } = useToast()
  const authModal = useAuthModal()

  // Wire DI handlers — store keeps the most-recent references so toasts and
  // auth modal opens both work. Re-runs whenever showToast or the auth modal
  // identity changes (rare in practice; useToast is stabilized inside the
  // provider).
  useEffect(() => {
    configure({
      showToast,
      openAuthModal: (subtitle?: string) => {
        if (authModal) authModal.openAuthModal(subtitle)
      },
    })
  }, [showToast, authModal])

  // Hydrate on auth state change (login, logout, user-switch).
  // Cleanup deliberately does NOT call init(null) — Watch-for #15: navigating
  // between Prayer Wall pages mounts/unmounts the hook on every page
  // transition, and clearing-on-unmount would clear cache repeatedly.
  useEffect(() => {
    void init(user?.id ?? null)
  }, [user?.id])

  return { reactions, togglePraying, toggleBookmark, toggleCandle, togglePraising }
}
