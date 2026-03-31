import { getLocalDateString } from '@/utils/date'

const STREAK_KEY = 'wr_streak'
const SESSION_KEY = 'wr_welcome_back_shown'

/**
 * Returns the number of days since the user was last active, or null if
 * no streak data exists (brand-new user / corrupted data).
 */
export function getDaysSinceLastActive(): number | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data.lastActiveDate !== 'string') return null

    const lastActive = data.lastActiveDate // 'YYYY-MM-DD'
    const today = getLocalDateString()
    if (lastActive === today) return 0

    const lastDate = new Date(lastActive + 'T00:00:00')
    const todayDate = new Date(today + 'T00:00:00')
    const diffMs = todayDate.getTime() - lastDate.getTime()
    if (diffMs < 0) return 0 // future date = treat as today
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}

/**
 * Returns true if the Welcome Back screen should be shown:
 * - daysSinceLastActive >= 3
 * - AND not already shown this session (sessionStorage)
 */
export function shouldShowWelcomeBack(): boolean {
  const days = getDaysSinceLastActive()
  if (days === null || days < 3) return false

  try {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') return false
  } catch {
    // sessionStorage unavailable — proceed (may re-show, acceptable)
  }
  return true
}

/**
 * Mark Welcome Back as shown for this session.
 */
export function markWelcomeBackShown(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true')
  } catch {
    // Silently fail — acceptable per spec
  }
}
