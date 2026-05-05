import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { ChallengeCompletionOverlay } from '../ChallengeCompletionOverlay'
import { generateChallengeShareImage } from '@/lib/challenge-share-canvas'

vi.mock('@/lib/challenge-share-canvas', () => ({
  generateChallengeShareImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

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

  it('renders challenge title with themeColor brand expression', () => {
    renderOverlay()
    const title = screen.getByText('Easter Joy')
    expect(title).not.toHaveClass('font-script')
    expect(title).toHaveStyle({ color: defaultProps.themeColor })
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

  it('auto-dismiss fires after 12 seconds', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    expect(onDismiss).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(12000)
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

  it('has role="dialog" and aria-modal', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Easter Joy challenge complete')
  })

  // New CTA grid tests
  it('renders 5 CTA cards with icons and labels', () => {
    renderOverlay()
    expect(screen.getByText(/See your growth/)).toBeInTheDocument()
    expect(screen.getByText(/Check the leaderboard/)).toBeInTheDocument()
    expect(screen.getByText('Share your achievement')).toBeInTheDocument()
    expect(screen.getByText(/Browse more plans/)).toBeInTheDocument()
    expect(screen.getByText(/Browse more challenges/)).toBeInTheDocument()
  })

  it('"See your growth" navigates to /', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    fireEvent.click(screen.getByText(/See your growth/))
    expect(onDismiss).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('"Check the leaderboard" navigates to /friends?tab=leaderboard', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    fireEvent.click(screen.getByText(/Check the leaderboard/))
    expect(onDismiss).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/friends?tab=leaderboard')
  })

  it('"Share your achievement" calls generateChallengeShareImage', async () => {
    renderOverlay()

    await act(async () => {
      fireEvent.click(screen.getByText('Share your achievement'))
    })

    expect(generateChallengeShareImage).toHaveBeenCalledWith({
      challengeTitle: 'Easter Joy',
      themeColor: '#FDE68A',
      currentDay: 7,
      totalDays: 7,
      streak: 0,
    })
  })

  it('share fallback downloads image when Web Share unavailable', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' })
    vi.mocked(generateChallengeShareImage).mockResolvedValue(mockBlob)

    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL, revokeObjectURL },
      writable: true,
    })

    // navigator.share is undefined by default in jsdom
    renderOverlay()

    await act(async () => {
      fireEvent.click(screen.getByText('Share your achievement'))
    })

    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()
  })

  it('"Browse more plans" navigates to /grow?tab=plans', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    fireEvent.click(screen.getByText(/Browse more plans/))
    expect(onDismiss).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/grow?tab=plans')
  })

  it('"Browse more challenges" navigates to /grow?tab=challenges', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })

    fireEvent.click(screen.getByText(/Browse more challenges/))
    expect(onDismiss).toHaveBeenCalled()
    expect(mockNavigate).toHaveBeenCalledWith('/grow?tab=challenges')
  })

  it('CTA cards have frosted glass styling', () => {
    renderOverlay()
    const card = screen.getByText(/See your growth/).closest('button')
    expect(card?.className).toContain('bg-white')
    expect(card?.className).toContain('border-white/10')
  })

  it('grid is single column on mobile', () => {
    renderOverlay()
    const grid = screen.getByText(/See your growth/).closest('button')?.parentElement
    expect(grid?.className).toContain('grid-cols-1')
    expect(grid?.className).toContain('sm:grid-cols-2')
  })
})
