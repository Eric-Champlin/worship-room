import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { ChallengeIcon } from '@/components/challenges/ChallengeIcon'
import { useAuth } from '@/hooks/useAuth'
import { useChallengeProgress } from '@/hooks/useChallengeProgress'
import { getChallenge } from '@/data/challenges'

export function ChallengeStrip() {
  const { isAuthenticated } = useAuth()
  const { getActiveChallenge } = useChallengeProgress()

  if (!isAuthenticated) return null

  const active = getActiveChallenge()
  if (!active) return null

  const challenge = getChallenge(active.challengeId)
  if (!challenge) return null

  const dayContent = challenge.dailyContent[active.progress.currentDay - 1]
  if (!dayContent) return null

  const themeColor = challenge.themeColor

  return (
    <div className="mx-4 mb-2 rounded-xl p-3" style={{ backgroundColor: `${themeColor}26` }}>
      <Link
        to={`/challenges/${active.challengeId}`}
        className="flex items-center gap-3"
        aria-label={`Day ${active.progress.currentDay} of ${challenge.title}: ${dayContent.dailyAction}. Go to challenge.`}
      >
        <ChallengeIcon name={challenge.icon} className="h-4 w-4 shrink-0" style={{ color: themeColor }} aria-hidden="true" />
        <span className="flex-1 truncate text-sm text-white">
          <span className="font-medium">Day {active.progress.currentDay}:</span>{' '}
          {dayContent.dailyAction}
        </span>
        <span className="flex shrink-0 items-center text-sm font-medium" style={{ color: themeColor }}>
          Go <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  )
}
