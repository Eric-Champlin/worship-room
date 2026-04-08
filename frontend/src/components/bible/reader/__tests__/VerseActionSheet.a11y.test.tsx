import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VerseActionSheet } from '../VerseActionSheet'
import type { VerseSelection } from '@/types/verse-actions'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: (_isActive: boolean, _onEscape?: () => void) => {
    return { current: null }
  },
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
    { number: 16, text: 'For God so loved the world...' },
    { number: 17, text: "For God didn't send his Son..." },
    { number: 18, text: 'He who believes in him...' },
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

describe('VerseActionSheet accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  it('dialog role and aria attributes', () => {
    render(<VerseActionSheet {...defaultProps} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Actions for John 3:16')
  })

  it('aria-live announces single selection on open', () => {
    const { container } = render(<VerseActionSheet {...defaultProps} />)
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).toBeTruthy()
    expect(live!.textContent).toContain('Actions for John 3:16')
  })

  it('aria-live announces range selection', () => {
    const { container } = render(
      <VerseActionSheet {...defaultProps} selection={MULTI_VERSE} />,
    )
    const live = container.querySelector('[aria-live="polite"]')
    expect(live!.textContent).toContain('Selected John 3:16 through 18')
  })

  it('all primary action buttons have min 44px tap targets', () => {
    render(<VerseActionSheet {...defaultProps} />)
    const highlight = screen.getByLabelText('Highlight')
    const note = screen.getByLabelText('Note')
    const bookmark = screen.getByLabelText('Bookmark')
    const share = screen.getByLabelText('Share')

    for (const btn of [highlight, note, bookmark, share]) {
      expect(btn.className).toContain('min-h-[44px]')
      expect(btn.className).toContain('min-w-[44px]')
    }
  })

  it('all secondary action buttons have min 44px height', () => {
    render(<VerseActionSheet {...defaultProps} />)
    const secondary = [
      'Pray about this',
      'Journal about this',
      'Meditate on this',
      'Cross-references',
      'Explain this passage',
      'Memorize',
      'Copy',
      'Copy with reference',
    ]

    for (const label of secondary) {
      const btn = screen.getByLabelText(label)
      expect(btn.className).toContain('min-h-[44px]')
    }
  })

  it('keyboard shortcut 1 activates first primary action (Highlight)', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.keyDown(window, { key: '1' })
    // Highlight has a sub-view — BB-7 color picker renders
    expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()
  })

  it('keyboard c activates copy', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.keyDown(window, { key: 'c' })
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
  })

  it('close button has accessible label', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByLabelText('Close')).toBeInTheDocument()
  })

  it('copy-ref button has accessible label', () => {
    render(<VerseActionSheet {...defaultProps} />)
    expect(screen.getByLabelText('Copy reference')).toBeInTheDocument()
  })

  it('sub-view back button has accessible label', () => {
    render(<VerseActionSheet {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Highlight'))
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
  })
})
