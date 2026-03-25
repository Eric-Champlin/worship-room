import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock evening time check so tests are time-independent
vi.mock('@/services/evening-reflection-storage', () => ({
  isEveningTime: () => false,
}))
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { useFaithPoints } from '@/hooks/useFaithPoints'
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

// Wrapper component that provides faithPoints from the hook
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
  it('renders all widget cards (5 base + weekly recap when visible)', () => {
    renderGrid()
    const sections = screen.getAllByRole('region')
    // 5 base cards + WeeklyRecap card (shown when no friends = CTA state)
    expect(sections.length).toBeGreaterThanOrEqual(5)
  })

  it('renders StreakCard in streak-points card', () => {
    renderGrid()
    expect(screen.getByText('A new streak starts today')).toBeInTheDocument()
    expect(screen.getByText('0 Faith Points')).toBeInTheDocument()
  })

  it('renders ActivityChecklist in activity-checklist card', () => {
    renderGrid()
    expect(screen.getByText('0/7')).toBeInTheDocument()
    expect(screen.getByText('Log your mood')).toBeInTheDocument()
  })

  it('friends-preview card shows FriendsPreview widget', () => {
    renderGrid()
    // Mock data auto-seeds 10 friends; preview shows top 3 by lastActive
    // Joshua B. (15m ago), Maria L. (30m ago), Grace H. (1h ago)
    expect(screen.getByText('Joshua B.')).toBeInTheDocument()
    expect(screen.getByText('Maria L.')).toBeInTheDocument()
    expect(screen.getByText('Grace H.')).toBeInTheDocument()
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

    const collapseButtons = screen.getAllByRole('button', { name: /collapse/i })
    await user.click(collapseButtons[0])

    unmount()
    renderGrid()

    const expandButtons = screen.getAllByRole('button', { name: /expand/i })
    expect(expandButtons.length).toBeGreaterThanOrEqual(1)
  })
})
