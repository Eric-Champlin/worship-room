import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HandHelping, Heart, HelpCircle, Lock, MessagesSquare, Sparkles, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ANIMATION_DURATIONS } from '@/constants/animation'
import type { PostType } from '@/constants/post-types'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest } from '@/types/prayer-wall'
import type { IntercessorEntry } from '@/types/intercessor'
import { useIntercessors } from '@/hooks/useIntercessors'
import { getChallenge } from '@/data/challenges'
import { Avatar } from './Avatar'
import { AnsweredBadge } from './AnsweredBadge'
import { PostImage } from './PostImage'
import { WaysToHelpPills } from './WaysToHelpPills'
import { CategoryBadge } from './CategoryBadge'
import { FromFriendChip } from './FromFriendChip'
import { QotdBadge } from './QotdBadge'
import { ScriptureChip } from './ScriptureChip'
import { IntercessorTimeline } from './IntercessorTimeline'
import { formatFullDate, timeAgo } from '@/lib/time'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { cn } from '@/lib/utils'
import { getPerTypeChromeClass } from '@/constants/post-type-chrome'
import {
  ANSWER_TEXT_REGION_LABEL,
  ANSWERED_TIMESTAMP_PREFIX,
  ANSWERED_TEXT_MISSING_FALLBACK,
  SHARE_UPDATE_LABEL,
  EDIT_UPDATE_LABEL,
} from '@/constants/answered-wall-copy'
import { AuthContext } from '@/contexts/AuthContext'
import { MarkAsAnsweredForm } from './MarkAsAnsweredForm'
import { UnmarkAnsweredDialog } from './UnmarkAnsweredDialog'

const PulseContext = createContext<(() => void) | null>(null)
// eslint-disable-next-line react-refresh/only-export-components -- Hook co-located with PrayerCard
export function usePrayerCardPulse() { return useContext(PulseContext) }

// Spec 6.5 — Intercessor optimistic actions exposed to InteractionBar (which
// is mounted under PrayerCard's `{children}` slot). Mirrors the PulseContext
// pattern above. Null when there is no provider (e.g., InteractionBar mounted
// outside a PrayerCard, or in a test with no PrayerCard wrap) — consumers
// must null-check.
export interface IntercessorActions {
  optimisticInsert: (entry: IntercessorEntry) => void
  optimisticRemove: (viewerUserId: string) => void
}
const IntercessorActionsContext = createContext<IntercessorActions | null>(null)
// eslint-disable-next-line react-refresh/only-export-components -- Hook co-located with PrayerCard
export function useIntercessorActions() { return useContext(IntercessorActionsContext) }

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

/**
 * Spec 7.7 — Visibility tier marker. Renders a small lucide-react icon next
 * to the post timestamp for non-public tiers; renders nothing for 'public'
 * (Plan-Time Divergence #3 — absence of icon == Public is a clear visual
 * rule; reduces noise on the dominant case). NOT interactive — pure visual
 * cue per MPD-10. Shown to every viewer regardless of post ownership (R7).
 */
function VisibilityIcon({
  visibility,
}: {
  visibility?: 'public' | 'friends' | 'private'
}) {
  if (visibility === 'friends') {
    return (
      <span
        className="inline-flex items-center text-white/60"
        title="Friends only"
        aria-label="Visible to friends only"
      >
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    )
  }
  if (visibility === 'private') {
    return (
      <span
        className="inline-flex items-center text-white/60"
        title="Private"
        aria-label="Private — visible only to you"
      >
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    )
  }
  return null
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
  /** Spec 6.6 — Answered Wall variant. When true AND prayer.isAnswered, the small
   *  inline AnsweredBadge is replaced with a prominent "How this was answered"
   *  region (eyebrow + answer text + relative timestamp). Default false; other
   *  surfaces (main feed, profile, dashboard) keep the inline pill. */
  answeredVariant?: boolean
  /** Spec 6.6b — called when the author confirms un-mark via UnmarkAnsweredDialog.
   *  The parent owns the API call (`prayerWallApi.updatePost({ isAnswered: false })`).
   *  Only rendered when the viewer is the post author AND answeredVariant=true. */
  onUnmark?: () => void
  /** Spec 6.6b — called when the author saves an edited / shared answered_text
   *  via the inline MarkAsAnsweredForm. The parent owns the API call
   *  (`prayerWallApi.updatePost({ answeredText })`). Only rendered when the
   *  viewer is the post author AND answeredVariant=true. */
  onEditAnsweredText?: (text: string) => void
}

