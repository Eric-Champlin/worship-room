import { Bell, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import type { Challenge } from '@/types/challenges'

import { CategoryTag } from './CategoryTag'
import { ChallengeIcon } from './ChallengeIcon'

interface UpcomingChallengeCardProps {
  challenge: Challenge
  startDate: Date
  isReminderSet: boolean
  onToggleReminder: () => void
  /** Retained for backward compatibility with call sites; no longer used — View Details Link handles navigation. */
  onClick?: () => void
}

export function UpcomingChallengeCard({
  challenge,
  startDate,
  isReminderSet,
  onToggleReminder,
}: UpcomingChallengeCardProps) {
  const formattedStartDate = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })

  return (
    <FrostedCard as="article" variant="default" className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3">
        <ChallengeIcon
          name={challenge.icon}
          className="h-6 w-6 shrink-0 text-white/90"
          aria-hidden="true"
        />
        <h3 className="flex-1 text-lg font-bold text-white">{challenge.title}</h3>
        <CategoryTag category={challenge.season} className="shrink-0" />
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-white/70">{challenge.description}</p>

      <div className="mt-3 text-xs text-white/60">
        {challenge.durationDays} days · Starts {formattedStartDate}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
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
