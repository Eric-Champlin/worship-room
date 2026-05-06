import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MonthlyReport } from '@/pages/MonthlyReport'
import { getDefaultMonth } from '@/hooks/useMonthlyReportData'

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

// --- Toast mock ---
const mockShowToast = vi.fn()
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast, showCelebrationToast: vi.fn() }),
  useToastSafe: () => ({ showToast: mockShowToast, showCelebrationToast: vi.fn() }),
}))

// --- Canvas generator mock ---
const mockGenerateMonthlyShareImage = vi.fn().mockResolvedValue(
  new Blob(['test'], { type: 'image/png' }),
)
vi.mock('@/lib/celebration-share-canvas', () => ({
  generateMonthlyShareImage: (...args: unknown[]) => mockGenerateMonthlyShareImage(...args),
}))

// Force reduced motion so count-up resolves instantly
beforeEach(() => {
  localStorage.clear()
  mockAuth.isAuthenticated = true
  mockAuth.user = { name: 'Eric', id: 'test-id' }
  mockShowToast.mockClear()
  mockGenerateMonthlyShareImage.mockClear()
  mockGenerateMonthlyShareImage.mockResolvedValue(new Blob(['test'], { type: 'image/png' }))
  // No Web Share or clipboard in tests
  Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true })
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/insights/monthly']}>
      <MonthlyReport />
    </MemoryRouter>,
  )
}

function seedDefaultMonthData() {
  const { month, year } = getDefaultMonth()
  const date = `${year}-${String(month + 1).padStart(2, '0')}-15`
  localStorage.setItem(
    'wr_mood_entries',
    JSON.stringify([
      {
        id: 'seed-1',
        date,
        mood: 4,
        moodLabel: 'Good',
        text: '',
        timestamp: Date.now(),
        verseSeen: 'Psalm 107:1',
      },
    ]),
  )
}

describe('MonthlyReport — Auth Gate', () => {
  it('redirects unauthenticated users', () => {
    mockAuth.isAuthenticated = false
    const { container } = render(
      <MemoryRouter initialEntries={['/insights/monthly']}>
        <MonthlyReport />
      </MemoryRouter>,
    )
    expect(container.querySelector('header')).toBeNull()
  })

  it('renders for authenticated users', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /monthly report/i })).toBeInTheDocument()
  })
})

describe('MonthlyReport — All Sections', () => {
  it('renders stat cards section', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText('Faith Points')).toBeInTheDocument()
    expect(screen.getByText('vs. last month')).toBeInTheDocument()
  })

  it('renders heatmap section', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText(/at a glance/i)).toBeInTheDocument()
  })

  it('renders activity bar chart section', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText('Your Top Activities')).toBeInTheDocument()
  })

  it('renders highlights section', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText('Longest Streak')).toBeInTheDocument()
    expect(screen.getByText('Badges Earned')).toBeInTheDocument()
    expect(screen.getByText('Best Day')).toBeInTheDocument()
  })

  it('renders AI insight cards section', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText('Monthly Insights')).toBeInTheDocument()
  })

  it('renders share button', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText('Share This Month')).toBeInTheDocument()
  })

  it('renders email preview link', () => {
    seedDefaultMonthData()
    renderPage()
    expect(screen.getByText('Preview Email')).toBeInTheDocument()
  })
})

describe('MonthlyReport — Month Navigation', () => {
  it('renders navigation arrows', () => {
    renderPage()
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument()
    expect(screen.getByLabelText('Next month')).toBeInTheDocument()
  })

  it('next disabled at current month', () => {
    renderPage()
    const now = new Date()
    if (now.getDate() > 5) {
      // Default is current month
      expect(screen.getByLabelText('Next month')).toBeDisabled()
    }
  })

  it('previous month navigation changes title', async () => {
    const user = userEvent.setup()
    renderPage()
    const prevButton = screen.getByLabelText('Previous month')
    if (!prevButton.hasAttribute('disabled')) {
      const navContainer = prevButton.parentElement!
      const titleBefore = navContainer.querySelector('span')!.textContent
      await user.click(prevButton)
      const titleAfter = navContainer.querySelector('span')!.textContent
      // Title should change (different month)
      expect(titleAfter).not.toEqual(titleBefore)
    }
  })
})

