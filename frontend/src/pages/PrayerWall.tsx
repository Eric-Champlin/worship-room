import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { PrayerWallHero } from '@/components/prayer-wall/PrayerWallHero'
import { PrayerCard } from '@/components/prayer-wall/PrayerCard'
import { InteractionBar } from '@/components/prayer-wall/InteractionBar'
import { InlineComposer } from '@/components/prayer-wall/InlineComposer'
import { CommentsSection } from '@/components/prayer-wall/CommentsSection'
import { Button } from '@/components/ui/Button'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useOpenSet } from '@/hooks/useOpenSet'
import { usePrayerReactions } from '@/hooks/usePrayerReactions'
import { getMockPrayers, getMockComments } from '@/mocks/prayer-wall-mock-data'
import { AuthModalProvider, useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import type { PrayerRequest, PrayerComment } from '@/types/prayer-wall'

const PRAYERS_PER_PAGE = 20

function PrayerWallContent() {
  const { isLoggedIn, user } = useAuth()
  const { showToast } = useToast()
  const { openAuthModal } = useAuthModal()
  const allPrayers = useMemo(() => getMockPrayers(), [])

  const [prayers, setPrayers] = useState<PrayerRequest[]>(() =>
    allPrayers.slice(0, PRAYERS_PER_PAGE),
  )
  const { reactions, togglePraying, toggleBookmark } = usePrayerReactions()
  const { openSet: openComments, toggle: handleToggleComments } = useOpenSet()
  const [composerOpen, setComposerOpen] = useState(false)
  const [localComments, setLocalComments] = useState<Record<string, PrayerComment[]>>({})

  const hasMore = prayers.length < allPrayers.length

  const loadMore = useCallback(() => {
    setPrayers((prev) => allPrayers.slice(0, prev.length + PRAYERS_PER_PAGE))
  }, [allPrayers])

  const handleComposerSubmit = useCallback(
    (content: string, isAnonymous: boolean) => {
      if (!isLoggedIn) return

      const newPrayer: PrayerRequest = {
        id: `prayer-new-${Date.now()}`,
        userId: isAnonymous ? null : (user?.id ?? null),
        authorName: isAnonymous ? 'Anonymous' : (user?.firstName ?? 'You'),
        authorAvatarUrl: null,
        isAnonymous,
        content,
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
    [user, isLoggedIn, showToast],
  )

  const handleTogglePraying = useCallback(
    (prayerId: string) => {
      const wasPraying = togglePraying(prayerId)
      setPrayers((prev) =>
        prev.map((p) =>
          p.id === prayerId
            ? { ...p, prayingCount: p.prayingCount + (wasPraying ? -1 : 1) }
            : p,
        ),
      )
    },
    [togglePraying],
  )

  const handleSubmitComment = useCallback(
    // TODO(phase-3): POST to /api/prayer-replies with { prayerId, content }
    // and refresh comments from the API response.
    // Crisis detection MUST run on the backend. See .claude/rules/01-ai-safety.md.
    (prayerId: string, content: string) => {
      if (!isLoggedIn) return
      const newComment: PrayerComment = {
        id: `comment-local-${Date.now()}`,
        prayerId,
        userId: user?.id ?? 'anonymous',
        authorName: user?.firstName ?? 'You',
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
      showToast('Comment posted.')
    },
    [isLoggedIn, showToast, user],
  )

  return (
    <div className="min-h-screen bg-neutral-bg font-sans">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar transparent />
      <PrayerWallHero
        action={
          isLoggedIn ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
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
              onClick={openAuthModal}
              className="rounded-lg border border-white/30 bg-white/10 px-8 py-3 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              Share a Prayer Request
            </button>
          )
        }
      />
      <main
        id="main-content"
        className="mx-auto max-w-[720px] px-4 py-6 sm:py-8"
      >

        {/* Inline Composer */}
        <InlineComposer
          isOpen={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSubmit={handleComposerSubmit}
        />

        {/* Prayer cards feed */}
        <div className="flex flex-col gap-4">
          {prayers.map((prayer) => (
            <PrayerCard key={prayer.id} prayer={prayer}>
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
              />
            </PrayerCard>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={loadMore}>
              Load More
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

export function PrayerWall() {
  return (
    <ToastProvider>
      <AuthModalProvider>
        <PrayerWallContent />
      </AuthModalProvider>
    </ToastProvider>
  )
}
