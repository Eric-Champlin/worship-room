import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PlanCompletionOverlay } from '../PlanCompletionOverlay'
import { PLAN_COMPLETION_SCRIPTURES } from '@/constants/reading-plan-completion-scriptures'

const mockPlaySoundEffect = vi.fn()
let mockReducedMotion = true

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: mockPlaySoundEffect }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReducedMotion,
}))

vi.mock('@/lib/plan-completion-canvas', () => ({
  generatePlanCompletionImage: vi.fn(() =>
    Promise.resolve(new Blob(['test'], { type: 'image/png' })),
  ),
}))

import { generatePlanCompletionImage } from '@/lib/plan-completion-canvas'

beforeEach(() => {
  vi.clearAllMocks()
  mockReducedMotion = true
})

function renderOverlay(
  overrides: Partial<{
    planTitle: string
    totalDays: number
    planId: string
    startDate: string | null
    onDismiss: () => void
    onBrowsePlans: () => void
  }> = {},
) {
  return render(
    <MemoryRouter>
      <PlanCompletionOverlay
        planTitle={overrides.planTitle ?? 'Finding Peace in Anxiety'}
        totalDays={overrides.totalDays ?? 7}
        planId={overrides.planId ?? 'anxiety'}
        startDate={'startDate' in overrides ? overrides.startDate : '2026-03-24T10:00:00.000Z'}
        onDismiss={overrides.onDismiss ?? vi.fn()}
        onBrowsePlans={overrides.onBrowsePlans ?? vi.fn()}
      />
    </MemoryRouter>,
  )
}

describe('PlanCompletionOverlay', () => {
  it('renders heading and plan title', () => {
    renderOverlay()
    expect(screen.getByText('Plan Complete!')).toBeInTheDocument()
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
  })

  it('shows stats section with days and points', () => {
    renderOverlay({ totalDays: 7 })
    expect(screen.getByText('7 days completed')).toBeInTheDocument()
    expect(screen.getByText('+105 faith points earned')).toBeInTheDocument()
  })

  it('shows date range when startDate provided', () => {
    renderOverlay({ startDate: '2026-03-10T10:00:00.000Z' })
    expect(screen.getByText(/Started Mar 10/)).toBeInTheDocument()
    expect(screen.getByText(/Finished/)).toBeInTheDocument()
  })

  it('omits date range when startDate is null', () => {
    renderOverlay({ startDate: null })
    expect(screen.queryByText(/Started/)).not.toBeInTheDocument()
  })

  it('displays a scripture from the curated set', () => {
    renderOverlay()
    const scriptureTexts = PLAN_COMPLETION_SCRIPTURES.map((s) => s.text)
    const found = scriptureTexts.some((text) =>
      screen.queryByText(text),
    )
    expect(found).toBe(true)
  })

  it('renders 3 CTA buttons', () => {
    renderOverlay()
    expect(screen.getByText('Browse Plans')).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('Browse Plans calls onBrowsePlans', async () => {
    const user = userEvent.setup()
    const onBrowsePlans = vi.fn()
    renderOverlay({ onBrowsePlans })
    await user.click(screen.getByText('Browse Plans'))
    expect(onBrowsePlans).toHaveBeenCalledTimes(1)
  })

  it('Done calls onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })
    await user.click(screen.getByText('Done'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('Share triggers canvas generation', async () => {
    const user = userEvent.setup()
    renderOverlay()
    await user.click(screen.getByText('Share'))
    expect(generatePlanCompletionImage).toHaveBeenCalledTimes(1)
  })

  it('dismisses on Escape key', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })
    await user.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismisses on X button', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })
    await user.click(screen.getByLabelText('Close'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders as dialog with correct ARIA', () => {
    renderOverlay()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'plan-completion-title')
  })

  it('reduced motion disables animations and hides confetti', () => {
    // useReducedMotion defaults to true in beforeEach
    renderOverlay()
    // No confetti
    const confettiSpans = document.querySelectorAll('.animate-confetti-fall')
    expect(confettiSpans).toHaveLength(0)
    // All content visible immediately (step = 7)
    expect(screen.getByText('Plan Complete!')).toBeInTheDocument()
    expect(screen.getByText('Browse Plans')).toBeInTheDocument()
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})

describe('PlanCompletionOverlay (with timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('auto-dismisses after 15 seconds', () => {
    const onDismiss = vi.fn()
    renderOverlay({ onDismiss })
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('plays ascending sound effect when heading appears', () => {
    mockReducedMotion = false
    renderOverlay()
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(mockPlaySoundEffect).toHaveBeenCalledWith('ascending')
  })

  it('does not play sound with reduced motion', () => {
    // mockReducedMotion defaults to true
    renderOverlay()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(mockPlaySoundEffect).not.toHaveBeenCalled()
  })

  it('shows confetti particles during animation', () => {
    mockReducedMotion = false
    renderOverlay()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    const confettiSpans = document.querySelectorAll('.animate-confetti-fall')
    expect(confettiSpans.length).toBeGreaterThan(0)
  })
})
