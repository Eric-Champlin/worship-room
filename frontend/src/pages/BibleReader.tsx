import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { SEO } from '@/components/SEO'
import { buildBibleChapterMetadata } from '@/lib/seo/routeMetadata'
import { BibleDrawerProvider } from '@/components/bible/BibleDrawerProvider'
import { BibleDrawer } from '@/components/bible/BibleDrawer'
import { DrawerViewRouter } from '@/components/bible/DrawerViewRouter'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { ChapterHeading } from '@/components/bible/reader/ChapterHeading'
import { ReaderBody } from '@/components/bible/reader/ReaderBody'
import { ReaderChrome } from '@/components/bible/reader/ReaderChrome'
import { ReaderChapterNav } from '@/components/bible/reader/ReaderChapterNav'
import { TypographySheet } from '@/components/bible/reader/TypographySheet'
import { VerseJumpPill } from '@/components/bible/reader/VerseJumpPill'
import { VerseActionSheet } from '@/components/bible/reader/VerseActionSheet'
import { FocusVignette } from '@/components/bible/reader/FocusVignette'
import { useReaderSettings } from '@/hooks/useReaderSettings'
import { useChapterSwipe } from '@/hooks/useChapterSwipe'
import { useFocusMode } from '@/hooks/useFocusMode'
import { useVerseTap } from '@/hooks/useVerseTap'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useVerseSelection } from '@/hooks/url/useVerseSelection'
import { useActionSheetState } from '@/hooks/url/useActionSheetState'
import { validateAction } from '@/lib/url/validateAction'
import { useAudioState, useReadingContext } from '@/components/audio/AudioProvider'
import { PlanCompletionCelebration } from '@/components/bible/plans/PlanCompletionCelebration'
import { ActivePlanReaderBanner } from '@/components/bible/reader/ActivePlanReaderBanner'
import { AmbientAudioPicker } from '@/components/bible/reader/AmbientAudioPicker'
import { useReaderAudioAutoStart } from '@/hooks/useReaderAudioAutoStart'
import { ANIMATION_DURATIONS, ANIMATION_EASINGS } from '@/constants/animation'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useActivePlan } from '@/hooks/bible/useActivePlan'
import { setCelebrationShown } from '@/lib/bible/plansStore'
import { recordReadToday } from '@/lib/bible/streakStore'
import { NotificationPrompt } from '@/components/bible/reader/NotificationPrompt'
import { getPushSupportStatus, getPermissionState, requestPermission } from '@/lib/notifications/permissions'
import { subscribeToPush } from '@/lib/notifications/subscription'
import { updateNotificationPrefs } from '@/lib/notifications/preferences'
import { getBookBySlug, getAdjacentChapter, loadChapterWeb } from '@/data/bible'
import { loadCrossRefsForBook } from '@/lib/bible/crossRefs/loader'
import {
  getHighlightsForChapter,
  subscribe as subscribeHighlights,
} from '@/lib/bible/highlightStore'
import {
  getBookmarksForChapter,
  subscribe as subscribeBookmarks,
} from '@/lib/bible/bookmarkStore'
import {
  getNotesForChapter,
  subscribe as subscribeNotes,
} from '@/lib/bible/notes/store'
import type { BibleVerse, Bookmark, Highlight, Note } from '@/types/bible'

