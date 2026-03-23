import { useCallback, useEffect, useRef } from 'react'

import { ACTION_TYPE_VERBS } from '@/constants/challenges'
import { CHALLENGES } from '@/data/challenges'
import { getTodayActivities } from '@/services/faith-points-storage'
import type { ChallengeProgress, ChallengeActionType } from '@/types/challenges'
import type { ActivityType } from '@/types/dashboard'
import type { CompletionResult } from './useChallengeProgress'

/** Maps challenge action types to the DailyActivities boolean key */
const ACTION_TO_ACTIVITY_KEY: Record<ChallengeActionType, ActivityType> = {
  pray: 'pray',
  journal: 'journal',
  meditate: 'meditate',
  music: 'listen',
  gratitude: 'gratitude',
  prayerWall: 'prayerWall',
}

interface UseChallengeAutoDetectOptions {
  isAuthenticated: boolean
  getActiveChallenge: () => { challengeId: string; progress: ChallengeProgress } | undefined
  completeDay: (
    challengeId: string,
    dayNumber: number,
    recordActivityFn?: (type: ActivityType) => void,
  ) => CompletionResult
  recordActivity: (type: ActivityType) => void
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void
}

export function useChallengeAutoDetect({
  isAuthenticated,
  getActiveChallenge,
  completeDay,
  recordActivity,
  showToast,
}: UseChallengeAutoDetectOptions) {
  const hasRunRef = useRef(false)

  const checkAndAutoComplete = useCallback((): CompletionResult | null => {
    if (!isAuthenticated) return null

    const active = getActiveChallenge()
    if (!active) return null

    const { challengeId, progress } = active
    if (progress.status !== 'active') return null

    const currentDay = progress.currentDay
    if (progress.completedDays.includes(currentDay)) return null

    // Find the challenge data for today's action type
    const challenge = CHALLENGES.find((c) => c.id === challengeId)
    if (!challenge) return null

    const dayContent = challenge.dailyContent.find((d) => d.dayNumber === currentDay)
    if (!dayContent) return null

    const activityKey = ACTION_TO_ACTIVITY_KEY[dayContent.actionType]
    if (!activityKey) return null

    // Check if the user has already performed this activity today
    const todayActivities = getTodayActivities()
    if (!todayActivities[activityKey]) return null

    // Auto-complete the day
    const result = completeDay(challengeId, currentDay, recordActivity)

    const verb = ACTION_TYPE_VERBS[dayContent.actionType] ?? dayContent.actionType
    showToast(
      `Challenge Day ${currentDay} auto-completed! You already ${verb} today.`,
      'success',
    )

    return result
  }, [isAuthenticated, getActiveChallenge, completeDay, recordActivity, showToast])

  // Run once on mount
  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true
    checkAndAutoComplete()
  }, [checkAndAutoComplete])

  // Listen for wr:activity-recorded events
  useEffect(() => {
    if (!isAuthenticated) return

    const handleActivityRecorded = () => {
      checkAndAutoComplete()
    }

    window.addEventListener('wr:activity-recorded', handleActivityRecorded)
    return () => window.removeEventListener('wr:activity-recorded', handleActivityRecorded)
  }, [isAuthenticated, checkAndAutoComplete])

  return { checkAndAutoComplete }
}
