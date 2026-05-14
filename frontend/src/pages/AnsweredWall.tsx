import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { SiteFooter } from '@/components/SiteFooter'
import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
import { SEO } from '@/components/SEO'
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { PrayerWallSkeleton } from '@/components/skeletons/PrayerWallSkeleton'
import { AnsweredCard } from '@/components/prayer-wall/AnsweredCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { PrayerWallViewTabs } from '@/components/prayer-wall/PrayerWallViewTabs'
import { CrisisResourcesBanner } from '@/components/prayer-wall/CrisisResourcesBanner'
import { AnsweredCategoryFilter } from '@/components/prayer-wall/AnsweredCategoryFilter'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { useWatchMode } from '@/hooks/useWatchMode'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import type { PrayerRequest } from '@/types/prayer-wall'
import {
  ANSWERED_WALL_HEADING,
  ANSWERED_WALL_SUBHEAD_6_6B,
  ANSWERED_WALL_INTRO,
  ANSWERED_WALL_EMPTY_STATE,
} from '@/constants/answered-wall-copy'

/**
 * Spec 6.6 — Answered Wall. Consumes the existing
 * `GET /api/v1/posts?sort=answered` feed (no new endpoint per Plan-Time
 * Discovery #1). Renders AnsweredCard for each answered post, surfacing the
 * "How this was answered" testimony as the focal point of each card. Empty
 * state when no answered prayers exist.
 *
 * Anti-pressure design (Gate-G-NO-METRICS): no page-level counts, no
 * trending, no leaderboards. Sort is `answered_at DESC` only.
 */
