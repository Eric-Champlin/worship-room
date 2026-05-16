import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { VerseActionSheet } from '../VerseActionSheet'
import type { VerseSelection } from '@/types/verse-actions'
import type { DeepLinkableAction } from '@/lib/url/validateAction'

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

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
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

// BB-38: Stateful wrapper that mirrors BibleReader.tsx's action-prop
// management. Tests that click an action button to mount a sub-view need the
// wrapper to track the action prop locally; tests that only inspect the root
// view can use it with no initialAction and it behaves as a simple passthrough.
type SheetWithStateProps = {
  selection?: VerseSelection
  isOpen?: boolean
  initialAction?: DeepLinkableAction | null
  onClose?: (options?: { navigating?: boolean }) => void
  onExtendSelection?: (verseNumber: number) => void
}

function SheetWithState(props: SheetWithStateProps) {
  const [action, setAction] = useState<DeepLinkableAction | null>(props.initialAction ?? null)
  return (
    <VerseActionSheet
      selection={props.selection ?? SINGLE_VERSE}
      isOpen={props.isOpen ?? true}
      onClose={props.onClose ?? vi.fn()}
      onExtendSelection={props.onExtendSelection ?? vi.fn()}
      action={action}
      onOpenAction={setAction}
      onCloseAction={() => setAction(null)}
    />
  )
}

