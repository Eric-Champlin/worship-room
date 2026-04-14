import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { NoteEditorSubView } from '../NoteEditorSubView'
import type { VerseSelection, VerseActionContext } from '@/types/verse-actions'
import type { Note } from '@/types/bible'
import * as noteStore from '@/lib/bible/notes/store'
import * as useAutosaveModule from '@/hooks/useAutosave'

// Mock the note store
vi.mock('@/lib/bible/notes/store', () => ({
  getNoteForSelection: vi.fn(),
  upsertNote: vi.fn(),
  updateNoteBody: vi.fn(),
  deleteNote: vi.fn(),
  restoreNote: vi.fn(),
  NoteStorageFullError: class NoteStorageFullError extends Error {
    constructor() {
      super('Storage full')
      this.name = 'NoteStorageFullError'
    }
  },
}))

// Mock useAutosave
vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: vi.fn().mockReturnValue({
    status: 'idle',
    flush: vi.fn(),
    lastSavedAt: null,
  }),
}))

// Mock formatReference
vi.mock('@/lib/bible/verseActionRegistry', () => ({
  formatReference: vi.fn(
    (sel: VerseSelection) =>
      sel.startVerse === sel.endVerse
        ? `${sel.bookName} ${sel.chapter}:${sel.startVerse}`
        : `${sel.bookName} ${sel.chapter}:${sel.startVerse}\u2013${sel.endVerse}`,
  ),
}))

const mockedStore = vi.mocked(noteStore)

const makeSelection = (overrides: Partial<VerseSelection> = {}): VerseSelection => ({
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
  ...overrides,
})

const makeContext = (): VerseActionContext => ({
  showToast: vi.fn(),
  closeSheet: vi.fn(),
  navigate: vi.fn(),
})

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'note-1',
  book: 'john',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  body: 'Existing note body',
  createdAt: Date.now() - 60000,
  updatedAt: Date.now() - 30000,
  ...overrides,
})

