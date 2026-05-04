import { Flame } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { CHALLENGES } from '@/data/challenges'
import { useChallengeProgress } from '@/hooks/useChallengeProgress'
import { getActiveChallengeInfo, getNextChallengeInfo } from '@/lib/challenge-calendar'
import { getParticipantCount } from '@/constants/challenges'

const RING_RADIUS = 18
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function ChallengeWidget() {
  const { getActiveChallenge, getReminders, toggleReminder } = useChallengeProgress()

  const active = getActiveChallenge()

  // State 1: Active challenge
  if (active) {
    const challenge = CHALLENGES.find((c) => c.id === active.challengeId)
    if (!challenge) return null

    const { currentDay, streak, completedDays } = active.progress
    const percent = completedDays.length / challenge.durationDays
    const dashOffset = RING_CIRCUMFERENCE * (1 - percent)

    const todayContent = challenge.dailyContent.find((d) => d.dayNumber === currentDay)
    const actionSummary = todayContent?.dailyAction ?? ''

    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        {/* Progress ring */}
        <div className="relative flex-shrink-0">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            role="progressbar"
            aria-valuenow={currentDay}
            aria-valuemin={1}
            aria-valuemax={challenge.durationDays}
            aria-label={`Day ${currentDay} of ${challenge.durationDays}`}
          >
            <circle
              cx="24" cy="24" r={RING_RADIUS}
              stroke="rgba(255,255,255,0.1)" strokeWidth="5" fill="none"
            />
            <circle
              cx="24" cy="24" r={RING_RADIUS}
              stroke={challenge.themeColor} strokeWidth="5" fill="none"
              strokeLinecap="round" transform="rotate(-90 24 24)"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-slow motion-safe:ease-decelerate"
            />
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-semibold text-white">Day {currentDay}</span>
            <span className="text-[10px] text-white/50">of {challenge.durationDays}</span>
          </span>
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-1.5 sm:justify-start">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: challenge.themeColor }}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-white">{challenge.title}</span>
          </div>
          {actionSummary && (
            <p className="mt-1 truncate text-sm text-white/60">{actionSummary}</p>
          )}
          <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
            {streak > 3 && (
              <Flame className="h-3.5 w-3.5" style={{ color: challenge.themeColor }} aria-hidden="true" />
            )}
            <span className="text-xs text-white/60">
              {streak > 0 ? `${streak}-day streak` : 'Start your streak!'}
            </span>
          </div>
          <Link
            to={`/challenges/${active.challengeId}`}
            className="mt-2 inline-block text-sm font-medium hover:underline"
            style={{ color: challenge.themeColor }}
            aria-label={`Continue ${challenge.title}`}
          >
            Continue →
          </Link>
        </div>
      </div>
    )
  }

  // State 2: No active challenge, season active
  const activeSeason = getActiveChallengeInfo()
  if (activeSeason) {
    const challenge = CHALLENGES.find((c) => c.id === activeSeason.challengeId)
    if (challenge) {
      const calendarDay = activeSeason.calendarDay
      const participantCount = getParticipantCount(challenge.id, calendarDay)

      return (
        <div>
          <p className="text-sm font-semibold text-white">Join {challenge.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-white/60">{challenge.description}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
            <span>{activeSeason.daysRemaining} days remaining</span>
            <span>{participantCount.toLocaleString()} participants</span>
          </div>
          <Link
            to={`/challenges/${challenge.id}`}
            className="mt-2 inline-block text-sm font-medium hover:underline"
            style={{ color: challenge.themeColor }}
            aria-label={`Join ${challenge.title} now`}
          >
            Join now →
          </Link>
        </div>
      )
    }
  }

  // State 3: No active challenge, no season active
  const next = getNextChallengeInfo()
  if (next) {
    const challenge = CHALLENGES.find((c) => c.id === next.challengeId)
    if (challenge) {
      const daysUntil = Math.ceil(
        (next.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )

      const isReminderSet = getReminders().includes(challenge.id)

      return (
        <div>
          <p className="text-sm text-white/60">
            Next challenge starts in {daysUntil} {daysUntil === 1 ? 'day' : 'days'}
          </p>
          <p className="mt-1 text-sm text-white/80">{challenge.title}</p>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => toggleReminder(challenge.id)}
            aria-pressed={isReminderSet}
            className={`mt-2 min-h-[44px] ${isReminderSet ? 'text-white/80' : 'text-white/60'}`}
          >
            {isReminderSet ? 'Reminder set' : 'Set reminder'}
          </Button>
        </div>
      )
    }
  }

  // Fallback: no challenges at all
  return (
    <FeatureEmptyState
      icon={Flame}
      heading="Challenges bring us together"
      description="Seasonal challenges happen throughout the year. The next one is coming soon!"
      compact
    />
  )
}
