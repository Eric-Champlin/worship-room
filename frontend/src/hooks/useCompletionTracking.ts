import { useState, useCallback, useMemo } from 'react'
import type { DailyCompletion, MeditationType } from '@/types/daily-experience'
import { DAILY_COMPLETION_KEY } from '@/constants/daily-experience'

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function getEmptyCompletion(): DailyCompletion {
  return {
    date: getTodayString(),
    pray: false,
    journal: false,
    meditate: { completed: false, types: [] },
    guidedPrayer: [],
  }
}

function readCompletion(): DailyCompletion {
  try {
    const raw = localStorage.getItem(DAILY_COMPLETION_KEY)
    if (!raw) return getEmptyCompletion()
    const parsed = JSON.parse(raw) as DailyCompletion
    if (parsed.date !== getTodayString()) return getEmptyCompletion()
    return parsed
  } catch (_e) {
    return getEmptyCompletion()
  }
}

function writeCompletion(completion: DailyCompletion): void {
  try {
    localStorage.setItem(DAILY_COMPLETION_KEY, JSON.stringify(completion))
  } catch (_e) {
    // localStorage write failure is non-critical
  }
}

export interface CompletionTracking {
  completion: DailyCompletion
  markPrayComplete: () => void
  markJournalComplete: () => void
  markMeditationComplete: (type: MeditationType) => void
  markGuidedPrayerComplete: (sessionId: string) => void
  isPrayComplete: boolean
  isJournalComplete: boolean
  isMeditateComplete: boolean
  completedMeditationTypes: MeditationType[]
  completedGuidedPrayerSessions: string[]
  isGuidedPrayerComplete: (sessionId: string) => boolean
}

export function useCompletionTracking(): CompletionTracking {
  const [completion, setCompletion] = useState<DailyCompletion>(readCompletion)

  const markPrayComplete = useCallback(() => {
    setCompletion((prev) => {
      const next = { ...prev, pray: true }
      writeCompletion(next)
      return next
    })
  }, [])

  const markJournalComplete = useCallback(() => {
    setCompletion((prev) => {
      const next = { ...prev, journal: true }
      writeCompletion(next)
      return next
    })
  }, [])

  const markMeditationComplete = useCallback((type: MeditationType) => {
    setCompletion((prev) => {
      const types = prev.meditate.types.includes(type)
        ? prev.meditate.types
        : [...prev.meditate.types, type]
      const next: DailyCompletion = {
        ...prev,
        meditate: { completed: true, types },
      }
      writeCompletion(next)
      return next
    })
  }, [])

  const markGuidedPrayerComplete = useCallback((sessionId: string) => {
    setCompletion((prev) => {
      const existing = prev.guidedPrayer ?? []
      if (existing.includes(sessionId)) return prev
      const next: DailyCompletion = {
        ...prev,
        guidedPrayer: [...existing, sessionId],
      }
      writeCompletion(next)
      return next
    })
  }, [])

  const completedGuidedPrayerSessions = useMemo(
    () => completion.guidedPrayer ?? [],
    [completion.guidedPrayer]
  )

  const isGuidedPrayerComplete = useCallback(
    (sessionId: string) => completedGuidedPrayerSessions.includes(sessionId),
    [completedGuidedPrayerSessions]
  )

  return {
    completion,
    markPrayComplete,
    markJournalComplete,
    markMeditationComplete,
    markGuidedPrayerComplete,
    isPrayComplete: completion.pray,
    isJournalComplete: completion.journal,
    isMeditateComplete: completion.meditate.completed,
    completedMeditationTypes: completion.meditate.types,
    completedGuidedPrayerSessions,
    isGuidedPrayerComplete,
  }
}
