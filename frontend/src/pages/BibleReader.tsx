import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { SEO, SITE_URL } from '@/components/SEO'
import { AudioControlBar } from '@/components/bible/AudioControlBar'
import { BibleAmbientChip } from '@/components/bible/BibleAmbientChip'
import { SleepTimerPanel } from '@/components/bible/SleepTimerPanel'
import { useSleepTimerControls } from '@/components/audio/AudioProvider'
import { BookNotFound } from '@/components/bible/BookNotFound'
import { ChapterNav } from '@/components/bible/ChapterNav'
import { ChapterPlaceholder } from '@/components/bible/ChapterPlaceholder'
import { BibleReaderSkeleton } from '@/components/skeletons/BibleReaderSkeleton'
import { ChapterSelector } from '@/components/bible/ChapterSelector'
import { VerseDisplay } from '@/components/bible/VerseDisplay'
import { BookCompletionCard } from '@/components/bible/BookCompletionCard'
import { BIBLE_BOOKS } from '@/constants/bible'
import { getBookBySlug, loadChapter } from '@/data/bible'
import { useAuth } from '@/hooks/useAuth'
import { useBibleAudio } from '@/hooks/useBibleAudio'
import { useBibleHighlights } from '@/hooks/useBibleHighlights'
import { useBibleNotes } from '@/hooks/useBibleNotes'
import { useBibleProgress } from '@/hooks/useBibleProgress'
import { useToast } from '@/components/ui/Toast'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { BibleVerse } from '@/types/bible'