describe('NoteEditorSubView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockedStore.getNoteForSelection.mockReturnValue(null)
  })

  it('renders textarea with placeholder', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    expect(
      screen.getByPlaceholderText('Write what this passage means to you…'),
    ).toBeInTheDocument()
  })

  it('textarea has correct aria-label', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Note for John 3:16')).toBeInTheDocument()
  })

  it('shows "New note" subtitle when no existing note', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('New note')).toBeInTheDocument()
  })

  it('shows "Edited Xm ago" subtitle for existing notes', () => {
    mockedStore.getNoteForSelection.mockReturnValue(
      makeNote({ updatedAt: Date.now() - 120000 }),
    )

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('Edited 2m ago')).toBeInTheDocument()
  })

  it('pre-fills textarea with existing note body', () => {
    mockedStore.getNoteForSelection.mockReturnValue(
      makeNote({ body: 'My existing note' }),
    )

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    const textarea = screen.getByLabelText('Note for John 3:16') as HTMLTextAreaElement
    expect(textarea.value).toBe('My existing note')
  })

  it('shows verse preview strip with verse text', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('For God so loved the world...')).toBeInTheDocument()
  })

  it('hard stop at 10,000 characters', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    const textarea = screen.getByLabelText('Note for John 3:16') as HTMLTextAreaElement
    const longText = 'a'.repeat(10001)
    fireEvent.change(textarea, { target: { value: longText } })

    // Value should not be updated beyond limit
    expect(textarea.value.length).toBeLessThanOrEqual(10000)
  })

  it('Tab key inserts tab character (prevented default)', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    const textarea = screen.getByLabelText('Note for John 3:16') as HTMLTextAreaElement

    // Type some text first
    fireEvent.change(textarea, { target: { value: 'hello' } })

    // Set cursor position
    Object.defineProperty(textarea, 'selectionStart', { value: 5, writable: true })
    Object.defineProperty(textarea, 'selectionEnd', { value: 5, writable: true })

    // Fire Tab keydown event
    const tabEvent = fireEvent.keyDown(textarea, { key: 'Tab' })

    // fireEvent.keyDown returns false when preventDefault was called
    expect(tabEvent).toBe(false)
  })

  it('Shift+Tab is handled without error', () => {
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    const textarea = screen.getByLabelText('Note for John 3:16') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: '\thello' } })

    Object.defineProperty(textarea, 'selectionStart', { value: 1, writable: true })
    Object.defineProperty(textarea, 'selectionEnd', { value: 1, writable: true })

    // Should not throw
    fireEvent.keyDown(textarea, { key: 'Tab', shiftKey: true })
  })

  it('delete button visible only for existing notes', () => {
    // No existing note — no delete button
    const { unmount } = render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.queryByLabelText('Delete note')).not.toBeInTheDocument()
    unmount()

    // Existing note — delete button visible
    mockedStore.getNoteForSelection.mockReturnValue(makeNote())

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Delete note')).toBeInTheDocument()
  })

  it('delete confirm prompt appears on trash click', () => {
    mockedStore.getNoteForSelection.mockReturnValue(makeNote())

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Delete note'))
    expect(screen.getByText('Delete this note?')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('confirming delete calls deleteNote and onBack', () => {
    const note = makeNote()
    mockedStore.getNoteForSelection.mockReturnValue(note)
    const onBack = vi.fn()
    const ctx = makeContext()

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={onBack}
        context={ctx}
      />,
    )

    fireEvent.click(screen.getByLabelText('Delete note'))
    fireEvent.click(screen.getByText('Delete'))

    expect(mockedStore.deleteNote).toHaveBeenCalledWith('note-1')
    expect(onBack).toHaveBeenCalled()
    expect(ctx.showToast).toHaveBeenCalledWith(
      'Note deleted',
      undefined,
      expect.objectContaining({ label: 'Undo' }),
    )
  })

  it('back button calls onBack', () => {
    const onBack = vi.fn()
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={onBack}
      />,
    )

    fireEvent.click(screen.getByLabelText('Back'))
    expect(onBack).toHaveBeenCalled()
  })

  it('Escape key calls onBack', () => {
    const onBack = vi.fn()
    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={onBack}
      />,
    )

    const textarea = screen.getByLabelText('Note for John 3:16')
    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(onBack).toHaveBeenCalled()
  })

  it('subtitle updates to "Edited just now" after first save', () => {
    const useAutosaveSpy = vi.spyOn(useAutosaveModule, 'useAutosave')
    let capturedOnSave: ((value: string) => void) | undefined

    useAutosaveSpy.mockImplementation((opts) => {
      capturedOnSave = opts.onSave as (value: string) => void
      return { status: 'idle' as const, flush: vi.fn(), lastSavedAt: null }
    })

    // Mock upsertNote to return a note (triggers setNoteId + setLastSavedAt)
    mockedStore.upsertNote.mockReturnValue(makeNote())

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('New note')).toBeInTheDocument()

    // Invoke the captured onSave (simulating autosave trigger)
    expect(capturedOnSave).toBeDefined()
    act(() => {
      capturedOnSave!('My first note')
    })

    // After save, subtitle should update to "Edited just now"
    expect(screen.getByText('Edited just now')).toBeInTheDocument()

    // Restore the default mock (don't use mockRestore — it breaks the vi.mock)
    useAutosaveSpy.mockReturnValue({
      status: 'idle',
      flush: vi.fn(),
      lastSavedAt: null,
    })
  })

  it('delete confirm prompt focuses the Delete button', () => {
    mockedStore.getNoteForSelection.mockReturnValue(makeNote())

    render(
      <NoteEditorSubView
        selection={makeSelection()}
        onBack={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByLabelText('Delete note'))
    expect(screen.getByText('Delete')).toHaveFocus()
  })
})
