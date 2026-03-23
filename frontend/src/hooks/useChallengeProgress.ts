import { useCallback, useState } from 'react'

import { CHALLENGE_PROGRESS_KEY, CHALLENGE_REMINDERS_KEY, CHALLENGE_BADGE_MAP } from '@/constants/challenges'
import { CHALLENGES } from '@/data/challenges'
import { useAuth } from '@/hooks/useAuth'
import { getOrInitBadgeData, addEarnedBadge, saveBadgeData } from '@/services/badge-storage'
import { getFaithPoints } from '@/services/faith-points-storage'
import { getLevelForPoints } from '@/constants/dashboard/levels'
import type { ChallengeProgress, ChallengeProgressMap, ChallengeStatus } from '@/types/challenges'
import type { ActivityType } from '@/types/dashboard'

export interface CompletionResult {
  isCompletion: boolean
  bonusPoints: number
  newBadgeIds: string[]
}

function migrateEntry(entry: ChallengeProgress): ChallengeProgress {
  return {
    ...entry,
    streak: entry.streak ?? 0,
    missedDays: entry.missedDays ?? [],
    status: entry.status ?? (entry.completedAt ? 'completed' : 'active'),
  }
}

function readProgress(): ChallengeProgressMap {
  try {
    const raw = localStorage.getItem(CHALLENGE_PROGRESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ChallengeProgressMap
    // Migrate entries that lack new fields
    const migrated: ChallengeProgressMap = {}
    for (const [key, value] of Object.entries(parsed)) {
      migrated[key] = migrateEntry(value)
    }
    return migrated
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

function calculateStreak(completedDays: number[], currentDay: number): number {
  if (completedDays.length === 0) return 0
  // Count consecutive days ending at currentDay-1 (the day just completed)
  let streak = 0
  const sorted = [...completedDays].sort((a, b) => b - a) // descending
  for (let i = 0; i < sorted.length; i++) {
    const expected = sorted[0] - i
    if (sorted[i] === expected) {
      streak++
    } else {
      break
    }
  }
  return streak
}

function awardBonusPoints(amount: number): void {
  try {
    const currentFP = getFaithPoints()
    const newTotal = currentFP.totalPoints + amount
    const levelInfo = getLevelForPoints(newTotal)
    const updated = {
      totalPoints: newTotal,
      currentLevel: levelInfo.level,
      currentLevelName: levelInfo.name,
      pointsToNextLevel: levelInfo.pointsToNextLevel,
      lastUpdated: new Date().toISOString(),
    }
    localStorage.setItem('wr_faith_points', JSON.stringify(updated))
  } catch {
    // best-effort
  }
}

function awardChallengeBadges(challengeId: string): string[] {
  try {
    const badgeData = getOrInitBadgeData(true)
    const newBadgeIds: string[] = []

    // 1. Challenge-specific badge
    const specificBadgeId = CHALLENGE_BADGE_MAP[challengeId]
    if (specificBadgeId && !badgeData.earned[specificBadgeId]) {
      newBadgeIds.push(specificBadgeId)
    }

    // 2. Count completed challenges (current one is already marked completed in localStorage)
    const progress = readProgress()
    const completedCount = Object.values(progress).filter(
      (p) => p.status === 'completed' || p.completedAt != null,
    ).length

    // 3. challenge_first — first completion
    if (completedCount === 1 && !badgeData.earned['challenge_first']) {
      newBadgeIds.push('challenge_first')
    }

    // 4. challenge_master — all 5 completed
    if (completedCount >= 5 && !badgeData.earned['challenge_master']) {
      newBadgeIds.push('challenge_master')
    }

    // 5. Increment challengesCompleted counter and award badges
    let updated = {
      ...badgeData,
      activityCounts: {
        ...badgeData.activityCounts,
        challengesCompleted: (badgeData.activityCounts.challengesCompleted ?? 0) + 1,
      },
    }

    for (const badgeId of newBadgeIds) {
      updated = addEarnedBadge(updated, badgeId)
    }

    saveBadgeData(updated)
    return newBadgeIds
  } catch {
    return []
  }
}

export function useChallengeProgress() {
  const { isAuthenticated } = useAuth()
  const [progress, setProgress] = useState<ChallengeProgressMap>(readProgress)
  const [reminders, setReminders] = useState<string[]>(readReminders)

  const getProgress = useCallback(
    (challengeId: string): ChallengeProgress | undefined => {
      const entry = progress[challengeId]
      return entry ? migrateEntry(entry) : undefined
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
      return p != null && (p.completedAt != null || p.status === 'completed')
    },
    [progress],
  )

  const getActiveChallenge = useCallback((): { challengeId: string; progress: ChallengeProgress } | undefined => {
    for (const [id, p] of Object.entries(progress)) {
      const migrated = migrateEntry(p)
      if (migrated.status === 'active') {
        return { challengeId: id, progress: migrated }
      }
    }
    return undefined
  }, [progress])

  const joinChallenge = useCallback(
    (challengeId: string): string | undefined => {
      if (!isAuthenticated) return undefined
      const updated = { ...progress }

      // Find any currently active challenge
      let previousActiveId: string | undefined
      for (const [id, p] of Object.entries(updated)) {
        if (migrateEntry(p).status === 'active') {
          previousActiveId = id
          break
        }
      }

      updated[challengeId] = {
        joinedAt: new Date().toISOString(),
        currentDay: 1,
        completedDays: [],
        completedAt: null,
        streak: 0,
        missedDays: [],
        status: 'active',
      }
      writeProgress(updated)
      setProgress(updated)
      return previousActiveId
    },
    [isAuthenticated, progress],
  )

  const pauseChallenge = useCallback(
    (challengeId: string) => {
      if (!isAuthenticated) return
      const entry = progress[challengeId]
      if (!entry) return
      const updated = { ...progress }
      updated[challengeId] = {
        ...migrateEntry(entry),
        status: 'paused' as ChallengeStatus,
      }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated, progress],
  )

  const resumeChallenge = useCallback(
    (challengeId: string) => {
      if (!isAuthenticated) return
      const entry = progress[challengeId]
      if (!entry) return
      const updated = { ...progress }
      updated[challengeId] = {
        ...migrateEntry(entry),
        status: 'active' as ChallengeStatus,
      }
      writeProgress(updated)
      setProgress(updated)
    },
    [isAuthenticated, progress],
  )

  const completeDay = useCallback(
    (
      challengeId: string,
      dayNumber: number,
      recordActivityFn?: (type: ActivityType) => void,
    ): CompletionResult => {
      const noResult: CompletionResult = { isCompletion: false, bonusPoints: 0, newBadgeIds: [] }
      if (!isAuthenticated) return noResult

      const challengeProgress = progress[challengeId]
      if (!challengeProgress) return noResult
      const migrated = migrateEntry(challengeProgress)
      if (migrated.completedDays.includes(dayNumber)) return noResult
      if (dayNumber !== migrated.currentDay) return noResult

      const challenge = CHALLENGES.find((c) => c.id === challengeId)
      if (!challenge) return noResult

      const completedDays = [...migrated.completedDays, dayNumber]
      const isLastDay = completedDays.length >= challenge.durationDays
      const newStreak = calculateStreak(completedDays, dayNumber)

      const updated = { ...progress }
      updated[challengeId] = {
        ...migrated,
        completedDays,
        currentDay: isLastDay ? migrated.currentDay : migrated.currentDay + 1,
        completedAt: isLastDay ? new Date().toISOString() : null,
        streak: newStreak,
        status: isLastDay ? 'completed' as ChallengeStatus : migrated.status,
      }
      writeProgress(updated)
      setProgress(updated)

      // Gamification: record challenge activity
      if (recordActivityFn) {
        recordActivityFn('challenge')

        // Cross-activity credit: record the day's action type
        const dayContent = challenge.dailyContent.find((d) => d.dayNumber === dayNumber)
        if (dayContent) {
          const actionType = dayContent.actionType
          // Map challenge action types to ActivityType (music → listen)
          const activityTypeMap: Record<string, ActivityType> = {
            pray: 'pray',
            journal: 'journal',
            meditate: 'meditate',
            music: 'listen',
            gratitude: 'gratitude',
            prayerWall: 'prayerWall',
          }
          const mappedType = activityTypeMap[actionType]
          if (mappedType) {
            recordActivityFn(mappedType)
          }
        }
      }

      // On challenge completion
      if (isLastDay) {
        // Award 100 bonus points directly (not via recordActivity)
        awardBonusPoints(100)

        // Award challenge badges
        const newBadgeIds = awardChallengeBadges(challengeId)

        return { isCompletion: true, bonusPoints: 100, newBadgeIds }
      }

      return noResult
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
    getActiveChallenge,
    pauseChallenge,
    resumeChallenge,
    getReminders,
    toggleReminder,
  }
}
