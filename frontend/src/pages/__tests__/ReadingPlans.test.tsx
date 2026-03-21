import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ReadingPlans } from '../ReadingPlans'

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

function renderPage(initialEntry = '/reading-plans') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <ReadingPlans />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ReadingPlans', () => {
  beforeEach(() => {
    localStorage.clear()
    mockAuth.isAuthenticated = false
    mockOpenAuthModal.mockClear()
  })

  it('renders PageHero with correct title and subtitle', () => {
    renderPage()
    expect(
      screen.getByRole('heading', { name: 'Reading Plans', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Guided journeys through Scripture'),
    ).toBeInTheDocument()
  })

  it('renders all 10 plan cards', () => {
    renderPage()
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText('Walking Through Grief')).toBeInTheDocument()
    expect(screen.getByText('The Gratitude Reset')).toBeInTheDocument()
    expect(
      screen.getByText('Knowing Who You Are in Christ'),
    ).toBeInTheDocument()
    expect(screen.getByText('The Path to Forgiveness')).toBeInTheDocument()
    expect(screen.getByText('Learning to Trust God')).toBeInTheDocument()
    expect(screen.getByText("Hope When It's Hard")).toBeInTheDocument()
    expect(
      screen.getByText('Healing from the Inside Out'),
    ).toBeInTheDocument()
    expect(screen.getByText('Discovering Your Purpose')).toBeInTheDocument()
    expect(
      screen.getByText('Building Stronger Relationships'),
    ).toBeInTheDocument()
  })

  it('filters by 7-day duration', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '7 days' }))

    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText('The Gratitude Reset')).toBeInTheDocument()
    expect(screen.getByText('Learning to Trust God')).toBeInTheDocument()
    expect(screen.getByText("Hope When It's Hard")).toBeInTheDocument()
    expect(
      screen.getByText('Building Stronger Relationships'),
    ).toBeInTheDocument()

    // 14 and 21-day plans should not be visible
    expect(
      screen.queryByText('Walking Through Grief'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Knowing Who You Are in Christ'),
    ).not.toBeInTheDocument()
  })

  it('filters by 14-day duration', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '14 days' }))

    expect(screen.getByText('Walking Through Grief')).toBeInTheDocument()
    expect(screen.getByText('The Path to Forgiveness')).toBeInTheDocument()
    expect(screen.getByText('Discovering Your Purpose')).toBeInTheDocument()
    expect(
      screen.queryByText('Finding Peace in Anxiety'),
    ).not.toBeInTheDocument()
  })

  it('filters by 21-day duration', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '21 days' }))

    expect(
      screen.getByText('Knowing Who You Are in Christ'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Healing from the Inside Out'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Finding Peace in Anxiety'),
    ).not.toBeInTheDocument()
  })

  it('filters by difficulty', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Beginner' }))

    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(
      screen.queryByText('Walking Through Grief'),
    ).not.toBeInTheDocument()
  })

  it('applies both filters with AND logic', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '7 days' }))
    await user.click(screen.getByRole('button', { name: 'Intermediate' }))

    // No 7-day intermediate plans exist, so empty state
    expect(
      screen.getByText('No reading plans match your filters.'),
    ).toBeInTheDocument()
  })

  it('shows empty state and clear filters button', async () => {
    renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '7 days' }))
    await user.click(screen.getByRole('button', { name: 'Intermediate' }))

    const clearBtn = screen.getByRole('button', { name: 'Clear filters' })
    expect(clearBtn).toBeInTheDocument()

    await user.click(clearBtn)
    // All 10 plans should be visible again
    expect(screen.getByText('Finding Peace in Anxiety')).toBeInTheDocument()
    expect(screen.getByText('Walking Through Grief')).toBeInTheDocument()
  })

  it('shows auth modal when clicking Start Plan while logged out', async () => {
    renderPage()
    const user = userEvent.setup()
    const startButtons = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(startButtons[0])
    expect(mockOpenAuthModal).toHaveBeenCalledWith(
      'Sign in to start this reading plan',
    )
  })

  it('starts plan when clicking Start Plan while logged in', async () => {
    mockAuth.isAuthenticated = true
    renderPage()
    const user = userEvent.setup()
    const startButtons = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(startButtons[0])

    // After starting, the button should change to "Continue"
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('shows confirmation dialog when starting a new plan while one is active', async () => {
    mockAuth.isAuthenticated = true
    renderPage()
    const user = userEvent.setup()

    // Start first plan
    const startButtons = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(startButtons[0])

    // Try to start another plan
    const remainingStarts = screen.getAllByRole('button', {
      name: 'Start Plan',
    })
    await user.click(remainingStarts[0])

    // Confirmation dialog should appear
    expect(screen.getByText('Switch Reading Plan?')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Keep Current' }),
    ).toBeInTheDocument()
  })

  it('dismisses dialog when clicking Keep Current', async () => {
    mockAuth.isAuthenticated = true
    renderPage()
    const user = userEvent.setup()

    const startButtons = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(startButtons[0])

    const remainingStarts = screen.getAllByRole('button', {
      name: 'Start Plan',
    })
    await user.click(remainingStarts[0])

    await user.click(screen.getByRole('button', { name: 'Keep Current' }))
    expect(
      screen.queryByText('Switch Reading Plan?'),
    ).not.toBeInTheDocument()
  })

  it('active filter pills have aria-pressed="true"', async () => {
    renderPage()
    const user = userEvent.setup()
    const sevenDayButton = screen.getByRole('button', { name: '7 days' })

    expect(sevenDayButton).toHaveAttribute('aria-pressed', 'false')
    await user.click(sevenDayButton)
    expect(sevenDayButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('plan cards link to detail page', () => {
    renderPage()
    const links = screen.getAllByRole('link')
    const planLink = links.find((l) =>
      l.getAttribute('href')?.includes('/reading-plans/finding-peace-in-anxiety'),
    )
    expect(planLink).toBeInTheDocument()
  })

  it('shows "Day X of Y" for in-progress plans', async () => {
    mockAuth.isAuthenticated = true
    renderPage()
    const user = userEvent.setup()

    const startButtons = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(startButtons[0])

    expect(screen.getByText(/Day 1 of/)).toBeInTheDocument()
  })
})