describe('MonthlyReport — Share & Email', () => {
  it('share button generates canvas image on click', async () => {
    seedDefaultMonthData()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Share This Month'))

    await waitFor(() => {
      expect(mockGenerateMonthlyShareImage).toHaveBeenCalledWith(
        expect.objectContaining({
          monthName: expect.any(String),
          year: expect.any(Number),
        }),
      )
    })
  })

  it('email preview opens and closes', async () => {
    seedDefaultMonthData()
    const user = userEvent.setup()
    renderPage()
    // Open
    await user.click(screen.getByText('Preview Email'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // Close
    await user.click(screen.getByLabelText('Close email preview'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('MonthlyReport — Empty State (Spec 10B Decision 11)', () => {
  beforeEach(() => {
    // Pin Date only (not setTimeout/setInterval) so userEvent async still works.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('current month with no entries → "This month is just beginning"', () => {
    renderPage()
    expect(screen.getByText('This month is just beginning')).toBeInTheDocument()
    expect(
      screen.getByText('Check back at the end of the month for your report.'),
    ).toBeInTheDocument()
    // Anti-pressure: the explicitly-forbidden "Check in now" CTA must NOT be present
    expect(screen.queryByRole('link', { name: /check in now/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /check in now/i })).toBeNull()
  })

  it('past month with no entries → "No entries yet for {Month Year}"', async () => {
    // Seed a mood entry in March 2026 so getEarliestMonth() returns March, which
    // enables backward navigation. The selected month (April 2026) still has zero
    // entries, exercising the past-month-empty branch.
    localStorage.setItem(
      'wr_mood_entries',
      JSON.stringify([
        {
          id: 'march-seed',
          date: '2026-03-15',
          mood: 4,
          moodLabel: 'Good',
          text: '',
          timestamp: new Date('2026-03-15T12:00:00').getTime(),
          verseSeen: 'Psalm 107:1',
        },
      ]),
    )
    const user = userEvent.setup()
    renderPage()
    // Navigate one month back from the default (May 2026 → April 2026)
    await user.click(screen.getByLabelText('Previous month'))
    expect(screen.getByText('No entries yet for April 2026')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The report will populate as you add mood entries and journal pages.',
      ),
    ).toBeInTheDocument()
  })

  it('month with entries → sections render, FeatureEmptyState absent', () => {
    seedDefaultMonthData()
    renderPage()
    // Sections render (canonical text from MonthlyStatCards / MonthlyHighlights)
    expect(screen.getByText('Faith Points')).toBeInTheDocument()
    expect(screen.getByText('Longest Streak')).toBeInTheDocument()
    // Empty-state copy must be absent
    expect(
      screen.queryByText('This month is just beginning'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/^No entries yet for /),
    ).not.toBeInTheDocument()
  })

  it('MonthlyShareButton hidden when hasData=false', () => {
    renderPage()
    expect(screen.queryByText('Share This Month')).not.toBeInTheDocument()
    expect(screen.queryByText('Preview Email')).not.toBeInTheDocument()
  })
})

describe('MonthlyReport — Misc', () => {
  it('breadcrumb with Insights trail replaces back link', () => {
    renderPage()
    // Back link removed
    expect(screen.queryByText('Mood Insights')).not.toBeInTheDocument()
    // Breadcrumb present
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    const link = nav.querySelector('a[href="/insights"]')
    expect(link).toHaveTextContent('Insights')
    const current = nav.querySelector('[aria-current="page"]')
    expect(current).toHaveTextContent('Monthly Report')
  })

  it('has reduced motion classes', () => {
    seedDefaultMonthData()
    const { container } = renderPage()
    const reduced = container.querySelectorAll('.motion-reduce\\:animate-none')
    // main container + 6 AnimatedSections = 7
    expect(reduced.length).toBeGreaterThanOrEqual(7)
  })

  it('has responsive grid classes for stat cards', () => {
    seedDefaultMonthData()
    const { container } = renderPage()
    const statGrid = container.querySelector('.grid-cols-2.sm\\:grid-cols-4')
    expect(statGrid).toBeInTheDocument()
  })

  it('has responsive grid classes for highlights', () => {
    seedDefaultMonthData()
    const { container } = renderPage()
    const highlightGrid = container.querySelector('.grid-cols-1.md\\:grid-cols-3')
    expect(highlightGrid).toBeInTheDocument()
  })

  it('skip-to-content link present (via Navbar)', () => {
    renderPage()
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toHaveAttribute('href', '#main-content')
  })
})
