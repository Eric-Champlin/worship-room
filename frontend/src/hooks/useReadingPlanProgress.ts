import { useCallback, useState } from 'react'

import { READING_PLAN_PROGRESS_KEY } from '@/constants/reading-plans'
import { READING_PLAN_METADATA } from '@/data/reading-plans'
import { useAuth } from '@/hooks/useAuth'
import type { PlanProgress, ReadingPlanProgressMap } from '@/types/reading-plans'

function readProgress(): ReadingPlanProgressMap {
  try {
    const raw = localStorage.getItem(READING_PLAN_PROGRESS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ReadingPlanProgressMap
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return {}
  }
}

function writeProgress(progress: ReadingPlanProgressMap): void {
  try {
    localStorage.setItem(READING_PLAN_PROGRESS_KEY, JSON.stringify(progress))
  } catch (_e) {
    // localStorage may be unavailable
  }
}

export function useReadingPlanProgress(): {
  progress: ReadingPlanProgressMap
  getProgress: (planId: string) => PlanProgress | undefined
  getActivePlanId: () => string | null
  startPlan: (planId: string) => void
  completeDay: (planId: string, dayNumber: number) => void
  getPlanStatus: (planId: string) => 'unstarted' | 'active' | 'paused' | 'completed'
} {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<ReadingPlanProgressMap>(readProgress)

  const getProgress = useCallback(
    (planId: string): PlanProgress | undefined => {
      return progress[planId]
    },
    [progress],
  )

  const getActivePlanId = useCallback((): string | null => {
    let activePlanId: string | null = null
    let latestStartedAt = ''
    for (const [planId, p] of Object.entries(progress)) {
      if (!p.completedAt && p.startedAt > latestStartedAt) {
        latestStartedAt = p.startedAt
        activePlanId = planId
      }
    }
    return activePlanId
  }, [progress])

  const startPlan = useCallback(
    (planId: string) => {
      if (!isAuthenticated) return
      const updated = { ...progress }
      updated[planId] = {
        startedAt: new Date().toISOString(),
        currentDay: 1,
        completedDays: [],
        completedAt: null,
      }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated, progress],
  )

  const completeDay = useCallback(
    (planId: string, dayNumber: number) => {
      if (!isAuthenticated) return
      const planProgress = progress[planId]
      if (!planProgress) return
      if (planProgress.completedDays.includes(dayNumber)) return

      const plan = READING_PLAN_METADATA.find((p) => p.id === planId)
      if (!plan) return

      const updated = { ...progress }
      const completedDays = [...planProgress.completedDays, dayNumber]
      const nextDay = planProgress.currentDay + 1
      const isLastDay = completedDays.length >= plan.durationDays

      updated[planId] = {
        ...planProgress,
        completedDays,
        currentDay: isLastDay ? planProgress.currentDay : nextDay,
        completedAt: isLastDay ? new Date().toISOString() : null,
      }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated, progress],
  )

  const getPlanStatus = useCallback(
    (
      planId: string,
    ): 'unstarted' | 'active' | 'paused' | 'completed' => {
      const p = progress[planId]
      if (!p) return 'unstarted'
      if (p.completedAt) return 'completed'
      if (planId === getActivePlanId()) return 'active'
      return 'paused'
    },
    [progress, getActivePlanId],
  )

  return {
    progress,
    getProgress,
    getActivePlanId,
    startPlan,
    completeDay,
    getPlanStatus,
  }
}
