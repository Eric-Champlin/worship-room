import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'
import { useBibleDrawer } from '@/components/bible/BibleDrawerProvider'
import { ContinueReadingCallout } from './ContinueReadingCallout'
import { ChapterJumpOverlay } from './ChapterJumpOverlay'
import { BOOK_METADATA, formatReadingTime, getReadingTimeMinutes } from '@/constants/bookMetadata'
import { BIBLE_PROGRESS_KEY } from '@/constants/bible'
import type { BibleProgressMap } from '@/types/bible'
import type { LastRead } from '@/types/bible-landing'
import { cn } from '@/lib/utils'

const JUMP_TIMEOUT_MS = 1000

interface ChapterPickerViewProps {
  onClose: () => void
}

export function ChapterPickerView({ onClose }: ChapterPickerViewProps) {
  const navigate = useNavigate()
  const { currentView, popView, close } = useBibleDrawer()

  const bookSlug = currentView.type === 'chapters' ? currentView.bookSlug : ''
  const book = BOOK_METADATA.find((b) => b.slug === bookSlug)

  // Read progress from localStorage (same stale-on-write pattern as BooksDrawerContent)
  const progress = useMemo<BibleProgressMap>(() => {
    try {
      const raw = localStorage.getItem(BIBLE_PROGRESS_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }, [])

  const readChapters = useMemo(() => new Set(progress[bookSlug] ?? []), [progress, bookSlug])

  // Read last-read position
  const lastRead = useMemo<LastRead | null>(() => {
    try {
      const raw = localStorage.getItem('wr_bible_last_read')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed.book || !parsed.chapter || !parsed.timestamp) return null
      return parsed as LastRead
    } catch {
      return null
    }
  }, [])

  // Match lastRead by display name (LastRead.book stores the display name, e.g., "John")
  const lastReadChapter =
    lastRead && book && lastRead.book === book.name ? lastRead.chapter : null

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState(() => lastReadChapter ?? 1)
  const focusedCellRef = useRef<HTMLButtonElement | null>(null)
  const backButtonRef = useRef<HTMLButtonElement | null>(null)

  // Number-key jump state
  const [jumpDigits, setJumpDigits] = useState('')
  const [jumpVisible, setJumpVisible] = useState(false)
  const jumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalChapters = book?.chapterCount ?? 0

  // Focus back button on mount
  useEffect(() => {
    const timer = setTimeout(() => backButtonRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const containerRef = useRef<HTMLDivElement>(null)

  // Keep focused cell ref up to date
  useEffect(() => {
    focusedCellRef.current?.focus()
  }, [focusedCell])

  const handleChapterSelect = useCallback(
    (chapter: number) => {
      navigate(`/bible/${bookSlug}/${chapter}`)
      close()
    },
    [navigate, bookSlug, close],
  )

  const clearJump = useCallback(() => {
    if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current)
    setJumpDigits('')
    setJumpVisible(false)
  }, [])

  // Native Escape/Backspace handler — must fire BEFORE useFocusTrap's native listener
  // on the drawer container. We use capture phase so it intercepts the event before
  // it reaches the drawer's bubble-phase listener.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handleNativeKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (e.key === 'Backspace' && (e.target as HTMLElement).tagName === 'INPUT') return
        e.preventDefault()
        e.stopPropagation()
        clearJump()
        popView()
      }
    }
    el.addEventListener('keydown', handleNativeKeyDown, true)
    return () => el.removeEventListener('keydown', handleNativeKeyDown, true)
  }, [clearJump, popView])

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, chapter: number) => {
      const columns = window.innerWidth >= 1024 ? 6 : 5

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedCell((c) => Math.max(1, c - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setFocusedCell((c) => Math.min(totalChapters, c + 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedCell((c) => Math.max(1, c - columns))
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedCell((c) => Math.min(totalChapters, c + columns))
          break
        case 'Enter':
          e.preventDefault()
          handleChapterSelect(chapter)
          break
      }
    },
    [totalChapters, handleChapterSelect],
  )

  // Container-level keyboard handler for number keys and Enter-during-jump
  // NOTE: Escape and Backspace are handled by the native capture-phase listener above
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Number key accumulation
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        const newDigits = jumpDigits + e.key
        setJumpDigits(newDigits)
        setJumpVisible(true)

        // Reset timeout
        if (jumpTimeoutRef.current) clearTimeout(jumpTimeoutRef.current)
        jumpTimeoutRef.current = setTimeout(() => {
          setJumpVisible(false)
          setJumpDigits('')
        }, JUMP_TIMEOUT_MS)

        // Try to focus the matching chapter
        const num = parseInt(newDigits, 10)
        if (num >= 1 && num <= totalChapters) {
          setFocusedCell(num)
        }
        return
      }

      // Enter during active jump buffer → navigate to that chapter
      if (e.key === 'Enter' && jumpDigits) {
        e.preventDefault()
        const num = parseInt(jumpDigits, 10)
        if (num >= 1 && num <= totalChapters) {
          handleChapterSelect(num)
        }
        clearJump()
      }
    },
    [jumpDigits, totalChapters, handleChapterSelect, clearJump],
  )

  if (!book) {
    return (
      <div className="flex h-full items-center justify-center text-white/50">Book not found</div>
    )
  }

  const readingTime = formatReadingTime(getReadingTimeMinutes(book.wordCount))
  const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1)

  return (
    <div ref={containerRef} className="flex h-full flex-col" onKeyDown={handleContainerKeyDown}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 shrink-0 px-4 pb-3 pt-4"
        style={{ background: 'rgba(15, 10, 30, 0.98)' }}
      >
        <div className="flex items-center justify-between">
          <button
            ref={backButtonRef}
            type="button"
            aria-label="Back to books"
            onClick={() => {
              clearJump()
              popView()
            }}
            className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1 px-2 text-center">
            <h2 className="truncate text-lg font-bold text-white">{book.name}</h2>
            <p className="text-xs text-white/50">
              {totalChapters} {totalChapters === 1 ? 'chapter' : 'chapters'} · {readingTime}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            className="flex h-8 w-8 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Screen reader announcement */}
      <div aria-live="polite" className="sr-only">
        Showing chapters in {book.name}
      </div>

      {/* Scrollable body */}
      <div className="relative flex-1 overflow-y-auto px-4 pb-6 pt-4">
        {/* Continue Reading callout */}
        {lastReadChapter && lastRead && (
          <ContinueReadingCallout
            bookName={book.name}
            chapter={lastReadChapter}
            timestamp={lastRead.timestamp}
            onSelect={() => handleChapterSelect(lastReadChapter)}
          />
        )}

        {/* Chapter grid */}
        <div
          className="grid grid-cols-5 gap-2 lg:grid-cols-6"
          role="grid"
          aria-label={`${book.name} chapters`}
        >
          {chapters.map((ch) => {
            const isRead = readChapters.has(ch)
            const isLastRead = ch === lastReadChapter

            return (
              <button
                key={ch}
                type="button"
                role="gridcell"
                aria-label={`${book.name} chapter ${ch}, ${isRead ? 'read' : 'unread'}`}
                className={cn(
                  'relative flex aspect-square min-h-[44px] items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt/70',
                  isLastRead
                    ? 'border border-white/15 bg-white/10 text-white ring-2 ring-primary/50 shadow-[0_0_12px_rgba(109,40,217,0.3)]'
                    : isRead
                      ? 'border border-white/10 bg-white/5 text-white/90'
                      : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
                  'motion-reduce:lg:hover:scale-100 lg:hover:scale-[1.02] lg:hover:shadow-[0_0_16px_rgba(109,40,217,0.2)]',
                )}
                onClick={() => handleChapterSelect(ch)}
                onKeyDown={(e) => handleCellKeyDown(e, ch)}
                tabIndex={ch === focusedCell ? 0 : -1}
                ref={ch === focusedCell ? focusedCellRef : undefined}
              >
                {ch}
                {/* Read indicator dot */}
                {isRead && (
                  <span
                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Number-key jump overlay */}
        <ChapterJumpOverlay digits={jumpDigits} visible={jumpVisible} />
      </div>

      {/* Footer caption — hidden on mobile */}
      <div className="hidden shrink-0 border-t border-white/[0.08] px-4 py-3 sm:block">
        <p className="text-center text-sm text-white/50">Tap a chapter to read</p>
      </div>
    </div>
  )
}
