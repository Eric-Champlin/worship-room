import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { FloatingActionBar } from '../FloatingActionBar'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

const defaultProps = {
  verseNumber: 1,
  verseText: 'In the beginning, God created the heavens and the earth.',
  bookName: 'Genesis',
  bookSlug: 'genesis',
  chapter: 1,
  isAuthenticated: true,
  hasHighlight: false,
  hasNote: false,
  currentHighlightColor: undefined as string | undefined,
  showColorPicker: false,
  onHighlight: vi.fn(),
  onSelectColor: vi.fn(),
  onNote: vi.fn(),
  onCopy: vi.fn(),
  onShare: vi.fn(),
  onDismiss: vi.fn(),
  targetElement: null as HTMLElement | null,
}

function createTargetElement(): HTMLElement {
  const el = document.createElement('div')
  el.id = 'verse-1'
  document.body.appendChild(el)
  el.getBoundingClientRect = () => ({
    top: 200,
    bottom: 230,
    left: 100,
    right: 600,
    width: 500,
    height: 30,
    x: 100,
    y: 200,
    toJSON: () => {},
  })
  return el
}

describe('FloatingActionBar', () => {
  let target: HTMLElement

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    target = createTargetElement()
  })

  it('renders 4 icon buttons when logged in', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    expect(screen.getByLabelText('Highlight verse')).toBeInTheDocument()
    expect(screen.getByLabelText('Add note')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy verse')).toBeInTheDocument()
    expect(screen.getByLabelText('Share verse')).toBeInTheDocument()
  })

  it('shows lock message and Copy for logged-out users', () => {
    render(
      <FloatingActionBar
        {...defaultProps}
        isAuthenticated={false}
        targetElement={target}
      />,
    )
    expect(screen.getByText('Sign in to highlight and take notes')).toBeInTheDocument()
    expect(screen.getByLabelText('Copy verse')).toBeInTheDocument()
    expect(screen.queryByLabelText('Highlight verse')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add note')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Share verse')).not.toBeInTheDocument()
  })

  it('calls onCopy when Copy button is clicked', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    fireEvent.click(screen.getByLabelText('Copy verse'))
    expect(defaultProps.onCopy).toHaveBeenCalledTimes(1)
  })

  it('calls onHighlight when Highlight button is clicked', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    fireEvent.click(screen.getByLabelText('Highlight verse'))
    expect(defaultProps.onHighlight).toHaveBeenCalledTimes(1)
  })

  it('calls onNote when Note button is clicked', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    fireEvent.click(screen.getByLabelText('Add note'))
    expect(defaultProps.onNote).toHaveBeenCalledTimes(1)
  })

  it('calls onShare when Share button is clicked', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    fireEvent.click(screen.getByLabelText('Share verse'))
    expect(defaultProps.onShare).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when Escape is pressed', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1)
  })

  it('has correct aria-labels for existing highlight/note', () => {
    render(
      <FloatingActionBar
        {...defaultProps}
        hasHighlight={true}
        hasNote={true}
        targetElement={target}
      />,
    )
    expect(screen.getByLabelText('Change highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit note')).toBeInTheDocument()
  })

  it('does not render when targetElement is null', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={null} />)
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('has toolbar role with aria-label', () => {
    render(<FloatingActionBar {...defaultProps} targetElement={target} />)
    expect(screen.getByRole('toolbar', { name: 'Verse actions' })).toBeInTheDocument()
  })

  // Color picker tests
  describe('color picker', () => {
    it('shows 4 color circles when showColorPicker is true', () => {
      render(
        <FloatingActionBar
          {...defaultProps}
          showColorPicker={true}
          targetElement={target}
        />,
      )
      expect(screen.getByLabelText('Highlight yellow')).toBeInTheDocument()
      expect(screen.getByLabelText('Highlight green')).toBeInTheDocument()
      expect(screen.getByLabelText('Highlight blue')).toBeInTheDocument()
      expect(screen.getByLabelText('Highlight pink')).toBeInTheDocument()
    })

    it('does not show color circles when showColorPicker is false', () => {
      render(
        <FloatingActionBar
          {...defaultProps}
          showColorPicker={false}
          targetElement={target}
        />,
      )
      expect(screen.queryByLabelText('Highlight yellow')).not.toBeInTheDocument()
    })

    it('calls onSelectColor with correct hex when circle clicked', () => {
      render(
        <FloatingActionBar
          {...defaultProps}
          showColorPicker={true}
          targetElement={target}
        />,
      )
      fireEvent.click(screen.getByLabelText('Highlight yellow'))
      expect(defaultProps.onSelectColor).toHaveBeenCalledWith('#FBBF24')
    })

    it('active color has aria-pressed=true', () => {
      render(
        <FloatingActionBar
          {...defaultProps}
          showColorPicker={true}
          currentHighlightColor="#34D399"
          targetElement={target}
        />,
      )
      expect(screen.getByLabelText('Highlight green')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByLabelText('Highlight yellow')).toHaveAttribute('aria-pressed', 'false')
    })

    it('Highlight button has aria-expanded when color picker is open', () => {
      render(
        <FloatingActionBar
          {...defaultProps}
          showColorPicker={true}
          targetElement={target}
        />,
      )
      expect(screen.getByLabelText('Highlight verse')).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
