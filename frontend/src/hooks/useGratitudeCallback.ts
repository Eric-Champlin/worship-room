import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useWhisperToast } from '@/hooks/useWhisperToast'
import {
  canShowSurprise,
  canShowGratitudeCallback,
  markGratitudeCallbackShown,
  markSurpriseShown,
} from '@/services/surprise-storage'
import { getGratitudeEntries } from '@/services/gratitude-storage'
import { getLocalDateString } from '@/utils/date'

const MIN_ENTRIES = 7
const MIN_AGE_DAYS = 3

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

export function useGratitudeCallback(isDashboard: boolean): void {
  const { isAuthenticated } = useAuth()
  const { showWhisperToast } = useWhisperToast()
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    if (!isAuthenticated) return
    if (!isDashboard) return
    if (!canShowSurprise()) return
    if (!canShowGratitudeCallback()) return

    const entries = getGratitudeEntries()
    if (entries.length < MIN_ENTRIES) return

    const cutoffDate = daysAgo(MIN_AGE_DAYS)
    const olderEntries = entries.filter((e) => e.date < cutoffDate)
    if (olderEntries.length === 0) return

    const randomEntry = olderEntries[Math.floor(Math.random() * olderEntries.length)]
    const randomItem = randomEntry.items[Math.floor(Math.random() * randomEntry.items.length)]
    if (!randomItem) return

    firedRef.current = true

    showWhisperToast({
      message: 'A little while ago, you were thankful for:',
      highlightedText: randomItem,
      closingMessage: "Isn't it beautiful to look back?",
      duration: 8000,
      soundId: 'chime',
    })

    markGratitudeCallbackShown()
    markSurpriseShown()
  }, [isAuthenticated, isDashboard, showWhisperToast])
}
