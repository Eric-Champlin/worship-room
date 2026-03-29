import { useState, useMemo, useEffect, useCallback } from 'react'
import { useFriends } from '@/hooks/useFriends'
import {
  getSocialInteractions,
  saveSocialInteractions,
  isRecapDismissedThisWeek,
  addNotification,
  NOTIFICATIONS_KEY,
} from '@/services/social-storage'
import { getActivityLog } from '@/services/faith-points-storage'
import { getCurrentWeekStart } from '@/utils/date'

// Mock group stats (hardcoded realistic numbers)
const MOCK_GROUP_STATS = {
  prayers: 23,
  journals: 15,
  meditations: 8,
  worshipHours: 12,
}
const MOCK_GROUP_ACTIVITY_TOTAL = 64

export interface WeeklyRecapData {
  isVisible: boolean
  stats: {
    prayers: number
    journals: number
    meditations: number
    worshipHours: number
  }
  userContributionPercent: number
  hasFriends: boolean
  dismiss: () => void
}

function getUserWeeklyActivityCount(): number {
  const log = getActivityLog()
  const weekStart = getCurrentWeekStart()
  let count = 0
  for (const [date, activities] of Object.entries(log)) {
    if (date >= weekStart) {
      if (activities.mood) count++
      if (activities.pray) count++
      if (activities.journal) count++
      if (activities.meditate) count++
      if (activities.listen) count++
      if (activities.prayerWall) count++
    }
  }
  return count
}

function hasWeeklyRecapNotificationThisWeek(): boolean {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY)
    if (!raw) return false
    const notifications = JSON.parse(raw)
    const weekStart = getCurrentWeekStart()
    return notifications.some(
      (n: { type: string; timestamp: string }) =>
        n.type === 'weekly_recap' && n.timestamp >= weekStart + 'T00:00:00',
    )
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return false
  }
}

export function useWeeklyRecap(): WeeklyRecapData {
  const { friends } = useFriends()
  const [dismissed, setDismissed] = useState(() => isRecapDismissedThisWeek())

  const hasFriends = friends.length > 0
  const isVisible = !dismissed && hasFriends

  const userActivityCount = useMemo(() => getUserWeeklyActivityCount(), [])

  const userContributionPercent = useMemo(() => {
    const total = userActivityCount + MOCK_GROUP_ACTIVITY_TOTAL
    if (total === 0) return 0
    return Math.round((userActivityCount / total) * 100)
  }, [userActivityCount])

  // Generate notification when recap becomes visible
  useEffect(() => {
    if (isVisible && !hasWeeklyRecapNotificationThisWeek()) {
      addNotification({
        type: 'weekly_recap',
        message: 'Your weekly recap is ready',
      })
    }
  }, [isVisible])

  const dismiss = useCallback(() => {
    const data = getSocialInteractions()
    const weekStart = getCurrentWeekStart()
    if (!data.recapDismissals.includes(weekStart)) {
      data.recapDismissals.push(weekStart)
      saveSocialInteractions(data)
    }
    setDismissed(true)
  }, [])

  return {
    isVisible,
    stats: MOCK_GROUP_STATS,
    userContributionPercent,
    hasFriends,
    dismiss,
  }
}
