import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/ui/Toast'
import { TodaysDevotionalCard } from '../TodaysDevotionalCard'
import { WeeklyGodMoments } from '../WeeklyGodMoments'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { MoodRecommendations } from '../MoodRecommendations'
import { getLocalDateString } from '@/utils/date'

// Mock devotional data
const MOCK_DEVOTIONAL_TRUST = {
  id: 'devotional-01',
  dayIndex: 0,
  title: 'Anchored in Trust',
  theme: 'trust' as const,
  quote: { text: 'Test quote', attribution: 'Author' },
  passage: { reference: 'Proverbs 3:5-6', verses: [] },
  reflection: ['First reflection paragraph.', 'Second paragraph.'],
  prayer: 'Test prayer',
  reflectionQuestion: 'Test question?',
}

const MOCK_DEVOTIONAL_GRATITUDE = {
  ...MOCK_DEVOTIONAL_TRUST,
  id: 'devotional-02',
  title: 'A Heart Full of Thanks',
  theme: 'gratitude' as const,
}

vi.mock('@/data/devotionals', () => ({
  getTodaysDevotional: vi.fn(() => MOCK_DEVOTIONAL_TRUST),
}))

import { getTodaysDevotional } from '@/data/devotionals'

vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}))

import { useReducedMotion } from '@/hooks/useReducedMotion'

// Mock canvas generation for VerseOfTheDayCard
vi.mock('@/lib/verse-card-canvas', () => ({
  generateVerseImage: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
}))

// Mock useFaithPoints for DashboardWidgetGrid
const mockFaithPoints = {
  currentStreak: 5,
  longestStreak: 10,
  totalPoints: 500,
  currentLevel: 3,
  levelName: 'Blooming',
  pointsToNextLevel: 1000,
  todayActivities: {
    mood: true,
    pray: false,
    listen: false,
    prayerWall: false,
    readingPlan: false,
    meditate: false,
    journal: false,
    pointsEarned: 5,
    multiplier: 1,
  },
  todayMultiplier: 1,
  todayPoints: 5,
  recordActivity: vi.fn(),
  previousStreak: null,
  isFreeRepairAvailable: false,
  repairStreak: vi.fn(),
  newlyEarnedBadges: [],
  clearNewlyEarnedBadges: vi.fn(),
}

function dateNDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return getLocalDateString(d)
}

