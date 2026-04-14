import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ActivePlan } from '@/types/bible-landing'
import type { Plan, PlanCompletionResult, PlanDay, PlanProgress } from '@/types/bible-plans'

import { getBookBySlug } from '@/data/bible'
import { loadPlan } from '@/lib/bible/planLoader'
import {
  getActivePlanProgress,
  getPlansState,
  markDayComplete as storeMarkDayComplete,
  pausePlan as storePausePlan,
  startPlan as storeStartPlan,
  subscribe,
} from '@/lib/bible/plansStore'

export interface UseActivePlanResult {
  activePlan: Plan | null
  progress: PlanProgress | null
  currentDay: PlanDay | null
  isOnPlanPassage: (book: string, chapter: number) => boolean
  markDayComplete: (dayNumber: number) => PlanCompletionResult
  pausePlan: () => void
  switchPlan: (slug: string) => Promise<void>
}

export function useActivePlan(): UseActivePlanResult {
  const [progress, setProgress] = useState<PlanProgress | null>(getActivePlanProgress)
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [activePlanSlug, setActivePlanSlug] = useState<string | null>(
    () => getPlansState().activePlanSlug,
  )

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const state = getPlansState()
      setActivePlanSlug(state.activePlanSlug)
      setProgress(state.activePlanSlug ? state.plans[state.activePlanSlug] ?? null : null)
    })
    return unsubscribe
  }, [])

  // Lazy-load the active plan's JSON when slug changes
  useEffect(() => {
    if (!activePlanSlug) {
      setActivePlan(null)
      return
    }

    let cancelled = false
    loadPlan(activePlanSlug).then(({ plan }) => {
      if (!cancelled) {
        setActivePlan(plan)
      }
    }).catch(() => { /* silent — active plan card degrades gracefully */ })
    return () => {
      cancelled = true
    }
  }, [activePlanSlug])

  // Write full bridge to wr_bible_active_plans when plan data or progress changes
  useEffect(() => {
    if (!activePlan || !progress) {
      try {
        localStorage.setItem('wr_bible_active_plans', '[]')
      } catch { /* Silent fail */ }
      return
    }
    const currentDayData = activePlan.days.find((d) => d.day === progress.currentDay)
    const primaryPassage = currentDayData?.passages[0]
    const todayReading = primaryPassage
      ? formatPassageRef(primaryPassage.book, primaryPassage.chapter, primaryPassage.startVerse, primaryPassage.endVerse)
      : ''
    const bridge: ActivePlan[] = [
      {
        planId: activePlan.slug,
        currentDay: progress.currentDay,
        totalDays: activePlan.duration,
        planName: activePlan.title,
        todayReading,
        startedAt: new Date(progress.startedAt).getTime(),
      },
    ]
    try {
      localStorage.setItem('wr_bible_active_plans', JSON.stringify(bridge))
    } catch { /* Silent fail */ }
  }, [activePlan, progress])

  const currentDay = useMemo<PlanDay | null>(() => {
    if (!activePlan || !progress) return null
    return activePlan.days.find((d) => d.day === progress.currentDay) ?? null
  }, [activePlan, progress])

  const isOnPlanPassage = useCallback(
    (book: string, chapter: number): boolean => {
      if (!currentDay) return false
      return currentDay.passages.some(
        (p) => p.book === book && p.chapter === chapter,
      )
    },
    [currentDay],
  )

  const markDayComplete = useCallback(
    (dayNumber: number): PlanCompletionResult => {
      if (!activePlan || !progress) {
        return { type: 'already-completed', day: dayNumber }
      }
      return storeMarkDayComplete(progress.slug, dayNumber, activePlan.duration)
    },
    [activePlan, progress],
  )

  const pausePlan = useCallback(() => {
    if (!progress) return
    storePausePlan(progress.slug)
  }, [progress])

  const switchPlan = useCallback(
    async (slug: string) => {
      if (activePlanSlug) {
        const confirmed = window.confirm(
          `Switching from your current plan — your progress will be saved.`,
        )
        if (!confirmed) return
      }
      const { plan } = await loadPlan(slug)
      if (!plan) return
      const firstDay = plan.days[0]
      const primaryPassage = firstDay?.passages[0]
      const todayReading = primaryPassage
        ? formatPassageRef(primaryPassage.book, primaryPassage.chapter, primaryPassage.startVerse, primaryPassage.endVerse)
        : ''
      storeStartPlan(slug, plan.duration, plan.title, todayReading)
    },
    [activePlanSlug],
  )

  return { activePlan, progress, currentDay, isOnPlanPassage, markDayComplete, pausePlan, switchPlan }
}

function formatPassageRef(
  book: string,
  chapter: number,
  startVerse?: number,
  endVerse?: number,
): string {
  const bookData = getBookBySlug(book)
  const bookName = bookData?.name ?? book.charAt(0).toUpperCase() + book.slice(1)
  let ref = `${bookName} ${chapter}`
  if (startVerse) {
    ref += `:${startVerse}`
    if (endVerse && endVerse !== startVerse) {
      ref += `-${endVerse}`
    }
  }
  return ref
}
