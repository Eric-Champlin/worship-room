import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ReadingPlansContent } from '../ReadingPlans'

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
          <ReadingPlansContent />
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

  it('renders Create Your Own Plan card', () => {
    renderPage()
    expect(screen.getByText('Create Your Own Plan')).toBeInTheDocument()
    expect(screen.getByText('Create Plan')).toBeInTheDocument()
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

  it('does not render filter UI', () => {
    renderPage()
    expect(
      screen.queryByRole('button', { name: '7 days' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '14 days' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Beginner' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/No reading plans match your filters/i),
    ).not.toBeInTheDocument()
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