function BibleReaderInner() {
  const { book: bookSlug, chapter: chapterParam } = useParams<{
    book: string
    chapter: string
  }>()
  const navigate = useNavigate()

  const { settings, updateSetting, resetToDefaults } = useReaderSettings()
  const bibleDrawer = useBibleDrawer()
  const [typographyOpen, setTypographyOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const aaRef = useRef<HTMLButtonElement>(null)
  const audioButtonRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()
  const focusMode = useFocusMode()

  // BB-20 ambient audio
  const audioState = useAudioState()
  const readingContextControl = useReadingContext()
  const isAudioPlaying = audioState.isPlaying && audioState.activeSounds.length > 0

  const [searchParams, setSearchParams] = useSearchParams()

  const readerBodyRef = useRef<HTMLElement>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arrivalHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [paragraphs, setParagraphs] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [arrivalHighlightVerses, setArrivalHighlightVerses] = useState<number[]>([])

  // BB-21 plan reader banner
  const { activePlan, progress: planProgress, currentDay: planCurrentDay, isOnPlanPassage, markDayComplete: planMarkDayComplete } = useActivePlan()
  const [readerBannerDismissed, setReaderBannerDismissed] = useState(false)
  const [celebrationData, setCelebrationData] = useState<{
    planTitle: string
    planDescription: string
    daysCompleted: number
    dateRange: string
    passageCount: number
    slug: string
  } | null>(null)

  // BB-41: Notification prompt (shows after 2nd reading session of the day)
  const [showNotifPrompt, setShowNotifPrompt] = useState(false)

  const book = bookSlug ? getBookBySlug(bookSlug) : undefined
  const chapterNumber = chapterParam ? parseInt(chapterParam, 10) : NaN

  // Reset plan banner dismissed state on chapter change
  useEffect(() => {
    setReaderBannerDismissed(false)
  }, [bookSlug, chapterNumber])

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

  // BB-38: URL-driven verse selection + action sheet state
  const { verseRange, setVerse, clearVerse } = useVerseSelection()
  const { action, setAction, clearAction } = useActionSheetState()

  // BB-38: Sheet-open React state follows the URL lifecycle rules:
  //   Rule 1 (mount): open iff URL has a valid action (cold-load sub-view)
  //   Rule 2 (tap): setSheetOpen(true) + setVerse(N)
  //   Rule 3 (URL verse→null): setSheetOpen(false) — handles browser back
  //   Rule 4 (close button): clearVerse() → verse & action cleared → Rule 3 fires
  //   Rule 5 (sub-view close): clearAction() — sheet stays open
  const [sheetOpen, setSheetOpen] = useState<boolean>(() =>
    Boolean(validateAction(searchParams.get('action'))),
  )

  // Rule 3: URL verse→null watcher (handles browser back to no-params state)
  useEffect(() => {
    if (!verseRange) {
      setSheetOpen(false)
    }
  }, [verseRange])

  // Rule 1 (redux): URL action changes → ensure sheet is open when action is
  // present AND a verse is selected. The spec invariant "action without verse
  // is meaningless" is enforced at the state layer here so render-time gating
  // isn't the only line of defense.
  useEffect(() => {
    if (action && verseRange) setSheetOpen(true)
  }, [action, verseRange])

  // Interactive tap handlers for useVerseTap
  const handleVerseTap = useCallback(
    (verseNumber: number) => {
      setVerse(verseNumber)
      setSheetOpen(true)
    },
    [setVerse],
  )

  const handleExtendSelectionFromTap = useCallback(
    (newStart: number, newEnd: number) => {
      setVerse(newStart, newEnd)
      // sheetOpen remains true
    },
    [setVerse],
  )

  // Verse tap handling
  const { selection } = useVerseTap({
    containerRef: readerBodyRef,
    bookSlug: bookSlug ?? '',
    bookName: book?.name ?? '',
    chapter: chapterNumber,
    verses,
    enabled: !isLoading && !loadError && verses.length > 0,
    verseRange,
    onVerseTap: handleVerseTap,
    onExtendSelection: handleExtendSelectionFromTap,
  })

  // Dismiss the sheet: flip React state and (unless we're navigating away via a
  // cross-ref click, which produces its own URL change) clear the verse/action
  // params from the URL.
  const dismissSheet = useCallback(
    (options?: { navigating?: boolean }) => {
      setSheetOpen(false)
      if (!options?.navigating) {
        clearVerse()
      }
    },
    [clearVerse],
  )

  // Callback passed to VerseActionSheet's onExtendSelection prop. It takes a
  // single verse number and extends the existing URL-driven selection.
  // Currently unused by the sheet (useVerseTap handles range extension via
  // pointer events on the reader body) but kept wired for future in-sheet
  // selection UI.
  const handleSheetExtendSelection = useCallback(
    (verseNumber: number) => {
      if (!verseRange) {
        setVerse(verseNumber)
        return
      }
      // Mirror the computeExtendedRange logic from useVerseTap
      if (verseRange.start !== verseRange.end) {
        if (verseNumber === verseRange.start) {
          setVerse(verseRange.start + 1, verseRange.end)
          return
        }
        if (verseNumber === verseRange.end) {
          setVerse(verseRange.start, verseRange.end - 1)
          return
        }
      }
      setVerse(
        Math.min(verseRange.start, verseNumber),
        Math.max(verseRange.end, verseNumber),
      )
    },
    [verseRange, setVerse],
  )

  // Selection visibility for fade-out animation
  const [selectionVisible, setSelectionVisible] = useState(true)
  const selectedVerseNumbers = useMemo(() => {
    if (!selection) return [] as number[]
    const nums: number[] = []
    for (let i = selection.startVerse; i <= selection.endVerse; i++) nums.push(i)
    return nums
  }, [selection])

  // Highlight store subscription (BB-7)
  const [chapterHighlights, setChapterHighlights] = useState<Highlight[]>(() =>
    getHighlightsForChapter(bookSlug ?? '', chapterNumber),
  )
  const prevHighlightVersesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const fresh = getHighlightsForChapter(bookSlug ?? '', chapterNumber)
    setChapterHighlights(fresh)
    // Rebuild the prev-verses set when chapter changes (no pulse on navigation)
    const verseKeys = new Set<string>()
    for (const hl of fresh) {
      for (let v = hl.startVerse; v <= hl.endVerse; v++) verseKeys.add(`${hl.color}:${v}`)
    }
    prevHighlightVersesRef.current = verseKeys
  }, [bookSlug, chapterNumber])

  useEffect(() => {
    const unsubscribe = subscribeHighlights(() => {
      const updated = getHighlightsForChapter(bookSlug ?? '', chapterNumber)
      setChapterHighlights(updated)

      // Diff previous vs new to find only newly highlighted verses
      const currentKeys = new Set<string>()
      const newVerseNums: number[] = []
      for (const hl of updated) {
        for (let v = hl.startVerse; v <= hl.endVerse; v++) {
          const key = `${hl.color}:${v}`
          currentKeys.add(key)
          if (!prevHighlightVersesRef.current.has(key)) {
            newVerseNums.push(v)
          }
        }
      }
      prevHighlightVersesRef.current = currentKeys

      if (newVerseNums.length > 0) {
        setFreshHighlightVerses(newVerseNums)
      }
    })
    return unsubscribe
  }, [bookSlug, chapterNumber])

  // Bookmark store subscription (BB-7.5)
  const [chapterBookmarks, setChapterBookmarks] = useState<Bookmark[]>(() =>
    getBookmarksForChapter(bookSlug ?? '', chapterNumber),
  )

  useEffect(() => {
    const fresh = getBookmarksForChapter(bookSlug ?? '', chapterNumber)
    setChapterBookmarks(fresh)
  }, [bookSlug, chapterNumber])

  useEffect(() => {
    const unsubscribe = subscribeBookmarks(() => {
      setChapterBookmarks(getBookmarksForChapter(bookSlug ?? '', chapterNumber))
    })
    return unsubscribe
  }, [bookSlug, chapterNumber])

  // Note store subscription (BB-8)
  const [chapterNotes, setChapterNotes] = useState<Note[]>(() =>
    getNotesForChapter(bookSlug ?? '', chapterNumber),
  )

  useEffect(() => {
    setChapterNotes(getNotesForChapter(bookSlug ?? '', chapterNumber))
  }, [bookSlug, chapterNumber])

  useEffect(() => {
    const unsubscribe = subscribeNotes(() => {
      setChapterNotes(getNotesForChapter(bookSlug ?? '', chapterNumber))
    })
    return unsubscribe
  }, [bookSlug, chapterNumber])

  // Cross-reference preloading (BB-9)
  // Fire-and-forget — populates in-memory cache so badge count is instant
  useEffect(() => {
    if (bookSlug) {
      void loadCrossRefsForBook(bookSlug)
    }
  }, [bookSlug])

  // Track freshly highlighted verses for pulse animation
  const [freshHighlightVerses, setFreshHighlightVerses] = useState<number[]>([])
  useEffect(() => {
    if (freshHighlightVerses.length === 0) return
    const timer = setTimeout(() => setFreshHighlightVerses([]), 500)
    return () => clearTimeout(timer)
  }, [freshHighlightVerses])

  // Selection fade-out on close
  const handleSheetClose = useCallback(
    (options?: { navigating?: boolean }) => {
      if (options?.navigating) {
        // Cross-ref navigation: close immediately, skip fade animation
        dismissSheet(options)
      } else {
        setSelectionVisible(false)
        fadeTimerRef.current = setTimeout(() => {
          fadeTimerRef.current = null
          dismissSheet()
          setSelectionVisible(true)
        }, 200)
      }
    },
    [dismissSheet],
  )

  // Clean up fade timer on unmount
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [])

  const { touchHandlers, swipeOffset, isSwiping } = useChapterSwipe({
    bookSlug: bookSlug ?? '',
    currentChapter: chapterNumber,
    enabled: isSmallViewport && !isLoading && !typographyOpen && !sheetOpen,
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

  // BB-38: Scroll to top on chapter change (skip when scroll-to param will handle scrolling)
  const scrollToParamRef = useRef<string | null>(
    searchParams.get('scroll-to') ?? searchParams.get('highlight'),
  )
  useEffect(() => {
    if (scrollToParamRef.current) {
      scrollToParamRef.current = null
      return
    }
    window.scrollTo({ top: 0 })
  }, [bookSlug, chapterNumber])

  // BB-38: ?scroll-to= (+ legacy ?highlight= alias) param processing:
  // one-shot scroll to verse with arrival glow, then param is deleted.
  useEffect(() => {
    if (isLoading || loadError || verses.length === 0) return

    // Read scroll-to first; fall back to legacy highlight for backward compatibility.
    const scrollToParam = searchParams.get('scroll-to') ?? searchParams.get('highlight')
    if (!scrollToParam) return

    // Parse single verse or range: "16" or "1-3"
    let startVerse: number
    let endVerse: number
    if (scrollToParam.includes('-')) {
      const parts = scrollToParam.split('-')
      startVerse = parseInt(parts[0], 10)
      endVerse = parseInt(parts[1], 10)
    } else {
      startVerse = parseInt(scrollToParam, 10)
      endVerse = startVerse
    }

    // Ignore invalid values — delete BOTH legacy and new param names
    if (isNaN(startVerse) || isNaN(endVerse) || startVerse < 1 || endVerse < startVerse) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('scroll-to')
          next.delete('highlight')
          return next
        },
        { replace: true },
      )
      return
    }

    // Build the list of verse numbers to highlight
    const verseNums: number[] = []
    for (let v = startVerse; v <= endVerse; v++) verseNums.push(v)
    setArrivalHighlightVerses(verseNums)

    // Scroll to the first verse
    const el = document.querySelector(`[data-verse="${startVerse}"]`)
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' })
    }

    // Clear BOTH the scroll-to and legacy highlight params from the URL
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('scroll-to')
        next.delete('highlight')
        return next
      },
      { replace: true },
    )

    // Fade out glow after 1.5s
    arrivalHighlightTimerRef.current = setTimeout(() => {
      setArrivalHighlightVerses([])
      arrivalHighlightTimerRef.current = null
    }, 1500)
  }, [isLoading, loadError, verses.length, searchParams, setSearchParams, reducedMotion])

  // Clean up arrival highlight timer on unmount
  useEffect(() => {
    return () => {
      if (arrivalHighlightTimerRef.current) clearTimeout(arrivalHighlightTimerRef.current)
    }
  }, [])

  // Pause focus mode when drawer is open
  useEffect(() => {
    if (bibleDrawer.isOpen) {
      focusMode.pauseFocusMode()
      return () => focusMode.resumeFocusMode()
    }
  }, [bibleDrawer.isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause focus mode when typography sheet is open
  useEffect(() => {
    if (typographyOpen) {
      focusMode.pauseFocusMode()
      return () => focusMode.resumeFocusMode()
    }
  }, [typographyOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause focus mode when verse action sheet is open
  useEffect(() => {
    if (sheetOpen) {
      focusMode.pauseFocusMode()
      return () => focusMode.resumeFocusMode()
    }
  }, [sheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pause focus mode when audio picker is open (BB-20)
  useEffect(() => {
    if (pickerOpen) {
      focusMode.pauseFocusMode()
      return () => focusMode.resumeFocusMode()
    }
  }, [pickerOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mutual exclusion: verse sheet closes picker (BB-20)
  useEffect(() => {
    if (sheetOpen && pickerOpen) {
      setPickerOpen(false)
    }
  }, [sheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // BB-20 audio toggle handler with mutual exclusion
  const handleAudioToggle = useCallback(() => {
    if (sheetOpen) dismissSheet()
    if (typographyOpen) setTypographyOpen(false)
    setPickerOpen((prev) => !prev)
  }, [sheetOpen, dismissSheet, typographyOpen])

  // BB-20 typography toggle with picker mutual exclusion
  const handleTypographyToggle = useCallback(() => {
    if (pickerOpen) setPickerOpen(false)
    setTypographyOpen((prev) => !prev)
  }, [pickerOpen])

  // BB-20 reading context: set when audio is playing in reader
  useEffect(() => {
    if (book && !isNaN(chapterNumber) && isAudioPlaying) {
      readingContextControl.setReadingContext({ book: book.name, chapter: chapterNumber })
    }
  }, [book?.name, chapterNumber, isAudioPlaying]) // eslint-disable-line react-hooks/exhaustive-deps

  // BB-20 reading context: clear on unmount
  useEffect(() => {
    return () => {
      readingContextControl.clearReadingContext()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // BB-20 auto-start ambient audio
  useReaderAudioAutoStart({
    enabled: settings.ambientAudioAutoStart,
    preferredSoundId: settings.ambientAudioAutoStartSound,
    volume: settings.ambientAudioVolume,
    bookName: book?.name ?? '',
    chapter: chapterNumber,
    isReady: !isLoading && verses.length > 0,
  })

  // Read tracking — writes for all users (no auth check)
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

    // Record today's read for the streak system (idempotent within a day)
    const streakResult = recordReadToday()

    // BB-41: Show notification prompt on 2nd+ reading session of the day
    if (
      streakResult.delta === 'same-day' &&
      getPushSupportStatus() !== 'unsupported' &&
      getPermissionState() === 'default' &&
      localStorage.getItem('wr_notification_prompt_dismissed') !== 'true'
    ) {
      setShowNotifPrompt(true)
    }
  }, [bookSlug, book, chapterNumber, isLoading, loadError, verses.length])

  // Keyboard shortcuts
  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire if input/textarea is focused
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      // Sheet has its own keyboard handling
      if (sheetOpen) return

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
    [bookSlug, chapterNumber, navigate, typographyOpen, bibleDrawer, sheetOpen],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard)
    return () => window.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  // Validation: invalid book
  if (!book) {
    return (
      <div className="flex min-h-screen flex-col bg-hero-bg">
        <SEO title="Book Not Found" description="This Bible book doesn't exist." noIndex />
        <div className="flex flex-1 items-center justify-center px-4">
          <FrostedCard className="max-w-md text-center">
            <p className="mb-6 text-lg text-white">That book doesn't exist.</p>
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => bibleDrawer.open()}
                className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
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
          <DrawerViewRouter onClose={bibleDrawer.close} />
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
          noIndex
        />
        <div className="flex flex-1 items-center justify-center px-4">
          <FrostedCard className="max-w-md text-center">
            <p className="mb-6 text-lg text-white">
              {book.name} only has {book.chapters} chapter{book.chapters !== 1 ? 's' : ''}.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Link
                to={`/bible/${book.slug}/${book.chapters}`}
                className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
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
          <DrawerViewRouter onClose={bibleDrawer.close} />
        </BibleDrawer>
      </div>
    )
  }

  const swipeStyle =
    isSwiping && swipeOffset !== 0
      ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' }
      : isSwiping
        ? { transform: 'translateX(0)', transition: `transform ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}` }
        : undefined

  return (
    <div
      className="relative min-h-screen"
      style={{ background: 'var(--reader-bg)' }}
      data-reader-theme={settings.theme}
      {...touchHandlers}
    >
      {/* BB-35: Skip link — BibleReader uses ReaderChrome instead of Navbar,
          so it needs its own skip link to match the global pattern. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* BB-40: builder returns title/description/canonical/ogImage/jsonLd together.
          Step 9 tests the BreadcrumbList JSON-LD emission. */}
      <SEO {...buildBibleChapterMetadata(book.name, chapterNumber, bookSlug!)} />

      <ReaderChrome
        bookName={book.name}
        bookSlug={bookSlug!}
        chapter={chapterNumber}
        onTypographyToggle={handleTypographyToggle}
        isTypographyOpen={typographyOpen}
        aaRef={aaRef}
        chromeOpacity={focusMode.chromeOpacity}
        chromePointerEvents={focusMode.chromePointerEvents}
        chromeTransitionMs={focusMode.chromeTransitionMs}
        isManuallyArmed={focusMode.isManuallyArmed}
        onFocusToggle={focusMode.triggerFocused}
        ambientAudioVisible={settings.ambientAudioVisible}
        isAudioPlaying={isAudioPlaying}
        onAudioToggle={handleAudioToggle}
        audioButtonRef={audioButtonRef}
        isAudioPickerOpen={pickerOpen}
        reducedMotion={reducedMotion}
      />

      <TypographySheet
        isOpen={typographyOpen}
        onClose={() => setTypographyOpen(false)}
        settings={settings}
        onUpdate={updateSetting}
        onReset={resetToDefaults}
        anchorRef={aaRef}
        focusSettings={focusMode.settings}
        onFocusSettingUpdate={focusMode.updateFocusSetting}
      />

      <AmbientAudioPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        anchorRef={audioButtonRef}
        bookName={book.name}
        chapter={chapterNumber}
        onVolumeChange={(v) => updateSetting('ambientAudioVolume', v)}
      />

      {/* BB-21: Active plan reader banner */}
      {activePlan && planProgress && planCurrentDay && !readerBannerDismissed && bookSlug && isOnPlanPassage(bookSlug, chapterNumber) && (
        <div className="pt-16 sm:pt-20">
          <ActivePlanReaderBanner
            planTitle={activePlan.title}
            currentDay={planProgress.currentDay}
            isDayCompleted={planProgress.completedDays.includes(planCurrentDay.day)}
            onMarkComplete={() => {
              const result = planMarkDayComplete(planCurrentDay.day)
              if (result.type === 'plan-completed' && planProgress && !planProgress.celebrationShown) {
                setCelebrationShown(activePlan.slug)
                setCelebrationData({
                  planTitle: activePlan.title,
                  planDescription: activePlan.description,
                  daysCompleted: activePlan.days.length,
                  dateRange: `${new Date(planProgress.startedAt).toLocaleDateString()} – ${new Date().toLocaleDateString()}`,
                  passageCount: activePlan.days.reduce((sum, d) => sum + d.passages.length, 0),
                  slug: activePlan.slug,
                })
              }
            }}
            onDismiss={() => setReaderBannerDismissed(true)}
            chromeOpacity={focusMode.chromeOpacity}
            chromePointerEvents={focusMode.chromePointerEvents}
            chromeTransitionMs={focusMode.chromeTransitionMs}
          />
        </div>
      )}

      <div style={swipeStyle}>
        <main
          id="main-content"
          ref={readerBodyRef}
          className="mx-auto max-w-2xl px-5 pb-8 pt-20 sm:px-6 sm:pt-24"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="h-8 w-8 motion-safe:animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
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
                  className="min-h-[44px] rounded-lg bg-primary px-6 py-2 font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
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
                selectedVerses={selectedVerseNumbers}
                chapterHighlights={chapterHighlights}
                chapterBookmarks={chapterBookmarks}
                chapterNotes={chapterNotes}
                selectionVisible={selectionVisible}
                freshHighlightVerses={freshHighlightVerses}
                arrivalHighlightVerses={arrivalHighlightVerses}
                reducedMotion={reducedMotion}
              />
            </>
          )}
        </main>

        {!isLoading && !loadError && (
          <ReaderChapterNav
            bookSlug={bookSlug!}
            currentChapter={chapterNumber}
            chromeOpacity={focusMode.chromeOpacity}
            chromePointerEvents={focusMode.chromePointerEvents}
            chromeTransitionMs={focusMode.chromeTransitionMs}
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
        <DrawerViewRouter onClose={bibleDrawer.close} />
      </BibleDrawer>

      <FocusVignette
        visible={focusMode.vignetteVisible}
        reducedMotion={reducedMotion}
      />

      {/* Verse Action Sheet */}
      {selection && (
        <VerseActionSheet
          selection={selection}
          isOpen={sheetOpen}
          onClose={handleSheetClose}
          onExtendSelection={handleSheetExtendSelection}
          action={action}
          onOpenAction={setAction}
          onCloseAction={clearAction}
        />
      )}

      {/* BB-21: Plan completion celebration */}
      {celebrationData && (
        <PlanCompletionCelebration
          {...celebrationData}
          onClose={() => {
            setCelebrationData(null)
            navigate(`/bible/plans/${celebrationData.slug}`)
          }}
        />
      )}

      {/* BB-41: Contextual notification prompt */}
      {showNotifPrompt && (
        <NotificationPrompt
          iosNeedsInstall={getPushSupportStatus() === 'ios-needs-install'}
          onEnable={async () => {
            const result = await requestPermission()
            if (result === 'granted') {
              await subscribeToPush()
              updateNotificationPrefs({ enabled: true })
            }
            localStorage.setItem('wr_notification_prompt_dismissed', 'true')
            setShowNotifPrompt(false)
          }}
          onDismiss={() => {
            localStorage.setItem('wr_notification_prompt_dismissed', 'true')
            setShowNotifPrompt(false)
          }}
        />
      )}
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
