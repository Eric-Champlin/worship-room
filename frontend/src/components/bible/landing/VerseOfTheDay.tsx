import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Share2, Bookmark } from 'lucide-react'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useVerseOfTheDay } from '@/hooks/bible/useVerseOfTheDay'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useToast } from '@/components/ui/Toast'
import {
  toggleBookmark,
  isSelectionBookmarked,
  setBookmarkLabel,
  subscribe as subscribeBookmarks,
} from '@/lib/bible/bookmarkStore'
import { VotdShareModal } from './VotdShareModal'

export function VerseOfTheDay() {
  const { votd, isLoading } = useVerseOfTheDay()
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const { showToast } = useToast()
  const [shareOpen, setShareOpen] = useState(false)

  // Bookmark state — reactive via store subscription
  const [isBookmarked, setIsBookmarked] = useState(() =>
    votd
      ? isSelectionBookmarked(
          votd.entry.book,
          votd.entry.chapter,
          votd.entry.startVerse,
          votd.entry.endVerse,
        )
      : false,
  )

  useEffect(() => {
    if (!votd) return
    // Sync on votd change
    setIsBookmarked(
      isSelectionBookmarked(
        votd.entry.book,
        votd.entry.chapter,
        votd.entry.startVerse,
        votd.entry.endVerse,
      ),
    )
    // Subscribe for external changes (e.g. from reader)
    const unsubscribe = subscribeBookmarks(() => {
      setIsBookmarked(
        isSelectionBookmarked(
          votd.entry.book,
          votd.entry.chapter,
          votd.entry.startVerse,
          votd.entry.endVerse,
        ),
      )
    })
    return unsubscribe
  }, [votd])

  const handleSave = useCallback(() => {
    if (!votd) return

    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save verses')
      return
    }

    const result = toggleBookmark({
      book: votd.entry.book,
      chapter: votd.entry.chapter,
      startVerse: votd.entry.startVerse,
      endVerse: votd.entry.endVerse,
    })

    if (result.created && result.bookmark) {
      setBookmarkLabel(
        result.bookmark.id,
        `Verse of the Day · ${new Date().toLocaleDateString()}`,
      )
      showToast('Verse saved', 'success')
    } else {
      showToast('Bookmark removed', 'success')
    }
  }, [votd, isAuthenticated, authModal, showToast])

  // Skeleton
  if (isLoading || !votd) {
    return (
      <div className="mx-auto max-w-2xl">
        <FrostedCard as="article">
          <div className="motion-safe:animate-pulse space-y-4">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="space-y-2">
              <div className="h-6 w-full rounded bg-white/10" />
              <div className="h-6 w-3/4 rounded bg-white/10" />
            </div>
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="flex gap-4">
              <div className="h-8 w-28 rounded bg-white/10" />
              <div className="h-8 w-16 rounded bg-white/10" />
              <div className="h-8 w-16 rounded bg-white/10" />
            </div>
          </div>
        </FrostedCard>
      </div>
    )
  }

  const { entry, verseText } = votd
  // BB-38: renamed from `highlightParam` to `scrollToParam` to match the
  // ?scroll-to= URL parameter (renamed from ?highlight=).
  const scrollToParam =
    entry.endVerse > entry.startVerse
      ? `${entry.startVerse}-${entry.endVerse}`
      : String(entry.startVerse)

  const verseFontClass = 'font-serif text-lg sm:text-xl text-white leading-relaxed'

  return (
    <div className="mx-auto max-w-2xl">
      <FrostedCard as="article">
        {/* VERSE OF THE DAY label */}
        <span className="text-xs font-medium uppercase tracking-widest text-white/50">
          Verse of the Day
        </span>

        {/* Verse text — cinematic display, no quotation marks */}
        <blockquote className={`mt-4 text-center sm:text-left ${verseFontClass}`}>
          {verseText}
        </blockquote>

        {/* Reference */}
        <cite className="mt-3 block text-sm font-semibold not-italic text-white/60">
          {entry.ref}
        </cite>

        {/* Action row + date */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Read in context */}
            <Link
              to={`/bible/${entry.book}/${entry.chapter}?scroll-to=${scrollToParam}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
              aria-label="Read this verse in context"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Read in context
            </Link>

            {/* Share */}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              aria-label="Share verse of the day"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </button>

            {/* Save / Saved */}
            <button
              type="button"
              onClick={handleSave}
              aria-label={isBookmarked ? 'Remove saved verse' : 'Save verse of the day'}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-white hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dashboard-dark"
            >
              <Bookmark
                className="h-4 w-4"
                aria-hidden="true"
                fill={isBookmarked ? 'currentColor' : 'none'}
              />
              {isBookmarked ? 'Saved' : 'Save'}
            </button>
          </div>

          {/* Date */}
          <time
            dateTime={new Date().toISOString().split('T')[0]}
            className="text-xs text-white/40"
          >
            {new Date().toLocaleDateString()}
          </time>
        </div>
      </FrostedCard>

      {/* Share modal */}
      {shareOpen && votd && (
        <VotdShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          votd={votd}
        />
      )}
    </div>
  )
}
