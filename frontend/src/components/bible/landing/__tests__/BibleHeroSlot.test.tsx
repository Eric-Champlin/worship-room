import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { LastReadState } from '@/hooks/bible/useLastRead'
import type { UseActivePlanResult } from '@/hooks/bible/useActivePlan'

import { BibleHeroSlot } from '../BibleHeroSlot'

// Mock useLastRead
const mockUseLastRead = vi.fn<() => LastReadState>()
vi.mock('@/hooks/bible/useLastRead', () => ({
  useLastRead: () => mockUseLastRead(),
}))

// Mock useActivePlan
const mockUseActivePlan = vi.fn<() => UseActivePlanResult>()
vi.mock('@/hooks/bible/useActivePlan', () => ({
  useActivePlan: () => mockUseActivePlan(),
}))

// Mock child components
vi.mock('../VerseOfTheDay', () => ({
  VerseOfTheDay: () => <div data-testid="votd-card">Verse of the Day</div>,
}))

vi.mock('../ResumeReadingCard', () => ({
  ResumeReadingCard: (props: { book: string; chapter: number }) => (
    <div data-testid="resume-card">
      Resume: {props.book} {props.chapter}
    </div>
  ),
}))

vi.mock('../ActivePlanBanner', () => ({
  ActivePlanBanner: (props: { planTitle: string; currentDay: number }) => (
    <div data-testid="plan-banner">
      Plan: {props.planTitle} Day {props.currentDay}
    </div>
  ),
}))

function renderSlot() {
  return render(
    <MemoryRouter>
      <BibleHeroSlot />
    </MemoryRouter>,
  )
}

const NO_PLAN: UseActivePlanResult = {
  activePlan: null,
  progress: null,
  currentDay: null,
  isOnPlanPassage: () => false,
  markDayComplete: () => ({ type: 'already-completed' as const, day: 0 }),
  pausePlan: () => {},
  switchPlan: async () => {},
}

const ACTIVE_PLAN: UseActivePlanResult = {
  activePlan: {
    slug: 'psalm-comfort',
    title: 'Psalms of Comfort',
    shortTitle: 'Comfort',
    description: 'A plan about comfort',
    theme: 'comfort',
    duration: 21,
    estimatedMinutesPerDay: 10,
    curator: 'Worship Room',
    coverGradient: 'from-primary/30 to-hero-dark',
    days: [
      { day: 5, title: 'Day Five', passages: [{ book: 'psalms', chapter: 23 }] },
    ],
  },
  progress: {
    slug: 'psalm-comfort',
    startedAt: '2026-04-01',
    currentDay: 5,
    completedDays: [1, 2, 3, 4],
    completedAt: null,
    pausedAt: null,
    resumeFromDay: null,
    reflection: null,
    celebrationShown: false,
  },
  currentDay: { day: 5, title: 'Day Five', passages: [{ book: 'psalms', chapter: 23 }] },
  isOnPlanPassage: () => false,
  markDayComplete: () => ({ type: 'day-completed' as const, day: 5, isAllComplete: false as const }),
  pausePlan: () => {},
  switchPlan: async () => {},
}

const ACTIVE_STATE: LastReadState = {
  book: 'John',
  chapter: 3,
  timestamp: Date.now(),
  isActiveReader: true,
  isLapsedReader: false,
  isFirstTimeReader: false,
  relativeTime: '2 hours ago',
  firstLineOfChapter: 'Now there was a man of the Pharisees...',
  slug: 'john',
  nextChapter: { bookSlug: 'john', bookName: 'John', chapter: 4 },
}

const FIRST_TIME_STATE: LastReadState = {
  book: null,
  chapter: null,
  timestamp: null,
  isActiveReader: false,
  isLapsedReader: false,
  isFirstTimeReader: true,
  relativeTime: '',
  firstLineOfChapter: null,
  slug: null,
  nextChapter: null,
}

const LAPSED_STATE: LastReadState = {
  book: 'John',
  chapter: 3,
  timestamp: Date.now() - 90_000_000,
  isActiveReader: false,
  isLapsedReader: true,
  isFirstTimeReader: false,
  relativeTime: 'Yesterday',
  firstLineOfChapter: null,
  slug: 'john',
  nextChapter: null,
}

describe('BibleHeroSlot', () => {
  it('renders plan banner when active plan exists', () => {
    mockUseActivePlan.mockReturnValue(ACTIVE_PLAN)
    mockUseLastRead.mockReturnValue(FIRST_TIME_STATE)
    renderSlot()

    expect(screen.getByTestId('plan-banner')).toBeInTheDocument()
    expect(screen.getByText(/Plan: Psalms of Comfort Day 5/)).toBeInTheDocument()
  })

  it('demotes VOTD below plan banner', () => {
    mockUseActivePlan.mockReturnValue(ACTIVE_PLAN)
    mockUseLastRead.mockReturnValue(FIRST_TIME_STATE)
    const { container } = renderSlot()

    const banner = screen.getByTestId('plan-banner')
    const votd = screen.getByTestId('votd-card')

    expect(banner).toBeInTheDocument()
    expect(votd).toBeInTheDocument()

    const parent = container.querySelector('.space-y-6')
    const children = Array.from(parent!.children)
    expect(children.indexOf(banner)).toBeLessThan(children.indexOf(votd))
  })

  it('falls through to resume when no plan', () => {
    mockUseActivePlan.mockReturnValue(NO_PLAN)
    mockUseLastRead.mockReturnValue(ACTIVE_STATE)
    renderSlot()

    expect(screen.queryByTestId('plan-banner')).not.toBeInTheDocument()
    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
  })

  // Existing tests that should still pass
  it('renders resume card when active reader (no plan)', () => {
    mockUseActivePlan.mockReturnValue(NO_PLAN)
    mockUseLastRead.mockReturnValue(ACTIVE_STATE)
    renderSlot()

    expect(screen.getByTestId('resume-card')).toBeInTheDocument()
  })

  it('renders VOTD below resume card when active', () => {
    mockUseActivePlan.mockReturnValue(NO_PLAN)
    mockUseLastRead.mockReturnValue(ACTIVE_STATE)
    const { container } = renderSlot()

    const resume = screen.getByTestId('resume-card')
    const votd = screen.getByTestId('votd-card')
    expect(resume).toBeInTheDocument()
    expect(votd).toBeInTheDocument()

    const parent = container.querySelector('.space-y-6')
    const children = Array.from(parent!.children)
    expect(children.indexOf(resume)).toBeLessThan(children.indexOf(votd))
  })

  it('renders VOTD as primary when lapsed reader', () => {
    mockUseActivePlan.mockReturnValue(NO_PLAN)
    mockUseLastRead.mockReturnValue(LAPSED_STATE)
    renderSlot()

    expect(screen.getByTestId('votd-card')).toBeInTheDocument()
    expect(screen.queryByTestId('resume-card')).not.toBeInTheDocument()
  })

  it('renders VOTD only for first-time reader', () => {
    mockUseActivePlan.mockReturnValue(NO_PLAN)
    mockUseLastRead.mockReturnValue(FIRST_TIME_STATE)
    renderSlot()

    expect(screen.getByTestId('votd-card')).toBeInTheDocument()
  })

  it('no resume affordance for first-time reader', () => {
    mockUseActivePlan.mockReturnValue(NO_PLAN)
    mockUseLastRead.mockReturnValue(FIRST_TIME_STATE)
    renderSlot()

    expect(screen.queryByTestId('resume-card')).not.toBeInTheDocument()
    expect(screen.queryByText(/Last read:/)).not.toBeInTheDocument()
  })
})
