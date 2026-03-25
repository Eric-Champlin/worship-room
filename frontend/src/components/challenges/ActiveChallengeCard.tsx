import { Users } from 'lucide-react'

import { getParticipantCount, getCommunityGoalProgress, getContrastSafeColor } from '@/constants/challenges'
import type { Challenge } from '@/types/challenges'

import { ChallengeIcon } from './ChallengeIcon'

interface ActiveChallengeCardProps {
  challenge: Challenge
  daysRemaining: number
  calendarDay: number
  onJoin: () => void
  onContinue: () => void
  onResume?: () => void
  isJoined: boolean
  isCompleted: boolean
  isPaused?: boolean
  currentDay?: number
}

export function ActiveChallengeCard({
  challenge,
  daysRemaining,
  calendarDay,
  onJoin,
  onContinue,
  onResume,
  isJoined,
  isCompleted,
  isPaused = false,
  currentDay,
}: ActiveChallengeCardProps) {
  const participantCount = getParticipantCount(challenge.id, calendarDay)
  const goalNumber = parseInt(challenge.communityGoal.replace(/[^0-9]/g, ''), 10) || 10000
  const communityProgress = getCommunityGoalProgress(participantCount, goalNumber)
  const progressPercent = Math.min((communityProgress / goalNumber) * 100, 100)

  return (
    <div
      className="rounded-2xl border-2 border-primary/30 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-3">
            <ChallengeIcon
              name={challenge.icon}
              className="h-8 w-8 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{challenge.title}</h2>
          </div>

          <p className="mb-4 text-white/70">{challenge.description}</p>

          <div className="mb-4 flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold" style={{ color: getContrastSafeColor(challenge.themeColor) }}>
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </span>
            <span className="flex items-center gap-1 text-sm text-white/50">
              <Users className="h-4 w-4" aria-hidden="true" />
              {participantCount.toLocaleString()} participants
            </span>
          </div>

          <div className="mb-4">
            <p className="mb-1 text-xs text-white/50">
              Community goal: {challenge.communityGoal}
            </p>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuenow={Math.round(progressPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Community goal: ${Math.round(progressPercent)}% complete`}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: challenge.themeColor,
                }}
              />
            </div>
          </div>

          {isJoined && currentDay != null && !isCompleted && (
            <p className="text-sm font-medium text-white/70">
              Day {currentDay} of {challenge.durationDays}
            </p>
          )}
        </div>

        <div className="mt-4 sm:mt-0 sm:ml-8">
          {isCompleted ? (
            <span className="inline-flex min-h-[44px] items-center rounded-full bg-success/10 px-6 py-2 text-sm font-semibold text-success">
              Completed
            </span>
          ) : isPaused && onResume ? (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex min-h-[44px] items-center rounded-full border-2 px-6 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ borderColor: challenge.themeColor, color: getContrastSafeColor(challenge.themeColor) }}
            >
              Resume
            </button>
          ) : isJoined ? (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex min-h-[44px] items-center rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: challenge.themeColor }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              className="inline-flex min-h-[44px] items-center rounded-full px-6 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: challenge.themeColor }}
            >
              Join Challenge
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
