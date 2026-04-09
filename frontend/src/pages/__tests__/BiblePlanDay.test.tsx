import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { UsePlanResult } from '@/hooks/bible/usePlan'

const mockOpenAuthModal = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))

const mockUsePlan = vi.fn<(slug: string) => UsePlanResult>()
vi.mock('@/hooks/bible/usePlan', () => ({
  usePlan: (slug: string) => mockUsePlan(slug),
}))

vi.mock('@/lib/bible/plansStore', () => ({
  markDayComplete: vi.fn(),
}))

import { BiblePlanDay } from '../BiblePlanDay'

const MOCK_PLAN = {
  slug: 'psalm-comfort',
  title: 'Psalms of Comfort',
  shortTitle: 'Comfort',
  description: 'Find comfort',
  theme: 'comfort' as const,
  duration: 21,
  estimatedMinutesPerDay: 10,
  curator: 'Worship Room',
  coverGradient: 'from-primary/30 to-hero-dark',
  days: [
    {
      day: 1,
      title: 'The Good Shepherd',
      passages: [{ book: 'psalms', chapter: 23, startVerse: 1, endVerse: 6 }],
      devotional: 'The Lord is my shepherd.\n\nI shall not want.',
      reflectionPrompts: ['What does it mean to you that the Lord is your shepherd?'],
    },
    {
      day: 2,
      title: 'Day of Rest',
      passages: [{ book: 'psalms', chapter: 46 }],
    },
    {
      day: 3,
      title: 'Day Three',
      passages: [
        { book: 'psalms', chapter: 91, startVerse: 1, endVerse: 16 },
        { book: 'psalms', chapter: 121 },
      ],
    },
  ],
}

const PROGRESS_DAY_1 = {
  slug: 'psalm-comfort',
  startedAt: '2026-04-01',
  currentDay: 1,
  completedDays: [] as number[],
  completedAt: null,
  pausedAt: null,
  resumeFromDay: null,
  reflection: null,
  celebrationShown: false,
}

function renderDay(dayNumber = 1) {
  return render(
    <MemoryRouter initialEntries={[`/bible/plans/psalm-comfort/day/${dayNumber}`]}>
      <Routes>
        <Route path="/bible/plans/:slug/day/:dayNumber" element={<BiblePlanDay />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BiblePlanDay', () => {
  it('renders day title and indicator', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    expect(screen.getByText('Day 1 of 21')).toBeInTheDocument()
    expect(screen.getByText('The Good Shepherd')).toBeInTheDocument()
  })

  it('renders devotional text as paragraphs', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    expect(screen.getByText('The Lord is my shepherd.')).toBeInTheDocument()
    expect(screen.getByText('I shall not want.')).toBeInTheDocument()
  })

  it('renders passage cards with links', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    expect(screen.getByText('Psalms 23:1-6')).toBeInTheDocument()
    expect(screen.getByText('Read this passage')).toBeInTheDocument()
  })

  it('passage link includes highlight param', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    const link = screen.getByText('Read this passage').closest('a')
    expect(link).toHaveAttribute('href', '/bible/psalms/23?highlight=1')
  })

  it('renders reflection prompts with journal link', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    expect(screen.getByText('What does it mean to you that the Lord is your shepherd?')).toBeInTheDocument()
    const journalLink = screen.getByText('Journal about this').closest('a')
    expect(journalLink).toHaveAttribute('href', expect.stringContaining('/daily?tab=journal'))
  })

  it('mark complete auth-gates when logged out', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    fireEvent.click(screen.getByText('I read this. Mark day complete.'))
    expect(mockOpenAuthModal).toHaveBeenCalledWith('Sign in to track your progress')
  })

  it('mark complete changes to "Day complete" state', () => {
    const completedProgress = { ...PROGRESS_DAY_1, completedDays: [1] }
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: completedProgress, isLoading: false, isError: false })
    renderDay(1)

    expect(screen.getByText('Day complete')).toBeInTheDocument()
    expect(screen.queryByText('I read this. Mark day complete.')).not.toBeInTheDocument()
  })

  it('day nav arrows link correctly', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(2)

    const prevLink = screen.getByText('Day 1').closest('a')
    expect(prevLink).toHaveAttribute('href', '/bible/plans/psalm-comfort/day/1')

    const nextLink = screen.getByText('Day 3').closest('a')
    expect(nextLink).toHaveAttribute('href', '/bible/plans/psalm-comfort/day/3')
  })

  it('day 1 has no prev arrow link', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(1)

    // "Day 0" is the disabled prev
    const disabledPrev = screen.getByText('Day 0')
    expect(disabledPrev.closest('a')).toBeNull()
  })

  it('invalid day number shows error', () => {
    mockUsePlan.mockReturnValue({ plan: MOCK_PLAN, progress: PROGRESS_DAY_1, isLoading: false, isError: false })
    renderDay(99)

    expect(screen.getByText(/Day 99 doesn't exist/)).toBeInTheDocument()
  })
})
