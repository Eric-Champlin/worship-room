import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { UsePlanResult } from '@/hooks/bible/usePlan'

const mockOpenAuthModal = vi.fn()

let mockIsAuthenticated = false
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: mockIsAuthenticated, user: null }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

const mockUsePlan = vi.fn<(slug: string) => UsePlanResult>()
vi.mock('@/hooks/bible/usePlan', () => ({
  usePlan: (slug: string) => mockUsePlan(slug),
}))

vi.mock('@/lib/bible/plansStore', () => ({
  startPlan: vi.fn(),
  pausePlan: vi.fn(),
  restartPlan: vi.fn(),
}))

import { BiblePlanDetail } from '../BiblePlanDetail'

const MOCK_PLAN = {
  slug: 'psalm-comfort',
  title: 'Psalms of Comfort',
  shortTitle: 'Comfort',
  description: 'Find comfort in the Psalms',
  theme: 'comfort' as const,
  duration: 10,
  estimatedMinutesPerDay: 10,
  curator: 'Worship Room',
  coverGradient: 'from-primary/30 to-hero-dark',
  days: Array.from({ length: 10 }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    passages: [{ book: 'psalms', chapter: i + 1 }],
  })),
}

function renderDetail(slug = 'psalm-comfort') {
  return render(
    <MemoryRouter initialEntries={[`/bible/plans/${slug}`]}>
      <Routes>
        <Route path="/bible/plans/:slug" element={<BiblePlanDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsAuthenticated = false
})

describe('BiblePlanDetail', () => {
  it('renders preview state when plan not started', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    renderDetail()

    expect(screen.getByText('Psalms of Comfort')).toBeInTheDocument()
    expect(screen.getByText('Start this plan')).toBeInTheDocument()
  })

  it('renders in-progress state with day list', () => {
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'psalm-comfort',
        startedAt: '2026-04-01',
        currentDay: 4,
        completedDays: [1, 2, 3],
        completedAt: null,
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: false,
      },
      isLoading: false,
      isError: false,
    })
    renderDetail()

    expect(screen.getByText(/Continue from day 4/)).toBeInTheDocument()
    expect(screen.getByText('Pause plan')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders completed state with badge', () => {
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'psalm-comfort',
        startedAt: '2026-04-01',
        currentDay: 10,
        completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        completedAt: '2026-04-10',
        pausedAt: null,
        resumeFromDay: null,
        reflection: 'This was beautiful.',
        celebrationShown: true,
      },
      isLoading: false,
      isError: false,
    })
    renderDetail()

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByText('Start again')).toBeInTheDocument()
    expect(screen.getByText('This was beautiful.')).toBeInTheDocument()
  })

  it('start plan auth-gates when logged out', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    renderDetail()

    fireEvent.click(screen.getByText('Start this plan'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to start a reading plan')
  })

  it('pause plan auth-gates when logged out', () => {
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'psalm-comfort',
        startedAt: '2026-04-01',
        currentDay: 4,
        completedDays: [1, 2, 3],
        completedAt: null,
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: false,
      },
      isLoading: false,
      isError: false,
    })
    renderDetail()

    fireEvent.click(screen.getByText('Pause plan'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to manage your reading plan')
  })

  it('day rows link to day pages', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    renderDetail()

    const day3Link = screen.getByText('Day 3: Day 3').closest('a')
    expect(day3Link).toHaveAttribute('href', '/bible/plans/psalm-comfort/day/3')
  })

  it('error state shows for corrupt plan', () => {
    mockUsePlan.mockReturnValue({ plan: null, progress: null, isLoading: false, isError: true })
    renderDetail()

    expect(screen.getByText(/couldn't be loaded/)).toBeInTheDocument()
  })

  it('progress bar has correct ARIA', () => {
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'psalm-comfort',
        startedAt: '2026-04-01',
        currentDay: 4,
        completedDays: [1, 2, 3],
        completedAt: null,
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: false,
      },
      isLoading: false,
      isError: false,
    })
    renderDetail()

    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '10')
  })

  it('restart auth-gates when logged out', () => {
    mockUsePlan.mockReturnValue({
      plan: MOCK_PLAN,
      progress: {
        slug: 'psalm-comfort',
        startedAt: '2026-04-01',
        currentDay: 10,
        completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        completedAt: '2026-04-10',
        pausedAt: null,
        resumeFromDay: null,
        reflection: null,
        celebrationShown: true,
      },
      isLoading: false,
      isError: false,
    })
    renderDetail()

    fireEvent.click(screen.getByText('Start again'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to start a reading plan')
  })

  it('all tap targets >= 44px (buttons have min-h-[44px])', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
    renderDetail()

    const startBtn = screen.getByText('Start this plan')
    expect(startBtn.className).toContain('min-h-[44px]')
  })

  describe('day-row auth gating (BB-53 Req 4)', () => {
    it('opens auth modal and prevents navigation when logged out', () => {
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
      renderDetail()

      const dayOneLink = screen.getByText('Day 1: Day 1').closest('a')
      expect(dayOneLink).not.toBeNull()
      fireEvent.click(dayOneLink!)

      expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to start this reading plan')
    })

    it('does NOT open auth modal when logged in', () => {
      mockIsAuthenticated = true
      mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: null, isLoading: false, isError: false })
      renderDetail()

      const dayOneLink = screen.getByText('Day 1: Day 1').closest('a')
      expect(dayOneLink).not.toBeNull()
      fireEvent.click(dayOneLink!)

      expect(mockOpenAuthModal).not.toHaveBeenCalled()
    })
  })
})
