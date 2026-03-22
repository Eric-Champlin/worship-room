import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Insights } from '@/pages/Insights'
import { getLocalDateString } from '@/utils/date'
import type { MoodEntry } from '@/types/dashboard'

// --- Mock IntersectionObserver ---
class IntersectionObserverMock {
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver

// --- Mock ResizeObserver for Recharts ---
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver

// --- Auth mock setup ---
const mockAuth = {
  user: { name: 'Eric', id: 'test-id' },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuth,
}))

beforeEach(() => {
  localStorage.clear()
  mockAuth.isAuthenticated = true
  mockAuth.user = { name: 'Eric', id: 'test-id' }
})

afterEach(() => {
  vi.restoreAllMocks()
})

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function makeMoodEntry(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: `test-${Math.random()}`,
    date: getLocalDateString(),
    mood: 4,
    moodLabel: 'Good',
    text: '',
    timestamp: Date.now(),
    verseSeen: 'Psalm 107:1',
    ...overrides,
  }
}

function seedEntries(entries: MoodEntry[]) {
  localStorage.setItem('wr_mood_entries', JSON.stringify(entries))
}

function renderInsights() {
  return render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Insights />
    </MemoryRouter>,
  )
}

describe('Insights — auth & shell', () => {
  it('redirects to / when not authenticated', () => {
    mockAuth.isAuthenticated = false
    mockAuth.user = null as unknown as typeof mockAuth.user
    const { container } = renderInsights()
    expect(screen.queryByText('Mood Insights')).not.toBeInTheDocument()
    expect(container.innerHTML).toBe('')
  })

  it('renders page title when authenticated', () => {
    renderInsights()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Mood Insights' }),
    ).toBeInTheDocument()
  })

  it('renders subtitle text', () => {
    renderInsights()
    expect(screen.getByText('Reflect on your journey')).toBeInTheDocument()
  })

  it('renders all 5 time range pills', () => {
    renderInsights()
    const radiogroup = screen.getByRole('radiogroup')
    const pills = within(radiogroup).getAllByRole('radio')
    expect(pills).toHaveLength(5)
  })

  it('30d is selected by default', () => {
    renderInsights()
    const radiogroup = screen.getByRole('radiogroup')
    const pill30d = within(radiogroup).getByRole('radio', { name: '30d' })
    expect(pill30d).toHaveAttribute('aria-checked', 'true')
  })

  it('clicking a pill updates selection', async () => {
    const user = userEvent.setup()
    renderInsights()
    const radiogroup = screen.getByRole('radiogroup')
    const pill90d = within(radiogroup).getByRole('radio', { name: '90d' })
    await user.click(pill90d)
    expect(pill90d).toHaveAttribute('aria-checked', 'true')
  })

  it('pills use radiogroup role', () => {
    renderInsights()
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('keyboard navigation between pills', async () => {
    const user = userEvent.setup()
    renderInsights()
    const radiogroup = screen.getByRole('radiogroup')
    const pill30d = within(radiogroup).getByRole('radio', { name: '30d' })
    pill30d.focus()
    await user.keyboard('{ArrowRight}')
    const pill90d = within(radiogroup).getByRole('radio', { name: '90d' })
    expect(pill90d).toHaveAttribute('aria-checked', 'true')
    expect(pill90d).toHaveFocus()
  })

  it('back link navigates to dashboard', () => {
    renderInsights()
    const link = screen.getByRole('link', { name: /dashboard/i })
    expect(link).toHaveAttribute('href', '/')
  })
})

describe('Insights — full page integration', () => {
  it('all 5 sections render in correct order with data', () => {
    seedEntries([
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: daysAgo(1), mood: 3, moodLabel: 'Okay' }),
    ])
    renderInsights()

    // Heatmap
    expect(screen.getByText('Your Mood Calendar')).toBeInTheDocument()
    // Trend chart
    expect(screen.getByText('Mood Over Time')).toBeInTheDocument()
    // Insight cards
    expect(screen.getByText('Insights')).toBeInTheDocument()
    // Activity correlations
    expect(screen.getByText('Activity & Mood')).toBeInTheDocument()
    // Scripture connections
    expect(screen.getByText('Scriptures That Spoke to You')).toBeInTheDocument()
  })

  it('all sections show empty states when no data', () => {
    renderInsights()

    // Zero-data empty state replaces charts
    expect(
      screen.getByText('Start checking in to unlock your mood insights'),
    ).toBeInTheDocument()
    // Insight cards empty
    expect(
      screen.getByText(/start checking in to see your insights grow/i),
    ).toBeInTheDocument()
    // Activity correlations empty
    expect(
      screen.getByText(/check in for a few days/i),
    ).toBeInTheDocument()
    // Scripture connections empty
    expect(
      screen.getByText(/as you check in and read scripture/i),
    ).toBeInTheDocument()
  })

  it('reduced motion: sections have motion-reduce classes', () => {
    const { container } = renderInsights()
    const animatedSections = container.querySelectorAll('.motion-reduce\\:animate-none')
    // 7 sections when no data: empty state + insight cards + correlations + gratitude streak + scripture + meditation history + monthly link
    expect(animatedSections.length).toBe(7)
  })

  it('time range change updates heatmap and chart', async () => {
    seedEntries([
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
    ])
    const user = userEvent.setup()
    renderInsights()

    const radiogroup = screen.getByRole('radiogroup')
    const pill90d = within(radiogroup).getByRole('radio', { name: '90d' })
    await user.click(pill90d)

    // Page should still render after range change
    expect(screen.getByText('Your Mood Calendar')).toBeInTheDocument()
    expect(screen.getByText('Mood Over Time')).toBeInTheDocument()
  })
})
