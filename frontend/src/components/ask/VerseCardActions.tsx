import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Highlighter, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { useBibleNotes } from '@/hooks/useBibleNotes'
import { useToast } from '@/components/ui/Toast'
import { CrisisBanner } from '@/components/daily/CrisisBanner'
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
    navigate(`/bible/${parsedRef.bookSlug}/${parsedRef.chapter}?highlight=${parsedRef.verseStart}#verse-${parsedRef.verseStart}`)
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
      showToast('Note saved')
    } else {
      showToast('Note limit reached. Delete an existing note to add a new one.', 'error')
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
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-text-light transition-colors hover:text-primary"
        >
          <Highlighter className="h-3.5 w-3.5" />
          Highlight in Bible
        </button>
        <button
          type="button"
          onClick={handleSaveNoteClick}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-text-light transition-colors hover:text-primary"
        >
          <StickyNote className="h-3.5 w-3.5" />
          Save note
        </button>
      </div>

      {showNoteInput && (
        <div className="mt-3 overflow-hidden transition-all duration-300">
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
            className={cn(
              'w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2',
              'text-sm text-text-dark placeholder:text-text-light/60',
              'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
            )}
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-text-light/60">
              {noteText.length} / {NOTE_MAX_CHARS}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="min-h-[44px] rounded-lg px-3 py-1 text-xs text-text-light transition-colors hover:text-text-dark"
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
