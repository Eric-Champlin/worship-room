import { Users, Bell, Award, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getActivityItems, AVATAR_COLORS } from '@/data/challenge-community-feed'

export type ChallengeStatus = 'upcoming' | 'active' | 'completed'

export interface CommunityFeedProps {
  status: ChallengeStatus
  /** Day number for active state's activity items */
  dayNumber: number
  /** Challenge duration in days (passed through to getActivityItems) */
  challengeDuration: number
  /** Pre-start: how many people have set a reminder */
  remindersCount?: number
  /** Active: how many are currently participating */
  activeParticipantsCount?: number
  /** Completed: how many finished the challenge */
  completedCount?: number
  /** Pre-start: formatted start date string (for copy) */
  startDateLabel?: string
  /** Shared: current user has the reminder set */
  hasReminder?: boolean
  /** Shared: reminder toggle handler. When undefined, the CTA is hidden. */
  onToggleReminder?: () => void
}

function pluralPeople(count: number): string {
  return count === 1 ? 'person' : 'people'
}

function pluralBe(count: number): string {
  return count === 1 ? 'is' : 'are'
}

export function CommunityFeed(props: CommunityFeedProps) {
  return (
    <section className="border-t border-white/10 py-8 sm:py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-white/60" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-white">Challenge Community</h3>
        </div>

        {props.status === 'upcoming' && <UpcomingState {...props} />}
        {props.status === 'active' && <ActiveState {...props} />}
        {props.status === 'completed' && <CompletedState {...props} />}
      </div>
    </section>
  )
}

function UpcomingState({
  remindersCount = 0,
  startDateLabel,
  hasReminder,
  onToggleReminder,
}: CommunityFeedProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Bell className="h-4 w-4" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-white">{remindersCount}</strong>{' '}
          {pluralPeople(remindersCount)} {pluralBe(remindersCount)} waiting to start
        </span>
      </div>
      <p className="max-w-sm text-sm text-white/60">
        Community activity will begin when the challenge starts
        {startDateLabel ? ` on ${startDateLabel}` : ''}. Set a reminder to join when it begins.
      </p>
      {onToggleReminder && (
        <Button
          variant="light"
          size="sm"
          onClick={onToggleReminder}
          aria-label={hasReminder ? 'Remove reminder' : 'Set reminder'}
          aria-pressed={Boolean(hasReminder)}
        >
          {hasReminder ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bell className="h-4 w-4" aria-hidden="true" />
          )}
          {hasReminder ? 'Reminder set' : 'Remind me'}
        </Button>
      )}
    </div>
  )
}

function ActiveState({ dayNumber, challengeDuration, activeParticipantsCount }: CommunityFeedProps) {
  const items = getActivityItems(dayNumber, challengeDuration, 6)
  return (
    <>
      {typeof activeParticipantsCount === 'number' && (
        <p className="mt-1 text-sm text-white/60">
          {activeParticipantsCount} {pluralPeople(activeParticipantsCount)} participating
        </p>
      )}
      <ul className="mt-4 divide-y divide-white/5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: AVATAR_COLORS[item.colorIndex] }}
              aria-hidden="true"
            >
              {item.initials}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-white/90">{item.name}</span>{' '}
              <span className="text-sm text-white/60">{item.action}</span>
            </div>
            <span className="shrink-0 text-xs text-white/60">{item.timestamp}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function CompletedState({ completedCount = 0 }: CommunityFeedProps) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
      <Award className="h-8 w-8 text-white/70" aria-hidden="true" />
      <p className="text-sm text-white/70">
        <strong className="font-semibold text-white">{completedCount}</strong>{' '}
        {pluralPeople(completedCount)} completed this challenge.
      </p>
    </div>
  )
}
