import { useSyncExternalStore } from 'react'
import {
  subscribe,
  getSnapshot,
  togglePraying,
  toggleBookmark,
} from '@/lib/prayer-wall/reactionsStore'
import type { PrayerReaction } from '@/types/prayer-wall'

function getServerSnapshot(): Record<string, PrayerReaction> {
  return {}
}

export function usePrayerReactions(): {
  reactions: Record<string, PrayerReaction>
  togglePraying: (prayerId: string) => boolean
  toggleBookmark: (prayerId: string) => void
} {
  const reactions = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { reactions, togglePraying, toggleBookmark }
}
