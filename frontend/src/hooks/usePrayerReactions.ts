import { useState, useCallback } from 'react'
import { getMockReactions } from '@/mocks/prayer-wall-mock-data'
import type { PrayerReaction } from '@/types/prayer-wall'

export function usePrayerReactions() {
  const [reactions, setReactions] = useState<Record<string, PrayerReaction>>(
    () => getMockReactions(),
  )

  const togglePraying = useCallback(
    (prayerId: string): boolean => {
      let wasPraying = false
      setReactions((prev) => {
        const current = prev[prayerId]
        wasPraying = current?.isPraying ?? false
        return {
          ...prev,
          [prayerId]: {
            prayerId,
            isPraying: !wasPraying,
            isBookmarked: current?.isBookmarked ?? false,
          },
        }
      })
      return wasPraying
    },
    [],
  )

  const toggleBookmark = useCallback(
    (prayerId: string) => {
      setReactions((prev) => {
        const current = prev[prayerId]
        return {
          ...prev,
          [prayerId]: {
            prayerId,
            isPraying: current?.isPraying ?? false,
            isBookmarked: !(current?.isBookmarked ?? false),
          },
        }
      })
    },
    [],
  )

  return { reactions, togglePraying, toggleBookmark }
}
