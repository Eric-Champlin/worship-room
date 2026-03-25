import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { DevotionalTabContent } from '../DevotionalTabContent'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => ({
    totalPoints: 0, currentLevel: 1, levelName: 'Seedling', pointsToNextLevel: 100,
    todayActivities: { mood: false, pray: false, listen: false, prayerWall: false, meditate: false, journal: false, readingPlan: false, gratitude: false, reflection: false, challenge: false, localVisit: false, devotional: false },
    todayPoints: 0, todayMultiplier: 1, currentStreak: 0, longestStreak: 0,
    recordActivity: vi.fn(),
  }),
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

import { useAuth } from '@/hooks/useAuth'
const mockUseAuth = vi.mocked(useAuth)

beforeEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
  mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() })
})

function renderComponent(initialEntry = '/daily?tab=devotional', props: Partial<React.ComponentProps<typeof DevotionalTabContent>> = {}) {
  return render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ToastProvider>
        <AuthModalProvider>
          <DevotionalTabContent
            onSwitchToJournal={props.onSwitchToJournal ?? vi.fn()}
            onSwitchToPray={props.onSwitchToPray ?? vi.fn()}
            onComplete={props.onComplete ?? vi.fn()}
          />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('DevotionalTabContent', () => {
  describe('Rendering', () => {
    it('renders "What\'s On Your Soul?" heading', () => {
      renderComponent()
      expect(screen.getByText('Soul?')).toBeInTheDocument()
      expect(screen.getByText(/What's On Your/)).toBeInTheDocument()
    })

    it('renders devotional title', () => {
      renderComponent()
      const headings = screen.getAllByRole('heading')
      // h2 is the main heading "What's On Your Soul?", h3 is devotional title
      expect(headings.length).toBeGreaterThanOrEqual(2)
    })

    it('renders formatted date', () => {
      renderComponent()
      const today = new Date()
      const formatted = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(screen.getByText(formatted)).toBeInTheDocument()
    })

    it('renders quote section with blockquote', () => {
      renderComponent()
      expect(screen.getByRole('blockquote')).toBeInTheDocument()
    })

    it('renders decorative quotation mark as aria-hidden', () => {
      renderComponent()
      const decorativeQuote = screen.getByText('\u201C')
      expect(decorativeQuote).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders "Closing Prayer" label', () => {
      renderComponent()
      expect(screen.getByText('Closing Prayer')).toBeInTheDocument()
    })

    it('renders reflection question', () => {
      renderComponent()
      expect(screen.getByText('Something to think about today:')).toBeInTheDocument()
    })

    it('renders Share and Read Aloud buttons', () => {
      renderComponent()
      expect(screen.getByText(/Share today/)).toBeInTheDocument()
      expect(screen.getByText('Read aloud')).toBeInTheDocument()
    })
  })

  describe('Date Navigation', () => {
    it('right arrow is disabled when on today', () => {
      renderComponent()
      const nextButton = screen.getByLabelText("Next day's devotional")
      expect(nextButton).toHaveAttribute('aria-disabled', 'true')
      expect(nextButton).toBeDisabled()
    })

    it('left arrow is disabled at day -7', () => {
      renderComponent('/daily?tab=devotional&day=-7')
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).toHaveAttribute('aria-disabled', 'true')
      expect(prevButton).toBeDisabled()
    })

    it('left arrow is enabled when on today', () => {
      renderComponent()
      const prevButton = screen.getByLabelText("Previous day's devotional")
      expect(prevButton).not.toBeDisabled()
    })

    it('browsing to previous day updates content', async () => {
      const user = userEvent.setup()
      renderComponent()
      const prevButton = screen.getByLabelText("Previous day's devotional")
      await user.click(prevButton)
      // Date should now show yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const formatted = yesterday.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      expect(screen.getByText(formatted)).toBeInTheDocument()
    })
  })

  describe('Cross-tab CTAs', () => {
    it('"Journal about this" calls onSwitchToJournal with theme', async () => {
      const onSwitchToJournal = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToJournal })
      await user.click(screen.getByText(/Journal about this/))
      expect(onSwitchToJournal).toHaveBeenCalledTimes(1)
      // Called with a string (the theme)
      expect(typeof onSwitchToJournal.mock.calls[0][0]).toBe('string')
    })

    it('"Pray about today\'s reading" calls onSwitchToPray with passage ref', async () => {
      const onSwitchToPray = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToPray })
      await user.click(screen.getByText(/Pray about today/))
      expect(onSwitchToPray).toHaveBeenCalledTimes(1)
      expect(onSwitchToPray.mock.calls[0][0]).toContain('reflecting on')
    })
  })

  describe('Completion Tracking', () => {
    it('no completion badge for logged-out users', () => {
      renderComponent()
      expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    })

    it('completion badge shows when localStorage has today and user is logged in', () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      const todayStr = new Date().toLocaleDateString('en-CA')
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
      renderComponent()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('completion badge not shown for past days', () => {
      mockUseAuth.mockReturnValue({
        user: { name: 'Eric', id: 'test-id' },
        isAuthenticated: true,
        login: vi.fn(),
        logout: vi.fn(),
      })
      const todayStr = new Date().toLocaleDateString('en-CA')
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
      renderComponent('/daily?tab=devotional&day=-1')
      expect(screen.queryByText('Completed')).not.toBeInTheDocument()
    })
  })
})
