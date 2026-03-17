import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthProvider } from '@/contexts/AuthContext'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

// Mock ResizeObserver for Recharts ResponsiveContainer
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

beforeEach(() => {
  localStorage.clear()
  // Simulate authenticated state for dashboard
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'Eric')
})

function renderGrid() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <DashboardWidgetGrid />
      </AuthProvider>
    </MemoryRouter>,
  )
}

function seedMoodEntries() {
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

describe('DashboardWidgetGrid', () => {
  it('renders all 5 widget cards', () => {
    renderGrid()
    const sections = screen.getAllByRole('region')
    expect(sections.length).toBe(5)
  })

  it('renders StreakCard in streak-points card', () => {
    renderGrid()
    // StreakCard renders streak message and level
    expect(screen.getByText('Start your streak today')).toBeInTheDocument()
    expect(screen.getByText('0 Faith Points')).toBeInTheDocument()
  })

  it('renders ActivityChecklist in activity-checklist card', () => {
    renderGrid()
    // ActivityChecklist renders progress ring and activity names
    expect(screen.getByText('0/6')).toBeInTheDocument()
    expect(screen.getByText('Log your mood')).toBeInTheDocument()
  })

  it('friends-preview card still shows placeholder', () => {
    renderGrid()
    expect(screen.getByText('Coming in Spec 9')).toBeInTheDocument()
  })

  it('mood chart card renders MoodChart component (empty state)', () => {
    renderGrid()
    expect(
      screen.getByText('Your mood journey starts today'),
    ).toBeInTheDocument()
  })

  it('mood chart card renders MoodChart with data', () => {
    seedMoodEntries()
    renderGrid()
    expect(
      screen.getByRole('img', { name: /your mood over the last 7 days/i }),
    ).toBeInTheDocument()
  })

  it('"See More" link still present in mood chart card header', () => {
    renderGrid()
    expect(screen.getByText('See More')).toBeInTheDocument()
  })

  it('collapse persists across unmount/remount', async () => {
    const user = userEvent.setup()
    const { unmount } = renderGrid()

    // Collapse the first card (mood chart)
    const collapseButtons = screen.getAllByRole('button', { name: /collapse/i })
    await user.click(collapseButtons[0])

    unmount()
    renderGrid()

    // First card's collapse button should show "Expand" now
    const expandButtons = screen.getAllByRole('button', { name: /expand/i })
    expect(expandButtons.length).toBeGreaterThanOrEqual(1)
  })
})
