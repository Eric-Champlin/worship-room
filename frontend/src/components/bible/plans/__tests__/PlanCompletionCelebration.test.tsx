import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test' } }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

vi.mock('@/lib/bible/plansStore', () => ({
  saveReflection: vi.fn(),
}))

vi.mock('@/lib/bible/planShareCanvas', () => ({
  renderPlanCompletionCard: vi.fn().mockResolvedValue(new Blob(['test'])),
}))

import { PlanCompletionCelebration } from '../PlanCompletionCelebration'

const DEFAULT_PROPS = {
  planTitle: 'Psalms of Comfort',
  planDescription: 'Find comfort in the Psalms',
  daysCompleted: 21,
  dateRange: '2026-04-01 – 2026-04-21',
  passageCount: 42,
  slug: 'psalm-comfort',
  coverGradient: 'from-primary/30 to-hero-dark',
  onClose: vi.fn(),
  onSaveReflection: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PlanCompletionCelebration', () => {
  it('renders plan title and description', () => {
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} />)
    expect(screen.getByText('You finished Psalms of Comfort')).toBeInTheDocument()
    expect(screen.getByText('Find comfort in the Psalms')).toBeInTheDocument()
  })

  it('renders stats', () => {
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} />)
    expect(screen.getByText(/21 days completed/)).toBeInTheDocument()
    expect(screen.getByText(/42 passages read/)).toBeInTheDocument()
  })

  it('textarea captures reflection text', () => {
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} />)
    const textarea = screen.getByPlaceholderText('Optional — share your thoughts...')
    fireEvent.change(textarea, { target: { value: 'Very meaningful' } })
    expect(textarea).toHaveValue('Very meaningful')
  })

  it('continue button fires onClose', () => {
    const onClose = vi.fn()
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} onClose={onClose} />)

    fireEvent.click(screen.getByText('Continue'))
    expect(onClose).toHaveBeenCalled()
  })

  it('share button triggers canvas render', async () => {
    const { renderPlanCompletionCard } = await import('@/lib/bible/planShareCanvas')
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} />)

    fireEvent.click(screen.getByText('Share your completion'))
    expect(renderPlanCompletionCard).toHaveBeenCalled()
  })

  it('focus trapped inside overlay (useFocusTrap called)', async () => {
    const { useFocusTrap } = await import('@/hooks/useFocusTrap')
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} />)
    expect(useFocusTrap).toHaveBeenCalledWith(true, expect.any(Function))
  })

  it('escape closes overlay (onClose passed to useFocusTrap)', async () => {
    const { useFocusTrap } = await import('@/hooks/useFocusTrap')
    const onClose = vi.fn()
    render(<PlanCompletionCelebration {...DEFAULT_PROPS} onClose={onClose} />)

    // useFocusTrap receives onClose as the escape handler
    expect(useFocusTrap).toHaveBeenCalledWith(true, onClose)
  })
})
