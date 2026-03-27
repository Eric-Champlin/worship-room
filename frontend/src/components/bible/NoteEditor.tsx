import { useEffect, useRef, useState } from 'react'

import { CrisisBanner } from '@/components/daily/CrisisBanner'
import { CharacterCount } from '@/components/ui/CharacterCount'
import { UnsavedChangesModal } from '@/components/ui/UnsavedChangesModal'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { NOTE_MAX_CHARS } from '@/constants/bible'
import type { BibleNote } from '@/types/bible'

interface NoteEditorProps {
  verseNumber: number
  existingNote?: BibleNote
  onSave: (text: string) => boolean
  onCancel: () => void
  onDelete?: () => void
  onDirtyChange?: (isDirty: boolean) => void
}

export function NoteEditor({
  verseNumber,
  existingNote,
  onSave,
  onCancel,
  onDelete,
  onDirtyChange,
}: NoteEditorProps) {
  const [text, setText] = useState(existingNote?.text ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = text !== (existingNote?.text ?? '')
  const isEmpty = text.trim().length === 0
  const { showModal, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty)

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const handleSave = () => {
    if (isEmpty) return
    onSave(text.trim())
  }

  return (
    <div className="mt-2 mb-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          if (e.target.value.length <= NOTE_MAX_CHARS) {
            setText(e.target.value)
          }
        }}
        placeholder="Add a note about this verse..."
        maxLength={NOTE_MAX_CHARS}
        rows={3}
        className="w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/90 placeholder:text-white/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/50 focus:outline-none"
        aria-label={`Personal note for verse ${verseNumber}`}
        aria-describedby="note-char-count"
      />

      {/* Character counter */}
      <div className="mt-1 text-right">
        <CharacterCount current={text.length} max={NOTE_MAX_CHARS} warningAt={240} dangerAt={288} id="note-char-count" />
      </div>

      {/* Crisis banner */}
      <CrisisBanner text={text} />

      {/* Actions */}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-white/40 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancel
        </button>

        {existingNote && onDelete && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="ml-auto text-sm text-white/30 hover:text-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Delete
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
          <span className="text-sm text-white/70">Delete this note?</span>
          <button
            type="button"
            onClick={() => {
              onDelete?.()
            }}
            className="text-sm font-medium text-danger hover:text-danger/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            className="text-sm text-white/40 hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      )}

      <UnsavedChangesModal isOpen={showModal} onLeave={confirmLeave} onStay={cancelLeave} />
    </div>
  )
}