export function PrayerCard({ prayer, showFull = false, onCategoryClick, children, index = 99, tier = 'feed', answeredVariant = false, onUnmark, onEditAnsweredText }: PrayerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  // Spec 6.6b — author affordance state. `editMode` toggles MarkAsAnsweredForm
  // (edit mode) inline below the answered region; the dialog state lives inside
  // UnmarkAnsweredDialog itself.
  const [editMode, setEditMode] = useState(false)
  // Spec 6.6b — read AuthContext directly (not useAuth) so legacy PrayerCard
  // tests that don't wrap in AuthProvider don't throw. `null` context resolves
  // to "not authenticated" — the affordance row hides naturally.
  const authCtx = useContext(AuthContext)
  const authUser = authCtx?.user ?? null
  // Spec 6.6b — author check for the affordance row. W26: never surface the
  // affordances to non-authors; the backend's ownership gate is enforced at
  // PATCH time but the UI must not display them. PrayerRequest.userId is null
  // for anonymous posts — anonymous posts never surface author affordances on
  // the Answered Wall (the author isn't displayed in any case).
  const isAuthor =
    authUser !== null && prayer.userId !== null && authUser.id === prayer.userId
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

  // Spec 6.5 — Intercessor Timeline state owned at the PrayerCard level so
  // that InteractionBar (mounted under `{children}` below) can fire
  // optimisticInsert / optimisticRemove via IntercessorActionsContext when
  // the viewer toggles their own praying reaction. Live count is `prayer.prayingCount`
  // — the hook syncs to it while collapsed and switches to server-truth on expand.
  const intercessor = useIntercessors(prayer.id, prayer.prayingCount)
  const intercessorActions = useMemo<IntercessorActions>(
    () => ({
      optimisticInsert: intercessor.optimisticInsert,
      optimisticRemove: intercessor.optimisticRemove,
    }),
    [intercessor.optimisticInsert, intercessor.optimisticRemove],
  )

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
     <IntercessorActionsContext.Provider value={intercessorActions}>
      {/* Spec 6.8 — data-prayer-category attribute consumed by PrayerWall.tsx
          IntersectionObserver to track the last-viewed post's category for
          the reading-time trigger. Plain HTML attribute, no behavior change. */}
      <div ref={articleRef} data-prayer-category={prayer.category ?? ''}>
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
                {/* Spec 7.7 — visibility tier marker (Users for friends, Lock
                    for private, nothing for public). */}
                <VisibilityIcon visibility={prayer.visibility} />
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <CategoryBadge
                  category={prayer.category}
                  onClick={onCategoryClick}
                />
                {prayer.isFromFriend === true && <FromFriendChip />}
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
              initialSummary={prayer.intercessorSummary ?? null}
              entries={intercessor.entries}
              totalCount={intercessor.totalCount}
              expanded={intercessor.expanded}
              loading={intercessor.loading}
              error={intercessor.error}
              onExpand={intercessor.expand}
              onCollapse={intercessor.collapse}
            />
          )}

          {children}

          {prayer.isAnswered && answeredVariant && (
            // Spec 6.6 — AnsweredCard prominent treatment. Eyebrow + answer text
            // + relative timestamp. Replaces the small inline AnsweredBadge so
            // the testimony of the answered prayer is the focal point of the card.
            <section
              aria-label={ANSWER_TEXT_REGION_LABEL}
              className="mt-4 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7"
            >
              <p className="mb-3 text-xs font-medium tracking-[0.15em] text-white/50">
                HOW THIS WAS ANSWERED
              </p>
              {prayer.answeredText && (
                <p className="whitespace-pre-wrap text-[17px] leading-[1.75] text-white sm:text-lg">
                  {prayer.answeredText}
                </p>
              )}
              {/* Spec 6.6b — missing-answer-text fallback. Renders when a post
                  is marked answered but the author has not shared an update
                  (or cleared the text). Quieter italic style than the answer
                  itself — surfaces the state without competing visually. */}
              {!prayer.answeredText && (
                <p className="text-base italic leading-relaxed text-white/50">
                  {ANSWERED_TEXT_MISSING_FALLBACK}
                </p>
              )}
              {prayer.answeredAt && (
                <p className="mt-3 text-xs text-white/50">
                  {ANSWERED_TIMESTAMP_PREFIX}
                  {timeAgo(prayer.answeredAt)}
                </p>
              )}

              {/* Spec 6.6b — author-only affordance row. Hidden when not the
                  author (W26) and hidden when no callbacks are provided (other
                  PrayerCard call sites are unaffected). When `editMode` is true,
                  the form replaces the affordance row inline. */}
              {isAuthor && (onUnmark || onEditAnsweredText) && (
                <div className="mt-5 border-t border-white/[0.08] pt-4">
                  {editMode && onEditAnsweredText ? (
                    <MarkAsAnsweredForm
                      mode="edit"
                      initialText={prayer.answeredText ?? ''}
                      onConfirm={(text) => {
                        onEditAnsweredText(text)
                        setEditMode(false)
                      }}
                      onCancel={() => setEditMode(false)}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {onEditAnsweredText && (
                        <button
                          type="button"
                          onClick={() => setEditMode(true)}
                          className="inline-flex min-h-[44px] items-center rounded-full border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-sm font-medium text-white/70 transition-colors duration-fast hover:bg-white/[0.10] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        >
                          {prayer.answeredText ? EDIT_UPDATE_LABEL : SHARE_UPDATE_LABEL}
                        </button>
                      )}
                      {onUnmark && <UnmarkAnsweredDialog onConfirm={onUnmark} />}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {prayer.isAnswered && !answeredVariant && (
            <AnsweredBadge
              answeredText={prayer.answeredText}
              answeredAt={prayer.answeredAt}
            />
          )}
        </FrostedCard>
      </div>
     </IntercessorActionsContext.Provider>
    </PulseContext.Provider>
  )
}
