import { useEffect, useRef, useState } from 'react'
import { Pencil, StickyNote, Trash2 } from 'lucide-react'
import type { BibleNote } from '@/types/bible'

interface NoteIndicatorProps {
  note: BibleNote
  onEdit: () => void
  onDelete: (noteId: string) => void
}

export function NoteIndicator({ note, onEdit, onDelete }: NoteIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const expandedRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded((prev) => !prev)
    setShowDeleteConfirm(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(note.id)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }

  // Collapse on click outside
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        expandedRef.current &&
        !expandedRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsExpanded(false)
        setShowDeleteConfirm(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="ml-0.5 mr-0.5 inline-flex items-center text-amber-400/50 transition-colors hover:text-amber-400/80"
        aria-label={`Note on verse ${note.verseNumber}`}
        aria-expanded={isExpanded}
      >
        <StickyNote size={14} aria-hidden="true" />
      </button>

      {isExpanded && (
        <div
          ref={expandedRef}
          className="mt-1 mb-2 rounded-lg border border-white/10 bg-white/5 p-3"
          onClick={(e) => e.stopPropagation()}
          role="region"
          aria-label={`Note for verse ${note.verseNumber}`}
        >
          <p className="text-sm leading-relaxed text-white/70">{note.text}</p>

          {!showDeleteConfirm ? (
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50"
                aria-label="Edit note"
              >
                <Pencil size={12} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50"
                aria-label="Delete note"
              >
                <Trash2 size={12} aria-hidden="true" />
                Delete
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-white/70">Delete this note?</span>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="text-xs font-medium text-danger hover:text-danger/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={handleCancelDelete}
                className="text-xs text-white/40 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
