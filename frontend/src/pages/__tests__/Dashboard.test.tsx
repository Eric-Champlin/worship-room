import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

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

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
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
    expect(root).toHaveClass('bg-[#0f0a1e]')
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
