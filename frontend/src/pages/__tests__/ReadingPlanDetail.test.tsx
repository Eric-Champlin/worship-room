import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ReadingPlanDetail } from '../ReadingPlanDetail'
import { READING_PLAN_PROGRESS_KEY } from '@/constants/reading-plans'

const mockAuth = {
  isAuthenticated: false,
  user: null,
  login: vi.fn(),
  logout: vi.fn(),
}

const mockOpenAuthModal = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

vi.mock('@/components/prayer-wall/AuthModalProvider', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/prayer-wall/AuthModalProvider')
  >('@/components/prayer-wall/AuthModalProvider')
  return {
    ...actual,
    useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
  }
})

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0,
    currentLevel: 1,
    levelName: 'Seedling',
    pointsToNextLevel: 100,
    todayActivities: {
      mood: false,
      pray: false,
      listen: false,
      prayerWall: false,
      readingPlan: false,
      meditate: false,
      journal: false,
    },
    todayPoints: 0,
    todayMultiplier: 1,
    currentStreak: 0,
    longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

function renderPage(planId: string) {
  return render(
    <MemoryRouter
      initialEntries={[`/reading-plans/${planId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <Routes>
            <Route
              path="/reading-plans/:planId"
              element={<ReadingPlanDetail />}
            />
          </Routes>
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ReadingPlanDetail', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    mockOpenAuthModal.mockClear()
  })

  it('renders plan detail for valid planId', () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      screen.getByRole('heading', {
        name: 'Finding Peace in Anxiety',
        level: 1,
      }),
    ).toBeInTheDocument()
  })

  it('shows Plan Not Found for invalid planId', () => {
    renderPage('nonexistent-plan')
    expect(screen.getByText('Plan Not Found')).toBeInTheDocument()
    expect(screen.getByText('Browse Reading Plans')).toBeInTheDocument()
  })

  it('renders hero with plan title, description, and emoji', () => {
    renderPage('finding-peace-in-anxiety')
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText(/A 7-day journey/)).toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('renders Day 1 content by default', () => {
    renderPage('finding-peace-in-anxiety')
    expect(screen.getByText('Day 1: When Worry Takes Over')).toBeInTheDocument()
    expect(screen.getByText('Philippians 4:6-7')).toBeInTheDocument()
  })

  it('renders passage with verse numbers', () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      screen.getByText(/In nothing be anxious/),
    ).toBeInTheDocument()
  })

  it('renders reflection paragraphs', () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      screen.getByText(/Worry has a way of filling/),
    ).toBeInTheDocument()
  })

  it('renders prayer section', () => {
    renderPage('finding-peace-in-anxiety')
    expect(screen.getByText('Closing Prayer')).toBeInTheDocument()
    expect(
      screen.getByText(/Father, I bring my anxious thoughts/),
    ).toBeInTheDocument()
  })

  it('renders action step card', () => {
    renderPage('finding-peace-in-anxiety')
    expect(screen.getByText("Today's Action Step")).toBeInTheDocument()
    expect(
      screen.getByText(/Write down three things/),
    ).toBeInTheDocument()
  })

  it('Previous Day button disabled on Day 1', () => {
    renderPage('finding-peace-in-anxiety')
    const prevBtn = screen.getByRole('button', { name: 'Go to previous day' })
    expect(prevBtn).toBeDisabled()
  })

  it('does not show progress bar for unstarted plans', () => {
    renderPage('finding-peace-in-anxiety')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows progress bar when plan is started', () => {
    mockAuth.isAuthenticated = true
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: new Date().toISOString(),
          currentDay: 2,
          completedDays: [1],
          completedAt: null,
        },
      }),
    )
    renderPage('finding-peace-in-anxiety')
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText(/% complete/)).toBeInTheDocument()
  })

  it('Day 1 content visible without login', () => {
    renderPage('finding-peace-in-anxiety')
    expect(screen.getByText('Day 1: When Worry Takes Over')).toBeInTheDocument()
    expect(
      screen.getByText(/In nothing be anxious/),
    ).toBeInTheDocument()
  })

  it('Next Day triggers auth modal when logged out', async () => {
    renderPage('finding-peace-in-anxiety')
    const user = userEvent.setup()
    const nextBtn = screen.getByRole('button', { name: 'Go to next day' })
    await user.click(nextBtn)
    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to start this reading plan',
    )
  })

  it('day selector shows current day', () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      screen.getByRole('button', { name: /Day 1 of 7/ }),
    ).toBeInTheDocument()
  })

  it('day selector opens dropdown on click', async () => {
    renderPage('finding-peace-in-anxiety')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Day 1 of 7/ }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('has all-dark background', () => {
    renderPage('finding-peace-in-anxiety')
    const darkBg = document.querySelector('.bg-hero-dark')
    expect(darkBg).toBeInTheDocument()
  })

  it('does not show inline celebration when revisiting completed plan', () => {
    mockAuth.isAuthenticated = true
    localStorage.setItem(
      READING_PLAN_PROGRESS_KEY,
      JSON.stringify({
        'finding-peace-in-anxiety': {
          startedAt: new Date().toISOString(),
          currentDay: 7,
          completedDays: [1, 2, 3, 4, 5, 6, 7],
          completedAt: new Date().toISOString(),
        },
      }),
    )
    renderPage('finding-peace-in-anxiety')

    // No inline celebration on re-visit (only shows on fresh completion via IO)
    expect(screen.queryByText(/Day \d+ Complete/)).not.toBeInTheDocument()
  })
})
