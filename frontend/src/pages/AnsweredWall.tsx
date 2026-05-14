import { useCallback, useEffect, useState } from 'react'
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
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { useWatchMode } from '@/hooks/useWatchMode'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'
import * as prayerWallApi from '@/services/api/prayer-wall-api'
import type { PrayerRequest } from '@/types/prayer-wall'
import {
  ANSWERED_WALL_HEADING,
  ANSWERED_WALL_SUBHEAD,
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
  const { reactions, togglePraising, togglePraying, toggleBookmark } =
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
    async function load() {
      try {
        const result = await prayerWallApi.listPosts({
          page: 1,
          limit: 20,
          sort: 'answered',
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
  }, [])

  const handleTogglePraising = useCallback(
    (prayerId: string) => {
      togglePraising(prayerId)
    },
    [togglePraising],
  )

  return (
    <BackgroundCanvas className="flex min-h-screen flex-col font-sans">
      <SEO
        title="Answered Prayers"
        description="Prayers the community has watched God move in. A quiet wall of answered prayer testimonies."
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
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            {ANSWERED_WALL_SUBHEAD}
          </p>
        </section>

        <div className="mx-auto mt-8 max-w-[720px]">
          <PrayerWallViewTabs />
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
                <AnsweredCard key={prayer.id} prayer={prayer} index={index}>
                  <InteractionBar
                    prayer={prayer}
                    reactions={reactions[prayer.id]}
                    onTogglePraying={() => togglePraying(prayer.id)}
                    onToggleComments={() => {}}
                    onToggleBookmark={() => toggleBookmark(prayer.id)}
                    isCommentsOpen={false}
                    showPraising
                    onTogglePraising={() => handleTogglePraising(prayer.id)}
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
