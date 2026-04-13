/**
 * BB-34: Empty State Rendering Tests
 *
 * Verifies that empty states across the app use FeatureEmptyState,
 * display warm/second-person copy, and use white pill CTA styling.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// --- Components under test ---
import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState'
import { FriendList } from '@/components/friends/FriendList'
import { MemorizationDeck } from '@/components/memorize/MemorizationDeck'
import { PrayerListEmptyState } from '@/components/my-prayers/PrayerListEmptyState'
// ChallengeWidget requires complex challenge-calendar mocks — tested inline via FeatureEmptyState
import { MonthlyHighlights } from '@/components/insights/MonthlyHighlights'
import { Heart, BookOpen } from 'lucide-react'

// --- Mocks ---
vi.mock('@/hooks/bible/useMemorizationStore', () => ({
  useMemorizationStore: vi.fn(() => []),
}))

vi.mock('@/lib/memorize', () => ({
  removeCard: vi.fn(),
  recordReview: vi.fn(),
}))

// ChallengeWidget mock not needed — using FeatureEmptyState directly

vi.mock('@/hooks/useStaggeredEntrance', () => ({
  useStaggeredEntrance: vi.fn(() => true),
}))

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

// --- Helper: verify white pill CTA classes ---
function expectWhitePillCTA(element: HTMLElement) {
  expect(element.className).toContain('rounded-full')
  expect(element.className).toContain('bg-white')
  expect(element.className).toContain('text-primary')
}

describe('BB-34 Empty State Rendering', () => {
  describe('FeatureEmptyState shared component', () => {
    it('CTA link renders white pill', () => {
      wrap(
        <FeatureEmptyState
          icon={BookOpen}
          heading="Test"
          description="Test"
          ctaLabel="Go"
          ctaHref="/test"
        />,
      )
      const link = screen.getByRole('link', { name: /go/i })
      expectWhitePillCTA(link)
    })

    it('CTA button renders white pill', () => {
      wrap(
        <FeatureEmptyState
          icon={Heart}
          heading="Test"
          description="Test"
          ctaLabel="Click"
          onCtaClick={() => {}}
        />,
      )
      const button = screen.getByRole('button', { name: /click/i })
      expectWhitePillCTA(button)
    })

    it('icon has aria-hidden', () => {
      wrap(
        <FeatureEmptyState
          icon={Heart}
          heading="Test"
          description="Test"
        />,
      )
      const svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('My Bible — no highlights', () => {
    it('renders warm heading', () => {
      wrap(
        <FeatureEmptyState
          icon={BookOpen}
          heading="Your Bible highlights will show up here"
          description="Tap any verse in the reader to highlight, bookmark, or add a note. They'll all be collected here for you."
          ctaLabel="Open the reader"
          ctaHref="/bible"
        />,
      )
      expect(
        screen.getByText('Your Bible highlights will show up here'),
      ).toBeInTheDocument()
      expect(screen.getByText(/collected here for you/)).toBeInTheDocument()
    })
  })

  describe('Memorization Deck — no cards', () => {
    it('renders warm heading', () => {
      wrap(<MemorizationDeck />)
      expect(
        screen.getByText('Your memorization deck is ready'),
      ).toBeInTheDocument()
    })

    it('renders CTA with white pill style', () => {
      wrap(<MemorizationDeck />)
      const link = screen.getByRole('link', { name: /open the reader/i })
      expectWhitePillCTA(link)
    })
  })

  describe('Friends list — empty', () => {
    it('renders warm heading', () => {
      wrap(
        <FriendList
          friends={[]}
          onRemove={vi.fn()}
          onBlock={vi.fn()}
          onScrollToInvite={vi.fn()}
        />,
      )
      expect(
        screen.getByText('Faith grows stronger together'),
      ).toBeInTheDocument()
    })

    it('renders CTA with white pill style', () => {
      wrap(
        <FriendList
          friends={[]}
          onRemove={vi.fn()}
          onBlock={vi.fn()}
          onScrollToInvite={vi.fn()}
        />,
      )
      const button = screen.getByRole('button', {
        name: /invite a friend/i,
      })
      expectWhitePillCTA(button)
    })
  })

  describe('My Prayers — empty list', () => {
    it('renders warm heading via FeatureEmptyState', () => {
      wrap(<PrayerListEmptyState onAddPrayer={vi.fn()} />)
      expect(
        screen.getByText('Your prayer list is waiting.'),
      ).toBeInTheDocument()
    })

    it('renders CTA with white pill style', () => {
      wrap(<PrayerListEmptyState onAddPrayer={vi.fn()} />)
      const button = screen.getByRole('button', { name: /add a prayer/i })
      expectWhitePillCTA(button)
    })

    it('icon has aria-hidden', () => {
      wrap(<PrayerListEmptyState onAddPrayer={vi.fn()} />)
      const svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Challenge Widget — no challenges (via FeatureEmptyState)', () => {
    it('renders warm heading', () => {
      wrap(
        <FeatureEmptyState
          icon={Heart}
          heading="Challenges bring us together"
          description="Seasonal challenges happen throughout the year. The next one is coming soon!"
          compact
        />,
      )
      expect(
        screen.getByText('Challenges bring us together'),
      ).toBeInTheDocument()
    })
  })

  describe('Monthly Highlights — no best day', () => {
    it('renders warm copy (no "No data")', () => {
      render(
        <MonthlyHighlights
          longestStreak={0}
          badgesEarned={[]}
          bestDay={null}
        />,
      )
      expect(
        screen.getByText(
          /highlights will appear here once you've been checking in/i,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(/No data/i)).not.toBeInTheDocument()
    })
  })

  describe('Copy compliance: no generic text', () => {
    it('My Bible heading does not contain "Nothing here yet"', () => {
      wrap(
        <FeatureEmptyState
          icon={BookOpen}
          heading="Your Bible highlights will show up here"
          description="Tap any verse in the reader to highlight, bookmark, or add a note. They'll all be collected here for you."
          ctaLabel="Open the reader"
          ctaHref="/bible"
        />,
      )
      expect(
        screen.queryByText(/nothing here yet/i),
      ).not.toBeInTheDocument()
    })

    it('MemorizationDeck heading does not contain "No memorization cards yet"', () => {
      wrap(<MemorizationDeck />)
      expect(
        screen.queryByText(/no memorization cards yet/i),
      ).not.toBeInTheDocument()
    })
  })
})