// Loading state: use BibleReaderSkeleton
export function BibleReader() {
  const { book: bookSlug, chapter: chapterParam } = useParams<{
    book: string
    chapter: string
  }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { markChapterRead, isChapterRead, justCompletedBook, progress } = useBibleProgress()
  const { getHighlightsForChapter, getHighlightForVerse, setHighlight: applyHighlight } =
    useBibleHighlights()
  const { getNotesForChapter, getNoteForVerse, saveNote, deleteNote } = useBibleNotes()
  const { showToast } = useToast()
  const { playSoundEffect } = useSoundEffects()

  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [timerPanelOpen, setTimerPanelOpen] = useState(false)
  const [ambientForceCollapse, setAmbientForceCollapse] = useState(false)
  const [cardDismissed, setCardDismissed] = useState(() =>
    bookSlug ? sessionStorage.getItem(`wr_bible_book_complete_dismissed_${bookSlug}`) === 'true' : false,
  )

  const sleepTimer = useSleepTimerControls()
  const announceRef = useRef<HTMLDivElement>(null)

  const [searchParams] = useSearchParams()
  const autoplay = searchParams.get('autoplay') === 'true'

  const book = bookSlug ? getBookBySlug(bookSlug) : undefined
  const chapterNumber = chapterParam ? parseInt(chapterParam, 10) : NaN

  const announce = useCallback((message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message
    }
  }, [])

  const bibleAudio = useBibleAudio({
    verses,
    bookSlug: bookSlug ?? '',
    chapterNumber,
    isAuthenticated,
    hasFullText: book?.hasFullText ?? false,
    isChapterAlreadyRead: bookSlug ? isChapterRead(bookSlug, chapterNumber) : false,
    onChapterComplete: () => {
      if (bookSlug) markChapterRead(bookSlug, chapterNumber)
    },
    onAnnounce: announce,
  })

  // Autoplay: start TTS after 2s delay
  const autoplayFiredRef = useRef(false)
  useEffect(() => {
    if (!autoplay || !isAuthenticated || !bibleAudio.isSupported) return
    if (isLoading || verses.length === 0) return
    if (bibleAudio.playbackState !== 'idle') return
    if (autoplayFiredRef.current) return

    autoplayFiredRef.current = true
    const timer = setTimeout(() => {
      bibleAudio.play()
    }, 2000)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, isAuthenticated, isLoading, verses.length, bibleAudio.isSupported])

  // Load chapter text
  useEffect(() => {
    if (!bookSlug || !book || isNaN(chapterNumber)) return

    let cancelled = false
    setIsLoading(true)
    setLoadError(false)
    setVerses([])

    loadChapter(bookSlug, chapterNumber)
      .then((data) => {
        if (cancelled) return
        setVerses(data?.verses ?? [])
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError(true)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bookSlug, book, chapterNumber])

  // Book completion toast
  useEffect(() => {
    if (!justCompletedBook || justCompletedBook !== bookSlug) return
    const bookData = BIBLE_BOOKS.find(b => b.slug === justCompletedBook)
    if (!bookData) return
    playSoundEffect('bell')
    showToast(`${bookData.name} Complete! You've read all ${bookData.chapters} chapters.`, 'success')
  }, [justCompletedBook, bookSlug, showToast, playSoundEffect])

  const isBookComplete = book && bookSlug
    ? (progress[bookSlug]?.length ?? 0) >= book.chapters
    : false

  const handleChapterSelect = useCallback(
    (chapter: number) => {
      if (!bookSlug) return
      navigate(`/bible/${bookSlug}/${chapter}`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [bookSlug, navigate],
  )

  // Validation
  if (!book) return <BookNotFound />

  if (
    isNaN(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > book.chapters
  ) {
    return <Navigate to={`/bible/${book.slug}/1`} replace />
  }

  const bookName = book.name
  const chapter = chapterNumber
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Bible', item: `${SITE_URL}/bible` },
      { '@type': 'ListItem', position: 3, name: bookName, item: `${SITE_URL}/bible/${bookSlug}/1` },
      { '@type': 'ListItem', position: 4, name: `Chapter ${chapter}` },
    ],
  }

  return (
    <Layout>
      {isLoading ? (
        <SEO title="Loading..." description="Loading Bible chapter..." />
      ) : (
        <SEO
          title={`${bookName} Chapter ${chapter} (WEB)`}
          description={`Read ${bookName} chapter ${chapter} from the World English Bible with highlights and notes.`}
          canonical={`/bible/${bookSlug}/${chapter}`}
          jsonLd={breadcrumbs}
        />
      )}
      <div className="min-h-screen bg-dashboard-dark">
        {/* Screen reader announcements */}
        <div
          ref={announceRef}
          role="status"
          aria-live="polite"
          className="sr-only"
        />

        {/* Hero section */}
        <section
          aria-labelledby="bible-reader-heading"
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-12 lg:pt-40"
          style={ATMOSPHERIC_HERO_BG}
        >
          <h1 id="bible-reader-heading" className="px-1 sm:px-2 font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl">
            <Link
              to={`/bible?book=${book.slug}`}
              className="text-white/60 underline transition-colors hover:text-white"
            >
              {book.name}
            </Link>{' '}
            Chapter {chapterNumber}
          </h1>
        </section>

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Bible', href: '/bible' },
            { label: book.name, href: `/bible?book=${book.slug}` },
            { label: `Chapter ${chapterNumber}` },
          ]}
          maxWidth="max-w-2xl"
        />

        {/* Chapter selector */}
        <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
          <ChapterSelector
            currentChapter={chapterNumber}
            totalChapters={book.chapters}
            onSelectChapter={handleChapterSelect}
          />
        </div>

        {/* Audio control bar */}
        {bibleAudio.isSupported && book.hasFullText && !isLoading && verses.length > 0 && (
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="mt-4">
              <AudioControlBar
                playbackState={bibleAudio.playbackState}
                currentVerseIndex={bibleAudio.currentVerseIndex}
                totalVerses={bibleAudio.totalVerses}
                speed={bibleAudio.speed}
                onSpeedChange={bibleAudio.setSpeed}
                voiceGender={bibleAudio.voiceGender}
                onVoiceGenderChange={bibleAudio.setVoiceGender}
                availableVoiceCount={bibleAudio.availableVoiceCount}
                onPlay={bibleAudio.play}
                onPause={bibleAudio.pause}
                onStop={bibleAudio.stop}
                onTimerClick={() => {
                  setTimerPanelOpen((prev) => !prev)
                  setAmbientForceCollapse(true)
                  setTimeout(() => setAmbientForceCollapse(false), 0)
                }}
                isTimerActive={sleepTimer.isActive}
                isTimerPanelOpen={timerPanelOpen}
                timerRemainingMs={sleepTimer.remainingMs}
                timerTotalDurationMs={sleepTimer.totalDurationMs}
              />
              <SleepTimerPanel
                isOpen={timerPanelOpen}
                onClose={() => setTimerPanelOpen(false)}
              />
              <div className="mt-2">
                <BibleAmbientChip
                  onExpand={() => setTimerPanelOpen(false)}
                  forceCollapse={ambientForceCollapse}
                />
              </div>
            </div>
          </div>
        )}

        {/* Book completion card */}
        {isAuthenticated && bookSlug && isBookComplete && !cardDismissed && (
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <BookCompletionCard
              bookName={book.name}
              bookSlug={bookSlug}
              onDismiss={() => {
                sessionStorage.setItem(`wr_bible_book_complete_dismissed_${bookSlug}`, 'true')
                setCardDismissed(true)
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {loadError ? (
            <div className="py-16 text-center">
              <p className="mb-4 text-white/50">
                Something went wrong loading this chapter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoadError(false)
                  setIsLoading(true)
                  loadChapter(bookSlug!, chapterNumber)
                    .then((data) => {
                      setVerses(data?.verses ?? [])
                      setIsLoading(false)
                    })
                    .catch(() => {
                      setLoadError(true)
                      setIsLoading(false)
                    })
                }}
                className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-lt"
              >
                Try Again
              </button>
            </div>
          ) : !book.hasFullText ? (
            <ChapterPlaceholder
              bookName={book.name}
              chapter={chapterNumber}
            />
          ) : isLoading ? (
            <BibleReaderSkeleton />
          ) : verses.length === 0 ? (
            <div className="py-16 text-center text-white/50">
              No content available for this chapter.
            </div>
          ) : (
            <VerseDisplay
              verses={verses}
              book={book}
              chapterNumber={chapterNumber}
              isAuthenticated={isAuthenticated}
              getHighlightsForChapter={getHighlightsForChapter}
              getHighlightForVerse={getHighlightForVerse}
              setHighlight={applyHighlight}
              getNotesForChapter={getNotesForChapter}
              getNoteForVerse={getNoteForVerse}
              saveNote={saveNote}
              deleteNote={deleteNote}
              currentVerseIndex={bibleAudio.currentVerseIndex}
              isChapterRead={isChapterRead}
              markChapterRead={markChapterRead}
              announce={announce}
            />
          )}

          {/* Chapter navigation */}
          <ChapterNav
            bookSlug={book.slug}
            currentChapter={chapterNumber}
            totalChapters={book.chapters}
          />

          {/* Cross-feature CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 pb-16 text-sm">
            <Link
              to="/daily?tab=pray"
              className="text-white/50 transition-colors hover:text-white/80"
            >
              Pray about this chapter &rarr;
            </Link>
            <Link
              to="/daily?tab=journal"
              className="text-white/50 transition-colors hover:text-white/80"
            >
              Journal your thoughts &rarr;
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}
