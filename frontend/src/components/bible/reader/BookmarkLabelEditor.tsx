import { useCallback, useEffect, useRef, useState } from 'react'
import type { VerseSelection } from '@/types/verse-actions'
import { toggleBookmark, setBookmarkLabel } from '@/lib/bible/bookmarkStore'

interface BookmarkLabelEditorProps {
  bookmarkId: string | null
  currentLabel: string
  selection: VerseSelection
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}

export function BookmarkLabelEditor({
  bookmarkId,
  currentLabel,
  selection,
  anchorRef,
  onClose,
}: BookmarkLabelEditorProps) {
  const [label, setLabel] = useState(currentLabel)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  // Position popover relative to the anchor button
  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const isMobile = window.innerWidth < 640

    if (isMobile) {
      // Above the action sheet, centered horizontally
      setPosition({
        top: rect.top - 8,
        left: window.innerWidth / 2,
      })
    } else {
      // Below the anchor button
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [anchorRef])

  // Auto-focus input on open
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleSave = useCallback(() => {
    let targetId = bookmarkId

    // If verse not yet bookmarked, create one first
    if (!targetId) {
      const result = toggleBookmark({
        book: selection.book,
        chapter: selection.chapter,
        startVerse: selection.startVerse,
        endVerse: selection.endVerse,
      })
      if (result.bookmark) {
        targetId = result.bookmark.id
      }
    }

    if (targetId) {
      setBookmarkLabel(targetId, label.trim())
    }

    onClose()
  }, [bookmarkId, label, selection, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    },
    [onClose, handleSave],
  )

  if (!position) return null

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <>
      {/* Backdrop — click outside to cancel */}
      <div
        className="fixed inset-0 z-[10002]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className={
          isMobile
            ? 'fixed z-[10003] w-[calc(100vw-2rem)] max-w-[400px] -translate-x-1/2 -translate-y-full p-4'
            : 'fixed z-[10003] w-[300px] -translate-x-1/2 p-4'
        }
        style={{
          top: position.top,
          left: position.left,
          background: 'rgba(15, 10, 30, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '0.75rem',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Edit bookmark label"
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="text"
          maxLength={80}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Add a label..."
          className="w-full rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
          style={{ minHeight: 44 }}
        />

        {/* Character counter */}
        <div className="mt-1.5 text-right text-xs text-white/40">
          {label.length} / 80
        </div>

        {/* Button row */}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}
