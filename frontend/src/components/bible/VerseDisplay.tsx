import { useCallback, useEffect, useRef, useState } from 'react'
import { recordChapterVisit } from '@/lib/heatmap/chapterVisitStore'
import { FloatingActionBar } from '@/components/bible/FloatingActionBar'
import { NoteEditor } from '@/components/bible/NoteEditor'
import { NoteIndicator } from '@/components/bible/NoteIndicator'
import { SharePanel } from '@/components/sharing/SharePanel'
import { HIGHLIGHT_COLORS } from '@/constants/bible'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { BibleVerse, BibleHighlight, BibleNote } from '@/types/bible'

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export interface VerseDisplayProps {
  verses: BibleVerse[]
  book: { name: string; slug: string; chapters: number; hasFullText: boolean }
  chapterNumber: number
  isAuthenticated: boolean
  getHighlightsForChapter: (bookSlug: string, chapter: number) => BibleHighlight[]
  getHighlightForVerse: (bookSlug: string, chapter: number, verse: number) => BibleHighlight | undefined
  setHighlight: (bookSlug: string, chapter: number, verse: number, color: string) => void
  getNotesForChapter: (bookSlug: string, chapter: number) => BibleNote[]
  getNoteForVerse: (bookSlug: string, chapter: number, verse: number) => BibleNote | undefined
  saveNote: (bookSlug: string, chapter: number, verse: number, text: string) => boolean
  deleteNote: (noteId: string) => void
  currentVerseIndex: number
  isChapterRead: (bookSlug: string, chapter: number) => boolean
  markChapterRead: (bookSlug: string, chapter: number) => void
  announce: (message: string) => void
}

export function VerseDisplay({
  verses,
  book,
  chapterNumber,
  isAuthenticated,
  getHighlightsForChapter,
  getHighlightForVerse,
  setHighlight: applyHighlight,
  getNotesForChapter,
  getNoteForVerse,
  saveNote,
  deleteNote,
  currentVerseIndex,
  isChapterRead,
  markChapterRead,
  announce,
}: VerseDisplayProps) {
  const { showToast } = useToast()
  const bookSlug = book.slug

  const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [editingNoteVerse, setEditingNoteVerse] = useState<number | null>(null)
  const [showDiscardPrompt, setShowDiscardPrompt] = useState<number | null>(null)

  const noteEditorDirtyRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const hasMarkedRef = useRef(false)

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

  // Handle verse highlighting from URL hash
  useEffect(() => {
    if (verses.length === 0) return

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
      const HIGHLIGHT_FADE_MS = 2000
      const timer = setTimeout(() => setHighlightedVerse(null), HIGHLIGHT_FADE_MS)
      return () => clearTimeout(timer)
    }
  }, [verses])

  // Intersection Observer for chapter completion
  useEffect(() => {
    if (!isAuthenticated || !book.hasFullText) return
    if (verses.length === 0) return
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
  }, [isAuthenticated, bookSlug, book, chapterNumber, verses, isChapterRead, markChapterRead])

  // Record chapter visit for heatmap (BB-43)
  useEffect(() => {
    if (!isAuthenticated) return
    if (verses.length === 0) return
    recordChapterVisit(bookSlug, chapterNumber)
  }, [isAuthenticated, bookSlug, chapterNumber, verses.length])

  const handleVerseClick = useCallback(
    (verseNumber: number) => {
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
    if (selectedVerse === null) return
    const verse = verses.find((v) => v.number === selectedVerse)
    if (!verse) return

    const text = `"${verse.text}" \u2014 ${book.name} ${chapterNumber}:${verse.number} WEB`

    try {
      await navigator.clipboard.writeText(text)
    } catch (_e) {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch (_e) {
        showToast("We couldn't copy that. Try again.", 'error')
        return
      }
    }

    showToast('Verse copied.', 'success')
    handleDismissActionBar()
  }, [selectedVerse, verses, book.name, chapterNumber, showToast, handleDismissActionBar])

  const handleHighlightClick = useCallback(() => {
    setShowColorPicker((prev) => !prev)
    setShowShareMenu(false)
  }, [])

  const handleSelectColor = useCallback(
    (color: string) => {
      if (selectedVerse === null) return
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
      if (editingNoteVerse === null) return false
      const success = saveNote(bookSlug, chapterNumber, editingNoteVerse, text)
      if (!success) {
        showToast("You've filled your notebook! Remove an older note to make room.", 'error')
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

  const chapterHighlights = getHighlightsForChapter(bookSlug, chapterNumber)
  const chapterNotes = getNotesForChapter(bookSlug, chapterNumber)
  const selectedVerseData = selectedVerse
    ? verses.find((v) => v.number === selectedVerse)
    : null
  const selectedVerseHighlight = selectedVerse
    ? getHighlightForVerse(bookSlug, chapterNumber, selectedVerse)
    : undefined
  const selectedVerseNote = selectedVerse
    ? getNoteForVerse(bookSlug, chapterNumber, selectedVerse)
    : undefined
  const selectedElement = selectedVerse
    ? document.getElementById(`verse-${selectedVerse}`)
    : null

  return (
    <>
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
          const isTtsActive = currentVerseIndex === index

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
              {isEditingThis && (
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
                    className="text-sm text-white/50 hover:text-white/60"
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
    </>
  )
}
