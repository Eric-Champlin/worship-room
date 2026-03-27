import type { PlanTheme } from '@/types/reading-plans'
import type { ChallengeSeason, Challenge } from '@/types/challenges'
import { CHALLENGES } from '@/data/challenges'
import { getChallengeCalendarInfo, compareDatesOnly } from '@/lib/challenge-calendar'

const THEME_TO_SEASONS: Record<PlanTheme, ChallengeSeason[] | 'any'> = {
  anxiety: 'any',
  relationships: 'any',
  grief: ['lent'],
  healing: ['lent'],
  forgiveness: ['lent'],
  gratitude: ['advent'],
  hope: ['easter'],
  trust: ['easter'],
  identity: ['newyear'],
  purpose: ['newyear'],
}

export interface ChallengeSuggestion {
  challenge: Challenge
  isActive: boolean
  startDate: Date
}

export function findMatchingChallenge(
  theme: PlanTheme,
  today: Date = new Date(),
): ChallengeSuggestion | null {
  const preferredSeasons = THEME_TO_SEASONS[theme]
  const thirtyDaysFromNow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 30,
  )

  const candidates: ChallengeSuggestion[] = []

  for (const challenge of CHALLENGES) {
    const info = getChallengeCalendarInfo(challenge, today)

    if (info.status === 'active') {
      if (
        preferredSeasons === 'any' ||
        preferredSeasons.includes(challenge.season)
      ) {
        candidates.push({ challenge, isActive: true, startDate: info.startDate })
      }
    } else if (
      info.status === 'upcoming' &&
      compareDatesOnly(info.startDate, thirtyDaysFromNow) <= 0
    ) {
      if (
        preferredSeasons === 'any' ||
        preferredSeasons.includes(challenge.season)
      ) {
        candidates.push({
          challenge,
          isActive: false,
          startDate: info.startDate,
        })
      }
    }
  }

  if (candidates.length === 0) return null

  // Prefer active over upcoming
  const active = candidates.find((c) => c.isActive)
  if (active) return active

  // Otherwise closest upcoming
  candidates.sort((a, b) => compareDatesOnly(a.startDate, b.startDate))
  return candidates[0]
}
