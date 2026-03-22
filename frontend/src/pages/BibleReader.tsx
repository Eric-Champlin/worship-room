import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import { BookNotFound } from '@/components/bible/BookNotFound'
import { ChapterNav } from '@/components/bible/ChapterNav'
import { ChapterPlaceholder } from '@/components/bible/ChapterPlaceholder'
import { ChapterSelector } from '@/components/bible/ChapterSelector'
import { getBookBySlug, loadChapter } from '@/data/bible'
import { useAuth } from '@/hooks/useAuth'
import { useBibleProgress } from '@/hooks/useBibleProgress'
import { cn } from '@/lib/utils'
import type { BibleVerse } from '@/types/bible'

const READER_BG_STYLE = {
  backgroundImage:
    'radial-gradient(100% 80% at 50% 0%, #3B0764 0%, transparent 60%), linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #0D0620 100%)',
  backgroundSize: '100% 100%',
} as const

export function BibleReader() {
  const { book: bookSlug, chapter: chapterParam } = useParams<{
    book: string
    chapter: string
  }>()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { markChapterRead, isChapterRead } = useBibleProgress()

  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const hasMarkedRef = useRef(false)

  const book = bookSlug ? getBookBySlug(bookSlug) : undefined
  const chapterNumber = chapterParam ? parseInt(chapterParam, 10) : NaN

  // Reset marked ref when chapter changes
  useEffect(() => {
    hasMarkedRef.current = false
  }, [bookSlug, chapterNumber])

  // Load chapter text
  useEffect(() => {
    if (!bookSlug || !book || isNaN(chapterNumber)) return

    let cancelled = false
    setIsLoading(true)
    setVerses([])

    loadChapter(bookSlug, chapterNumber).then((data) => {
      if (cancelled) return
      setVerses(data?.verses ?? [])
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [bookSlug, book, chapterNumber])

  // Handle verse highlighting from URL hash
  useEffect(() => {
    if (isLoading || verses.length === 0) return

    const hash = window.location.hash
    const match = hash.match(/^#verse-(\d+)$/)
    if (!match) return

    const verseNum = parseInt(match[1], 10)
    const el = document.getElementById(`verse-${verseNum}`)
    if (!el) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    el.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'center',
    })

    if (!prefersReducedMotion) {
      setHighlightedVerse(verseNum)
      const timer = setTimeout(() => setHighlightedVerse(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [isLoading, verses])

  // Intersection Observer for chapter completion
  useEffect(() => {
    if (!isAuthenticated || !bookSlug || !book?.hasFullText) return
    if (isLoading || verses.length === 0) return
    if (isChapterRead(bookSlug, chapterNumber)) return

    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasMarkedRef.current) {
          hasMarkedRef.current = true
          markChapterRead(bookSlug, chapterNumber)
        }
      },
      { threshold: 0.5 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    isAuthenticated,
    bookSlug,
    book,
    chapterNumber,
    isLoading,
    verses,
    isChapterRead,
    markChapterRead,
  ])

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

  return (
    <Layout>
      <div className="min-h-screen bg-hero-dark">
        {/* Hero section */}
        <section
          className="relative flex w-full flex-col items-center px-4 pt-32 pb-8 text-center antialiased sm:pt-36 sm:pb-10"
          style={READER_BG_STYLE}
        >
          <h1 className="font-script text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            <Link
              to={`/bible?book=${book.slug}`}
              className="text-white/70 underline transition-colors hover:text-white"
            >
              {book.name}
            </Link>{' '}
            Chapter {chapterNumber}
          </h1>
        </section>

        {/* Chapter selector */}
        <div className="mx-auto max-w-2xl px-4 pt-4 sm:px-6">
          <ChapterSelector
            currentChapter={chapterNumber}
            totalChapters={book.chapters}
            onSelectChapter={handleChapterSelect}
          />
        </div>

        {/* Content */}
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {!book.hasFullText ? (
            <ChapterPlaceholder
              bookName={book.name}
              chapter={chapterNumber}
            />
          ) : isLoading ? (
            <div className="py-16 text-center text-white/50">Loading...</div>
          ) : verses.length === 0 ? (
            <div className="py-16 text-center text-white/50">
              No content available for this chapter.
            </div>
          ) : (
            <div className="py-8 sm:py-12">
              {verses.map((verse) => (
                <span
                  key={verse.number}
                  id={`verse-${verse.number}`}
                  className={cn(
                    'transition-colors duration-[2000ms]',
                    highlightedVerse === verse.number &&
                      'rounded bg-primary/10',
                  )}
                >
                  <sup className="mr-1 align-super font-sans text-xs text-white/30">
                    {verse.number}
                  </sup>
                  <span className="font-serif text-base leading-[1.8] text-white/90 sm:text-lg">
                    {verse.text}
                  </span>{' '}
                </span>
              ))}

              {/* Sentinel for IO-based completion tracking */}
              <div ref={sentinelRef} aria-hidden="true" className="h-1" />
            </div>
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
