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

  // --- Spec 6A Step 11: Create-Your-Own-Plan FrostedCard chrome + Sparkles tonal ---

  it('Create-Your-Own-Plan card uses FrostedCard chrome', () => {
    renderPage()
    const heading = screen.getByText('Create Your Own Plan')
    // Walk up to the FrostedCard div (the heading sits inside flex-1 div, which sits inside flex row, which sits inside FrostedCard div)
    const card = heading.closest('.rounded-3xl') as HTMLElement | null
    expect(card).not.toBeNull()
    expect(card?.className).toContain('bg-white/[0.07]')
    expect(card?.className).toContain('border-white/[0.12]')
    expect(card?.className).toContain('mb-6')
  })

  it('Create-Your-Own-Plan Sparkles icon has text-violet-300 (Tonal Icon Pattern)', () => {
    const { container } = renderPage()
    const heading = screen.getByText('Create Your Own Plan')
    const card = heading.closest('.rounded-3xl') as HTMLElement | null
    const sparkles = card?.querySelector('svg.lucide-sparkles') ?? container.querySelector('svg[aria-hidden="true"]')
    expect(sparkles?.classList.contains('text-violet-300')).toBe(true)
  })

  it('Create-Your-Own-Plan Sparkles container has bg-white/[0.05]', () => {
    renderPage()
    const heading = screen.getByText('Create Your Own Plan')
    const card = heading.closest('.rounded-3xl') as HTMLElement | null
    const iconContainer = card?.querySelector('.h-12.w-12') as HTMLElement | null
    expect(iconContainer).not.toBeNull()
    expect(iconContainer?.className).toContain('bg-white/[0.05]')
  })

  it('Create-Your-Own-Plan description has text-white/70', () => {
    renderPage()
    const description = screen.getByText(
      /Tell us what you're going through and we'll create a personalized Scripture journey just for you./,
    )
    expect(description.className).toContain('text-white/70')
  })

  // --- Spec 6A Step 12: ConfirmDialog "Pause & Start New" subtle button ---

  it('ConfirmDialog "Pause & Start New" uses subtle button chrome (not bg-primary)', async () => {
    mockAuth.isAuthenticated = true
    renderPage()
    const user = userEvent.setup()

    // Trigger the dialog via two starts
    const startButtons = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(startButtons[0])
    const remainingStarts = screen.getAllByRole('button', { name: 'Start Plan' })
    await user.click(remainingStarts[0])

    const pauseBtn = screen.getByRole('button', { name: 'Pause & Start New' })
    expect(pauseBtn.className).toContain('bg-white/[0.07]')
    expect(pauseBtn.className).toContain('rounded-full')
    expect(pauseBtn.className).toContain('min-h-[44px]')
    // Negative assertion: must NOT be the deprecated bg-primary solid button
    expect(pauseBtn.className).not.toContain('bg-primary')
  })
})
