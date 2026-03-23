import { useCallback, useState } from 'react'

import { CHALLENGE_PROGRESS_KEY, CHALLENGE_REMINDERS_KEY } from '@/constants/challenges'
import { CHALLENGES } from '@/data/challenges'
import { useAuth } from '@/hooks/useAuth'
import type { ChallengeProgress, ChallengeProgressMap } from '@/types/challenges'

function readProgress(): ChallengeProgressMap {
  try {
    const raw = localStorage.getItem(CHALLENGE_PROGRESS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ChallengeProgressMap
  } catch {
    return {}
  }
}

function writeProgress(progress: ChallengeProgressMap): void {
  try {
    localStorage.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // localStorage unavailable
  }
}

function readReminders(): string[] {
  try {
    const raw = localStorage.getItem(CHALLENGE_REMINDERS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

function writeReminders(reminders: string[]): void {
  try {
    localStorage.setItem(CHALLENGE_REMINDERS_KEY, JSON.stringify(reminders))
  } catch {
    // localStorage unavailable
  }
}

export function useChallengeProgress() {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<ChallengeProgressMap>(readProgress)
  const [reminders, setReminders] = useState<string[]>(readReminders)

  const getProgress = useCallback(
    (challengeId: string): ChallengeProgress | undefined => {
      return progress[challengeId]
    },
    [progress],
  )

  const isChallengeJoined = useCallback(
    (challengeId: string): boolean => {
      return challengeId in progress
    },
    [progress],
  )

  const isChallengeCompleted = useCallback(
    (challengeId: string): boolean => {
      const p = progress[challengeId]
      return p != null && p.completedAt != null
    },
    [progress],
  )

  const joinChallenge = useCallback(
    (challengeId: string) => {
      if (!isAuthenticated) return
      const updated = { ...progress }
      updated[challengeId] = {
        joinedAt: new Date().toISOString(),
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
    (challengeId: string, dayNumber: number) => {
      if (!isAuthenticated) return
      const challengeProgress = progress[challengeId]
      if (!challengeProgress) return
      if (challengeProgress.completedDays.includes(dayNumber)) return
      if (dayNumber !== challengeProgress.currentDay) return

      const challenge = CHALLENGES.find((c) => c.id === challengeId)
      if (!challenge) return

      const completedDays = [...challengeProgress.completedDays, dayNumber]
      const isLastDay = completedDays.length >= challenge.durationDays

      const updated = { ...progress }
      updated[challengeId] = {
        ...challengeProgress,
        completedDays,
        currentDay: isLastDay ? challengeProgress.currentDay : challengeProgress.currentDay + 1,
        completedAt: isLastDay ? new Date().toISOString() : null,
      }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated, progress],
  )

  const getReminders = useCallback((): string[] => {
    return reminders
  }, [reminders])

  const toggleReminder = useCallback(
    (challengeId: string) => {
      if (!isAuthenticated) return
      const updated = reminders.includes(challengeId)
        ? reminders.filter((id) => id !== challengeId)
        : [...reminders, challengeId]
      writeReminders(updated)
      setReminders(updated)
    },
    [isAuthenticated, reminders],
  )

  return {
    getProgress,
    joinChallenge,
    completeDay,
    isChallengeJoined,
    isChallengeCompleted,
    getReminders,
    toggleReminder,
  }
}
