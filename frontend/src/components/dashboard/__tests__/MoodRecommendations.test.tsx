import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MoodRecommendations } from '../MoodRecommendations'
import { MOOD_RECOMMENDATIONS } from '@/constants/dashboard/recommendations'
import { MOOD_COLORS } from '@/constants/dashboard/mood'
import type { MoodValue } from '@/types/dashboard'

const mockOnAdvance = vi.fn()

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
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MoodRecommendations', () => {
  describe('Rendering', () => {
    it('renders heading text', () => {
      renderRecommendations()
      expect(screen.getByText(/based on how you're feeling/i)).toBeInTheDocument()
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
      const heading = screen.getByText(/based on how you're feeling/i)
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
})
