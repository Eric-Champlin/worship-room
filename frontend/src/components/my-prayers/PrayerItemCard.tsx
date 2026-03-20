import { useState, type ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo, formatFullDate } from '@/lib/time'
import { CATEGORY_LABELS } from '@/constants/prayer-categories'
import type { PersonalPrayer } from '@/types/personal-prayer'

interface PrayerItemCardProps {
  prayer: PersonalPrayer
  children?: ReactNode
  glowing?: boolean
}

export function PrayerItemCard({ prayer, children, glowing }: PrayerItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const needsTruncation = prayer.description.length > 150

  const displayText =
    isExpanded || !needsTruncation
      ? prayer.description
      : prayer.description.slice(0, 150) + '...'

  return (
    <article
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 transition-all sm:p-6 lg:hover:shadow-md',
        prayer.status === 'answered' && 'border-l-4 border-l-success',
        glowing && 'ring-2 ring-primary/30 bg-primary/5',
      )}
      aria-label={`Prayer: ${prayer.title}`}
    >
      {/* Header: title + category badge + timestamp */}
      <header className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-text-dark">{prayer.title}</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {CATEGORY_LABELS[prayer.category]}
          </span>
        </div>
        <time dateTime={prayer.createdAt} className="text-sm text-text-light">
          {timeAgo(prayer.createdAt)}
        </time>
      </header>

      {/* Description with truncation */}
      {prayer.description && (
        <div className="mb-3">
          <p className="whitespace-pre-wrap text-text-dark">{displayText}</p>
          {needsTruncation && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-sm font-medium text-primary hover:text-primary-lt"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* "Prayed" indicator */}
      {prayer.lastPrayedAt && (
        <p className="mb-3 text-xs text-text-light">
          Prayed {timeAgo(prayer.lastPrayedAt)}
        </p>
      )}

      {/* Answered section */}
      {prayer.status === 'answered' && prayer.answeredAt && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle className="h-4 w-4" aria-hidden="true" />
            <span className="font-medium">Answered</span>
            <span className="text-text-light">&mdash; {formatFullDate(prayer.answeredAt)}</span>
          </div>
          {prayer.answeredNote && (
            <p className="mt-1 font-serif italic text-text-light">
              {prayer.answeredNote}
            </p>
          )}
        </div>
      )}

      {/* Action buttons (passed as children) */}
      {children}
    </article>
  )
}
