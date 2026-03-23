import type { ChallengeActionType } from '@/types/challenges'

/**
 * Returns a gentle prayer starter for a challenge day.
 * MUST NOT contain crisis keywords (see constants/crisis-resources.ts).
 * Follows theological boundaries: encouraging, not authoritative.
 */
export function getPrayerPrefill(dayTitle: string, dayNumber: number): string {
  return `Lord, on Day ${dayNumber} of this journey, as I reflect on "${dayTitle}", I pray...`
}

/**
 * Returns the journal prompt for a challenge day.
 * Uses the day's action text as the guided prompt.
 */
export function getJournalPrompt(dailyAction: string): string {
  return dailyAction
}

/**
 * Maps action types to specific meditation sub-page paths.
 * Returns null for general meditation tab.
 */
export function getMeditationSuggestion(
  actionType: ChallengeActionType,
  _dayTitle: string,
): string | null {
  switch (actionType) {
    case 'pray':
      return '/meditate/acts'
    case 'gratitude':
      return '/meditate/gratitude'
    case 'meditate':
      return '/meditate/soaking'
    default:
      return null
  }
}

/**
 * Maps day themes to music destinations.
 * Contemplative/reflective themes → sleep & rest tab.
 * Praise/worship themes → worship playlists tab.
 * Default → music landing page.
 */
export function getMusicDestination(dayTitle: string): string {
  const lower = dayTitle.toLowerCase()
  if (lower.includes('rest') || lower.includes('peace') || lower.includes('quiet') || lower.includes('sleep')) {
    return '/music?tab=sleep'
  }
  if (lower.includes('praise') || lower.includes('worship') || lower.includes('joy') || lower.includes('sing')) {
    return '/music?tab=playlists'
  }
  if (lower.includes('nature') || lower.includes('creation') || lower.includes('calm') || lower.includes('still')) {
    return '/music?tab=ambient'
  }
  return '/music'
}
