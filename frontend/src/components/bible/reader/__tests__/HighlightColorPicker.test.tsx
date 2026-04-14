import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HighlightColorPicker } from '../HighlightColorPicker'
import type { VerseSelection } from '@/types/verse-actions'

const MOCK_SELECTION: VerseSelection = {
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  verses: [{ number: 16, text: 'For God so loved the world...' }],
}

const defaultProps = {
  selection: MOCK_SELECTION,
  onBack: vi.fn(),
  onApply: vi.fn(),
  onRemove: vi.fn(),
  currentColor: null as const,
  isMixedSelection: false,
}

describe('HighlightColorPicker', () => {
  it('renders 5 color swatches', () => {
    render(<HighlightColorPicker {...defaultProps} />)

    expect(screen.getByLabelText('Peace highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Conviction highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Joy highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Struggle highlight')).toBeInTheDocument()
    expect(screen.getByLabelText('Promise highlight')).toBeInTheDocument()
  })

  it('swatch tap calls onApply with correct color', async () => {
    const onApply = vi.fn()
    render(<HighlightColorPicker {...defaultProps} onApply={onApply} />)

    await userEvent.click(screen.getByLabelText('Peace highlight'))
    expect(onApply).toHaveBeenCalledWith('peace')
  })

  it('shows Remove button when currentColor is set', () => {
    render(<HighlightColorPicker {...defaultProps} currentColor="joy" />)

    expect(screen.getByLabelText('Remove highlight')).toBeInTheDocument()
  })

  it('hides Remove button when no highlight', () => {
    render(<HighlightColorPicker {...defaultProps} currentColor={null} />)

    expect(screen.queryByLabelText('Remove highlight')).not.toBeInTheDocument()
  })

  it('hides Remove button for mixed selections', () => {
    render(<HighlightColorPicker {...defaultProps} currentColor="joy" isMixedSelection={true} />)

    expect(screen.queryByLabelText('Remove highlight')).not.toBeInTheDocument()
  })

  it('Remove tap calls onRemove', async () => {
    const onRemove = vi.fn()
    render(<HighlightColorPicker {...defaultProps} currentColor="peace" onRemove={onRemove} />)

    await userEvent.click(screen.getByLabelText('Remove highlight'))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows selected state on current color', () => {
    render(<HighlightColorPicker {...defaultProps} currentColor="peace" />)

    expect(screen.getByLabelText('Peace highlight')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Joy highlight')).toHaveAttribute('aria-pressed', 'false')
  })

  it('no selected state when mixed', () => {
    render(<HighlightColorPicker {...defaultProps} currentColor={null} isMixedSelection={true} />)

    const swatches = screen.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') !== null)
    for (const swatch of swatches) {
      expect(swatch).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('all swatches have accessible labels', () => {
    render(<HighlightColorPicker {...defaultProps} />)

    const labels = ['Peace highlight', 'Conviction highlight', 'Joy highlight', 'Struggle highlight', 'Promise highlight']
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('swatch container has radiogroup role', () => {
    render(<HighlightColorPicker {...defaultProps} />)

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('swatches meet 44px minimum tap target', () => {
    render(<HighlightColorPicker {...defaultProps} />)

    const swatch = screen.getByLabelText('Peace highlight')
    expect(swatch.className).toContain('min-h-[44px]')
    expect(swatch.className).toContain('min-w-[44px]')
  })
})
