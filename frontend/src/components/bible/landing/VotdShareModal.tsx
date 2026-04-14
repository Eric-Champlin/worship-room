import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { ShareSubView } from '@/components/bible/reader/ShareSubView'
import type { VotdHydrated } from '@/types/bible-landing'
import type { VerseSelection } from '@/types/verse-actions'

interface VotdShareModalProps {
  isOpen: boolean
  onClose: () => void
  votd: VotdHydrated
}

export function VotdShareModal({ isOpen, onClose, votd }: VotdShareModalProps) {
  const trapRef = useFocusTrap(isOpen, onClose)

  // Build VerseSelection from VOTD data
  const selection: VerseSelection = {
    book: votd.entry.book,
    bookName: votd.bookName,
    chapter: votd.entry.chapter,
    startVerse: votd.entry.startVerse,
    endVerse: votd.entry.endVerse,
    verses: [{ number: votd.entry.startVerse, text: votd.verseText }],
  }

  // Close on backdrop click
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Share verse of the day"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15, 10, 30, 0.95)', backdropFilter: 'blur(16px)' }}
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={trapRef}
        className="relative z-10 mx-4 w-full max-w-lg rounded-2xl border border-white/[0.12] bg-white/[0.06] p-6 backdrop-blur-sm"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close share modal"
          className="absolute right-4 top-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white/50 hover:bg-white/[0.06] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-white">Share Verse of the Day</h2>

        <ShareSubView selection={selection} onBack={onClose} />
      </div>
    </div>
  )
}
