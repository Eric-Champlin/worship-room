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

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
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
    it('uses max-w-4xl container width', () => {
      const { container } = renderComponent()
      const maxWEl = container.querySelector('.max-w-4xl') as HTMLElement
      expect(maxWEl).not.toBeNull()
      expect(maxWEl.className).not.toContain('max-w-2xl')
    })

    it('renders devotional title as primary heading', () => {
      renderComponent()
      const headings = screen.getAllByRole('heading')
      // Only the devotional title heading remains (h3)
      expect(headings.length).toBeGreaterThanOrEqual(1)
      expect(headings[0].textContent).toBeTruthy()
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

    it('Closing Prayer label uses text-white/60 opacity', () => {
      renderComponent()
      const label = screen.getByText('Closing Prayer')
      expect(label.className).toContain('text-white/60')
      expect(label.className).not.toContain('text-white/50')
    })

    it('Closing Prayer label preserves typography classes', () => {
      renderComponent()
      const label = screen.getByText('Closing Prayer')
      expect(label.className).toContain('mb-2')
      expect(label.className).toContain('text-xs')
      expect(label.className).toContain('font-medium')
      expect(label.className).toContain('uppercase')
      expect(label.className).toContain('tracking-widest')
    })

    it('Closing Prayer label matches prayer body opacity (text-white/60)', () => {
      renderComponent()
      const label = screen.getByText('Closing Prayer')
      const prayerBody = label.nextElementSibling as HTMLElement
      expect(prayerBody).not.toBeNull()
      expect(prayerBody.tagName).toBe('P')
      expect(prayerBody.className).toContain('text-white/60')
      expect(label.className).toContain('text-white/60')
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
    it('"Journal about this" calls onSwitchToJournal with theme and stripped reflection question', async () => {
      const onSwitchToJournal = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToJournal })
      await user.click(screen.getByText(/Journal about this/))
      expect(onSwitchToJournal).toHaveBeenCalledTimes(1)
      // First arg: theme (string)
      expect(typeof onSwitchToJournal.mock.calls[0][0]).toBe('string')
      // Second arg: stripped reflection question (no "Something to think about today: " prefix)
      const customPrompt = onSwitchToJournal.mock.calls[0][1] as string
      expect(typeof customPrompt).toBe('string')
      expect(customPrompt).not.toContain('Something to think about today: ')
      expect(customPrompt.length).toBeGreaterThan(0)
    })

    it('"Pray about today\'s reading" calls onSwitchToPray with theme and combined context', async () => {
      const onSwitchToPray = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToPray })
      await user.click(screen.getByText(/Pray about today/))
      expect(onSwitchToPray).toHaveBeenCalledTimes(1)
      // First arg: theme
      expect(typeof onSwitchToPray.mock.calls[0][0]).toBe('string')
      // Second arg: combined passage reference + stripped reflection question
      const customPrompt = onSwitchToPray.mock.calls[0][1] as string
      expect(customPrompt).toContain('reflecting on')
      expect(customPrompt).not.toContain('Something to think about today: ')
    })

    it('stripReflectionPrefix strips known prefix from reflection question', async () => {
      const onSwitchToJournal = vi.fn()
      const user = userEvent.setup()
      renderComponent('/daily?tab=devotional', { onSwitchToJournal })
      await user.click(screen.getByText(/Journal about this/))
      const customPrompt = onSwitchToJournal.mock.calls[0][1] as string
      // The stripped question should start with an uppercase letter (the actual question)
      expect(customPrompt[0]).toBe(customPrompt[0].toUpperCase())
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

  describe('Verse linking', () => {
    it('devotional passage reference is a link', () => {
      renderComponent()
      // The passage reference should be rendered as a link (via VerseLink)
      const links = screen.getAllByRole('link')
      const verseLink = links.find((l) => l.getAttribute('href')?.startsWith('/bible/'))
      expect(verseLink).toBeDefined()
    })

    it('devotional link has correct styling', () => {
      renderComponent()
      const links = screen.getAllByRole('link')
      const verseLink = links.find((l) => l.getAttribute('href')?.startsWith('/bible/'))
      expect(verseLink?.className).toContain('text-primary-lt')
    })
  })

  describe('Visual atmosphere', () => {
    it('wraps content in GlowBackground with glow orb', () => {
      renderComponent()
      expect(screen.getByTestId('glow-orb')).toBeInTheDocument()
    })

    it('reflection question card has frosted glass styling with purple border', () => {
      renderComponent()
      const questionText = screen.getByText(/Something to think about today/)
      const card = questionText.closest('[class*="backdrop-blur"]') as HTMLElement
      expect(card).not.toBeNull()
      expect(card!.className).toContain('border-l-primary')
    })

    it('action buttons have frosted glass styling', () => {
      renderComponent()
      const shareBtn = screen.getByRole('button', { name: /Share today/i })
      expect(shareBtn.className).toContain('rounded-xl')
      expect(shareBtn.className).toContain('backdrop-blur-sm')
    })

    it('does not render BackgroundSquiggle', () => {
      const { container } = renderComponent()
      // No squiggle SVG with mask-style should be present in the component
      expect(container.querySelector('[aria-hidden="true"][style*="mask"]')).toBeNull()
    })

    it('quote section has frosted glass styling', () => {
      renderComponent()
      const blockquote = screen.getByRole('blockquote')
      const card = blockquote.closest('[class*="backdrop-blur"]') as HTMLElement
      expect(card).not.toBeNull()
      expect(card!.className).toContain('bg-white/[0.06]')
    })

    it('section dividers use border-white/[0.08]', () => {
      const { container } = renderComponent()
      const dividers = container.querySelectorAll('.border-white\\/\\[0\\.08\\]')
      expect(dividers.length).toBeGreaterThanOrEqual(5)
    })

    it('bottom padding is compact (pb-8)', () => {
      const { container } = renderComponent()
      expect(container.querySelector('.pb-8')).not.toBeNull()
      expect(container.querySelector('.pb-16')).toBeNull()
    })
  })
})
