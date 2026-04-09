import { useCallback, useEffect, useState } from 'react'
import { getTodayLocal, getYesterday } from '@/lib/bible/dateUtils'
import { getStreak, subscribe } from '@/lib/bible/streakStore'
import type { StreakRecord } from '@/types/bible-streak'

export function useStreakStore() {
  const [streak, setStreak] = useState<StreakRecord>(getStreak)
  const [atRisk, setAtRisk] = useState(false)

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = subscribe(() => setStreak(getStreak()))
    return unsubscribe
  }, [])

  // At-risk: streak > 0, lastReadDate is yesterday, local time past 6 PM
  const checkAtRisk = useCallback(() => {
    const s = getStreak()
    if (s.currentStreak <= 0 || !s.lastReadDate) {
      setAtRisk(false)
      return
    }
    const today = getTodayLocal()
    const yesterday = getYesterday(today)
    const now = new Date()
    const isPast6PM = now.getHours() >= 18
    setAtRisk(s.lastReadDate === yesterday && isPast6PM)
  }, [])

  // Check on mount, on store change, and on 1-minute interval
  useEffect(() => {
    checkAtRisk()
    const interval = setInterval(checkAtRisk, 60_000)
    return () => clearInterval(interval)
  }, [checkAtRisk, streak])

  return { streak, atRisk }
}
