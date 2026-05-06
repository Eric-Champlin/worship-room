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
    expect(screen.getByText('Your story is just beginning.')).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { level: 2, name: 'Insights' })).toBeInTheDocument()
    // Activity correlations
    expect(screen.getByText('Activity & Mood')).toBeInTheDocument()
    // Scripture connections
    expect(screen.getByText('Scriptures That Spoke to You')).toBeInTheDocument()
  })

  it('all sections show empty states when no data', () => {
    renderInsights()

    // Zero-data empty state replaces charts
    expect(
      screen.getByText('Your story is just beginning'),
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
    // 10 sections when no data: empty state + insight cards + correlations + gratitude correlation + community connections + gratitude streak + scripture + prayer life + meditation history + monthly link
    expect(animatedSections.length).toBe(10)
  })

  it('time range change updates heatmap and chart', async () => {
    seedEntries([
      makeMoodEntry({ date: daysAgo(0), mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: daysAgo(1), mood: 3, moodLabel: 'Okay' }),
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

  it('renders GratitudeCorrelationCard in insights layout', () => {
    // Seed 5 days of both mood and gratitude data
    const moods = Array.from({ length: 5 }, (_, i) =>
      makeMoodEntry({ date: daysAgo(i), mood: 4, moodLabel: 'Good' }),
    )
    seedEntries(moods)
    const gratitude = Array.from({ length: 5 }, (_, i) => ({
      id: `grat-${i}`,
      date: daysAgo(i),
      items: ['Thankful'],
      createdAt: new Date().toISOString(),
    }))
    localStorage.setItem('wr_gratitude_entries', JSON.stringify(gratitude))

    renderInsights()
    expect(screen.getByLabelText('Gratitude and mood correlation')).toBeInTheDocument()
  })
})

describe('Insights — narrative subtitle (Spec 10B Decision 13)', () => {
  it('zero entries → "Your story is just beginning."', () => {
    renderInsights()
    expect(
      screen.getByText('Your story is just beginning.'),
    ).toBeInTheDocument()
  })

  it('recent entry (≤14 days) → "Your story so far."', () => {
    const recentTs = Date.now() - 1 * 24 * 60 * 60 * 1000 // 1 day ago
    seedEntries([makeMoodEntry({ timestamp: recentTs, date: daysAgo(1) })])
    renderInsights()
    expect(screen.getByText('Your story so far.')).toBeInTheDocument()
    expect(
      screen.queryByText('Welcome back. Your story continues.'),
    ).not.toBeInTheDocument()
  })

  it('returning after gap (>14 days since most recent entry) → "Welcome back. ..."', () => {
    const oldTs = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
    seedEntries([makeMoodEntry({ timestamp: oldTs, date: daysAgo(30) })])
    renderInsights()
    expect(
      screen.getByText('Welcome back. Your story continues.'),
    ).toBeInTheDocument()
  })

  it('uses MOST RECENT entry, not first/last array position (storage-order independent)', () => {
    // Storage layer uses unshift (newest first), but reading code MUST NOT
    // assume that — sort by timestamp explicitly. Seed with two entries where
    // the most recent timestamp is recent (≤14d) but an older entry sits at
    // entries[entries.length - 1]. The previous bug returned "Welcome back".
    const recentTs = Date.now() - 2 * 24 * 60 * 60 * 1000
    const oldTs = Date.now() - 365 * 24 * 60 * 60 * 1000
    seedEntries([
      makeMoodEntry({ id: 'recent', timestamp: recentTs, date: daysAgo(2) }),
      makeMoodEntry({ id: 'old', timestamp: oldTs, date: daysAgo(365) }),
    ])
    renderInsights()
    expect(screen.getByText('Your story so far.')).toBeInTheDocument()
  })

  it('malformed timestamp falls back to "Your story so far."', () => {
    seedEntries([
      makeMoodEntry({ timestamp: NaN as unknown as number, date: daysAgo(0) }),
    ])
    renderInsights()
    expect(screen.getByText('Your story so far.')).toBeInTheDocument()
  })
})

describe('Insights — time-of-day greeting (Spec 10B Decision 13)', () => {
  beforeEach(() => {
    // Pin Date only (not setTimeout/setInterval) so userEvent + Recharts still work.
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setHour(hour: number) {
    const d = new Date()
    d.setHours(hour, 0, 0, 0)
    vi.setSystemTime(d)
  }

  it('hour < 12 → "Good Morning, {name}!"', () => {
    setHour(9)
    renderInsights()
    expect(screen.getByText('Good Morning, Eric!')).toBeInTheDocument()
  })

  it('hour 11 (boundary) → still morning', () => {
    setHour(11)
    renderInsights()
    expect(screen.getByText('Good Morning, Eric!')).toBeInTheDocument()
  })

  it('hour 12 (boundary) → afternoon', () => {
    setHour(12)
    renderInsights()
    expect(screen.getByText('Good Afternoon, Eric!')).toBeInTheDocument()
  })

  it('12 ≤ hour < 17 → "Good Afternoon, {name}!"', () => {
    setHour(15)
    renderInsights()
    expect(screen.getByText('Good Afternoon, Eric!')).toBeInTheDocument()
  })

  it('hour 16 (boundary) → afternoon', () => {
    setHour(16)
    renderInsights()
    expect(screen.getByText('Good Afternoon, Eric!')).toBeInTheDocument()
  })

  it('hour 17 (boundary) → evening', () => {
    setHour(17)
    renderInsights()
    expect(screen.getByText('Good Evening, Eric!')).toBeInTheDocument()
  })

  it('hour ≥ 17 → "Good Evening, {name}!"', () => {
    setHour(20)
    renderInsights()
    expect(screen.getByText('Good Evening, Eric!')).toBeInTheDocument()
  })

  it('falls back without name when user.name is absent (defensive)', () => {
    setHour(9)
    mockAuth.user = null as unknown as typeof mockAuth.user
    // Auth-gated route — but if user is somehow null while authenticated,
    // greeting should still render gracefully.
    mockAuth.isAuthenticated = true
    renderInsights()
    expect(screen.getByText('Good Morning!')).toBeInTheDocument()
  })
})

describe('Insights — TimeRangePills active-state (Spec 10A pattern, Spec 10B Decision 2)', () => {
  it('selected pill uses muted-white pattern (bg-white/15, text-white, border-white/30)', () => {
    renderInsights()
    const radiogroup = screen.getByRole('radiogroup')
    const pill30d = within(radiogroup).getByRole('radio', { name: '30d' })
    const cls = pill30d.className
    expect(cls).toContain('bg-white/15')
    expect(cls).toContain('text-white')
    expect(cls).toContain('border-white/30')
    // Deprecated violet active-state must be gone
    expect(cls).not.toContain('bg-primary/20')
    expect(cls).not.toContain('text-primary-lt')
  })

  it('inactive pill chrome preserved (bg-white/10, text-white/60)', () => {
    renderInsights()
    const radiogroup = screen.getByRole('radiogroup')
    const pill90d = within(radiogroup).getByRole('radio', { name: '90d' })
    const cls = pill90d.className
    expect(cls).toContain('bg-white/10')
    expect(cls).toContain('text-white/60')
  })
})
