import { Bell, Check, Calendar } from 'lucide-react'

import { getContrastSafeColor } from '@/constants/challenges'
import type { Challenge } from '@/types/challenges'

import { ChallengeIcon } from './ChallengeIcon'

interface NextChallengeCountdownProps {
  challenge: Challenge
  startDate: Date
  isReminderSet: boolean
  onToggleReminder: () => void
}

export function NextChallengeCountdown({
  challenge,
  startDate,
  isReminderSet,
  onToggleReminder,
}: NextChallengeCountdownProps) {
  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const daysUntilStart = Math.max(0, Math.round((startUTC - todayUTC) / (1000 * 60 * 60 * 24)))

  const formattedStartDate = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-center gap-2 text-text-light">
        <Calendar className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium uppercase tracking-wide">Next Challenge</span>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <ChallengeIcon
          name={challenge.icon}
          className="h-7 w-7 shrink-0"
          aria-hidden="true"
        />
        <h2 className="text-xl font-bold text-text-dark sm:text-2xl">{challenge.title}</h2>
      </div>

      <p className="mb-2 text-lg font-semibold text-text-dark">
        Starts in{' '}
        <span style={{ color: getContrastSafeColor(challenge.themeColor) }}>
          {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
        </span>
      </p>

      <p className="mb-4 text-sm text-text-light">
        Begins {formattedStartDate} - {challenge.durationDays} days
      </p>

      <p className="mb-6 text-text-light">{challenge.description}</p>

      <button
        type="button"
        onClick={onToggleReminder}
        className={
          isReminderSet
            ? 'inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gray-100 px-5 py-2 text-sm font-medium text-text-light transition-colors'
            : 'inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-text-dark transition-colors hover:bg-gray-50'
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
  )
}
