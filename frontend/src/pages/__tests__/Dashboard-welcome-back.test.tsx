import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'

// Mock ResizeObserver for Recharts ResponsiveContainer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => true),
}))

const mockRecordActivity = vi.fn()
vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 100, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    previousStreak: 15, isFreeRepairAvailable: true,
    newlyEarnedBadges: [],
    recordActivity: mockRecordActivity,
    clearNewlyEarnedBadges: vi.fn(),
    repairStreak: vi.fn(),
  }),
}))

const mockShouldShowWelcomeBack = vi.fn()
const mockMarkWelcomeBackShown = vi.fn()
vi.mock('@/services/welcome-back-storage', () => ({
  shouldShowWelcomeBack: (...args: unknown[]) => mockShouldShowWelcomeBack(...args),
  markWelcomeBackShown: (...args: unknown[]) => mockMarkWelcomeBackShown(...args),
}))

vi.mock('@/services/onboarding-storage', () => ({
  isOnboardingComplete: () => true,
}))

const mockHasCheckedInToday = vi.fn(() => false)
vi.mock('@/services/mood-storage', () => ({
  hasCheckedInToday: () => mockHasCheckedInToday(),
  getMoodEntries: () => [],
}))

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <Dashboard />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  localStorage.setItem('wr_onboarding_complete', 'true')
  mockShouldShowWelcomeBack.mockReturnValue(false)
  mockHasCheckedInToday.mockReturnValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Dashboard Welcome Back Integration', () => {
  it('shows WelcomeBack when shouldShowWelcomeBack returns true', () => {
    mockShouldShowWelcomeBack.mockReturnValue(true)
    renderDashboard()

    expect(screen.getByText('Welcome back, Eric')).toBeInTheDocument()
  })

  it('shows MoodCheckIn when shouldShowWelcomeBack returns false and not checked in', () => {
    mockShouldShowWelcomeBack.mockReturnValue(false)
    mockHasCheckedInToday.mockReturnValue(false)
    renderDashboard()

    expect(screen.queryByText('Welcome back, Eric')).not.toBeInTheDocument()
    expect(screen.getByText(/How are you feeling today/i)).toBeInTheDocument()
  })

  it('shows dashboard when shouldShowWelcomeBack returns false and checked in', () => {
    mockShouldShowWelcomeBack.mockReturnValue(false)
    mockHasCheckedInToday.mockReturnValue(true)
    renderDashboard()

    expect(screen.queryByText('Welcome back, Eric')).not.toBeInTheDocument()
    expect(screen.queryByText(/How are you feeling today/i)).not.toBeInTheDocument()
  })

  it('handleWelcomeBackStepIn transitions to check_in and marks shown', async () => {
    mockShouldShowWelcomeBack.mockReturnValue(true)
    renderDashboard()

    const user = userEvent.setup()
    await user.click(screen.getByText('Step Back In'))

    expect(mockMarkWelcomeBackShown).toHaveBeenCalled()
    expect(screen.getByText(/How are you feeling today/i)).toBeInTheDocument()
  })

  it('handleWelcomeBackSkip transitions to dashboard and marks shown', async () => {
    mockShouldShowWelcomeBack.mockReturnValue(true)
    mockHasCheckedInToday.mockReturnValue(true)
    renderDashboard()

    const user = userEvent.setup()
    await user.click(screen.getByText('Skip to Dashboard'))

    expect(mockMarkWelcomeBackShown).toHaveBeenCalled()
    expect(screen.queryByText('Welcome back, Eric')).not.toBeInTheDocument()
  })

  it('welcome_back phase appears between onboarding and check_in', () => {
    // When onboarding is complete and shouldShowWelcomeBack is true,
    // welcome_back shows before check_in
    mockShouldShowWelcomeBack.mockReturnValue(true)
    mockHasCheckedInToday.mockReturnValue(false)
    renderDashboard()

    // Should show welcome back (not mood check-in directly)
    expect(screen.getByText('Welcome back, Eric')).toBeInTheDocument()
    expect(screen.queryByText(/How are you feeling today/i)).not.toBeInTheDocument()
  })
})