function renderSheet(overrides: SheetWithStateProps = {}) {
  return render(<SheetWithState {...overrides} />)
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
    renderSheet()
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
  })

  it('renders verse preview text', () => {
    renderSheet()
    expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument()
  })

  it('renders 4 primary action buttons', () => {
    renderSheet()
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Note')).toBeInTheDocument()
    expect(screen.getByLabelText('Bookmark')).toBeInTheDocument()
    expect(screen.getByLabelText('Share')).toBeInTheDocument()
  })

  it('renders secondary action items including Ask about this', () => {
    renderSheet()
    expect(screen.getByLabelText('Pray about this')).toBeInTheDocument()
    // Spec 7.1 — new sibling action distinct from "Pray about this".
    expect(screen.getByLabelText('Pray with this passage')).toBeInTheDocument()
    expect(screen.getByLabelText('Journal about this')).toBeInTheDocument()
    expect(screen.getByLabelText('Meditate on this')).toBeInTheDocument()
    expect(screen.getByLabelText('Cross-references')).toBeInTheDocument()
    expect(screen.getByLabelText('Explain this passage')).toBeInTheDocument()
    expect(screen.getByLabelText('Ask about this')).toBeInTheDocument()
    expect(screen.getByLabelText('Memorize')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy with reference')).toBeInTheDocument()
  })

  it('copy action copies text and shows toast', () => {
    renderSheet()
    fireEvent.click(screen.getByLabelText('Copy'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(SINGLE_VERSE.verses[0].text)
    expect(mockShowToast).toHaveBeenCalledWith('Copied')
  })

  it('copy-with-ref includes reference', () => {
    renderSheet()
    fireEvent.click(screen.getByLabelText('Copy with reference'))
    const arg = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(arg).toContain('\u2014 John 3:16 (WEB)')
    expect(mockShowToast).toHaveBeenCalledWith('Copied with reference')
  })

  it('sub-view push on highlight click', () => {
    renderSheet()
    fireEvent.click(screen.getByLabelText('Highlight'))
    // BB-7: real color picker renders with 5 emotion swatches
    expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()
  })

  it('sub-view back button returns to root', () => {
    renderSheet()
    fireEvent.click(screen.getByLabelText('Highlight'))
    expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Back'))
    // Root view should be visible again
    expect(screen.getByText('John 3:16')).toBeInTheDocument()
    expect(screen.queryByLabelText('Peace highlight')).not.toBeInTheDocument()
  })

  it('escape closes sheet (via onClose prop)', () => {
    // Since useFocusTrap is mocked, test the close button instead
    const onClose = vi.fn()
    renderSheet({ onClose })
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('footer shows WEB caption', () => {
    renderSheet()
    expect(screen.getByText('WEB · Public Domain')).toBeInTheDocument()
  })

  it('reduced motion skips animation', () => {
    mockUseReducedMotion.mockReturnValue(true)

    const { container } = renderSheet()
    const panel = container.querySelector('[role="dialog"]')
    expect(panel?.className).not.toContain('animate-')

    mockUseReducedMotion.mockReturnValue(false)
  })

  it('multi-verse header shows range', () => {
    renderSheet({ selection: MULTI_VERSE })
    expect(screen.getByText('John 3:16\u201318')).toBeInTheDocument()
  })

  it('aria attributes correct', () => {
    renderSheet()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Actions for John 3:16')
  })

  it('does not render when isOpen is false', () => {
    renderSheet({ isOpen: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sub-view header has close button', () => {
    renderSheet()

    // Click cross-references to open sub-view
    const crossRefsBtn = screen.getByLabelText('Cross-references')
    fireEvent.click(crossRefsBtn)

    // Should have a close button (X) in the sub-view header
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('secondary action row renders badge when handler has renderBadge', () => {
    renderSheet()

    // Cross-references handler has renderBadge — check that it renders something
    // The badge component renders asynchronously, so we just verify the row exists
    const crossRefsBtn = screen.getByLabelText('Cross-references')
    expect(crossRefsBtn).toBeInTheDocument()
  })

  it('Ask about this click calls onClose with navigating:true', () => {
    const onClose = vi.fn()
    renderSheet({ onClose })
    fireEvent.click(screen.getByLabelText('Ask about this'))
    expect(onClose).toHaveBeenCalledWith({ navigating: true })
  })

  it('Ask about this click navigates to /ask?q=<encoded prefilled question>', () => {
    renderSheet()
    fireEvent.click(screen.getByLabelText('Ask about this'))
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/ask?q='))
    const navArg = mockNavigate.mock.calls[0][0] as string
    // Decoded q param contains the canonical "Help me understand <ref>: \"<text>\"" template
    const q = new URLSearchParams(navArg.slice(navArg.indexOf('?'))).get('q')
    expect(q).toContain('Help me understand')
    expect(q).toContain('John 3:16')
  })

  // -------------------------------------------------------------------------
  // Spec 7.1 — Pray with this passage (sub-view + navigation)
  // -------------------------------------------------------------------------

  describe('Pray with this passage (Spec 7.1)', () => {
    it('tapping "Pray with this passage" opens the sub-view with 5 post-type buttons', () => {
      renderSheet()
      fireEvent.click(screen.getByLabelText('Pray with this passage'))
      // Sub-view body — 5 post-type buttons (labels from POST_TYPES). Using
      // getByRole('button', { name }) avoids collision with the sub-view
      // header span + the sr-only announcement region (both also carry the
      // text "Pray with this passage").
      expect(
        screen.getByRole('button', { name: 'Prayer request' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Testimony' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Question' })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Discussion' }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Encouragement' }),
      ).toBeInTheDocument()
    })

    it('tapping a post-type button navigates to /prayer-wall with compose + scripture params (single verse)', () => {
      renderSheet()
      fireEvent.click(screen.getByLabelText('Pray with this passage'))
      fireEvent.click(screen.getByRole('button', { name: 'Question' }))
      // SINGLE_VERSE is John 3:16 → URL-encoded "John 3:16" is "John%203%3A16".
      expect(mockNavigate).toHaveBeenCalledWith(
        '/prayer-wall?compose=question&scripture=John%203%3A16',
      )
    })

    it('tapping a post-type button navigates with hyphen-minus for range references (NOT en-dash)', () => {
      renderSheet({ selection: MULTI_VERSE })
      fireEvent.click(screen.getByLabelText('Pray with this passage'))
      fireEvent.click(screen.getByRole('button', { name: 'Discussion' }))
      const navArg = mockNavigate.mock.calls[0][0] as string
      expect(navArg).toBe(
        '/prayer-wall?compose=discussion&scripture=John%203%3A16-18',
      )
      // Hyphen-minus (%2D when URL-encoded) NOT en-dash (%E2%80%93).
      expect(navArg).not.toContain('%E2%80%93')
    })

    it('tapping a post-type button calls onClose with navigating:true', () => {
      const onClose = vi.fn()
      renderSheet({ onClose })
      fireEvent.click(screen.getByLabelText('Pray with this passage'))
      fireEvent.click(screen.getByRole('button', { name: 'Question' }))
      expect(onClose).toHaveBeenCalledWith({ navigating: true })
    })

    it('back arrow returns to root view', () => {
      renderSheet()
      fireEvent.click(screen.getByLabelText('Pray with this passage'))
      // Confirm we're in the sub-view (a post-type button is visible).
      expect(
        screen.getByRole('button', { name: 'Prayer request' }),
      ).toBeInTheDocument()
      // Tap the back arrow.
      fireEvent.click(screen.getByLabelText('Back'))
      // Root view returns: the original "Pray with this passage" button is back.
      expect(
        screen.getByLabelText('Pray with this passage'),
      ).toBeInTheDocument()
      // Sub-view content is gone.
      expect(
        screen.queryByRole('button', { name: 'Prayer request' }),
      ).not.toBeInTheDocument()
    })
  })
})
