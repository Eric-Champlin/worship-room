import { Bell, Check, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { Challenge } from '@/types/challenges'

import { CategoryTag } from './CategoryTag'
import { ChallengeIcon } from './ChallengeIcon'

function getCountdownColorClass(daysUntilStart: number): string {
  if (daysUntilStart <= 1) return 'text-red-400'
  if (daysUntilStart <= 7) return 'text-amber-300'
  return 'text-white'
}

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
  const countdownColor = getCountdownColorClass(daysUntilStart)

  return (
    <FrostedCard variant="default" className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-white/60">
        <Calendar className="h-5 w-5" aria-hidden="true" />
        <span className="text-sm font-medium uppercase tracking-wide">Next Challenge</span>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <ChallengeIcon
          name={challenge.icon}
          className="h-7 w-7 shrink-0 text-white/90"
          aria-hidden="true"
        />
        <h2 className="flex-1 text-xl font-bold text-white sm:text-2xl">{challenge.title}</h2>
        <CategoryTag category={challenge.season} className="shrink-0" />
      </div>

      <p className="mb-2 text-lg font-semibold text-white">
        Starts in{' '}
        <span className={countdownColor}>
          {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
        </span>
      </p>

      <p className="mb-4 text-sm text-white/60">
        Begins {formattedStartDate} · {challenge.durationDays} days
      </p>

      <p className="mb-6 text-white/60">{challenge.description}</p>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="subtle"
          size="sm"
          onClick={onToggleReminder}
          aria-label={isReminderSet ? 'Remove reminder' : 'Set reminder'}
          aria-pressed={isReminderSet}
        >
          {isReminderSet ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bell className="h-4 w-4" aria-hidden="true" />
          )}
          {isReminderSet ? 'Reminder set' : 'Remind me'}
        </Button>
        <Button variant="subtle" size="sm" asChild>
          <Link to={`/challenges/${challenge.id}`}>View Details</Link>
        </Button>
      </div>
    </FrostedCard>
  )
}
