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
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <ChallengeIcon
            name={challenge.icon}
            className="h-6 w-6 shrink-0"
            aria-hidden="true"
          />
          <h3 className="text-lg font-bold text-text-dark">{challenge.title}</h3>
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

      <p className="mb-4 line-clamp-2 text-sm text-text-light">{challenge.description}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-sm text-text-light">
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
              ? 'inline-flex min-h-[44px] items-center gap-1 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-text-light transition-colors'
              : 'inline-flex min-h-[44px] items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-text-dark transition-colors hover:bg-gray-50'
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
