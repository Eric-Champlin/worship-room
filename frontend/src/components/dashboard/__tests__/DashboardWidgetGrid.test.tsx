import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, beforeEach } from 'vitest'
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
})

function renderGrid() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <DashboardWidgetGrid />
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

  it('mood chart card no longer shows "Coming in Spec 3"', () => {
    renderGrid()
    expect(screen.queryByText('Coming in Spec 3')).not.toBeInTheDocument()
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

  it('other placeholder cards unchanged', () => {
    renderGrid()
    expect(screen.getAllByText('Coming in Spec 6')).toHaveLength(2)
    expect(screen.getByText('Coming in Spec 9')).toBeInTheDocument()
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
