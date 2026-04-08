import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { SEO } from '@/components/SEO'
import { BibleDrawerProvider } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { BooksDrawerContent } from '@/components/bible/BooksDrawerContent'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { ChapterHeading } from '@/components/bible/reader/ChapterHeading'
import { ReaderBody } from '@/components/bible/reader/ReaderBody'
import { ReaderChrome } from '@/components/bible/reader/ReaderChrome'
import { ReaderChapterNav } from '@/components/bible/reader/ReaderChapterNav'
import { TypographySheet } from '@/components/bible/reader/TypographySheet'
import { VerseJumpPill } from '@/components/bible/reader/VerseJumpPill'
import { useReaderSettings } from '@/hooks/useReaderSettings'
import { useChapterSwipe } from '@/hooks/useChapterSwipe'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { getBookBySlug, getAdjacentChapter, loadChapterWeb } from '@/data/bible'
import type { BibleVerse } from '@/types/bible'

function BibleReaderInner() {
  const { book: bookSlug, chapter: chapterParam } = useParams<{
    book: string
    chapter: string
  }>()
  const navigate = useNavigate()

  const { settings, updateSetting, resetToDefaults } = useReaderSettings()
  const bibleDrawer = useBibleDrawer()
  const [typographyOpen, setTypographyOpen] = useState(false)
  const aaRef = useRef<HTMLButtonElement>(null)

  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [paragraphs, setParagraphs] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const book = bookSlug ? getBookBySlug(bookSlug) : undefined
  const chapterNumber = chapterParam ? parseInt(chapterParam, 10) : NaN

  // Swipe gesture (mobile/tablet only)
  const [isSmallViewport, setIsSmallViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const handler = (e: MediaQueryListEvent) => setIsSmallViewport(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { touchHandlers, swipeOffset, isSwiping } = useChapterSwipe({
    bookSlug: bookSlug ?? '',
    currentChapter: chapterNumber,
    enabled: isSmallViewport && !isLoading && !typographyOpen,
  })

  // Load chapter from web/ JSON
  useEffect(() => {
    if (!bookSlug || !book || isNaN(chapterNumber)) return

    let cancelled = false
    setIsLoading(true)
    setLoadError(false)
    setVerses([])
    setParagraphs([])

    loadChapterWeb(bookSlug, chapterNumber)
      .then((data) => {
        if (cancelled) return
        if (data) {
          setVerses(data.verses)
          setParagraphs(data.paragraphs ?? [])
        } else {
          setLoadError(true)
        }
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

  // Scroll to top on chapter change
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [bookSlug, chapterNumber])

  // Read tracking stub — writes for all users (no auth check)
  // TODO BB-17: replace stub
  useEffect(() => {
    if (!bookSlug || !book || isLoading || loadError || verses.length === 0) return

    localStorage.setItem(
      'wr_bible_last_read',
      JSON.stringify({
        book: book.name,
        chapter: chapterNumber,
        verse: 1,
        timestamp: Date.now(),
      }),
    )

    const progressRaw = localStorage.getItem('wr_bible_progress')
    const progress: Record<string, number[]> = progressRaw ? JSON.parse(progressRaw) : {}
    const bookChapters = progress[bookSlug] ?? []
    if (!bookChapters.includes(chapterNumber)) {
      progress[bookSlug] = [...bookChapters, chapterNumber]
      localStorage.setItem('wr_bible_progress', JSON.stringify(progress))
    }
  }, [bookSlug, book, chapterNumber, isLoading, loadError, verses.length])

  // Keyboard shortcuts
  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire if input/textarea is focused
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowLeft' && bookSlug) {
        const prev = getAdjacentChapter(bookSlug, chapterNumber, 'prev')
        if (prev) navigate(`/bible/${prev.bookSlug}/${prev.chapter}`)
      } else if (e.key === 'ArrowRight' && bookSlug) {
        const next = getAdjacentChapter(bookSlug, chapterNumber, 'next')
        if (next) navigate(`/bible/${next.bookSlug}/${next.chapter}`)
      } else if (e.key === ',') {
        setTypographyOpen((p) => !p)
      } else if (e.key === 'b' && !typographyOpen) {
        bibleDrawer.open()
      }
    },
    [bookSlug, chapterNumber, navigate, typographyOpen, bibleDrawer],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  // Validation: invalid book
  if (!book) {
    return (
      <div className="flex min-h-screen flex-col bg-hero-bg">
        <SEO title="Book Not Found" description="This Bible book doesn't exist." />
        <div className="flex flex-1 items-center justify-center px-4">
          <FrostedCard className="max-w-md text-center">
            <p className="mb-6 text-lg text-white">That book doesn't exist.</p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => bibleDrawer.open()}
                className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-lt"
              >
                Browse books
              </button>
              <Link to="/bible" className="text-sm text-white/50 transition-colors hover:text-white/70">
                &larr; Back to Bible
              </Link>
            </div>
          </FrostedCard>
        </div>
        <BibleDrawer isOpen={bibleDrawer.isOpen} onClose={bibleDrawer.close} ariaLabel="Browse books">
          <BooksDrawerContent
            onClose={bibleDrawer.close}
            onSelectBook={(slug) => {
              bibleDrawer.close()
              navigate(`/bible/${slug}/1`)
            }}
          />
        </BibleDrawer>
      </div>
    )
  }

  // Validation: invalid chapter
  if (isNaN(chapterNumber) || chapterNumber < 1 || chapterNumber > book.chapters) {
    return (
      <div className="flex min-h-screen flex-col bg-hero-bg">
        <SEO
          title="Chapter Not Found"
          description={`${book.name} only has ${book.chapters} chapters.`}
        />
        <div className="flex flex-1 items-center justify-center px-4">
          <FrostedCard className="max-w-md text-center">
            <p className="mb-6 text-lg text-white">
              {book.name} only has {book.chapters} chapter{book.chapters !== 1 ? 's' : ''}.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                to={`/bible/${book.slug}/${book.chapters}`}
                className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-lt"
              >
                Go to Chapter {book.chapters}
              </Link>
              <button
                type="button"
                onClick={() => bibleDrawer.open()}
                className="text-sm text-white/50 transition-colors hover:text-white/70"
              >
                Browse books
              </button>
              <Link to="/bible" className="text-sm text-white/50 transition-colors hover:text-white/70">
                &larr; Back to Bible
              </Link>
            </div>
          </FrostedCard>
        </div>
        <BibleDrawer isOpen={bibleDrawer.isOpen} onClose={bibleDrawer.close} ariaLabel="Browse books">
          <BooksDrawerContent
            onClose={bibleDrawer.close}
            onSelectBook={(slug) => {
              bibleDrawer.close()
              navigate(`/bible/${slug}/1`)
            }}
          />
        </BibleDrawer>
      </div>
    )
  }

  const swipeStyle =
    isSwiping && swipeOffset !== 0
      ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
      : isSwiping
        ? { transform: 'translateX(0)', transition: 'transform 200ms ease-out' }
        : undefined

  return (
    <div
      className="relative min-h-screen"
      style={{ background: 'var(--reader-bg)' }}
      data-reader-theme={settings.theme}
      {...touchHandlers}
    >
      <SEO
        title={`${book.name} ${chapterNumber} (WEB)`}
        description={`Read ${book.name} chapter ${chapterNumber} from the World English Bible.`}
        canonical={`/bible/${bookSlug}/${chapterNumber}`}
      />

      <ReaderChrome
        bookName={book.name}
        chapter={chapterNumber}
        onTypographyToggle={() => setTypographyOpen((p) => !p)}
        isTypographyOpen={typographyOpen}
        aaRef={aaRef}
      />

      <TypographySheet
        isOpen={typographyOpen}
        onClose={() => setTypographyOpen(false)}
        settings={settings}
        onUpdate={updateSetting}
        onReset={resetToDefaults}
        anchorRef={aaRef}
      />

      <div style={swipeStyle}>
        <main
          className="mx-auto max-w-2xl px-5 pb-8 pt-20 sm:px-6 sm:pt-24"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center py-16">
              <FrostedCard className="max-w-md text-center">
                <p className="mb-6 text-lg text-white">
                  Couldn't load this chapter. Check your connection.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setLoadError(false)
                    setIsLoading(true)
                    loadChapterWeb(bookSlug!, chapterNumber)
                      .then((data) => {
                        if (data) {
                          setVerses(data.verses)
                          setParagraphs(data.paragraphs ?? [])
                        } else {
                          setLoadError(true)
                        }
                        setIsLoading(false)
                      })
                      .catch(() => {
                        setLoadError(true)
                        setIsLoading(false)
                      })
                  }}
                  className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-lt"
                >
                  Try Again
                </button>
              </FrostedCard>
            </div>
          ) : (
            <>
              <ChapterHeading bookName={book.name} chapter={chapterNumber} />
              <ReaderBody
                verses={verses}
                bookSlug={bookSlug!}
                chapter={chapterNumber}
                settings={settings}
                paragraphs={paragraphs}
              />
            </>
          )}
        </main>

        {!isLoading && !loadError && (
          <ReaderChapterNav
            bookSlug={bookSlug!}
            currentChapter={chapterNumber}
          />
        )}

        <div className="pb-16" />
      </div>

      {/* Verse Jump Pill — long chapters only */}
      {!isLoading && !loadError && (
        <VerseJumpPill totalVerses={verses.length} />
      )}

      {/* Books Drawer */}
      <BibleDrawer
        isOpen={bibleDrawer.isOpen}
        onClose={bibleDrawer.close}
        ariaLabel="Browse books"
      >
        <BooksDrawerContent
          onClose={bibleDrawer.close}
          onSelectBook={(slug) => {
            bibleDrawer.close()
            navigate(`/bible/${slug}/1`)
          }}
        />
      </BibleDrawer>
    </div>
  )
}

export function BibleReader() {
  return (
    <BibleDrawerProvider>
      <BibleReaderInner />
    </BibleDrawerProvider>
  )
}
