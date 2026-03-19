import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isOnboardingComplete } from '@/services/onboarding-storage'
import {
  getGettingStartedData,
  setGettingStartedFlag,
  isGettingStartedComplete,
  setGettingStartedComplete,
} from '@/services/getting-started-storage'
import type { ActivityType, GettingStartedData } from '@/types/dashboard'

export interface GettingStartedItem {
  key: keyof GettingStartedData
  activityType: ActivityType | null
  label: string
  pointHint: string
  destination: string | null // null for item 1 (triggers check-in)
  completed: boolean
}

const ITEM_DEFINITIONS: {
  key: keyof GettingStartedData
  activityType: ActivityType | null
  label: string
  points: number
  destination: string | null
}[] = [
  { key: 'mood_done', activityType: 'mood', label: 'Check in with your mood', points: 5, destination: null },
  { key: 'pray_done', activityType: 'pray', label: 'Generate your first prayer', points: 10, destination: '/daily?tab=pray' },
  { key: 'journal_done', activityType: 'journal', label: 'Write a journal entry', points: 25, destination: '/daily?tab=journal' },
  { key: 'meditate_done', activityType: 'meditate', label: 'Try a meditation', points: 20, destination: '/daily?tab=meditate' },
  { key: 'ambient_visited', activityType: null, label: 'Listen to ambient sounds', points: 10, destination: '/music?tab=ambient' },
  { key: 'prayer_wall_visited', activityType: null, label: 'Explore the Prayer Wall', points: 15, destination: '/prayer-wall' },
]

export function useGettingStarted(todayActivities: Record<ActivityType, boolean>) {
  const { isAuthenticated } = useAuth()

  const [flags, setFlags] = useState<GettingStartedData>(() => getGettingStartedData())
  const [dismissed, setDismissed] = useState(() => isGettingStartedComplete())

  // Sync daily activities (items 1-4) to permanent flags
  useEffect(() => {
    if (!isAuthenticated) return

    let changed = false
    const current = getGettingStartedData()

    for (const def of ITEM_DEFINITIONS) {
      if (def.activityType && todayActivities[def.activityType] && !current[def.key]) {
        current[def.key] = true
        setGettingStartedFlag(def.key, true)
        changed = true
      }
    }

    if (changed) {
      setFlags({ ...current })
    }
  }, [isAuthenticated, todayActivities])

  const items: GettingStartedItem[] = useMemo(
    () =>
      ITEM_DEFINITIONS.map((def) => {
        const fromPermanentFlag = flags[def.key]
        const fromDailyActivity = def.activityType ? todayActivities[def.activityType] : false
        const completed = fromPermanentFlag || fromDailyActivity

        return {
          key: def.key,
          activityType: def.activityType,
          label: def.label,
          pointHint: `+${def.points} pts`,
          destination: def.destination,
          completed,
        }
      }),
    [flags, todayActivities],
  )

  const completedCount = useMemo(() => items.filter((i) => i.completed).length, [items])
  const allComplete = completedCount === 6

  const isVisible =
    isAuthenticated &&
    isOnboardingComplete() &&
    !dismissed

  const dismiss = useCallback(() => {
    setGettingStartedComplete()
    setDismissed(true)
  }, [])

  return {
    items,
    completedCount,
    allComplete,
    isVisible,
    dismiss,
  }
}
