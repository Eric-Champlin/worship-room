import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlanCompletionOverlay } from '../PlanCompletionOverlay'

beforeEach(() => {
  vi.restoreAllMocks()
})

function renderOverlay(overrides: Partial<{
  planTitle: string
  totalDays: number
  onDismiss: () => void
  onBrowsePlans: () => void
}> = {}) {
  return render(
    <PlanCompletionOverlay
      planTitle={overrides.planTitle ?? 'Finding Peace in Anxiety'}
      totalDays={overrides.totalDays ?? 7}
      onDismiss={overrides.onDismiss ?? vi.fn()}
      onBrowsePlans={overrides.onBrowsePlans ?? vi.fn()}
    />,
  )
}

describe('PlanCompletionOverlay', () => {
  it('renders title and verse', () => {
    renderOverlay()
    expect(screen.getByText('Plan Complete!')).toBeInTheDocument()
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText('7 days completed')).toBeInTheDocument()
    expect(
      screen.getByText(/I have fought the good fight/),
    ).toBeInTheDocument()
    expect(screen.getByText(/2 Timothy 4:7 WEB/)).toBeInTheDocument()
  })

  it('shows confetti particles', () => {
    renderOverlay()
    const confettiSpans = document.querySelectorAll('.animate-confetti-fall')
    expect(confettiSpans.length).toBeGreaterThan(0)
  })

  it('renders as a dialog with correct ARIA', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'plan-completion-title')
  })

  it('dismisses on X button click', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })
    await user.click(screen.getByLabelText('Close'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismisses on Escape key', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })
    await user.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onBrowsePlans when Browse button clicked', async () => {
    const user = userEvent.setup()
    const onBrowsePlans = vi.fn()
    renderOverlay({ onBrowsePlans })
    await user.click(screen.getByText('Browse more plans'))
    expect(onBrowsePlans).toHaveBeenCalledTimes(1)
  })

  it('respects prefers-reduced-motion (no confetti)', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
    } as MediaQueryList)

    renderOverlay()
    const confettiSpans = document.querySelectorAll('.animate-confetti-fall')
    expect(confettiSpans).toHaveLength(0)
  })
})
