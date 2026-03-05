import { useState, useCallback } from 'react'
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
  }
}

function readCompletion(): DailyCompletion {
  try {
    const raw = localStorage.getItem(DAILY_COMPLETION_KEY)
    if (!raw) return getEmptyCompletion()
    const parsed = JSON.parse(raw) as DailyCompletion
    if (parsed.date !== getTodayString()) return getEmptyCompletion()
    return parsed
  } catch {
    return getEmptyCompletion()
  }
}

function writeCompletion(completion: DailyCompletion): void {
  localStorage.setItem(DAILY_COMPLETION_KEY, JSON.stringify(completion))
}

export interface CompletionTracking {
  completion: DailyCompletion
  markPrayComplete: () => void
  markJournalComplete: () => void
  markMeditationComplete: (type: MeditationType) => void
  isPrayComplete: boolean
  isJournalComplete: boolean
  isMeditateComplete: boolean
  completedMeditationTypes: MeditationType[]
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

  return {
    completion,
    markPrayComplete,
    markJournalComplete,
    markMeditationComplete,
    isPrayComplete: completion.pray,
    isJournalComplete: completion.journal,
    isMeditateComplete: completion.meditate.completed,
    completedMeditationTypes: completion.meditate.types,
  }
}
