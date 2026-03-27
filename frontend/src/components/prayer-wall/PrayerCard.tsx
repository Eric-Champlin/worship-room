import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest } from '@/types/prayer-wall'
import { getChallenge } from '@/data/challenges'
import { Avatar } from './Avatar'
import { AnsweredBadge } from './AnsweredBadge'
import { CategoryBadge } from './CategoryBadge'
import { QotdBadge } from './QotdBadge'
import { formatFullDate } from '@/lib/time'

const PulseContext = createContext<(() => void) | null>(null)
export function usePrayerCardPulse() { return useContext(PulseContext) }

const TRUNCATE_LENGTH = 150

interface PrayerCardProps {
  prayer: PrayerRequest
  showFull?: boolean
  onCategoryClick?: (category: PrayerCategory) => void
  children?: ReactNode
}

export function PrayerCard({ prayer, showFull = false, onCategoryClick, children }: PrayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const articleRef = useRef<HTMLElement>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const triggerPulse = useCallback(() => {
    const el = articleRef.current
    if (!el) return
    el.classList.add('motion-safe:animate-card-pulse')
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => {
      el.classList.remove('motion-safe:animate-card-pulse')
    }, 300)
  }, [])
  const challengeData = prayer.challengeId ? getChallenge(prayer.challengeId) : null
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
    <PulseContext.Provider value={triggerPulse}>
    <article
      ref={articleRef}
      className="rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm transition-shadow sm:p-6 lg:hover:shadow-md lg:hover:shadow-black/20"
      aria-label={`Prayer by ${prayer.authorName}`}
    >
      {prayer.qotdId && (
        <div className="mb-1">
          <QotdBadge />
        </div>
      )}
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
              className="font-semibold text-white hover:underline"
            >
              {prayer.authorName}
            </Link>
          ) : (
            <span className="font-semibold text-white">
              {prayer.authorName}
            </span>
          )}
          <span className="text-white/40"> &mdash; </span>
          <time
            dateTime={prayer.createdAt}
            className="text-sm text-white/40"
          >
            {formatFullDate(prayer.createdAt)}
          </time>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CategoryBadge
              category={prayer.category}
              onClick={onCategoryClick}
            />
            {challengeData && (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${challengeData.themeColor}26`, color: challengeData.themeColor }}
              >
                {challengeData.title.split(':')[0]}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="mb-3">
        <p className="whitespace-pre-wrap leading-relaxed text-white/80">
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
    </PulseContext.Provider>
  )
}
