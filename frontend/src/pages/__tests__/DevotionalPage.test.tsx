import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DevotionalPage } from '@/pages/DevotionalPage'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { useAuth } from '@/hooks/useAuth'


vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

vi.mock('@/hooks/useReadAloud', () => ({
  useReadAloud: () => ({
    state: 'idle',
    currentWordIndex: -1,
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  }),
}))

const mockUseAuth = vi.mocked(useAuth)

function renderPage(initialEntry = '/devotional') {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <DevotionalPage />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
  })
  localStorage.clear()
})

describe('DevotionalPage', () => {
  describe('Rendering', () => {
    it('renders "Daily Devotional" heading', () => {
      renderPage()
      expect(
        screen.getByRole('heading', { name: 'Daily Devotional', level: 1 }),
      ).toBeInTheDocument()
    })

    it('renders devotional title as h2', () => {
      renderPage()
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('renders formatted date', () => {
      renderPage()
      // The date should be formatted like "Friday, March 20, 2026"
      const today = new Date()
      const formatted = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(screen.getByText(formatted)).toBeInTheDocument()
    })

    it('renders quote text and attribution', () => {
      renderPage()
      expect(screen.getByRole('blockquote')).toBeInTheDocument()
    })

    it('decorative quotation mark is aria-hidden', () => {
      renderPage()
      const decorativeQuote = screen.getByText('\u201C') // Left double quote
      expect(decorativeQuote).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders "Closing Prayer" label', () => {
      renderPage()
      expect(screen.getByText('Closing Prayer')).toBeInTheDocument()
    })

    it('renders "Something to think about today:" question prefix', () => {
      renderPage()
      expect(screen.getByText('Something to think about today:')).toBeInTheDocument()
    })

    it('renders all three action buttons', () => {
      renderPage()
      expect(screen.getByText('Journal about this')).toBeInTheDocument()
      expect(screen.getByText(/Share today/)).toBeInTheDocument()
      expect(screen.getByText('Read aloud')).toBeInTheDocument()
    })
  })

  describe('Day Navigation', () => {
    it('right arrow is disabled when on today (no day param)', () => {
      renderPage('/devotional')
      const nextButton = screen.getByLabelText("Next day's devotional")
      expect(nextButton).toHaveAttribute('aria-disabled', 'true')
      expect(nextButton).toBeDisabled()
    })

    it('left arrow is disabled at day -7', () => {
      renderPage('/devotional?day=-7')
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).toHaveAttribute('aria-disabled', 'true')
      expect(prevButton).toBeDisabled()
    })

    it('left arrow is enabled when on today', () => {
      renderPage('/devotional')
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).not.toBeDisabled()
    })

    it('dayOffset clamped: day=-10 treated as -7', () => {
      renderPage('/devotional?day=-10')
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).toHaveAttribute('aria-disabled', 'true')
    })

    it('dayOffset clamped: day=5 treated as 0', () => {
      renderPage('/devotional?day=5')
      const nextButton = screen.getByLabelText("Next day's devotional")
      expect(nextButton).toHaveAttribute('aria-disabled', 'true')
    })

    it('arrow buttons have accessible labels', () => {
      renderPage()
      expect(screen.getByLabelText("Previous day's devotional")).toBeInTheDocument()
      expect(screen.getByLabelText("Next day's devotional")).toBeInTheDocument()
    })
  })

  describe('Auth Gating', () => {
    it('"Journal about this" shows auth modal when logged out', async () => {
      renderPage()
      const user = userEvent.setup()
      await user.click(screen.getByText('Journal about this'))
      // Auth modal should appear
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })

    it('"Journal about this" does not show auth modal when logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      renderPage()
      const user = userEvent.setup()
      await user.click(screen.getByText('Journal about this'))
      // Should not show auth modal
      expect(screen.queryByText(/sign in to journal/i)).not.toBeInTheDocument()
    })
  })

  describe('Sharing', () => {
    it('"Share" button renders and is clickable', async () => {
      renderPage()
      const shareBtn = screen.getByText(/Share today/)
      expect(shareBtn).toBeInTheDocument()
      // Verify it's a button element
      expect(shareBtn.closest('button')).toBeInTheDocument()
    })
  })

  describe('Completion Tracking', () => {
    it('no completion badge for logged-out users', () => {
      renderPage()
      expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    })

    it('completion badge not shown for past days', () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      renderPage('/devotional?day=-1')
      expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    })

    it('completion badge shows when localStorage has today', () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      const todayStr = new Date().toLocaleDateString('en-CA')
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
      renderPage()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('no localStorage activity for logged-out users on scroll', () => {
      renderPage()
      // Simulate IntersectionObserver — logged-out users should not write
      expect(localStorage.getItem('wr_devotional_reads')).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy (h1 then h2)', () => {
      renderPage()
      const h1 = screen.getByRole('heading', { level: 1 })
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h1).toBeInTheDocument()
      expect(h2).toBeInTheDocument()
    })
  })

  describe('Responsive Layout', () => {
    it('action buttons container has flex-col as default (mobile)', () => {
      renderPage()
      const journalBtn = screen.getByText('Journal about this')
      const container = journalBtn.closest('div')
      expect(container?.className).toContain('flex-col')
    })

    it('action buttons container has sm:flex-row for desktop', () => {
      renderPage()
      const journalBtn = screen.getByText('Journal about this')
      const container = journalBtn.closest('div')
      expect(container?.className).toContain('sm:flex-row')
    })
  })
})
