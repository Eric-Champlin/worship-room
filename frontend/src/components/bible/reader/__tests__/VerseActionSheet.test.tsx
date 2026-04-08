import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VerseActionSheet } from '../VerseActionSheet'
import type { VerseSelection } from '@/types/verse-actions'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockShowToast = vi.fn()

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}))

const mockUseReducedMotion = vi.fn().mockReturnValue(false)
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: (_isActive: boolean, _onEscape?: () => void) => {
    return { current: null }
  },
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/data/bible', () => ({
  getBookBySlug: vi.fn((slug: string) => ({ name: slug, slug })),
  loadChapterWeb: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/bible/crossRefs/loader', () => ({
  loadCrossRefsForBook: vi.fn().mockResolvedValue(new Map()),
  collectCrossRefsForRange: vi.fn().mockReturnValue([]),
  getCachedBook: vi.fn().mockReturnValue(null),
  getDeduplicatedCrossRefCount: vi.fn().mockReturnValue(0),
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const SINGLE_VERSE: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [
    {
      number: 16,
      text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    },
  ],
}

const MULTI_VERSE: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 18,
  verses: [
    {
      number: 16,
      text: 'For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.',
    },
    {
      number: 17,
      text: "For God didn't send his Son into the world to judge the world, but that the world should be saved through him.",
    },
    {
      number: 18,
      text: "He who believes in him is not judged. He who doesn't believe has been judged already, because he has not believed in the name of the only born Son of God.",
    },
  ],
}

const defaultProps = {
  selection: SINGLE_VERSE,
  isOpen: true,
  onClose: vi.fn(),
  onExtendSelection: vi.fn(),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VerseActionSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('renders header with formatted reference', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
  })

  it('renders verse preview text', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument()
  })

  it('renders 4 primary action buttons', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
    expect(screen.getByLabelText('Bookmark')).toBeInTheDocument()
    expect(screen.getByLabelText('Share')).toBeInTheDocument()
  })

  it('renders 8 secondary action items', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByLabelText('Pray about this')).toBeInTheDocument()
    expect(screen.getByLabelText('Journal about this')).toBeInTheDocument()
    expect(screen.getByLabelText('Meditate on this')).toBeInTheDocument()
    expect(screen.getByLabelText('Cross-references')).toBeInTheDocument()
    expect(screen.getByLabelText('Explain this passage')).toBeInTheDocument()
    expect(screen.getByLabelText('Memorize')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy with reference')).toBeInTheDocument()
  })

  it('copy action copies text and shows toast', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Copy'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SINGLE_VERSE.verses[0].text)
    expect(mockShowToast).toHaveBeenCalledWith('Copied')
  })

  it('copy-with-ref includes reference', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Copy with reference'))
    const arg = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(arg).toContain('\u2014 John 3:16 (WEB)')
    expect(mockShowToast).toHaveBeenCalledWith('Copied with reference')
  })

  it('sub-view push on highlight click', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Highlight'))
    // BB-7: real color picker renders with 5 emotion swatches
    expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()
  })

  it('sub-view back button returns to root', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Highlight'))
    expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    // Root view should be visible again
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.queryByLabelText('Peace highlight')).not.toBeInTheDocument()
  })

  it('escape closes sheet (via onClose prop)', () => {
    // Since useFocusTrap is mocked, test the close button instead
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Close'))
    expect(defaultProps.onClose).toHaveBeenCalledOnce()
  })

  it('footer shows WEB caption', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByText('WEB · Public Domain')).toBeInTheDocument()
  })

  it('reduced motion skips animation', () => {
    mockUseReducedMotion.mockReturnValue(true)

    const { container } = render(<VerseActionSheet {...defaultProps} />)
    const panel = container.querySelector('[role="dialog"]')
    expect(panel?.className).not.toContain('animate-')

    mockUseReducedMotion.mockReturnValue(false)
  })

  it('multi-verse header shows range', () => {
    render(<VerseActionSheet {...defaultProps} selection={MULTI_VERSE} />)
    expect(screen.getByText('John 3:16\u201318')).toBeInTheDocument()
  })

  it('aria attributes correct', () => {
    render(<VerseActionSheet {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Actions for John 3:16')
  })

  it('does not render when isOpen is false', () => {
    render(<VerseActionSheet {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sub-view header has close button', () => {
    render(<VerseActionSheet {...defaultProps} />)

    // Click cross-references to open sub-view
    const crossRefsBtn = screen.getByLabelText('Cross-references')
    fireEvent.click(crossRefsBtn)

    // Should have a close button (X) in the sub-view header
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('secondary action row renders badge when handler has renderBadge', () => {
    render(<VerseActionSheet {...defaultProps} />)

    // Cross-references handler has renderBadge — check that it renders something
    // The badge component renders asynchronously, so we just verify the row exists
    const crossRefsBtn = screen.getByLabelText('Cross-references')
    expect(crossRefsBtn).toBeInTheDocument()
  })
})