function renderWidgetGrid() {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <DashboardWidgetGrid faithPoints={mockFaithPoints as any} />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

function renderRecommendations(mood: 1 | 2 | 3 | 4 | 5 = 1) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <MoodRecommendations moodValue={mood} onAdvanceToDashboard={vi.fn()} />
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('wr_auth_simulated', 'true')
  localStorage.setItem('wr_user_name', 'TestUser')
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Devotional Dashboard Integration', () => {
  describe('Widget + Read State Sync', () => {
    it('widget shows unread state when wr_devotional_reads is empty', () => {
      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TodaysDevotionalCard />
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: /Read today's devotional/ })).toBeInTheDocument()
      expect(screen.queryByLabelText('Completed')).not.toBeInTheDocument()
    })

    it('widget updates when wr_devotional_reads changes', () => {
      const todayStr = getLocalDateString()
      localStorage.setItem('wr_devotional_reads', JSON.stringify([todayStr]))

      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TodaysDevotionalCard />
        </MemoryRouter>,
      )
      expect(screen.getByLabelText('Completed')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Read again/ })).toBeInTheDocument()
    })
  })

  describe('Recommendation + Read State', () => {
    it('recommendation card disappears when devotional is read', () => {
      // Theme 'trust' maps to moods [1, 2] — mock it
      vi.mocked(getTodaysDevotional).mockReturnValue(MOCK_DEVOTIONAL_TRUST)

      // First render: unread, mood 1 matches → 4 cards
      const { unmount } = renderRecommendations(1)
      expect(screen.getAllByRole('link')).toHaveLength(4)
      expect(screen.getByText("Read Today's Devotional")).toBeInTheDocument()
      unmount()

      // Mark as read
      localStorage.setItem('wr_devotional_reads', JSON.stringify([getLocalDateString()]))

      // Re-render: read → 3 cards
      renderRecommendations(1)
      expect(screen.getAllByRole('link')).toHaveLength(3)
      expect(screen.queryByText("Read Today's Devotional")).not.toBeInTheDocument()
    })
  })

  describe('Weekly Banner Stats', () => {
    it('weekly banner counts correct devotionals across week', () => {
      const reads = [
        dateNDaysAgo(0),
        dateNDaysAgo(1),
        dateNDaysAgo(2),
        dateNDaysAgo(3),
        dateNDaysAgo(4),
      ]
      localStorage.setItem('wr_devotional_reads', JSON.stringify(reads))

      render(
        <WeeklyGodMoments
          isVisible={true}
          devotionalsRead={5}
          totalActivities={10}
          moodTrend="steady"
          dismiss={vi.fn()}
        />,
      )
      expect(screen.getByText('5 of 7')).toBeInTheDocument()
    })

    it('weekly banner mood trend handles empty weeks', () => {
      render(
        <WeeklyGodMoments
          isVisible={true}
          devotionalsRead={0}
          totalActivities={0}
          moodTrend="insufficient"
          dismiss={vi.fn()}
        />,
      )
      expect(screen.getByText('Keep checking in')).toBeInTheDocument()
    })
  })

  describe('Existing Widget Integrity', () => {
    it('existing dashboard widgets unchanged', () => {
      renderWidgetGrid()
      expect(screen.getByText('7-Day Mood')).toBeInTheDocument()
      expect(screen.getByText('Streak & Faith Points')).toBeInTheDocument()
      expect(screen.getByText("Today's Activity")).toBeInTheDocument()
      expect(screen.getByText('Friends & Leaderboard')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    })

    it('new devotional widget appears alongside existing widgets', () => {
      renderWidgetGrid()
      expect(screen.getByText("Today's Devotional")).toBeInTheDocument()
    })
  })

  describe('Existing Recommendations Unchanged', () => {
    it('existing recommendation cards unchanged when no devotional match', () => {
      // theme 'gratitude' maps to [4,5] — mood 1 doesn't match
      vi.mocked(getTodaysDevotional).mockReturnValue(MOCK_DEVOTIONAL_GRATITUDE)
      renderRecommendations(1)
      expect(screen.getAllByRole('link')).toHaveLength(3)
      expect(screen.getByText('Talk to God')).toBeInTheDocument()
      expect(screen.getByText('Find Comfort in Scripture')).toBeInTheDocument()
      expect(screen.getByText("You're Not Alone")).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('widget card renders within DashboardCard section', () => {
      renderWidgetGrid()
      const devotionalCard = screen.getByText("Today's Devotional").closest('section')
      expect(devotionalCard).toBeInTheDocument()
    })

    it('banner stats readable by screen readers', () => {
      render(
        <WeeklyGodMoments
          isVisible={true}
          devotionalsRead={5}
          totalActivities={12}
          moodTrend="improving"
          dismiss={vi.fn()}
        />,
      )
      // Each stat has descriptive text, not just icons
      expect(screen.getByText('devotionals')).toBeInTheDocument()
      expect(screen.getByText('activities this week')).toBeInTheDocument()
      expect(screen.getByText('mood trend')).toBeInTheDocument()
    })

    it('dismiss X has aria-label', () => {
      render(
        <WeeklyGodMoments
          isVisible={true}
          devotionalsRead={0}
          totalActivities={0}
          moodTrend="insufficient"
          dismiss={vi.fn()}
        />,
      )
      expect(screen.getByLabelText('Dismiss weekly summary')).toBeInTheDocument()
    })

    it('CTA links in widget are keyboard-accessible', () => {
      render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TodaysDevotionalCard />
        </MemoryRouter>,
      )
      const link = screen.getByRole('link')
      link.focus()
      expect(link).toHaveFocus()
    })

    it('reduced motion: banner dismiss is instant', () => {
      vi.mocked(useReducedMotion).mockReturnValue(true)
      const dismiss = vi.fn()
      render(
        <WeeklyGodMoments
          isVisible={true}
          devotionalsRead={0}
          totalActivities={0}
          moodTrend="insufficient"
          dismiss={dismiss}
        />,
      )
      fireEvent.click(screen.getByLabelText('Dismiss weekly summary'))
      expect(dismiss).toHaveBeenCalledOnce()
    })
  })
})
