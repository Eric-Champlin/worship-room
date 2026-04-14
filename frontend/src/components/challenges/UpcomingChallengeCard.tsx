import { Bell, Check } from 'lucide-react'

import { getContrastSafeColor, SEASON_LABELS } from '@/constants/challenges'
import type { Challenge } from '@/types/challenges'

import { ChallengeIcon } from './ChallengeIcon'

interface UpcomingChallengeCardProps {
  challenge: Challenge
  startDate: Date
  isReminderSet: boolean
  onToggleReminder: () => void
  onClick: () => void
}

export function UpcomingChallengeCard({
  challenge,
  startDate,
  isReminderSet,
  onToggleReminder,
  onClick,
}: UpcomingChallengeCardProps) {
  const formattedStartDate = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm transition-shadow motion-reduce:transition-none lg:hover:shadow-md lg:hover:shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ChallengeIcon
            name={challenge.icon}
            className="h-6 w-6 shrink-0"
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-white">{challenge.title}</h3>
        </div>
        <span
          className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${challenge.themeColor}26`,
            color: getContrastSafeColor(challenge.themeColor),
          }}
        >
          {SEASON_LABELS[challenge.season]}
        </span>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-white/70">{challenge.description}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm text-white/50">
          <span>{challenge.durationDays} days</span>
          <span aria-hidden="true">-</span>
          <span>Starts {formattedStartDate}</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleReminder()
          }}
          onKeyDown={(e) => {
            e.stopPropagation()
          }}
          className={
            isReminderSet
              ? 'inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'
              : 'inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70'
          }
          aria-label={isReminderSet ? 'Remove reminder' : 'Set reminder'}
          aria-pressed={isReminderSet}
        >
          {isReminderSet ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Reminder set
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" aria-hidden="true" />
              Remind me
            </>
          )}
        </button>
      </div>
    </div>
  )
}
