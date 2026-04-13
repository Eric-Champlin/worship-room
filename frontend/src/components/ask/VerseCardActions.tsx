import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Highlighter, StickyNote, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useBibleNotes } from '@/hooks/useBibleNotes'
import { useToast } from '@/components/ui/Toast'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { SharePanel } from '@/components/sharing/SharePanel'
import { NOTE_MAX_CHARS } from '@/constants/bible'
import type { AskVerse } from '@/types/ask'
import type { ParsedVerseReference } from '@/lib/parse-verse-references'

interface VerseCardActionsProps {
  verse: AskVerse
  parsedRef: ParsedVerseReference | null
}

export function VerseCardActions({ verse, parsedRef }: VerseCardActionsProps) {
  const { isAuthenticated } = useAuth()
  const authModal = useAuthModal()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { getNoteForVerse, saveNote } = useBibleNotes()
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showSharePanel, setShowSharePanel] = useState(false)

  // Pre-fill with existing note when expanding
  useEffect(() => {
    if (showNoteInput && parsedRef) {
      const existing = getNoteForVerse(parsedRef.book, parsedRef.chapter, parsedRef.verseStart)
      if (existing) {
        setNoteText(existing.text)
      }
    }
  }, [showNoteInput, parsedRef, getNoteForVerse])

  if (!parsedRef) return null

  const handleHighlight = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save highlights and notes')
      return
    }
    // BB-38: write ?scroll-to= (renamed from ?highlight=) for the one-shot arrival glow.
    navigate(`/bible/${parsedRef.bookSlug}/${parsedRef.chapter}?scroll-to=${parsedRef.verseStart}#verse-${parsedRef.verseStart}`)
  }

  const handleSaveNoteClick = () => {
    if (!isAuthenticated) {
      authModal?.openAuthModal('Sign in to save highlights and notes')
      return
    }
    setShowNoteInput(true)
  }

  const handleSave = () => {
    if (!noteText.trim()) return
    const success = saveNote(parsedRef.book, parsedRef.chapter, parsedRef.verseStart, noteText.trim())
    if (success) {
      setShowNoteInput(false)
      setNoteText('')
      showToast('Note saved.')
    } else {
      showToast("You've filled your notebook! Remove an older note to make room.", 'error')
    }
  }

  const handleCancel = () => {
    setShowNoteInput(false)
    setNoteText('')
  }

  return (
    <>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={handleHighlight}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-primary"
        >
          <Highlighter className="h-3.5 w-3.5" aria-hidden="true" />
          Highlight in Bible
        </button>
        <button
          type="button"
          onClick={handleSaveNoteClick}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-primary"
        >
          <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
          Save note
        </button>
        <button
          type="button"
          onClick={() => setShowSharePanel(true)}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-primary"
          aria-label={`Share ${verse.reference}`}
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Share
        </button>
      </div>
      <SharePanel
        verseText={verse.text}
        reference={verse.reference}
        isOpen={showSharePanel}
        onClose={() => setShowSharePanel(false)}
      />

      {showNoteInput && (
        <div className="mt-3 overflow-hidden transition-all motion-reduce:transition-none duration-base">
          <label htmlFor={`note-${verse.reference}`} className="sr-only">
            Note for {verse.reference}
          </label>
          <textarea
            id={`note-${verse.reference}`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add a note about this verse..."
            maxLength={NOTE_MAX_CHARS}
            rows={3}
            aria-invalid={noteText.length > NOTE_MAX_CHARS ? 'true' : undefined}
            aria-describedby={`note-count-${verse.reference}`}
            className={cn(
              'w-full resize-none rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2',
              'text-sm text-white placeholder:text-white/50',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
            )}
          />
          <div className="mt-1 flex items-center justify-between">
            <span id={`note-count-${verse.reference}`} className="text-xs text-white/60">
              {noteText.length} / {NOTE_MAX_CHARS}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[44px] rounded-lg px-3 py-1 text-xs text-white/50 transition-colors hover:text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!noteText.trim()}
                className={cn(
                  'min-h-[44px] rounded-lg bg-primary px-3 py-1 text-xs text-white transition-colors hover:bg-primary-lt',
                  !noteText.trim() && 'cursor-not-allowed opacity-50',
                )}
              >
                Save
              </button>
            </div>
          </div>
          <CrisisBanner text={noteText} />
        </div>
      )}
    </>
  )
}
