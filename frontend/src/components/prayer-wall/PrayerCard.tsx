import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { PrayerRequest } from '@/types/prayer-wall'
import { Avatar } from './Avatar'
import { AnsweredBadge } from './AnsweredBadge'
import { formatFullDate } from '@/lib/time'

const TRUNCATE_LENGTH = 150

interface PrayerCardProps {
  prayer: PrayerRequest
  showFull?: boolean
  children?: ReactNode
}

export function PrayerCard({ prayer, showFull = false, children }: PrayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const needsTruncation = !showFull && prayer.content.length > TRUNCATE_LENGTH

  const displayText =
    showFull || isExpanded
      ? prayer.content
      : needsTruncation
        ? prayer.content.slice(0, TRUNCATE_LENGTH) + '...'
        : prayer.content

  const authorLink = !prayer.isAnonymous && prayer.userId
    ? `/prayer-wall/user/${prayer.userId}`
    : null

  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow sm:p-6 lg:hover:shadow-md"
      aria-label={`Prayer by ${prayer.authorName}`}
    >
      <header className="mb-3 flex items-center gap-3">
        {authorLink ? (
          <Link to={authorLink} tabIndex={-1} aria-hidden="true">
            <Avatar
              firstName={prayer.authorName}
              lastName=""
              avatarUrl={prayer.authorAvatarUrl}
              size="md"
              isAnonymous={prayer.isAnonymous}
              userId={prayer.userId || ''}
            />
          </Link>
        ) : (
          <Avatar
            firstName={prayer.authorName}
            lastName=""
            avatarUrl={prayer.authorAvatarUrl}
            size="md"
            isAnonymous={prayer.isAnonymous}
            userId={prayer.userId || ''}
          />
        )}
        <div className="min-w-0">
          {authorLink ? (
            <Link
              to={authorLink}
              className="font-semibold text-text-dark hover:underline"
            >
              {prayer.authorName}
            </Link>
          ) : (
            <span className="font-semibold text-text-dark">
              {prayer.authorName}
            </span>
          )}
          <span className="text-text-light"> &mdash; </span>
          <time
            dateTime={prayer.createdAt}
            className="text-sm text-text-light"
          >
            {formatFullDate(prayer.createdAt)}
          </time>
        </div>
      </header>

      <div className="mb-3">
        <p className="whitespace-pre-wrap leading-relaxed text-text-dark">
          {displayText}
        </p>
        {needsTruncation && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className="mt-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {children}

      {prayer.isAnswered && (
        <AnsweredBadge
          answeredText={prayer.answeredText}
          answeredAt={prayer.answeredAt}
        />
      )}
    </article>
  )
}
