import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MonthlyReport } from '@/pages/MonthlyReport'

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

// Force reduced motion so count-up resolves instantly
beforeEach(() => {
  localStorage.clear()
  mockAuth.isAuthenticated = true
  mockAuth.user = { name: 'Eric', id: 'test-id' }
  mockShowToast.mockClear()
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
    expect(screen.getByText(/faith journey/i)).toBeInTheDocument()
  })
})

describe('MonthlyReport — All Sections', () => {
  it('renders stat cards section', () => {
    renderPage()
    // Mock data: 24 days active, 1847 points
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('1,847')).toBeInTheDocument()
    expect(screen.getByText('Faith Points')).toBeInTheDocument()
  })

  it('renders heatmap section', () => {
    renderPage()
    expect(screen.getByText(/at a glance/i)).toBeInTheDocument()
  })

  it('renders activity bar chart section', () => {
    renderPage()
    expect(screen.getByText('Your Top Activities')).toBeInTheDocument()
  })

  it('renders highlights section', () => {
    renderPage()
    expect(screen.getByText('Longest Streak')).toBeInTheDocument()
    expect(screen.getByText('Badges Earned')).toBeInTheDocument()
    expect(screen.getByText('Best Day')).toBeInTheDocument()
  })

  it('renders AI insight cards section', () => {
    renderPage()
    expect(screen.getByText('Monthly Insights')).toBeInTheDocument()
  })

  it('renders share button', () => {
    renderPage()
    expect(screen.getByText('Share Your Month')).toBeInTheDocument()
  })

  it('renders email preview link', () => {
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
      const titleBefore = screen.getByText(/faith journey/i).textContent
      await user.click(prevButton)
      const titleAfter = screen.getByText(/faith journey/i).textContent
      // Title should change (different month)
      expect(titleAfter).not.toEqual(titleBefore)
    }
  })
})

describe('MonthlyReport — Share & Email', () => {
  it('share button triggers toast', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByText('Share Your Month'))
    expect(mockShowToast).toHaveBeenCalledWith(
      "Sharing is coming soon! We're working on beautiful shareable cards for your faith journey.",
      'success',
    )
  })

  it('email preview opens and closes', async () => {
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

describe('MonthlyReport — Empty State & Misc', () => {
  it('renders with empty localStorage (mock data, no crashes)', () => {
    renderPage()
    // All sections render with mock data
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('3 badges')).toBeInTheDocument()
  })

  it('back link points to /insights', () => {
    renderPage()
    const backLink = screen.getByText('Mood Insights')
    expect(backLink.closest('a')).toHaveAttribute('href', '/insights')
  })

  it('has reduced motion classes', () => {
    const { container } = renderPage()
    const reduced = container.querySelectorAll('.motion-reduce\\:animate-none')
    // main container + 6 AnimatedSections = 7
    expect(reduced.length).toBeGreaterThanOrEqual(7)
  })

  it('has responsive grid classes for stat cards', () => {
    const { container } = renderPage()
    const statGrid = container.querySelector('.grid-cols-2.sm\\:grid-cols-4')
    expect(statGrid).toBeInTheDocument()
  })

  it('has responsive grid classes for highlights', () => {
    const { container } = renderPage()
    const highlightGrid = container.querySelector('.grid-cols-1.md\\:grid-cols-3')
    expect(highlightGrid).toBeInTheDocument()
  })

  it('skip-to-content link present', () => {
    renderPage()
    const skipLink = screen.getByText('Skip to content')
    expect(skipLink).toHaveAttribute('href', '#monthly-report-content')
  })
})
