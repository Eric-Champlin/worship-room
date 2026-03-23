import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { ChallengeCompletionOverlay } from '../ChallengeCompletionOverlay'

const defaultProps = {
  challengeTitle: 'Easter Joy',
  themeColor: '#FDE68A',
  daysCompleted: 7,
  totalPointsEarned: 240,
  badgeName: 'Easter Champion',
  onDismiss: vi.fn(),
}

function renderOverlay(overrides = {}) {
  return render(
    <MemoryRouter>
      <ChallengeCompletionOverlay {...defaultProps} {...overrides} />
    </MemoryRouter>,
  )
}

describe('ChallengeCompletionOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders challenge title in Caveat font', () => {
    renderOverlay()
    const title = screen.getByText('Easter Joy')
    expect(title).toHaveClass('font-script')
  })

  it('renders "Challenge Complete!" heading', () => {
    renderOverlay()
    expect(screen.getByText('Challenge Complete!')).toBeInTheDocument()
  })

  it('shows days completed and points', () => {
    renderOverlay()
    expect(screen.getByText('7 days of faithful commitment')).toBeInTheDocument()
    expect(screen.getByText('+240 faith points')).toBeInTheDocument()
  })

  it('shows badge name', () => {
    renderOverlay()
    expect(screen.getByText('Easter Champion')).toBeInTheDocument()
  })

  it('auto-dismisses after 8 seconds', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(8000)
    })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('dismisses on click', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('dismisses on Escape', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('"Browse more challenges" button is present', () => {
    renderOverlay()
    expect(screen.getByText('Browse more challenges')).toBeInTheDocument()
  })

  it('"Share Your Achievement" button is present', () => {
    renderOverlay()
    expect(screen.getByText('Share Your Achievement')).toBeInTheDocument()
  })

  it('has role="dialog" and aria-modal', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Easter Joy challenge complete')
  })
})
