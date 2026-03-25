import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })),
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

const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  // Required since Welcome Wizard checks onboarding state
  localStorage.setItem('wr_onboarding_complete', 'true')
  mockUseAuth.mockReturnValue({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  })
})

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

describe('Dashboard', () => {
  it('shows MoodCheckIn when not checked in today', () => {
    renderDashboard()
    expect(screen.getByText(/how are you feeling/i)).toBeInTheDocument()
  })

  it('shows dashboard content when already checked in', () => {
    seedTodayMoodEntry()
    renderDashboard()
    expect(screen.getByText(/Good morning|Good afternoon|Good evening/)).toBeInTheDocument()
    expect(screen.queryByText(/how are you feeling/i)).not.toBeInTheDocument()
  })

  it('transitions from check-in to dashboard on skip', async () => {
    const user = userEvent.setup()
    renderDashboard()

    expect(screen.getByText(/how are you feeling/i)).toBeInTheDocument()

    await user.click(screen.getByText(/not right now/i))

    expect(screen.getByText(/Good morning|Good afternoon|Good evening/)).toBeInTheDocument()
  })

  it('has skip-to-content link', () => {
    seedTodayMoodEntry()
    renderDashboard()
    const skipLink = document.querySelector('a[href="#main-content"]')
    expect(skipLink).toBeInTheDocument()
  })

  it('has dark background', () => {
    seedTodayMoodEntry()
    renderDashboard()
    const root = screen.getByRole('main').closest('.min-h-screen')
    expect(root).toHaveClass('bg-dashboard-dark')
  })
})
