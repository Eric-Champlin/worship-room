import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { VerseCardActions } from '../VerseCardActions'
import type { AskVerse } from '@/types/ask'
import type { ParsedVerseReference } from '@/lib/parse-verse-references'
import type { AuthContextValue } from '@/contexts/AuthContext'
import type { Note } from '@/types/bible'
import { NoteStorageFullError } from '@/lib/bible/notes/store'
import { addCard, _resetForTesting } from '@/lib/memorize'

const { mockAuthFn } = vi.hoisted(() => {
  const mockAuthFn = vi.fn((): AuthContextValue => ({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }))
  return { mockAuthFn }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: mockAuthFn,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockAuthFn,
}))

const mockUpsertNote = vi.fn()
const mockGetNoteForVerse = vi.fn((): Note | null => null)

vi.mock('@/lib/bible/notes/store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/bible/notes/store')>()
  return {
    ...actual,
    upsertNote: (...args: Parameters<typeof actual.upsertNote>) => mockUpsertNote(...args),
    getNoteForVerse: (...args: Parameters<typeof actual.getNoteForVerse>) => mockGetNoteForVerse(...args),
  }
})

const VERSE: AskVerse = {
  reference: 'Romans 8:28',
  text: 'We know that all things work together for good...',
  explanation: 'God is working things together.',
}

const PARSED_REF: ParsedVerseReference = {
  raw: 'Romans 8:28',
  book: 'Romans',
  bookSlug: 'romans',
  chapter: 8,
  verseStart: 28,
  startIndex: 0,
  endIndex: 11,
}

function renderActions(
  props: { verse?: AskVerse; parsedRef?: ParsedVerseReference | null } = {},
) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <VerseCardActions
            verse={props.verse ?? VERSE}
            parsedRef={'parsedRef' in props ? (props.parsedRef ?? null) : PARSED_REF}
          />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  _resetForTesting()
  mockAuthFn.mockReturnValue({
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
  mockUpsertNote.mockReset()
  mockGetNoteForVerse.mockReturnValue(null)
})

describe('VerseCardActions', () => {
  it('"Highlight in Bible" button renders with Highlighter icon', () => {
    renderActions()
    expect(screen.getByRole('button', { name: /Highlight in Bible/i })).toBeInTheDocument()
  })

  it('"Save note" button renders with StickyNote icon', () => {
    renderActions()
    expect(screen.getByRole('button', { name: /Save note/i })).toBeInTheDocument()
  })

  it('renders no buttons when parsedRef is null', () => {
    renderActions({ parsedRef: null })
    expect(screen.queryByRole('button', { name: /Highlight in Bible/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Save note/i })).not.toBeInTheDocument()
  })

  it('logged-out click "Highlight in Bible" opens auth modal', async () => {
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Highlight in Bible/i }))
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('logged-out click "Save note" opens auth modal', async () => {
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()
  })

  it('logged-in click "Save note" expands textarea', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    expect(screen.getByPlaceholderText('Add a note about this verse...')).toBeInTheDocument()
  })

  it('inline textarea has 10000 char max', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    expect(textarea).toHaveAttribute('maxLength', '10000')
  })

  it('Save button saves note via canonical notes store', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    await user.type(textarea, 'My note')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))
    expect(mockUpsertNote).toHaveBeenCalledWith(
      { book: 'Romans', chapter: 8, startVerse: 28, endVerse: 28 },
      'My note',
    )
  })

  it('note storage full shows error toast', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    mockUpsertNote.mockImplementation(() => { throw new NoteStorageFullError() })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    await user.type(screen.getByPlaceholderText('Add a note about this verse...'), 'Note text')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))
    expect(screen.getByText(/filled your notebook/i)).toBeInTheDocument()
  })

  it('existing note pre-fills textarea', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    mockGetNoteForVerse.mockReturnValue({
      id: '1',
      book: 'Romans',
      chapter: 8,
      startVerse: 28,
      endVerse: 28,
      body: 'Existing note text',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    const textarea = screen.getByPlaceholderText('Add a note about this verse...')
    expect(textarea).toHaveValue('Existing note text')
  })

  it('crisis banner appears when crisis keyword typed in note', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    await user.type(
      screen.getByPlaceholderText('Add a note about this verse...'),
      'I want to kill myself',
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('Cancel button collapses textarea', async () => {
    mockAuthFn.mockReturnValue({
      isAuthenticated: true,
      user: { name: 'Test', id: 'test' },
      login: vi.fn(),
      logout: vi.fn(),
    })
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Save note/i }))
    expect(screen.getByPlaceholderText('Add a note about this verse...')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(screen.queryByPlaceholderText('Add a note about this verse...')).not.toBeInTheDocument()
  })

  it('renders Memorize button', () => {
    renderActions()
    expect(screen.getByRole('button', { name: /Memorize this verse/i })).toBeInTheDocument()
  })

  it('Memorize button has aria-pressed="false" initially', () => {
    renderActions()
    expect(screen.getByRole('button', { name: /Memorize this verse/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking Memorize adds card to store and shows Memorized', async () => {
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Memorize this verse/i }))
    const btn = screen.getByRole('button', { name: /Remove from memorization deck/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking Memorized removes card from store', async () => {
    addCard({
      book: 'romans',
      bookName: 'Romans',
      chapter: 8,
      startVerse: 28,
      endVerse: 28,
      verseText: VERSE.text,
      reference: VERSE.reference,
    })
    const user = userEvent.setup()
    renderActions()
    const btn = screen.getByRole('button', { name: /Remove from memorization deck/i })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    await user.click(btn)
    expect(screen.getByRole('button', { name: /Memorize this verse/i })).toBeInTheDocument()
  })

  it('BB-45: store mutation after mount updates Memorize button (cross-mount sync)', async () => {
    renderActions()
    expect(screen.getByRole('button', { name: /Memorize this verse/i })).toBeInTheDocument()
    act(() => {
      addCard({
        book: 'romans',
        bookName: 'Romans',
        chapter: 8,
        startVerse: 28,
        endVerse: 28,
        verseText: VERSE.text,
        reference: VERSE.reference,
      })
    })
    expect(await screen.findByRole('button', { name: /Remove from memorization deck/i })).toBeInTheDocument()
  })

  it('Memorize button is NOT auth-gated (logged-out user can memorize)', async () => {
    // Default beforeEach: isAuthenticated = false
    const user = userEvent.setup()
    renderActions()
    await user.click(screen.getByRole('button', { name: /Memorize this verse/i }))
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remove from memorization deck/i })).toBeInTheDocument()
  })

  it('renders four action buttons in correct order: Highlight, Memorize, Save note, Share', () => {
    renderActions()
    const buttons = screen.getAllByRole('button')
    const names = buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim())
    const highlightIdx = names.findIndex((n) => /Highlight in Bible/i.test(n ?? ''))
    const memorizeIdx = names.findIndex((n) => /Memorize this verse/i.test(n ?? ''))
    const saveNoteIdx = names.findIndex((n) => /Save note/i.test(n ?? ''))
    const shareIdx = names.findIndex((n) => /Share/i.test(n ?? ''))
    expect(highlightIdx).toBeLessThan(memorizeIdx)
    expect(memorizeIdx).toBeLessThan(saveNoteIdx)
    expect(saveNoteIdx).toBeLessThan(shareIdx)
  })
})
