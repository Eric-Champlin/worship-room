export type StreakRecord = {
  currentStreak: number
  longestStreak: number
  lastReadDate: string // ISO date "YYYY-MM-DD"
  streakStartDate: string // ISO date the current streak began
  graceDaysAvailable: number // 0 to 1
  graceDaysUsedThisWeek: number // 0 to 1
  lastGraceUsedDate: string | null // ISO date when grace was last used
  weekResetDate: string // ISO Monday of current grace-reset week
  milestones: number[] // streak counts the user has hit
  totalDaysRead: number // lifetime distinct days with reads
}

export type StreakDelta = 'same-day' | 'extended' | 'used-grace' | 'reset' | 'first-read'

export type StreakUpdateResult = {
  previousStreak: number
  newStreak: number
  delta: StreakDelta
  milestoneReached: number | null
  graceDaysRemaining: number
  isFirstReadEver: boolean
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const
