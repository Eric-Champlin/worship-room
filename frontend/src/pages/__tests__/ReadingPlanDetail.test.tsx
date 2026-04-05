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

  it('renders plan detail for valid planId', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      await screen.findByRole('heading', {
        name: 'Finding Peace in Anxiety',
        level: 1,
      }),
    ).toBeInTheDocument()
  })

  it('shows Plan Not Found for invalid planId', async () => {
    renderPage('nonexistent-plan')
    expect(await screen.findByText('Plan Not Found')).toBeInTheDocument()
    expect(screen.getByText('Browse Reading Plans')).toBeInTheDocument()
  })

  it('renders hero with plan title, description, and emoji', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Finding Peace in Anxiety')
    expect(screen.getByText(/A 7-day journey/)).toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('renders Day 1 content by default', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(await screen.findByText('Day 1: When Worry Takes Over')).toBeInTheDocument()
    expect(screen.getByText('Philippians 4:6-7')).toBeInTheDocument()
  })

  it('renders passage with verse numbers', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      await screen.findByText(/In nothing be anxious/),
    ).toBeInTheDocument()
  })

  it('renders reflection paragraphs', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      await screen.findByText(/Worry has a way of filling/),
    ).toBeInTheDocument()
  })

  it('renders prayer section', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(await screen.findByText('Closing Prayer')).toBeInTheDocument()
    expect(
      screen.getByText(/Father, I bring my anxious thoughts/),
    ).toBeInTheDocument()
  })

  it('renders action step card', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(await screen.findByText("Today's Action Step")).toBeInTheDocument()
    expect(
      screen.getByText(/Write down three things/),
    ).toBeInTheDocument()
  })

  it('Previous Day button disabled on Day 1', async () => {
    renderPage('finding-peace-in-anxiety')
    const prevBtn = await screen.findByRole('button', { name: 'Go to previous day' })
    expect(prevBtn).toBeDisabled()
  })

  it('does not show progress bar for unstarted plans', async () => {
    renderPage('finding-peace-in-anxiety')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows progress bar when plan is started', async () => {
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
    expect(await screen.findByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText(/% complete/)).toBeInTheDocument()
  })

  it('Day 1 content visible without login', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(await screen.findByText('Day 1: When Worry Takes Over')).toBeInTheDocument()
    expect(
      screen.getByText(/In nothing be anxious/),
    ).toBeInTheDocument()
  })

  it('Next Day triggers auth modal when logged out', async () => {
    renderPage('finding-peace-in-anxiety')
    const user = userEvent.setup()
    const nextBtn = await screen.findByRole('button', { name: 'Go to next day' })
    await user.click(nextBtn)
    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to start this reading plan',
    )
  })

  it('day selector shows current day', async () => {
    renderPage('finding-peace-in-anxiety')
    expect(
      await screen.findByRole('button', { name: /Day 1 of 7/ }),
    ).toBeInTheDocument()
  })

  it('day selector opens dropdown on click', async () => {
    renderPage('finding-peace-in-anxiety')
    const user = userEvent.setup()
    const dayBtn = await screen.findByRole('button', { name: /Day 1 of 7/ })
    await user.click(dayBtn)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('has all-dark background', async () => {
    renderPage('finding-peace-in-anxiety')
    await screen.findByRole('heading', { level: 1 })
    const darkBg = document.querySelector('.bg-hero-dark')
    expect(darkBg).toBeInTheDocument()
  })

  it('does not show inline celebration when revisiting completed plan', async () => {
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
    await screen.findByRole('heading', { level: 1 })

    // No inline celebration on re-visit (only shows on fresh completion via IO)
    expect(screen.queryByText(/Day \d+ Complete/)).not.toBeInTheDocument()
  })

  describe('Breadcrumb', () => {
    it('renders breadcrumb with plan trail', async () => {
      renderPage('finding-peace-in-anxiety')
      const nav = await screen.findByRole('navigation', { name: /breadcrumb/i })
      expect(nav).toHaveTextContent('Grow')
      expect(nav).toHaveTextContent('Reading Plans')
      expect(nav).toHaveTextContent('Finding Peace in Anxiety')
    })

    it('Grow and Reading Plans link to /grow?tab=plans', async () => {
      renderPage('finding-peace-in-anxiety')
      const nav = await screen.findByRole('navigation', { name: /breadcrumb/i })
      const links = nav.querySelectorAll('a')
      const hrefs = Array.from(links).map((l) => l.getAttribute('href'))
      expect(hrefs).toContain('/grow?tab=plans')
      // Both Grow and Reading Plans link to the same destination
      expect(hrefs.filter((h) => h === '/grow?tab=plans').length).toBe(2)
    })

    it('current page shows plan title', async () => {
      renderPage('finding-peace-in-anxiety')
      const nav = await screen.findByRole('navigation', { name: /breadcrumb/i })
      const current = nav.querySelector('[aria-current="page"]')
      expect(current).toHaveTextContent('Finding Peace in Anxiety')
    })
  })
})