export default function AnsweredWall() {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  // Spec 6.6b — URL-driven category filter. Drives the GET /api/v1/posts request
  // and reflects the active chip in AnsweredCategoryFilter. No localStorage write
  // (ED-7) — URL IS the canonical state.
  const category = searchParams.get('category') ?? undefined
  const { reactions, togglePraising, toggleCelebrate, togglePraying, toggleBookmark } =
    usePrayerReactions()
  // Spec 6.4 Gate-G-CRISIS-RESOURCES-ALWAYS-VISIBLE: the crisis banner must
  // mount on every Prayer Wall family route (/prayer-wall, /prayer-wall/:id,
  // /prayer-wall/dashboard, /prayer-wall/user/:id, AND now
  // /prayer-wall/answered). PrayerWall.tsx mounts it inline rather than via
  // PageShell because BackgroundCanvas is the canonical atmospheric layer;
  // AnsweredWall mirrors that pattern.
  const watchMode = useWatchMode()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const result = await prayerWallApi.listPosts({
          page: 1,
          limit: 20,
          sort: 'answered',
          category,
        })
        if (cancelled) return
        setPrayers(result.posts)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'We could not load the Answered Wall right now.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [category])

  const handleTogglePraising = useCallback(
    (prayerId: string) => {
      togglePraising(prayerId)
    },
    [togglePraising],
  )

  const handleToggleCelebrate = useCallback(
    (prayerId: string) => {
      toggleCelebrate(prayerId)
    },
    [toggleCelebrate],
  )

  // Spec 6.6b — author affordance handlers. Both call the existing
  // `updatePost` API helper (Step 21 — no new HTTP routes needed; PATCH
  // /api/v1/posts/{id} handles both shapes). On success, optimistically
  // update the local feed state.
  const handleUnmark = useCallback(
    async (prayerId: string) => {
      try {
        await prayerWallApi.updatePost(prayerId, { isAnswered: false })
        // The un-marked post leaves the answered feed — filter it out of
        // local state so the user sees the change immediately. The next
        // refetch will confirm via the backend cache eviction.
        setPrayers((prev) => prev.filter((p) => p.id !== prayerId))
      } catch (err) {
        // Silent failure — the post stays in the feed and the next refetch
        // recovers the canonical state. Future spec can surface a toast.
        console.warn('Un-mark answered failed:', err)
      }
    },
    [],
  )

  const handleEditAnsweredText = useCallback(
    async (prayerId: string, text: string) => {
      try {
        const updated = await prayerWallApi.updatePost(prayerId, {
          answeredText: text,
        })
        // MERGE, do not replace. `prayerWallApi.updatePost` returns a
        // single-post `PostDto` mapped via PostMapper.toDto, which does NOT
        // populate `intercessorSummary` (only the feed endpoint's
        // toDtoList does). A wholesale replace would silently drop the
        // intercessor names on this card until the next paginated refetch.
        // Spread preserves every field the update response doesn't
        // re-send, including intercessorSummary, image, helpTags, etc.
        setPrayers((prev) =>
          prev.map((p) => (p.id === prayerId ? { ...p, ...updated } : p)),
        )
      } catch (err) {
        console.warn('Edit answered text failed:', err)
      }
    },
    [],
  )

  return (
    <BackgroundCanvas className="flex min-h-screen flex-col font-sans">
      <SEO
        title="Answered Prayers"
        description="Answered prayers, shared as gratitude. A quiet wall of testimonies — not a leaderboard."
        ogImageAlt="The Worship Room Answered Wall — answered prayer testimonies"
      />
      <Navbar transparent />
      {watchMode.active && (
        <div className="mx-auto mt-4 w-full max-w-[720px] px-4">
          <CrisisResourcesBanner />
        </div>
      )}
      <main
        id="main-content"
        className="relative z-10 flex-1 px-4 pt-[145px] pb-12 sm:px-6"
      >
        <section className="mx-auto max-w-[720px] text-center">
          <h1
            className="text-4xl font-bold leading-tight sm:text-5xl"
            style={GRADIENT_TEXT_STYLE}
          >
            {ANSWERED_WALL_HEADING}
          </h1>
          {/* Spec 6.6b — load-bearing subhead. Lora italic, <h2> within <main>.
              Gate-G-COPY: the live Spec 6.6 master plan stub's own notes flag
              this as the single most important copy on the page. */}
          <h2 className="mt-2 font-serif text-lg italic text-white/80 sm:text-xl">
            {ANSWERED_WALL_SUBHEAD_6_6B}
          </h2>
          {/* Spec 6.6b — intro paragraph. Calm context, NOT a CTA. Acknowledges
              the survivorship-bias problem so the wall doesn't read as a
              leaderboard of "winners". */}
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60">
            {ANSWERED_WALL_INTRO}
          </p>
        </section>

        <div className="mx-auto mt-8 max-w-[720px]">
          <PrayerWallViewTabs />
        </div>

        {/* Spec 6.6b — category filter chip row. URL-driven via ?category=.
            Six chips (All + 5 categories); Mental Health is deliberately
            omitted (Gate-G-MH-OMISSION — see AnsweredCategoryFilter comment). */}
        <div className="mx-auto mt-6 max-w-[720px]">
          <AnsweredCategoryFilter />
        </div>

        <section className="mx-auto mt-8 max-w-[720px]">
          {loading && <PrayerWallSkeleton />}

          {!loading && error && (
            <div
              role="alert"
              className="mx-auto max-w-md rounded-2xl border border-red-400/30 bg-red-950/30 p-6 text-center text-sm text-red-100"
            >
              <p className="font-medium">We couldn't load the Answered Wall.</p>
              <p className="mt-1 text-red-100/80">Try reloading the page.</p>
            </div>
          )}

          {!loading && !error && prayers.length === 0 && (
            <FeatureEmptyState
              icon={Sparkles}
              heading="No answered prayers yet"
              description={ANSWERED_WALL_EMPTY_STATE}
            />
          )}

          {!loading && !error && prayers.length > 0 && (
            <div className="space-y-6">
              {prayers.map((prayer, index) => (
                <AnsweredCard
                  key={prayer.id}
                  prayer={prayer}
                  index={index}
                  onUnmark={() => void handleUnmark(prayer.id)}
                  onEditAnsweredText={(text) =>
                    void handleEditAnsweredText(prayer.id, text)
                  }
                >
                  <InteractionBar
                    prayer={prayer}
                    reactions={reactions[prayer.id]}
                    onTogglePraying={() => togglePraying(prayer.id)}
                    onToggleComments={() => {}}
                    onToggleBookmark={() => toggleBookmark(prayer.id)}
                    isCommentsOpen={false}
                    showPraising
                    onTogglePraising={() => handleTogglePraising(prayer.id)}
                    showCelebrate
                    onToggleCelebrate={() => handleToggleCelebrate(prayer.id)}
                  />
                </AnsweredCard>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </BackgroundCanvas>
  )
}
