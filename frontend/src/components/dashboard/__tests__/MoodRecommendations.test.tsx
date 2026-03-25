import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MoodRecommendations } from '../MoodRecommendations'
import { MOOD_RECOMMENDATIONS } from '@/constants/dashboard/recommendations'
import { MOOD_COLORS } from '@/constants/dashboard/mood'
import type { MoodValue } from '@/types/dashboard'

const mockOnAdvance = vi.fn()

// Default mock: theme 'gratitude' maps to moods [4,5] — won't interfere with mood 1/2/3 tests
const MOCK_DEVOTIONAL = {
  id: 'devotional-02',
  dayIndex: 1,
  title: 'A Heart Full of Thanks',
  theme: 'gratitude' as const,
  quote: { text: 'Test quote', attribution: 'Author' },
  passage: { reference: 'Psalm 100:1-5', verses: [] },
  reflection: ['First paragraph.'],
  prayer: 'Test prayer',
  reflectionQuestion: 'Test question?',
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { name: 'Test' } }),
}))

vi.mock('@/data/devotionals', () => ({
  getTodaysDevotional: vi.fn(() => MOCK_DEVOTIONAL),
}))

import { getTodaysDevotional } from '@/data/devotionals'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

function renderRecommendations(moodValue: MoodValue = 3) {
  return render(
    <MemoryRouter>
      <MoodRecommendations moodValue={moodValue} onAdvanceToDashboard={mockOnAdvance} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MoodRecommendations', () => {
  describe('Rendering', () => {
    it('renders heading text', () => {
      renderRecommendations()
      // Text is split across spans by KaraokeTextReveal
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading.textContent).toMatch(/based on how you're feeling/i)
    })

    it('renders 3 suggestion cards for mood 1 (Struggling)', () => {
      renderRecommendations(1)
      expect(screen.getByText('Talk to God')).toBeInTheDocument()
      expect(screen.getByText('Find Comfort in Scripture')).toBeInTheDocument()
      expect(screen.getByText("You're Not Alone")).toBeInTheDocument()
    })

    it('renders 3 suggestion cards for mood 5 (Thriving)', () => {
      renderRecommendations(5)
      expect(screen.getByText('Celebrate with Worship')).toBeInTheDocument()
      expect(screen.getByText('Share Your Joy')).toBeInTheDocument()
      expect(screen.getByText('Pour into Others')).toBeInTheDocument()
    })

    it('each card is a link to the correct route', () => {
      renderRecommendations(3)
      const recs = MOOD_RECOMMENDATIONS[3]
      const links = screen.getAllByRole('link')
      // 3 card links
      expect(links).toHaveLength(3)
      for (let i = 0; i < 3; i++) {
        expect(links[i]).toHaveAttribute('href', recs[i].route)
      }
    })

    it('cards have mood-colored left border', () => {
      renderRecommendations(2)
      const links = screen.getAllByRole('link')
      for (const link of links) {
        expect(link).toHaveStyle({ borderLeftColor: MOOD_COLORS[2] })
      }
    })

    it('Lucide icons render with mood color', () => {
      renderRecommendations(4)
      const moodColor = MOOD_COLORS[4]
      const links = screen.getAllByRole('link')
      for (const link of links) {
        const svg = link.querySelector('svg')
        expect(svg).toBeTruthy()
        expect(svg).toHaveStyle({ color: moodColor })
      }
    })
  })

  describe('Navigation & Timer', () => {
    it('"Go to Dashboard" button calls onAdvanceToDashboard', async () => {
      renderRecommendations()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const button = screen.getByRole('button', { name: /go to dashboard/i })
      await user.click(button)
      expect(mockOnAdvance).toHaveBeenCalledOnce()
    })

    it('auto-advances after 5 seconds', () => {
      renderRecommendations()
      expect(mockOnAdvance).not.toHaveBeenCalled()
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(mockOnAdvance).toHaveBeenCalledOnce()
    })

    it('clicking a card clears auto-advance timer', async () => {
      renderRecommendations(3)
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const links = screen.getAllByRole('link')
      await user.click(links[0])
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(mockOnAdvance).not.toHaveBeenCalled()
    })

    it('clicking "Go to Dashboard" clears auto-advance timer', async () => {
      renderRecommendations()
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const button = screen.getByRole('button', { name: /go to dashboard/i })
      await user.click(button)
      // Called once from the click
      expect(mockOnAdvance).toHaveBeenCalledOnce()
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      // Still only once — timer was cleared
      expect(mockOnAdvance).toHaveBeenCalledOnce()
    })
  })

  describe('Accessibility', () => {
    it('focus moves to heading on mount', () => {
      renderRecommendations()
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveFocus()
    })

    it('cards have accessible link text', () => {
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      for (const link of links) {
        expect(link).toHaveAccessibleName()
      }
    })

    it('cards have 44px min touch target', () => {
      renderRecommendations()
      const links = screen.getAllByRole('link')
      for (const link of links) {
        expect(link.className).toContain('min-h-[44px]')
      }
    })

    it('"Go to Dashboard" has 44px min touch target', () => {
      renderRecommendations()
      const button = screen.getByRole('button', { name: /go to dashboard/i })
      expect(button.className).toContain('min-h-[44px]')
    })

    it('region has aria-label', () => {
      renderRecommendations()
      const region = screen.getByRole('region')
      expect(region).toHaveAttribute('aria-label', 'Recommended activities based on your mood')
    })
  })

  describe('Reduced Motion', () => {
    it('reduced motion disables animations', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true)
      renderRecommendations()
      const links = screen.getAllByRole('link')
      for (const link of links) {
        expect(link.className).not.toContain('animate-fade-in')
        expect(link.className).not.toContain('opacity-0')
      }
    })

    it('stagger animation delays are correct when motion enabled', () => {
      vi.mocked(useReducedMotion).mockReturnValue(false)
      renderRecommendations()
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveStyle({ animationDelay: '0ms' })
      expect(links[1]).toHaveStyle({ animationDelay: '150ms' })
      expect(links[2]).toHaveStyle({ animationDelay: '300ms' })
    })
  })

  describe('Devotional Recommendation Integration', () => {
    it('shows devotional card when theme matches mood and unread', () => {
      // theme 'trust' maps to moods [1,2]
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(4)
      expect(screen.getByText("Read Today's Devotional")).toBeInTheDocument()
    })

    it('devotional card is first in list', () => {
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveTextContent("Read Today's Devotional")
    })

    it('devotional card description is devotional title', () => {
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      renderRecommendations(1)
      expect(screen.getByText('Anchored in Trust')).toBeInTheDocument()
    })

    it('devotional card links to /daily?tab=devotional', () => {
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveAttribute('href', '/daily?tab=devotional')
    })

    it('does NOT show devotional when theme does not match mood', () => {
      // theme 'gratitude' maps to [4,5], mood 1 is not in that list
      vi.mocked(getTodaysDevotional).mockReturnValue(MOCK_DEVOTIONAL)
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
      expect(screen.queryByText("Read Today's Devotional")).not.toBeInTheDocument()
    })

    it('does NOT show devotional when already read', () => {
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(3)
    })

    it('shows 3 existing cards unchanged when no devotional match', () => {
      vi.mocked(getTodaysDevotional).mockReturnValue(MOCK_DEVOTIONAL)
      renderRecommendations(1)
      expect(screen.getByText('Talk to God')).toBeInTheDocument()
      expect(screen.getByText('Find Comfort in Scripture')).toBeInTheDocument()
      expect(screen.getByText("You're Not Alone")).toBeInTheDocument()
    })

    it('handles missing wr_devotional_reads gracefully', () => {
      // No localStorage key set — should treat as unread
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      renderRecommendations(1)
      expect(screen.getByText("Read Today's Devotional")).toBeInTheDocument()
    })

    it('layout handles 4 cards without breakage', () => {
      vi.mocked(getTodaysDevotional).mockReturnValue({
        ...MOCK_DEVOTIONAL,
        theme: 'trust',
        title: 'Anchored in Trust',
      })
      renderRecommendations(1)
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(4)
      // All 4 cards render with correct structure
      for (const link of links) {
        expect(link).toHaveClass('rounded-xl')
        expect(link.querySelector('svg')).toBeTruthy()
      }
    })
  })

  describe('KaraokeTextReveal Integration', () => {
    it('heading renders via KaraokeTextReveal', () => {
      renderRecommendations()
      // Each word of the heading should be in the DOM
      expect(screen.getByText('Based')).toBeInTheDocument()
      expect(screen.getByText("you're")).toBeInTheDocument()
      expect(screen.getByText('feeling...')).toBeInTheDocument()
    })

    it('reduced motion shows heading immediately', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true)
      renderRecommendations()

      // All heading words visible immediately
      const words = "Based on how you're feeling...".split(/\s+/)
      for (const word of words) {
        expect(screen.getByText(word).style.opacity).toBe('1')
      }
    })

    it('existing card stagger animations unchanged', () => {
      vi.mocked(useReducedMotion).mockReturnValue(false)
      renderRecommendations()
      const links = screen.getAllByRole('link')
      for (const link of links) {
        expect(link.className).toContain('motion-safe:animate-fade-in')
      }
    })
  })
})
