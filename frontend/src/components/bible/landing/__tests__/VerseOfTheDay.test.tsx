import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { VerseOfTheDay } from '../VerseOfTheDay'

const mockVotd = {
  entry: {
    ref: 'Psalms 23:1',
    book: 'psalms',
    chapter: 23,
    startVerse: 1,
    endVerse: 1,
    theme: 'provision' as const,
  },
  verseText: 'Yahweh is my shepherd; I shall lack nothing.',
  bookName: 'Psalms',
  wordCount: 8,
}

const mockLongVotd = {
  entry: {
    ref: 'Isaiah 41:10',
    book: 'isaiah',
    chapter: 41,
    startVerse: 10,
    endVerse: 10,
    theme: 'comfort' as const,
  },
  verseText:
    "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.",
  bookName: 'Isaiah',
  wordCount: 38,
}

let mockIsLoading = false
let mockVotdValue = mockVotd

vi.mock('@/hooks/bible/useVerseOfTheDay', () => ({
  useVerseOfTheDay: () => ({
    votd: mockIsLoading ? null : mockVotdValue,
    isLoading: mockIsLoading,
  }),
}))

let mockIsAuthenticated = false
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated ? { name: 'Test' } : null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

const mockToggleBookmark = vi.fn().mockReturnValue({ created: true, bookmark: { id: 'bm-1' } })
const mockIsSelectionBookmarked = vi.fn().mockReturnValue(false)
const mockSetBookmarkLabel = vi.fn()
const mockSubscribeBookmarks = vi.fn().mockReturnValue(() => {})

vi.mock('@/lib/bible/bookmarkStore', () => ({
  toggleBookmark: (...args: unknown[]) => mockToggleBookmark(...args),
  isSelectionBookmarked: (...args: unknown[]) => mockIsSelectionBookmarked(...args),
  setBookmarkLabel: (...args: unknown[]) => mockSetBookmarkLabel(...args),
  subscribe: (...args: unknown[]) => mockSubscribeBookmarks(...args),
}))

function renderComponent() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <VerseOfTheDay />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsLoading = false
  mockVotdValue = mockVotd
  mockIsAuthenticated = false
  mockIsSelectionBookmarked.mockReturnValue(false)
  mockToggleBookmark.mockReturnValue({ created: true, bookmark: { id: 'bm-1' } })
})

describe('VerseOfTheDay', () => {
  it('renders verse text from hook', () => {
    renderComponent()
    expect(screen.getByText('Yahweh is my shepherd; I shall lack nothing.')).toBeInTheDocument()
  })

  it('renders reference below verse', () => {
    renderComponent()
    const cite = screen.getByText('Psalms 23:1')
    expect(cite.tagName.toLowerCase()).toBe('cite')
  })

  it('renders "VERSE OF THE DAY" label', () => {
    renderComponent()
    expect(screen.getByText('Verse of the Day')).toBeInTheDocument()
  })

  it('renders date in locale format', () => {
    renderComponent()
    const today = new Date().toLocaleDateString()
    expect(screen.getByText(today)).toBeInTheDocument()
  })

  it('"Read in context" links to correct URL with highlight', () => {
    renderComponent()
    const link = screen.getByText('Read in context').closest('a')
    expect(link?.getAttribute('href')).toBe('/bible/psalms/23?scroll-to=1')
  })

  it('"Share" opens share modal', () => {
    renderComponent()
    fireEvent.click(screen.getByLabelText('Share verse of the day'))
    expect(screen.getByText('Share Verse of the Day')).toBeInTheDocument()
  })

  it('"Save" toggles bookmark (authenticated)', () => {
    mockIsAuthenticated = true
    renderComponent()
    fireEvent.click(screen.getByLabelText('Save verse of the day'))
    expect(mockToggleBookmark).toHaveBeenCalledWith({
      book: 'psalms',
      chapter: 23,
      startVerse: 1,
      endVerse: 1,
    })
  })

  it('"Save" shows auth modal (unauthenticated)', () => {
    mockIsAuthenticated = false
    renderComponent()
    fireEvent.click(screen.getByLabelText('Save verse of the day'))
    // Auth modal should appear
    expect(screen.getByText(/Sign in/i)).toBeInTheDocument()
  })

  it('"Saved" shows for already-bookmarked verse', () => {
    mockIsSelectionBookmarked.mockReturnValue(true)
    renderComponent()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('verse uses smaller font unconditionally', () => {
    renderComponent()
    const blockquote = screen.getByText(mockVotd.verseText).closest('blockquote')
    expect(blockquote?.className).toContain('text-lg')
    expect(blockquote?.className).toContain('sm:text-xl')
    expect(blockquote?.className).not.toContain('text-2xl')
    expect(blockquote?.className).not.toContain('text-3xl')
  })

  it('long verse also uses smaller font (word-count branching removed)', () => {
    mockVotdValue = mockLongVotd
    renderComponent()
    const blockquote = screen.getByText(mockLongVotd.verseText).closest('blockquote')
    expect(blockquote?.className).toContain('text-lg')
    expect(blockquote?.className).not.toContain('text-2xl')
  })

  it('action buttons render with white text and no primary color', () => {
    renderComponent()
    const buttons = [
      screen.getByLabelText('Read this verse in context'),
      screen.getByLabelText('Share verse of the day'),
      screen.getByLabelText('Save verse of the day'),
    ]
    buttons.forEach((btn) => {
      expect(btn.className).toContain('text-white')
      expect(btn.className).not.toContain('text-primary')
    })
  })

  it('skeleton shows during loading', () => {
    mockIsLoading = true
    renderComponent()
    const pulseEl = document.querySelector('[class*="animate-pulse"]')
    expect(pulseEl).toBeInTheDocument()
  })

  it('uses <blockquote> for verse', () => {
    renderComponent()
    const blockquote = screen.getByText('Yahweh is my shepherd; I shall lack nothing.')
    expect(blockquote.closest('blockquote')).not.toBeNull()
  })

  it('uses <cite> for reference', () => {
    renderComponent()
    const cite = screen.getByText('Psalms 23:1')
    expect(cite.tagName.toLowerCase()).toBe('cite')
  })

  it('all buttons have aria-label', () => {
    renderComponent()
    expect(screen.getByLabelText('Read this verse in context')).toBeInTheDocument()
    expect(screen.getByLabelText('Share verse of the day')).toBeInTheDocument()
    expect(screen.getByLabelText('Save verse of the day')).toBeInTheDocument()
  })

  it('all buttons have ≥ 44px tap target', () => {
    renderComponent()
    const buttons = [
      screen.getByLabelText('Read this verse in context'),
      screen.getByLabelText('Share verse of the day'),
      screen.getByLabelText('Save verse of the day'),
    ]
    buttons.forEach((btn) => {
      expect(btn.className).toContain('min-h-[44px]')
    })
  })
})
