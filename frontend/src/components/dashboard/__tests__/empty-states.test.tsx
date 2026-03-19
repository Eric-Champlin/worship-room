import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { useFaithPoints } from '@/hooks/useFaithPoints'

// Mock ResizeObserver for Recharts ResponsiveContainer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
  // Seed empty friends data so FriendsPreview shows empty state (otherwise mock data auto-initializes)
  localStorage.setItem('wr_friends', JSON.stringify({
    friends: [],
    pendingIncoming: [],
    pendingOutgoing: [],
    blocked: [],
  }))
})

function GridWithFaithPoints() {
  const faithPoints = useFaithPoints()
  return <DashboardWidgetGrid faithPoints={faithPoints} />
}

function renderGrid() {
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

describe('Empty States — New User Dashboard', () => {
  it('shows mood chart empty state with ghost chart', () => {
    renderGrid()
    expect(screen.getByText('Your mood journey starts today')).toBeInTheDocument()
  })

  it('ghosted chart preview is aria-hidden', () => {
    const { container } = renderGrid()
    const ghosted = container.querySelector('.opacity-\\[0\\.15\\]')
    expect(ghosted).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows streak encouragement for day 0', () => {
    renderGrid()
    expect(screen.getByText('A new streak starts today')).toBeInTheDocument()
  })

  it('shows "A new day" message when all activities unchecked', () => {
    renderGrid()
    expect(screen.getByText('A new day, a new opportunity to grow')).toBeInTheDocument()
  })

  it('shows friends empty state with circle network', () => {
    renderGrid()
    expect(screen.getByText('Faith grows stronger together')).toBeInTheDocument()
  })

  it('shows "You vs. Yesterday" in friends preview', () => {
    renderGrid()
    expect(screen.getByText('You vs. Yesterday')).toBeInTheDocument()
  })

  it('empty state text is not aria-hidden (screen-reader accessible)', () => {
    renderGrid()
    const emptyTexts = [
      screen.getByText('Your mood journey starts today'),
      screen.getByText('A new streak starts today'),
      screen.getByText('A new day, a new opportunity to grow'),
      screen.getByText('Faith grows stronger together'),
    ]
    emptyTexts.forEach((el) => {
      expect(el.closest('[aria-hidden="true"]')).toBeNull()
    })
  })

  it('mood chart "Check in now" CTA shows when onRequestCheckIn provided', () => {
    const onRequestCheckIn = () => {}
    const faithPoints = {
      totalPoints: 0, currentLevel: 1, levelName: 'Seedling',
      pointsToNextLevel: 100, todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false },
      todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
      newlyEarnedBadges: [], clearNewlyEarnedBadges: () => {},
      recordActivity: () => {}, repairStreak: () => {},
      previousStreak: null, isFreeRepairAvailable: false,
    }

    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ToastProvider>
            <DashboardWidgetGrid faithPoints={faithPoints} onRequestCheckIn={onRequestCheckIn} />
          </ToastProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Check in now')).toBeInTheDocument()
  })
})
