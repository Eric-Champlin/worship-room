import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { PrayerWallHero } from '@/components/prayer-wall/PrayerWallHero'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { InlineComposer } from '@/components/prayer-wall/InlineComposer'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { CategoryFilterBar } from '@/components/prayer-wall/CategoryFilterBar'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { useOpenSet } from '@/hooks/useOpenSet'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { getMockPrayers, getMockComments } from '@/mocks/prayer-wall-mock-data'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useTooltipCallout } from '@/hooks/useTooltipCallout'
import { TooltipCallout } from '@/components/ui/TooltipCallout'
import { TOOLTIP_DEFINITIONS } from '@/constants/tooltips'
import { setGettingStartedFlag, isGettingStartedComplete } from '@/services/getting-started-storage'
import { isValidCategory, PRAYER_CATEGORIES, CATEGORY_LABELS, type PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest, PrayerComment } from '@/types/prayer-wall'

const PRAYERS_PER_PAGE = 20

function PrayerWallContent() {
  const { isAuthenticated, user } = useAuth()
  const { showToast, showCelebrationToast } = useToast()
  const { recordActivity } = useFaithPoints()
  const authModal = useAuthModal()
  const openAuthModal = authModal?.openAuthModal
  const allPrayers = useMemo(() => getMockPrayers(), [])

  const [prayers, setPrayers] = useState<PrayerRequest[]>(() =>
    allPrayers.slice(0, PRAYERS_PER_PAGE),
  )
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()
  const [composerOpen, setComposerOpen] = useState(false)
  const [localComments, setLocalComments] = useState<Record<string, PrayerComment[]>>({})

  // Category filter via URL params
  const [searchParams, setSearchParams] = useSearchParams()
  const rawCategory = searchParams.get('category')
  const activeCategory: PrayerCategory | null = isValidCategory(rawCategory) ? rawCategory : null

  const filteredPrayers = useMemo(() => {
    if (!activeCategory) return prayers
    return allPrayers.filter(p => p.category === activeCategory)
  }, [allPrayers, prayers, activeCategory])

  const categoryCounts = useMemo(() => {
    const counts = {} as Record<PrayerCategory, number>
    for (const cat of PRAYER_CATEGORIES) counts[cat] = 0
    for (const p of allPrayers) counts[p.category]++
    return counts
  }, [allPrayers])

  const handleSelectCategory = useCallback(
    (category: PrayerCategory | null) => {
      if (category) {
        setSearchParams({ category }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    },
    [setSearchParams],
  )

  // Sticky filter bar sentinel
  const filterSentinelRef = useRef<HTMLDivElement>(null)
  const [isFilterSticky, setIsFilterSticky] = useState(false)

  useEffect(() => {
    const sentinel = filterSentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsFilterSticky(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Getting Started checklist: flag prayer wall visit
  useEffect(() => {
    if (isAuthenticated && !isGettingStartedComplete()) {
      setGettingStartedFlag('prayer_wall_visited', true)
    }
  }, [isAuthenticated])

  // Tooltip for composer
  const composerRef = useRef<HTMLDivElement>(null)
  const composerTooltip = useTooltipCallout('prayer-wall-composer', composerRef)

  // Ceremony toast timeouts — cleaned up on unmount and rapid toggle
  const ceremonyTimeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    return () => {
      ceremonyTimeoutRefs.current.forEach(clearTimeout)
    }
  }, [])

  const hasMore = prayers.length < allPrayers.length

  const loadMore = useCallback(() => {
    setPrayers((prev) => allPrayers.slice(0, prev.length + PRAYERS_PER_PAGE))
  }, [allPrayers])

  const handleComposerSubmit = useCallback(
    (content: string, isAnonymous: boolean, category: PrayerCategory) => {
      if (!isAuthenticated) return

      const newPrayer: PrayerRequest = {
        id: `prayer-new-${Date.now()}`,
        userId: isAnonymous ? null : (user?.id ?? null),
        authorName: isAnonymous ? 'Anonymous' : (user?.name ?? 'You'),
        authorAvatarUrl: null,
        isAnonymous,
        content,
        category,
        isAnswered: false,
        answeredText: null,
        answeredAt: null,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        prayingCount: 0,
        commentCount: 0,
      }
      setPrayers((prev) => [newPrayer, ...prev])
      setComposerOpen(false)
      showToast('Your prayer has been shared.')
    },
    [user, isAuthenticated, showToast],
  )

  const handleTogglePraying = useCallback(
    (prayerId: string) => {
      // Clear any pending ceremony timeouts (rapid toggle protection)
      ceremonyTimeoutRefs.current.forEach(clearTimeout)
      ceremonyTimeoutRefs.current = []

      const wasPraying = togglePraying(prayerId)
      if (!wasPraying) {
        recordActivity('prayerWall')

        // Success toast after 600ms ceremony
        const successTimeout = setTimeout(() => {
          showToast('Your prayer has been lifted up')
        }, 600)
        ceremonyTimeoutRefs.current.push(successTimeout)

        // Author notification: check if prayer author is the logged-in user
        const prayer = prayers.find((p) => p.id === prayerId)
        if (prayer?.userId && prayer.userId === user?.id) {
          const authorTimeout = setTimeout(() => {
            showCelebrationToast(
              '',
              '\u{1F64F} Someone is praying for your request',
              'celebration',
            )
          }, 800)
          ceremonyTimeoutRefs.current.push(authorTimeout)
        }
      }
      // No toast on untoggle

      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? { ...p, prayingCount: p.prayingCount + (wasPraying ? -1 : 1) }
            : p,
        ),
      )
    },
    [togglePraying, recordActivity, showToast, showCelebrationToast, prayers, user],
  )

  const handleSubmitComment = useCallback(
    // TODO(phase-3): POST to /api/prayer-replies with { prayerId, content }
    // and refresh comments from the API response.
    // Crisis detection MUST run on the backend. See .claude/rules/01-ai-safety.md.
    (prayerId: string, content: string) => {
      if (!isAuthenticated) return
      const newComment: PrayerComment = {
        id: `comment-local-${Date.now()}`,
        prayerId,
        userId: user?.id ?? 'anonymous',
        authorName: user?.name ?? 'You',
        authorAvatarUrl: null,
        content,
        createdAt: new Date().toISOString(),
      }
      setLocalComments((prev) => ({
        ...prev,
        [prayerId]: [newComment, ...(prev[prayerId] ?? [])],
      }))
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? {
                ...p,
                commentCount: p.commentCount + 1,
                lastActivityAt: new Date().toISOString(),
              }
            : p,
        ),
      )
      recordActivity('prayerWall')
      showToast('Comment posted.')
    },
    [isAuthenticated, showToast, user, recordActivity],
  )

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <PrayerWallHero
        action={
          isAuthenticated ? (
            <div
              ref={composerRef}
              className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
              {...(composerTooltip.shouldShow ? { 'aria-describedby': 'prayer-wall-composer' } : {})}
            >
              <button
                type="button"
                onClick={() => setComposerOpen(!composerOpen)}
                className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Share a Prayer Request
              </button>
              <Link
                to="/prayer-wall/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:rounded"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                My Dashboard
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal?.()}
              className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Share a Prayer Request
            </button>
          )
        }
      />

      {/* Sentinel for sticky filter bar */}
      <div ref={filterSentinelRef} aria-hidden="true" />

      {/* Filter Bar */}
      <div className={cn(
        'sticky top-0 z-30 transition-shadow',
        isFilterSticky && 'shadow-md',
      )}>
        <CategoryFilterBar
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          categoryCounts={categoryCounts}
          showCounts={activeCategory !== null}
        />
      </div>

      {/* Screen reader announcement for filter changes */}
      <div className="sr-only" aria-live="polite">
        {activeCategory
          ? `Showing ${filteredPrayers.length} ${CATEGORY_LABELS[activeCategory]} prayers`
          : `Showing all ${allPrayers.length} prayers`}
      </div>

      <main
        id="main-content"
        className="mx-auto max-w-[720px] flex-1 px-4 py-6 sm:py-8"
      >

        {/* Inline Composer */}
        <InlineComposer
          isOpen={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSubmit={handleComposerSubmit}
        />

        {/* Prayer cards feed */}
        <div className="flex flex-col gap-4">
          {filteredPrayers.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer} onCategoryClick={handleSelectCategory}>
              <InteractionBar
                prayer={prayer}
                reactions={reactions[prayer.id]}
                onTogglePraying={() => handleTogglePraying(prayer.id)}
                onToggleComments={() => handleToggleComments(prayer.id)}
                onToggleBookmark={() => toggleBookmark(prayer.id)}
                isCommentsOpen={openComments.has(prayer.id)}
              />
              <CommentsSection
                prayerId={prayer.id}
                isOpen={openComments.has(prayer.id)}
                comments={[...(localComments[prayer.id] ?? []), ...getMockComments(prayer.id)]}
                totalCount={prayer.commentCount}
                onSubmitComment={handleSubmitComment}
                prayerContent={prayer.content}
              />
            </PrayerCard>
          ))}
        </div>

        {/* Empty state for filtered views */}
        {filteredPrayers.length === 0 && activeCategory && (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="mb-4 text-lg text-text-light">
              No prayers in this category yet. Be the first to share.
            </p>
            <button
              type="button"
              onClick={() => {
                if (isAuthenticated) {
                  setComposerOpen(true)
                } else {
                  openAuthModal?.('Sign in to share a prayer request')
                }
              }}
              className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-lt"
            >
              Share a Prayer Request
            </button>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={loadMore}>
              Load More
            </Button>
          </div>
        )}
      </main>
      <SiteFooter />
      {composerTooltip.shouldShow && (
        <TooltipCallout
          targetRef={composerRef}
          message={TOOLTIP_DEFINITIONS['prayer-wall-composer'].message}
          tooltipId="prayer-wall-composer"
          position={TOOLTIP_DEFINITIONS['prayer-wall-composer'].position}
          onDismiss={composerTooltip.dismiss}
        />
      )}
    </div>
  )
}

export function PrayerWall() {
  return <PrayerWallContent />
}
