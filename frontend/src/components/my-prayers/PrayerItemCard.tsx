import { useState, type ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo, formatFullDate } from '@/lib/time'
import { CATEGORY_LABELS } from '@/constants/prayer-categories'
import { ReminderToggle } from './ReminderToggle'
import type { PersonalPrayer } from '@/types/personal-prayer'

interface PrayerItemCardProps {
  prayer: PersonalPrayer
  children?: ReactNode
  glowing?: boolean
  onToggleReminder?: (enabled: boolean) => void
  onReminderTimeChange?: (time: string) => void
}

export function PrayerItemCard({ prayer, children, glowing, onToggleReminder, onReminderTimeChange }: PrayerItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const needsTruncation = prayer.description.length > 150

  const displayText =
    isExpanded || !needsTruncation
      ? prayer.description
      : prayer.description.slice(0, 150) + '...'

  return (
    <article
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 transition-all motion-reduce:transition-none sm:p-6 lg:hover:bg-white/[0.07]',
        prayer.status === 'answered' && 'border-l-4 border-l-success',
        glowing && 'ring-2 ring-primary/30 bg-primary/10',
      )}
      aria-label={`Prayer: ${prayer.title}`}
    >
      {/* Header: title + category badge + timestamp */}
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">{prayer.title}</h3>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
            {CATEGORY_LABELS[prayer.category]}
          </span>
        </div>
        <time dateTime={prayer.createdAt} className="text-sm text-white/50">
          {timeAgo(prayer.createdAt)}
        </time>
      </header>

      {/* Description with truncation */}
      {prayer.description && (
        <div className="mb-3">
          <p className="whitespace-pre-wrap text-white/80">{displayText}</p>
          {needsTruncation && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-sm font-medium text-primary-lt hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* "Prayed" indicator */}
      {prayer.lastPrayedAt && (
        <p className="mb-3 text-xs text-white/50">
          Prayed {timeAgo(prayer.lastPrayedAt)}
        </p>
      )}

      {/* Answered section */}
      {prayer.status === 'answered' && prayer.answeredAt && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium">Answered</span>
            <span className="text-white/50">&mdash; {formatFullDate(prayer.answeredAt)}</span>
          </div>
          {prayer.answeredNote && (
            <p className="mt-1 font-serif italic text-white/60">
              {prayer.answeredNote}
            </p>
          )}
        </div>
      )}

      {/* Reminder toggle (active prayers only) */}
      {prayer.status === 'active' && onToggleReminder && onReminderTimeChange && (
        <ReminderToggle
          enabled={prayer.reminderEnabled ?? false}
          time={prayer.reminderTime ?? '09:00'}
          onToggle={onToggleReminder}
          onTimeChange={onReminderTimeChange}
        />
      )}

      {/* Action buttons (passed as children) */}
      {children}
    </article>
  )
}
