import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HandHelping, Heart, HelpCircle, MessagesSquare, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ANIMATION_DURATIONS } from '@/constants/animation'
import type { PostType } from '@/constants/post-types'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest } from '@/types/prayer-wall'
import { getChallenge } from '@/data/challenges'
import { Avatar } from './Avatar'
import { AnsweredBadge } from './AnsweredBadge'
import { PostImage } from './PostImage'
import { WaysToHelpPills } from './WaysToHelpPills'
import { CategoryBadge } from './CategoryBadge'
import { QotdBadge } from './QotdBadge'
import { ScriptureChip } from './ScriptureChip'
import { IntercessorTimeline } from './IntercessorTimeline'
import { formatFullDate } from '@/lib/time'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { cn } from '@/lib/utils'
import { getPerTypeChromeClass } from '@/constants/post-type-chrome'

const PulseContext = createContext<(() => void) | null>(null)
// eslint-disable-next-line react-refresh/only-export-components -- Hook co-located with PrayerCard
export function usePrayerCardPulse() { return useContext(PulseContext) }

const TRUNCATE_LENGTH = 150

const POST_TYPE_ICONS: Record<PostType, LucideIcon> = {
  prayer_request: HandHelping,
  testimony: Sparkles, // 4.3 — was HandHelping placeholder
  question: HelpCircle, // 4.4 — was HandHelping placeholder
  discussion: MessagesSquare, // 4.5 — was HandHelping placeholder
  encouragement: Heart, // 4.6 — was HandHelping placeholder
}

function TypeMarker({ postType }: { postType: PostType }) {
  const Icon = POST_TYPE_ICONS[postType]
  return <Icon className="h-3.5 w-3.5 text-white/40" aria-hidden="true" />
}

interface PrayerCardProps {
  prayer: PrayerRequest
  showFull?: boolean
  onCategoryClick?: (category: PrayerCategory) => void
  children?: ReactNode
  /** Spec 4.6b — feed index. Indices < 5 load images eagerly; >= 5 load lazily. */
  index?: number
  /** Spec 5.5 — Tier 1 elevation for PrayerDetail's main card; Tier 2 default for feed/dashboard/profile. */
  tier?: 'feed' | 'detail'
}

export function PrayerCard({ prayer, showFull = false, onCategoryClick, children, index = 99, tier = 'feed' }: PrayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const articleRef = useRef<HTMLDivElement>(null)
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    return () => { if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current) }
  }, [])
  const triggerPulse = useCallback(() => {
    const el = articleRef.current
    if (!el) return
    el.classList.add('motion-safe:animate-card-pulse')
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => {
      el.classList.remove('motion-safe:animate-card-pulse')
    }, ANIMATION_DURATIONS.pulse)
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

  const articleAriaLabel = (() => {
    switch (prayer.postType) {
      case 'testimony':
        return `Testimony by ${prayer.authorName}`
      case 'question':
        return `Question by ${prayer.authorName}`
      case 'discussion':
        return `Discussion by ${prayer.authorName}`
      case 'encouragement':
        // Spec 4.6 — encouragement is never anonymous (rejected at backend +
        // submit-time defense in InlineComposer), so authorName is always real.
        return `Encouragement by ${prayer.authorName}`
      case 'prayer_request':
      default:
        return `Prayer by ${prayer.authorName}`
    }
  })()

  return (
    <PulseContext.Provider value={triggerPulse}>
      <div ref={articleRef}>
        <FrostedCard
          variant={tier === 'detail' ? 'accent' : 'default'}
          as="article"
          aria-label={articleAriaLabel}
          className={cn(
            tier === 'feed' && getPerTypeChromeClass(prayer.postType),
            'lg:hover:shadow-md lg:hover:shadow-black/20 transition-shadow motion-reduce:transition-none',
          )}
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
              <span className="inline-flex items-center gap-1.5">
                <TypeMarker postType={prayer.postType} />
                <time
                  dateTime={prayer.createdAt}
                  className="text-sm text-white/60"
                >
                  {formatFullDate(prayer.createdAt)}
                </time>
              </span>
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
                className="mt-1 min-h-[44px] text-sm font-medium text-violet-300 hover:text-violet-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {prayer.scriptureReference && (
            <div className="-mt-1 mb-3">
              <ScriptureChip reference={prayer.scriptureReference} />
            </div>
          )}

          {/* Spec 4.6b — image attachment for testimony / question post types.
              Renders whenever prayer.image is non-null; postType-agnostic by design
              so future post types that gain images don't require touching PrayerCard. */}
          {prayer.image && <PostImage image={prayer.image} index={index} />}

          {/* Spec 4.7b — practical-help pills (prayer_request only). Defense-in-depth:
              backend rejects helpTags on other post types, but the postType gate here
              guards against any leftover fixture or stale data leaking pills onto a
              testimony / question / discussion / encouragement card (W18). The
              WaysToHelpPills component itself returns null when the displayable set
              is empty (W6), and filters out just_prayer (W5). */}
          {prayer.postType === 'prayer_request' && prayer.helpTags && (
            <WaysToHelpPills tags={prayer.helpTags} />
          )}

          {/* Spec 6.5 — Intercessor Timeline. Restricted to prayer_request posts
              because the "praying" reaction (and "Anonymous is praying" copy)
              only fits this post type. Other post types still surface
              `prayer.intercessorSummary` on the wire if the backend returns it,
              but we don't render the timeline UI for them. */}
          {prayer.postType === 'prayer_request' && (
            <IntercessorTimeline
              postId={prayer.id}
              prayingCount={prayer.prayingCount}
              initialSummary={prayer.intercessorSummary ?? null}
            />
          )}

          {children}

          {prayer.isAnswered && (
            <AnsweredBadge
              answeredText={prayer.answeredText}
              answeredAt={prayer.answeredAt}
            />
          )}
        </FrostedCard>
      </div>
    </PulseContext.Provider>
  )
}
