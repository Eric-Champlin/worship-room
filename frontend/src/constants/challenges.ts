import type { ChallengeActionType, ChallengeSeason } from '@/types/challenges'

export const CHALLENGE_PROGRESS_KEY = 'wr_challenge_progress'
export const CHALLENGE_REMINDERS_KEY = 'wr_challenge_reminders'

export const CHALLENGE_SEASONS = ['lent', 'easter', 'pentecost', 'advent', 'newyear'] as const

export const SEASON_LABELS: Record<ChallengeSeason, string> = {
  lent: 'Lent',
  easter: 'Easter',
  pentecost: 'Pentecost',
  advent: 'Advent',
  newyear: 'New Year',
}

/**
 * Returns a WCAG AA safe text color for the given theme color on white backgrounds.
 * Easter yellow (#FDE68A) fails contrast — use darker amber instead.
 */
export function getContrastSafeColor(themeColor: string): string {
  if (themeColor === '#FDE68A') return '#92400E'
  return themeColor
}

export const ACTION_TYPE_LABELS: Record<ChallengeActionType, string> = {
  pray: 'Prayer',
  journal: 'Journal',
  meditate: 'Meditation',
  music: 'Music',
  gratitude: 'Gratitude',
  prayerWall: 'Prayer Wall',
}

export const ACTION_TYPE_ROUTES: Record<ChallengeActionType, string> = {
  pray: '/daily?tab=pray',
  journal: '/daily?tab=journal',
  meditate: '/daily?tab=meditate',
  music: '/music',
  gratitude: '/meditate/gratitude',
  prayerWall: '/prayer-wall',
}

export function getParticipantCount(challengeId: string, calendarDayWithinChallenge: number): number {
  return Math.min(500 + (calendarDayWithinChallenge * 23) + (challengeId.length * 47), 2000)
}

export function getCommunityGoalProgress(participantCount: number, goalNumber: number): number {
  return Math.min(participantCount * 3, goalNumber)
}
