import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock evening time check so tests are time-independent
vi.mock('@/services/evening-reflection-storage', () => ({
  isEveningTime: () => false,
}))
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { useFaithPoints } from '@/hooks/useFaithPoints'
import { getLocalDateString } from '@/utils/date'

// Mock ResizeObserver for Recharts ResponsiveContainer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  // Pin to 9 AM so getTimeOfDay() returns 'morning' — the activity-checklist
  // widget is included in morning order but absent from night order.
  const morning = new Date()
  morning.setHours(9, 0, 0, 0)
  vi.useFakeTimers({ shouldAdvanceTime: true, now: morning })
})

afterEach(() => {
  vi.useRealTimers()
})

// Wrapper component that provides faithPoints from the hook
function GridWithFaithPoints() {
  const faithPoints = useFaithPoints()
  return <DashboardWidgetGrid faithPoints={faithPoints} />
}

function renderWidgetGrid(authenticated = true) {
  if (authenticated) {
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
  }
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <GridWithFaithPoints />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function seedActivities(activities: Record<string, boolean>) {
  const today = getLocalDateString()
  const entry = {
    mood: false,
    pray: false,
    listen: false,
    prayerWall: false,
    readingPlan: false,
    meditate: false,
    journal: false,
    gratitude: false,
    pointsEarned: 0,
    multiplier: 1,
    ...activities,
  }

  // Calculate points
  const points: Record<string, number> = { mood: 5, pray: 10, listen: 10, prayerWall: 15, readingPlan: 15, meditate: 20, journal: 25, gratitude: 5 }
  let total = 0
  for (const [key, val] of Object.entries(activities)) {
    if (val && key in points) total += points[key]
  }
  const completedCount = Object.values(activities).filter(Boolean).length
  let multiplier = 1
  if (completedCount >= 7) multiplier = 2
  else if (completedCount >= 4) multiplier = 1.5
  else if (completedCount >= 2) multiplier = 1.25
  entry.pointsEarned = Math.round(total * multiplier)
  entry.multiplier = multiplier

  localStorage.setItem('wr_daily_activities', JSON.stringify({ [today]: entry }))
  localStorage.setItem('wr_faith_points', JSON.stringify({
    totalPoints: entry.pointsEarned,
    currentLevel: 1,
    currentLevelName: 'Seedling',
    pointsToNextLevel: 100 - entry.pointsEarned,
    lastUpdated: new Date().toISOString(),
  }))
  localStorage.setItem('wr_streak', JSON.stringify({
    currentStreak: completedCount > 0 ? 1 : 0,
    longestStreak: completedCount > 0 ? 1 : 0,
    lastActiveDate: completedCount > 0 ? today : null,
  }))
}

describe('Dashboard widgets integration', () => {
  it('fresh user: shows 0/7, Start your streak, 0 Faith Points, Seedling', () => {
    renderWidgetGrid()
    expect(screen.getByText('0/7')).toBeInTheDocument()
    expect(screen.getByText('A new streak starts today')).toBeInTheDocument()
    expect(screen.getByText('0 Faith Points')).toBeInTheDocument()
    expect(screen.getByText('Seedling')).toBeInTheDocument()
    expect(screen.getByText('Every small step matters.')).toBeInTheDocument()
  })

  it('with 3 activities: shows 3/7, correct multiplier preview', () => {
    seedActivities({ mood: true, pray: true, listen: true })
    renderWidgetGrid()
    expect(screen.getByText('3/7')).toBeInTheDocument()
    expect(screen.getByText('Look at you, making space for what matters.')).toBeInTheDocument()
  })

  it('7/7 complete: shows Full Worship Day message and 2x badge', () => {
    seedActivities({
      mood: true, pray: true, listen: true,
      prayerWall: true, meditate: true, journal: true, gratitude: true,
    })
    renderWidgetGrid()
    expect(screen.getByText('7/7')).toBeInTheDocument()
    expect(screen.getByText('A full day of worship — what a gift.')).toBeInTheDocument()
    expect(screen.getByText('2x bonus today!')).toBeInTheDocument()
  })

  it('Lighthouse level: full progress bar, max level label', () => {
    const today = getLocalDateString()
    localStorage.setItem('wr_auth_simulated', 'true')
    localStorage.setItem('wr_user_name', 'Eric')
    localStorage.setItem('wr_daily_activities', JSON.stringify({
      [today]: {
        mood: true, pray: false, listen: false, prayerWall: false,
        readingPlan: false, meditate: false, journal: false, pointsEarned: 5, multiplier: 1,
      },
    }))
    localStorage.setItem('wr_faith_points', JSON.stringify({
      totalPoints: 12000,
      currentLevel: 6,
      currentLevelName: 'Lighthouse',
      pointsToNextLevel: 0,
      lastUpdated: new Date().toISOString(),
    }))
    localStorage.setItem('wr_streak', JSON.stringify({
      currentStreak: 100,
      longestStreak: 100,
      lastActiveDate: today,
    }))

    renderWidgetGrid()

    expect(screen.getByText('Lighthouse — Max Level')).toBeInTheDocument()
    expect(screen.getByText('12,000 Faith Points')).toBeInTheDocument()
    const progressBar = screen.getByRole('progressbar', { name: /maximum level/i })
    expect(progressBar).toBeInTheDocument()
  })

  it('unauthenticated: shows default state', () => {
    renderWidgetGrid(false)
    expect(screen.getByText('0/7')).toBeInTheDocument()
    expect(screen.getByText('A new streak starts today')).toBeInTheDocument()
    expect(screen.getByText('0 Faith Points')).toBeInTheDocument()
  })
})
