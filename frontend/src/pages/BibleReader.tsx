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
import { ChapterSelector } from '@/components/bible/ChapterSelector'
import { FloatingActionBar } from '@/components/bible/FloatingActionBar'
import { NoteEditor } from '@/components/bible/NoteEditor'
import { NoteIndicator } from '@/components/bible/NoteIndicator'
import { SharePanel } from '@/components/sharing/SharePanel'
import { HIGHLIGHT_COLORS, BIBLE_BOOKS } from '@/constants/bible'
import { BookCompletionCard } from '@/components/bible/BookCompletionCard'
import { getBookBySlug, loadChapter } from '@/data/bible'
import { useAuth } from '@/hooks/useAuth'
import { useBibleAudio } from '@/hooks/useBibleAudio'
import { useBibleHighlights } from '@/hooks/useBibleHighlights'
import { useBibleNotes } from '@/hooks/useBibleNotes'
import { useBibleProgress } from '@/hooks/useBibleProgress'
import { useToast } from '@/components/ui/Toast'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { cn } from '@/lib/utils'
import { ATMOSPHERIC_HERO_BG } from '@/components/PageHero'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import type { BibleVerse } from '@/types/bible'


function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

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
  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState<number | null>(null)
  const [timerPanelOpen, setTimerPanelOpen] = useState(false)
  const [ambientForceCollapse, setAmbientForceCollapse] = useState(false)
  const [cardDismissed, setCardDismissed] = useState(() =>
    bookSlug ? sessionStorage.getItem(`wr_bible_book_complete_dismissed_${bookSlug}`) === 'true' : false,
  )

  const sleepTimer = useSleepTimerControls()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const hasMarkedRef = useRef(false)
  const announceRef = useRef<HTMLDivElement>(null)
  const noteEditorDirtyRef = useRef(false)

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

  // Autoplay: start TTS after 2s delay for authenticated users with ?autoplay=true
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

  // Reset state when chapter changes
  useEffect(() => {
    hasMarkedRef.current = false
    setSelectedVerse(null)
    setShowColorPicker(false)
    setShowShareMenu(false)
    setEditingNoteVerse(null)
    setShowDiscardPrompt(null)
    noteEditorDirtyRef.current = false
  }, [bookSlug, chapterNumber])

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

  // Book completion toast
  useEffect(() => {
    if (!justCompletedBook || justCompletedBook !== bookSlug) return
    const bookData = BIBLE_BOOKS.find(b => b.slug === justCompletedBook)
    if (!bookData) return
    playSoundEffect('bell')
    showToast(`${bookData.name} Complete! You've read all ${bookData.chapters} chapters.`, 'success')
  }, [justCompletedBook, bookSlug, showToast, playSoundEffect])

  // Compute book completion for inline card
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

  const handleVerseClick = useCallback(
    (verseNumber: number) => {
      // If note editor is open and dirty, show discard prompt
      if (editingNoteVerse !== null && noteEditorDirtyRef.current && verseNumber !== editingNoteVerse) {
        setShowDiscardPrompt(verseNumber)
        return
      }

      setEditingNoteVerse(null)
      noteEditorDirtyRef.current = false
      setSelectedVerse((prev) => (prev === verseNumber ? null : verseNumber))
      setShowColorPicker(false)
      setShowShareMenu(false)
    },
    [editingNoteVerse],
  )

  const handleDismissActionBar = useCallback(() => {
    setSelectedVerse(null)
    setShowColorPicker(false)
    setShowShareMenu(false)
  }, [])

  const handleCopy = useCallback(async () => {
    if (!book || selectedVerse === null) return
    const verse = verses.find((v) => v.number === selectedVerse)
    if (!verse) return

    const text = `"${verse.text}" \u2014 ${book.name} ${chapterNumber}:${verse.number} WEB`

    try {
      await navigator.clipboard.writeText(text)
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch {
        showToast('Failed to copy', 'error')
        return
      }
    }

    showToast('Copied!', 'success')
    handleDismissActionBar()
  }, [book, selectedVerse, verses, chapterNumber, showToast, handleDismissActionBar])

  const handleHighlightClick = useCallback(() => {
    setShowColorPicker((prev) => !prev)
    setShowShareMenu(false)
  }, [])

  const handleSelectColor = useCallback(
    (color: string) => {
      if (!bookSlug || selectedVerse === null) return
      const existing = getHighlightForVerse(bookSlug, chapterNumber, selectedVerse)
      applyHighlight(bookSlug, chapterNumber, selectedVerse, color)

      if (existing?.color === color) {
        announce(`Highlight removed from verse ${selectedVerse}`)
      } else {
        const colorName =
          HIGHLIGHT_COLORS.find((c) => c.hex === color)?.name ?? 'color'
        announce(`Verse ${selectedVerse} highlighted ${colorName.toLowerCase()}`)
      }

      handleDismissActionBar()
    },
    [bookSlug, chapterNumber, selectedVerse, getHighlightForVerse, applyHighlight, handleDismissActionBar, announce],
  )

  const handleShareClick = useCallback(() => {
    setShowShareMenu((prev) => !prev)
    setShowColorPicker(false)
  }, [])

  const handleNoteClick = useCallback(() => {
    if (selectedVerse === null) return
    setEditingNoteVerse(selectedVerse)
    noteEditorDirtyRef.current = false
    handleDismissActionBar()
  }, [selectedVerse, handleDismissActionBar])

  const handleNoteSave = useCallback(
    (text: string): boolean => {
      if (!bookSlug || editingNoteVerse === null) return false
      const success = saveNote(bookSlug, chapterNumber, editingNoteVerse, text)
      if (!success) {
        showToast('Note limit reached. Delete an existing note to add a new one.', 'error')
        return false
      }
      announce(`Note saved for verse ${editingNoteVerse}`)
      setEditingNoteVerse(null)
      noteEditorDirtyRef.current = false
      return true
    },
    [bookSlug, chapterNumber, editingNoteVerse, saveNote, showToast, announce],
  )

  const handleNoteCancel = useCallback(() => {
    setEditingNoteVerse(null)
    noteEditorDirtyRef.current = false
  }, [])

  const handleNoteDelete = useCallback(
    (noteId: string) => {
      deleteNote(noteId)
      announce(`Note deleted`)
      setEditingNoteVerse(null)
      noteEditorDirtyRef.current = false
    },
    [deleteNote, announce],
  )

  const handleNoteEditFromIndicator = useCallback(
    (verseNumber: number) => {
      setEditingNoteVerse(verseNumber)
      noteEditorDirtyRef.current = false
      setSelectedVerse(null)
    },
    [],
  )

  const handleDiscardAndProceed = useCallback(() => {
    const targetVerse = showDiscardPrompt
    setEditingNoteVerse(null)
    noteEditorDirtyRef.current = false
    setShowDiscardPrompt(null)
    if (targetVerse !== null) {
      setSelectedVerse(targetVerse)
    }
  }, [showDiscardPrompt])

  const handleKeepEditing = useCallback(() => {
    setShowDiscardPrompt(null)
  }, [])

  // Validation
  if (!book) return <BookNotFound />

  if (
    isNaN(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > book.chapters
  ) {
    return <Navigate to={`/bible/${book.slug}/1`} replace />
  }

  const chapterHighlights = bookSlug
    ? getHighlightsForChapter(bookSlug, chapterNumber)
    : []

  const chapterNotes = bookSlug
    ? getNotesForChapter(bookSlug, chapterNumber)
    : []

  const selectedVerseData = selectedVerse
    ? verses.find((v) => v.number === selectedVerse)
    : null
  const selectedVerseHighlight =
    selectedVerse && bookSlug
      ? getHighlightForVerse(bookSlug, chapterNumber, selectedVerse)
      : undefined
  const selectedVerseNote =
    selectedVerse && bookSlug
      ? getNoteForVerse(bookSlug, chapterNumber, selectedVerse)
      : undefined
  const selectedElement = selectedVerse
    ? document.getElementById(`verse-${selectedVerse}`)
    : null

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
          <h1 id="bible-reader-heading" className="font-script text-3xl font-bold bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent sm:text-4xl">
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
            <div className="py-16 text-center text-white/50">Loading...</div>
          ) : verses.length === 0 ? (
            <div className="py-16 text-center text-white/50">
              No content available for this chapter.
            </div>
          ) : (
            <div key={`${bookSlug}-${chapterNumber}`} className="py-8 sm:py-12 motion-safe:animate-content-fade-in">
              {verses.map((verse, index) => {
                const highlight = chapterHighlights.find(
                  (h) => h.verseNumber === verse.number,
                )
                const highlightStyle = highlight
                  ? { backgroundColor: hexToRgba(highlight.color, 0.20) }
                  : undefined
                const note = chapterNotes.find(
                  (n) => n.verseNumber === verse.number,
                )
                const isEditingThis = editingNoteVerse === verse.number
                const isTtsActive = bibleAudio.currentVerseIndex === index

                return (
                  <div
                    key={verse.number}
                    className={cn(
                      'motion-safe:transition-all motion-safe:duration-200',
                      isTtsActive && 'border-l-2 border-primary bg-primary/5 pl-2',
                    )}
                    aria-current={isTtsActive ? 'true' : undefined}
                  >
                    <span
                      id={`verse-${verse.number}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleVerseClick(verse.number)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleVerseClick(verse.number)
                        }
                      }}
                      className={cn(
                        'cursor-pointer rounded transition-colors duration-[2000ms]',
                        highlightedVerse === verse.number && 'bg-primary/10',
                        selectedVerse === verse.number &&
                          'ring-1 ring-white/20',
                      )}
                      style={highlightStyle}
                      aria-label={`Verse ${verse.number}`}
                    >
                      <sup className="mr-1 align-super font-sans text-xs text-white/30">
                        {verse.number}
                      </sup>
                      {isAuthenticated && note && !isEditingThis && (
                        <NoteIndicator
                          note={note}
                          onEdit={() => handleNoteEditFromIndicator(verse.number)}
                          onDelete={handleNoteDelete}
                        />
                      )}
                      <span className="font-serif text-base leading-[1.8] text-white/80 sm:text-lg">
                        {verse.text}
                      </span>{' '}
                    </span>

                    {/* Inline note editor */}
                    {isEditingThis && bookSlug && (
                      <NoteEditor
                        verseNumber={verse.number}
                        existingNote={note}
                        onSave={handleNoteSave}
                        onCancel={handleNoteCancel}
                        onDelete={note ? () => handleNoteDelete(note.id) : undefined}
                        onDirtyChange={(dirty) => { noteEditorDirtyRef.current = dirty }}
                      />
                    )}

                    {/* Discard unsaved changes prompt */}
                    {showDiscardPrompt !== null && editingNoteVerse === verse.number && (
                      <div className="mt-2 mb-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                        <span className="text-sm text-white/70">Discard unsaved changes?</span>
                        <button
                          type="button"
                          onClick={handleDiscardAndProceed}
                          className="text-sm font-medium text-danger hover:text-danger/80"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={handleKeepEditing}
                          className="text-sm text-white/40 hover:text-white/60"
                        >
                          Keep editing
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

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

      {/* Floating action bar */}
      {selectedVerse !== null && selectedVerseData && book.hasFullText && editingNoteVerse === null && (
        <FloatingActionBar
          verseNumber={selectedVerse}
          verseText={selectedVerseData.text}
          bookName={book.name}
          bookSlug={book.slug}
          chapter={chapterNumber}
          isAuthenticated={isAuthenticated}
          hasHighlight={!!selectedVerseHighlight}
          hasNote={!!selectedVerseNote}
          currentHighlightColor={selectedVerseHighlight?.color}
          showColorPicker={showColorPicker}
          onHighlight={handleHighlightClick}
          onSelectColor={handleSelectColor}
          onNote={handleNoteClick}
          onCopy={handleCopy}
          onShare={handleShareClick}
          onDismiss={handleDismissActionBar}
          targetElement={selectedElement}
        />
      )}

      {/* Share panel */}
      {selectedVerse !== null && selectedVerseData && (
        <SharePanel
          verseText={selectedVerseData.text}
          reference={`${book.name} ${chapterNumber}:${selectedVerse} WEB`}
          isOpen={showShareMenu}
          onClose={() => {
            setShowShareMenu(false)
            handleDismissActionBar()
          }}
        />
      )}
    </Layout>
  )
}
