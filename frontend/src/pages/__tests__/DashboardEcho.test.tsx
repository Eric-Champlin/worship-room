import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ToastProvider } from '@/components/ui/Toast'
import type { Echo } from '@/types/echoes'
import { getLocalDateString } from '@/utils/date'

import { Dashboard } from '../Dashboard'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

const mockEcho: Echo = {
  id: 'echo:highlighted:john:3:16-16',
  kind: 'highlighted',
  book: 'john',
  bookName: 'John',
  chapter: 3,
  startVerse: 16,
  endVerse: 16,
  text: 'For God so loved the world',
  reference: 'John 3:16',
  relativeLabel: 'a month ago',
  occurredAt: Date.now() - 30 * 86_400_000,
  score: 120,
}

let mockEchoValue: Echo | null = null

vi.mock('@/hooks/useEcho', () => ({
  useEcho: () => mockEchoValue,
  useEchoes: () => (mockEchoValue ? [mockEchoValue] : []),
  markEchoSeen: vi.fn(),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { name: 'Eric', id: 'test-id' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/useWhisperToast', () => ({
  useWhisperToast: () => ({ showWhisperToast: vi.fn() }),
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

vi.mock('@/hooks/useSoundEffects', () => ({
  useSoundEffects: () => ({ playSoundEffect: vi.fn() }),
}))

vi.mock('@/hooks/useAnniversaryMoment', () => ({
  useAnniversaryMoment: () => ({ show: false }),
}))

vi.mock('@/hooks/useGratitudeCallback', () => ({
  useGratitudeCallback: () => {},
}))

vi.mock('@/hooks/useRoutePreload', () => ({
  useRoutePreload: () => {},
}))

vi.mock('@/hooks/useDashboardLayout', () => ({
  useDashboardLayout: () => ({
    orderedWidgets: [],
    moveWidget: vi.fn(),
    resetLayout: vi.fn(),
  }),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_onboarding_complete', 'true')
  // Seed a mood entry so dashboard phase skips check-in
  const today = getLocalDateString()
  localStorage.setItem(
    'wr_mood_entries',
    JSON.stringify([{
      id: 'test-1',
      mood: 4,
      date: today,
      timestamp: Date.now(),
      timeOfDay: 'morning',
    }]),
  )
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

describe('Dashboard EchoCard integration', () => {
  it('renders EchoCard when echo exists', () => {
    mockEchoValue = mockEcho
    renderDashboard()
    expect(screen.getByText('You highlighted this a month ago')).toBeInTheDocument()
    expect(screen.getByText('For God so loved the world')).toBeInTheDocument()
  })

  it('renders nothing when echo is null', () => {
    mockEchoValue = null
    renderDashboard()
    expect(screen.queryByText(/You highlighted this/)).not.toBeInTheDocument()
  })
})
