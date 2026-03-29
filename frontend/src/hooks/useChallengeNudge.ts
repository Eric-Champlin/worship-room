import { useEffect, useRef } from 'react'

import { CHALLENGE_NUDGE_KEY } from '@/constants/challenges'
import { CHALLENGES } from '@/data/challenges'
import { getSettings } from '@/services/settings-storage'
import { getLocalDateString } from '@/utils/date'
import type { ChallengeProgress } from '@/types/challenges'
import type { ToastAction } from '@/components/ui/Toast'

type StandardToastType = 'success' | 'error' | 'warning'

interface UseChallengeNudgeOptions {
  isAuthenticated: boolean
  isDashboard: boolean
  getActiveChallenge: () => { challengeId: string; progress: ChallengeProgress } | undefined
  showToast: (message: string, type?: StandardToastType, action?: ToastAction) => void
  navigate: (path: string) => void
}

export function useChallengeNudge({
  isAuthenticated,
  isDashboard,
  getActiveChallenge,
  showToast,
  navigate,
}: UseChallengeNudgeOptions): void {
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    if (!isAuthenticated || !isDashboard) return

    // Only after 6 PM
    const currentHour = new Date().getHours()
    if (currentHour < 18) return

    // Once per day
    const today = getLocalDateString()
    try {
      const lastShown = localStorage.getItem(CHALLENGE_NUDGE_KEY)
      if (lastShown === today) return
    } catch (_e) {
      // localStorage unavailable
    }

    // Check settings
    const settings = getSettings()
    if (settings.notifications?.nudges === false) return

    const active = getActiveChallenge()
    if (!active) return

    const { challengeId, progress } = active
    if (progress.completedDays.includes(progress.currentDay)) return

    // Find challenge for action summary
    const challenge = CHALLENGES.find((c) => c.id === challengeId)
    const dayContent = challenge?.dailyContent.find((d) => d.dayNumber === progress.currentDay)
    const actionSummary = dayContent
      ? dayContent.dailyAction.slice(0, 60)
      : `Day ${progress.currentDay}`

    // Mark as shown
    try {
      localStorage.setItem(CHALLENGE_NUDGE_KEY, today)
    } catch (_e) {
      // best-effort
    }

    showToast(
      `Don't forget your challenge! Day ${progress.currentDay}: ${actionSummary}`,
      'warning',
      {
        label: 'Go',
        onClick: () => navigate(`/challenges/${challengeId}`),
      },
    )
  }, [isAuthenticated, isDashboard, getActiveChallenge, showToast, navigate])
}
