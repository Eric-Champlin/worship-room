import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { NOTE_BODY_MAX_CHARS } from '@/constants/bible'
import {
  getNoteForSelection,
  upsertNote,
  updateNoteBody,
  deleteNote,
  restoreNote,
  NoteStorageFullError,
} from '@/lib/bible/notes/store'
import { formatReference } from '@/lib/bible/verseActionRegistry'
import { useAutosave } from '@/hooks/useAutosave'
import { CharacterCount } from '@/components/ui/CharacterCount'
import type { Note } from '@/types/bible'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'

interface NoteEditorSubViewProps {
  selection: VerseSelection
  onBack: () => void
  context?: VerseActionContext
}

function editedAgo(epochMs: number): string {
  const seconds = Math.floor((Date.now() - epochMs) / 1000)
  if (seconds < 60) return 'Edited just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Edited ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Edited ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Edited ${days}d ago`
}

export function NoteEditorSubView({ selection, onBack, context }: NoteEditorSubViewProps) {
  const existingNote = useRef<Note | null>(getNoteForSelection(selection))
  const [noteId, setNoteId] = useState<string | null>(existingNote.current?.id ?? null)
  const [body, setBody] = useState(existingNote.current?.body ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)
  const lastErrorRef = useRef<'storage-full' | 'other' | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    existingNote.current?.updatedAt ?? null,
  )

  // Determine reference display — use note's full range if wider than selection
  const displayRef = existingNote.current
    ? formatReference({
        ...selection,
        startVerse: existingNote.current.startVerse,
        endVerse: existingNote.current.endVerse,
      })
    : formatReference(selection)

  // Subtitle — reactive to saves
  const subtitle = lastSavedAt
    ? editedAgo(lastSavedAt)
    : existingNote.current
      ? editedAgo(existingNote.current.updatedAt)
      : 'New note'

  // Verse preview text
  const versePreview = selection.verses.map((v) => v.text).join(' ')

  // Read font preference
  const fontFamily =
    typeof window !== 'undefined'
      ? localStorage.getItem('wr_bible_reader_font_family') === 'sans'
        ? 'Inter, sans-serif'
        : 'Lora, serif'
      : 'Lora, serif'

  // Autosave
  const handleSave = useCallback(
    (value: string) => {
      if (!value.trim()) return // Don't persist empty notes

      try {
        if (noteId) {
          updateNoteBody(noteId, value)
        } else {
          const created = upsertNote(selection, value)
          setNoteId(created.id)
        }
        lastErrorRef.current = null
        setLastSavedAt(Date.now())
      } catch (e) {
        if (e instanceof NoteStorageFullError) {
          lastErrorRef.current = 'storage-full'
          context?.showToast('Storage full — clear some notes to free space')
        } else {
          lastErrorRef.current = 'other'
        }
        throw e
      }
    },
    [noteId, selection, context],
  )

  const autosave = useAutosave({
    value: body,
    onSave: handleSave,
    delay: 2000,
    enabled: true,
  })

  // Autofocus
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Save status text
  const statusText =
    autosave.status === 'saving'
      ? 'Saving…'
      : autosave.status === 'saved'
        ? 'Saved'
        : autosave.status === 'error'
          ? lastErrorRef.current === 'storage-full'
            ? "Couldn't save — storage full"
            : "Couldn't save — try again"
          : body && body !== (existingNote.current?.body ?? '')
            ? 'Unsaved changes'
            : ''

  // Close handler — flush and close
  const handleClose = useCallback(() => {
    autosave.flush()
    onBack()
  }, [autosave, onBack])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + S → force save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        autosave.flush()
        return
      }

      // Escape → save and close
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }

      // Tab → insert tab character
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        const textarea = e.currentTarget
        const { selectionStart, selectionEnd } = textarea
        const newValue = body.slice(0, selectionStart) + '\t' + body.slice(selectionEnd)
        if (newValue.length <= NOTE_BODY_MAX_CHARS) {
          setBody(newValue)
          // Restore cursor after React re-render
          requestAnimationFrame(() => {
            textarea.selectionStart = selectionStart + 1
            textarea.selectionEnd = selectionStart + 1
          })
        }
        return
      }

      // Shift+Tab → remove leading tab from current line
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault()
        const textarea = e.currentTarget
        const { selectionStart } = textarea
        const lineStart = body.lastIndexOf('\n', selectionStart - 1) + 1
        if (body[lineStart] === '\t') {
          const newValue = body.slice(0, lineStart) + body.slice(lineStart + 1)
          setBody(newValue)
          requestAnimationFrame(() => {
            const newPos = Math.max(lineStart, selectionStart - 1)
            textarea.selectionStart = newPos
            textarea.selectionEnd = newPos
          })
        }
        return
      }

      // Cmd/Ctrl + Backspace → delete to start of current line
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault()
        const textarea = e.currentTarget
        const { selectionStart } = textarea
        const lineStart = body.lastIndexOf('\n', selectionStart - 1) + 1
        if (selectionStart > lineStart) {
          const newValue = body.slice(0, lineStart) + body.slice(selectionStart)
          setBody(newValue)
          requestAnimationFrame(() => {
            textarea.selectionStart = lineStart
            textarea.selectionEnd = lineStart
          })
        }
      }
    },
    [body, autosave, handleClose],
  )

  // Delete flow
  const handleDeleteConfirm = useCallback(() => {
    if (!noteId) return
    const deletedNote = getNoteForSelection(selection)
    if (!deletedNote) return

    deleteNote(noteId)
    onBack()
    context?.showToast('Note deleted', undefined, {
      label: 'Undo',
      onClick: () => restoreNote(deletedNote),
    })
  }, [noteId, selection, onBack, context])

  // Focus the delete button when confirm prompt appears
  useEffect(() => {
    if (showDeleteConfirm) {
      deleteButtonRef.current?.focus()
    }
  }, [showDeleteConfirm])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      if (value.length <= NOTE_BODY_MAX_CHARS) {
        setBody(value)
      }
    },
    [],
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={handleClose}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-white/70" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{displayRef}</div>
          <div className="text-xs text-white/50">{subtitle}</div>
        </div>
        {noteId && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
            aria-label="Delete note"
          >
            <Trash2 className="h-5 w-5 text-red-400" />
          </button>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="flex-1 text-sm text-white/70">Delete this note?</span>
          <button
            ref={deleteButtonRef}
            type="button"
            onClick={handleDeleteConfirm}
            className="min-h-[44px] rounded-lg bg-red-500/20 px-4 text-sm font-medium text-red-400"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(false)}
            className="min-h-[44px] rounded-lg px-4 text-sm text-white/60"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Verse preview */}
      <div
        className="line-clamp-2 px-4 py-2 text-xs"
        style={{ color: 'var(--reader-verse-num)' }}
      >
        {versePreview}
      </div>

      {/* Textarea */}
      <div className="relative flex-1 px-4">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={NOTE_BODY_MAX_CHARS}
          placeholder="Write what this passage means to you…"
          aria-label={`Note for ${displayRef}`}
          aria-describedby="note-char-count"
          className="h-full w-full resize-none bg-transparent placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/20 rounded"
          style={{
            color: 'var(--reader-text)',
            fontFamily,
            lineHeight: 1.75,
          }}
        />
        <div className="absolute bottom-2 right-4">
          <CharacterCount
            current={body.length}
            max={NOTE_BODY_MAX_CHARS}
            warningAt={9000}
            dangerAt={10000}
            visibleAt={1}
            id="note-char-count"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
        <div className="text-xs text-white/50" aria-live="polite">
          {statusText}
        </div>
        <div className="text-xs text-white/50">Autosaves every 2 seconds</div>
      </div>
    </div>
  )
}
