import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { UsePlanResult } from '@/hooks/bible/usePlan'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test' } }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: vi.fn() }),
}))

const mockUsePlan = vi.fn<(slug: string) => UsePlanResult>()
vi.mock('@/hooks/bible/usePlan', () => ({
  usePlan: (slug: string) => mockUsePlan(slug),
}))

const mockMarkDayComplete = vi.fn()
const mockSetCelebrationShown = vi.fn()
vi.mock('@/lib/bible/plansStore', () => ({
  markDayComplete: (...args: unknown[]) => mockMarkDayComplete(...args),
  setCelebrationShown: (...args: unknown[]) => mockSetCelebrationShown(...args),
  saveReflection: vi.fn(),
}))

vi.mock('@/components/bible/plans/PlanCompletionCelebration', () => ({
  PlanCompletionCelebration: (props: { planTitle: string; onClose: () => void }) => (
    <div data-testid="celebration">Celebration: {props.planTitle}</div>
  ),
}))

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(),
}))

import { BiblePlanDay } from '../BiblePlanDay'

const MOCK_PLAN = {
  slug: 'test',
  title: 'Test Plan',
  shortTitle: 'Test',
  description: 'A test plan',
  theme: 'comfort' as const,
  duration: 3,
  estimatedMinutesPerDay: 10,
  curator: 'Worship Room',
  coverGradient: 'from-primary/30 to-hero-dark',
  days: [
    { day: 1, title: 'Day 1', passages: [{ book: 'psalms', chapter: 23 }] },
    { day: 2, title: 'Day 2', passages: [{ book: 'psalms', chapter: 46 }] },
    { day: 3, title: 'Day 3', passages: [{ book: 'psalms', chapter: 91 }] },
  ],
}

function renderDay(dayNumber = 3) {
  return render(
    <MemoryRouter initialEntries={[`/bible/plans/test/day/${dayNumber}`]}>
      <Routes>
        <Route path="/bible/plans/:slug/day/:dayNumber" element={<BiblePlanDay />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BiblePlanDay celebration wiring', () => {
  it('shows celebration on final day completion', () => {
    mockMarkDayComplete.mockReturnValue({ type: 'plan-completed', day: 3, isAllComplete: true })
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'test',
        startedAt: '2026-04-01',
        currentDay: 3,
        completedDays: [1, 2],
        completedAt: null,
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: false,
      },
      isLoading: false,
      isError: false,
    })
    renderDay(3)

    fireEvent.click(screen.getByText('I read this. Mark day complete.'))
    expect(screen.getByTestId('celebration')).toBeInTheDocument()
    expect(mockSetCelebrationShown).toHaveBeenCalledWith('test')
  })

  it('does not show celebration for non-final day', () => {
    mockMarkDayComplete.mockReturnValue({ type: 'day-completed', day: 1, isAllComplete: false })
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'test',
        startedAt: '2026-04-01',
        currentDay: 1,
        completedDays: [],
        completedAt: null,
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: false,
      },
      isLoading: false,
      isError: false,
    })
    renderDay(1)

    fireEvent.click(screen.getByText('I read this. Mark day complete.'))
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
  })

  it('does not re-fire when celebrationShown is already true', () => {
    mockMarkDayComplete.mockReturnValue({ type: 'plan-completed', day: 3, isAllComplete: true })
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'test',
        startedAt: '2026-04-01',
        currentDay: 3,
        completedDays: [1, 2],
        completedAt: null,
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: true, // Already shown
      },
      isLoading: false,
      isError: false,
    })
    renderDay(3)

    fireEvent.click(screen.getByText('I read this. Mark day complete.'))
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
  })
})
