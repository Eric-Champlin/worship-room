import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'
import { useReducedMotion } from '@/hooks/useReducedMotion'

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
  useReducedMotion: vi.fn(() => false),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    newlyEarnedBadges: [],
    recordActivity: vi.fn(),
    clearNewlyEarnedBadges: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
  // Required since Welcome Wizard checks onboarding state
  localStorage.setItem('wr_onboarding_complete', 'true')
})

afterEach(() => {
  vi.useRealTimers()
})

function seedTodayMoodEntry() {
  const entry: MoodEntry = {
    id: 'test-1',
    date: getLocalDateString(),
    mood: 4,
    moodLabel: 'Good',
    text: '',
    timestamp: Date.now(),
    verseSeen: 'Psalm 107:1',
  }
  localStorage.setItem('wr_mood_entries', JSON.stringify([entry]))
}

function renderDashboard() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthModalProvider>
          <Dashboard />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('Dashboard', () => {
  it('renders dashboard with dark background when checked in', () => {
    seedTodayMoodEntry()
    renderDashboard()
    const root = screen.getByRole('main').closest('.min-h-screen')
    expect(root).toHaveClass('bg-dashboard-dark')
  })

  it('has main content landmark when checked in', () => {
    seedTodayMoodEntry()
    renderDashboard()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders mood chart with seeded data', () => {
    seedTodayMoodEntry()
    renderDashboard()
    expect(
      screen.getByRole('img', { name: /your mood over the last 7 days/i }),
    ).toBeInTheDocument()
  })

  it('old placeholder text no longer appears', () => {
    seedTodayMoodEntry()
    renderDashboard()
    expect(screen.queryByText('Coming in Spec 3')).not.toBeInTheDocument()
  })
})

describe('Dashboard — Recommendations Phase', () => {
  it('check-in completion transitions to recommendations phase', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderDashboard()

    // Should show check-in (no mood entry today)
    expect(screen.getByText(/how are you feeling today/i)).toBeInTheDocument()

    // Select "Good" mood
    const goodOrb = screen.getByRole('radio', { name: /good/i })
    await user.click(goodOrb)

    // Click Continue
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    await user.click(continueBtn)

    // Wait for verse display auto-advance (3000ms)
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    // Should now show recommendations heading (text split by KaraokeTextReveal)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toMatch(/based on how you're feeling/i)
    // Should show Good mood suggestions
    expect(screen.getByText('Give Thanks')).toBeInTheDocument()
    expect(screen.getByText('Encourage Someone')).toBeInTheDocument()
    expect(screen.getByText('Deepen Your Worship')).toBeInTheDocument()
  })

  it('recommendations advance transitions to dashboard', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderDashboard()

    // Complete check-in
    const goodOrb = screen.getByRole('radio', { name: /good/i })
    await user.click(goodOrb)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    await user.click(continueBtn)
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    // Click "Go to Dashboard"
    const skipBtn = screen.getByRole('button', { name: /go to dashboard/i })
    await user.click(skipBtn)

    // Wait for dashboard_enter phase
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should show dashboard content
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('skip check-in does NOT show recommendations', async () => {
    const user = userEvent.setup()
    renderDashboard()

    // Click "Not right now"
    const skipLink = screen.getByText(/not right now/i)
    await user.click(skipLink)

    // Should show dashboard directly, no recommendations
    expect(screen.queryByText(/based on how you're feeling/i)).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('reduced motion skips recommendations', async () => {
    vi.mocked(useReducedMotion).mockReturnValue(true)
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderDashboard()

    const goodOrb = screen.getByRole('radio', { name: /good/i })
    await user.click(goodOrb)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    await user.click(continueBtn)

    // Advance past verse display
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    // With reduced motion, should skip recommendations and go directly to dashboard
    expect(screen.queryByText(/based on how you're feeling/i)).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()

    vi.mocked(useReducedMotion).mockReturnValue(false)
  })

  it('recommendations show correct mood suggestions for Struggling', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderDashboard()

    // Select "Struggling" mood
    const strugglingOrb = screen.getByRole('radio', { name: /struggling/i })
    await user.click(strugglingOrb)
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    await user.click(continueBtn)
    act(() => {
      vi.advanceTimersByTime(3500)
    })

    expect(screen.getByText('Talk to God')).toBeInTheDocument()
    expect(screen.getByText('Find Comfort in Scripture')).toBeInTheDocument()
    expect(screen.getByText("You're Not Alone")).toBeInTheDocument()
  })
})
