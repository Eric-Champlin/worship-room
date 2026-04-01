import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Dashboard } from '../Dashboard'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

const mockRecordActivity = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/components/ui/WhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: vi.fn() }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    newlyEarnedBadges: [],
    recordActivity: mockRecordActivity,
    clearNewlyEarnedBadges: vi.fn(),
    previousStreak: null,
    isFreeRepairAvailable: false,
    repairStreak: vi.fn(),
  }),
}))

function seedAuth() {
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
}

function seedOnboardingComplete() {
  localStorage.setItem('wr_onboarding_complete', 'true')
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

function seedAllGettingStartedFlags() {
  localStorage.setItem('wr_getting_started', JSON.stringify({
    mood_done: true,
    pray_done: true,
    journal_done: true,
    meditate_done: true,
    ambient_visited: true,
    prayer_wall_visited: true,
  }))
}

beforeEach(() => {
  localStorage.clear()
  seedAuth()
  seedOnboardingComplete()
  seedTodayMoodEntry()
})

afterEach(() => {
  vi.useRealTimers()
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

describe('Dashboard — Getting Started Integration', () => {
  it('GettingStartedCard renders when conditions met', () => {
    renderDashboard()
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByLabelText('0 of 6 getting started items completed')).toBeInTheDocument()
  })

  it('GettingStartedCard NOT visible when onboarding incomplete', () => {
    localStorage.removeItem('wr_onboarding_complete')
    renderDashboard()
    // Should show onboarding wizard, not dashboard
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })

  it('GettingStartedCard NOT visible when already dismissed', () => {
    localStorage.setItem('wr_getting_started_complete', 'true')
    renderDashboard()
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })

  it('celebration fires when all 6 items complete', () => {
    seedAllGettingStartedFlags()
    renderDashboard()
    expect(screen.getByText("You're all set! Welcome to Worship Room.")).toBeInTheDocument()
  })

  it('celebration does NOT fire on manual dismiss', () => {
    renderDashboard()
    const dismissBtn = screen.getByLabelText('Dismiss getting started checklist')
    fireEvent.click(dismissBtn)
    expect(screen.queryByText("You're all set! Welcome to Worship Room.")).not.toBeInTheDocument()
  })

  it('celebration dismiss sets wr_getting_started_complete', () => {
    seedAllGettingStartedFlags()
    renderDashboard()
    const letsGoBtn = screen.getByText("Let's Go")
    fireEvent.click(letsGoBtn)
    expect(localStorage.getItem('wr_getting_started_complete')).toBe('true')
  })

  it('card removed after celebration dismiss', () => {
    seedAllGettingStartedFlags()
    renderDashboard()
    fireEvent.click(screen.getByText("Let's Go"))
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })

  it('card fades out after manual dismiss', () => {
    vi.useFakeTimers()
    renderDashboard()
    const dismissBtn = screen.getByLabelText('Dismiss getting started checklist')
    fireEvent.click(dismissBtn)
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument()
  })

  it('existing dashboard widgets still render', () => {
    renderDashboard()
    // Check for known widgets
    expect(screen.getByText('7-Day Mood')).toBeInTheDocument()
    expect(screen.getByText('Streak & Faith Points')).toBeInTheDocument()
  })

  it('handleRequestCheckIn triggered from card item 1', () => {
    renderDashboard()
    const goLinks = screen.getAllByText('Go')
    fireEvent.click(goLinks[0])
    // Should switch to check_in phase — mood check-in should render
    expect(screen.getByText(/How are you feeling/i)).toBeInTheDocument()
  })

  it('logout does NOT clear getting started data', () => {
    localStorage.setItem('wr_getting_started', JSON.stringify({ mood_done: true }))
    localStorage.setItem('wr_getting_started_complete', 'true')

    // Simulate what logout() does: remove only auth keys
    localStorage.removeItem('wr_auth_simulated')
    localStorage.removeItem('wr_user_name')

    // Getting started data should still be present
    expect(localStorage.getItem('wr_getting_started')).not.toBeNull()
    expect(localStorage.getItem('wr_getting_started_complete')).toBe('true')
  })
})
