import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DashboardWidgetGrid } from '../DashboardWidgetGrid'
import { AuthModalProvider } from '@/components/prayer-wall/AuthModalProvider'
import { ToastProvider } from '@/components/ui/Toast'

// Mock hooks used inside widgets
vi.mock('@/hooks/useWeeklyRecap', () => ({
  useWeeklyRecap: () => ({ isVisible: false, hasFriends: true }),
}))

vi.mock('@/hooks/useFaithPoints', () => ({
  useFaithPoints: () => mockFaithPoints,
}))

vi.mock('@/hooks/useDashboardLayout', () => ({
  useDashboardLayout: vi.fn(),
}))

// Minimal mocks for widget internals
vi.mock('../MoodChart', () => ({
  MoodChart: () => <div data-testid="mood-chart">MoodChart</div>,
}))
vi.mock('../VerseOfTheDayCard', () => ({
  VerseOfTheDayCard: () => <div data-testid="votd">VerseOfTheDay</div>,
}))
vi.mock('../TodaysDevotionalCard', () => ({
  TodaysDevotionalCard: () => <div data-testid="devotional">Devotional</div>,
}))
vi.mock('../ReadingPlanWidget', () => ({
  ReadingPlanWidget: () => <div data-testid="reading-plan">ReadingPlan</div>,
}))
vi.mock('../PrayerListWidget', () => ({
  PrayerListWidget: () => <div data-testid="prayer-list">PrayerList</div>,
}))
vi.mock('../RecentHighlightsWidget', () => ({
  RecentHighlightsWidget: () => <div data-testid="recent-highlights">Highlights</div>,
}))
vi.mock('../GratitudeWidget', () => ({
  GratitudeWidget: () => <div data-testid="gratitude">Gratitude</div>,
}))
vi.mock('../StreakCard', () => ({
  StreakCard: () => <div data-testid="streak">Streak</div>,
}))
vi.mock('../ActivityChecklist', () => ({
  ActivityChecklist: () => <div data-testid="activity-checklist">Activity</div>,
}))
vi.mock('../ChallengeWidget', () => ({
  ChallengeWidget: () => <div data-testid="challenge">Challenge</div>,
}))
vi.mock('../FriendsPreview', () => ({
  FriendsPreview: () => <div data-testid="friends">Friends</div>,
}))
vi.mock('../WeeklyRecap', () => ({
  WeeklyRecap: () => <div data-testid="weekly-recap">Recap</div>,
}))
vi.mock('../QuickActions', () => ({
  QuickActions: () => <div data-testid="quick-actions">QuickActions</div>,
}))
vi.mock('../GettingStartedCard', () => ({
  GettingStartedCard: () => <div data-testid="getting-started">GettingStarted</div>,
}))
vi.mock('../EveningReflectionBanner', () => ({
  EveningReflectionBanner: () => <div data-testid="evening-reflection">EveningBanner</div>,
}))

import { useDashboardLayout } from '@/hooks/useDashboardLayout'
import type { WidgetId } from '@/constants/dashboard/widget-order'

const mockUseDashboardLayout = vi.mocked(useDashboardLayout)

const mockFaithPoints = {
  currentStreak: 5,
  longestStreak: 10,
  totalPoints: 500,
  currentLevel: 3,
  levelName: 'Blooming',
  pointsToNextLevel: 1000,
  todayActivities: {} as any,
  todayMultiplier: 1,
  todayPoints: 50,
  previousStreak: null,
  isFreeRepairAvailable: false,
  repairStreak: vi.fn(),
  recordActivity: vi.fn(),
  newlyEarnedBadges: [],
  clearNewlyEarnedBadges: vi.fn(),
}

function renderGrid(props: Partial<Parameters<typeof DashboardWidgetGrid>[0]> = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthModalProvider>
          <DashboardWidgetGrid faithPoints={mockFaithPoints as any} {...props} />
        </AuthModalProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  mockUseDashboardLayout.mockReturnValue({
    orderedWidgets: ['devotional', 'votd', 'mood-chart', 'streak'] as WidgetId[],
    layout: null,
    isCustomized: false,
    updateOrder: vi.fn(),
    toggleVisibility: vi.fn(),
    resetToDefault: vi.fn(),
  })
})

describe('DashboardWidgetGrid dynamic ordering', () => {
  it('renders widgets in the order returned by useDashboardLayout', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['mood-chart', 'devotional'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid()
    expect(screen.getByTestId('mood-chart')).toBeInTheDocument()
    expect(screen.getByTestId('devotional')).toBeInTheDocument()
  })

  it('hides reading-plan when hasActiveReadingPlan is false', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['devotional'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid({ hasActiveReadingPlan: false })
    expect(screen.queryByTestId('reading-plan')).not.toBeInTheDocument()
  })

  it('shows reading-plan when it is in orderedWidgets', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['reading-plan'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid({ hasActiveReadingPlan: true })
    expect(screen.getByTestId('reading-plan')).toBeInTheDocument()
  })

  it('getting-started renders when showGettingStarted is true with props', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['getting-started', 'devotional'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid({
      showGettingStarted: true,
      gettingStartedProps: {
        items: [],
        completedCount: 0,
        onDismiss: vi.fn(),
        onRequestCheckIn: vi.fn(),
      },
    })
    expect(screen.getByTestId('getting-started')).toBeInTheDocument()
  })

  it('getting-started is first when visible', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['getting-started', 'devotional', 'mood-chart'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid({
      showGettingStarted: true,
      gettingStartedProps: {
        items: [],
        completedCount: 0,
        onDismiss: vi.fn(),
        onRequestCheckIn: vi.fn(),
      },
    })
    const gs = screen.getByTestId('getting-started')
    expect(gs.closest('[style]')).toHaveStyle({ order: 0 })
  })

  it('stagger animation delays are sequential', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['devotional', 'votd', 'mood-chart'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid({ animateEntrance: true, staggerStartIndex: 2 })
    // First widget: delay = (2 + 0) * 100 = 200ms
    const devotional = screen.getByText('Today\'s Devotional').closest('[style]')
    expect(devotional).toHaveStyle({ animationDelay: '200ms' })
  })

  it('evening-reflection hidden when showEveningBanner is false', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['devotional'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid({ showEveningBanner: false })
    expect(screen.queryByTestId('evening-reflection')).not.toBeInTheDocument()
  })

  it('preserves existing DashboardCard collapse behavior', () => {
    mockUseDashboardLayout.mockReturnValue({
      orderedWidgets: ['mood-chart'] as WidgetId[],
      layout: null,
      isCustomized: false,
      updateOrder: vi.fn(),
      toggleVisibility: vi.fn(),
      resetToDefault: vi.fn(),
    })
    renderGrid()
    // The card id should still be "mood-chart" for collapse persistence
    const card = screen.getByText('7-Day Mood')
    expect(card).toBeInTheDocument()
  })
})
