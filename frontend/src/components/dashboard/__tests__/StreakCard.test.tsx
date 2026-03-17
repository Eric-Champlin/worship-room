import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { StreakCard } from '../StreakCard'

const DEFAULT_PROPS = {
  currentStreak: 5,
  longestStreak: 14,
  totalPoints: 247,
  currentLevel: 2,
  levelName: 'Sprout',
  pointsToNextLevel: 253,
  todayMultiplier: 1,
}

beforeEach(() => {
  localStorage.clear()
})

function renderCard(overrides?: Partial<typeof DEFAULT_PROPS>) {
  return render(<StreakCard {...DEFAULT_PROPS} {...overrides} />)
}

describe('StreakCard', () => {
  it('renders streak count with flame icon', () => {
    renderCard()
    expect(screen.getByText('5')).toBeInTheDocument()
    // Flame icon rendered (aria-hidden svg)
    const flame = document.querySelector('.text-amber-400')
    expect(flame).toBeInTheDocument()
  })

  it('shows "days streak" (plural) when streak > 1', () => {
    renderCard({ currentStreak: 5 })
    expect(screen.getByText('days streak')).toBeInTheDocument()
  })

  it('shows "day streak" (singular) when streak === 1', () => {
    renderCard({ currentStreak: 1 })
    expect(screen.getByText('day streak')).toBeInTheDocument()
  })

  it('shows "Start your streak today" when streak is 0', () => {
    renderCard({ currentStreak: 0 })
    expect(screen.getByText('Start your streak today')).toBeInTheDocument()
    // Flame should be dimmed
    const flame = document.querySelector('.text-white\\/30')
    expect(flame).toBeInTheDocument()
  })

  it('displays longest streak', () => {
    renderCard()
    expect(screen.getByText('Longest: 14 days')).toBeInTheDocument()
  })

  it('displays faith points and level name', () => {
    renderCard()
    expect(screen.getByText('247 Faith Points')).toBeInTheDocument()
    expect(screen.getByText('Sprout')).toBeInTheDocument()
  })

  it('renders correct level icon for each level', () => {
    const levels = [
      { level: 1, name: 'Seedling' },
      { level: 2, name: 'Sprout' },
      { level: 3, name: 'Blooming' },
      { level: 4, name: 'Flourishing' },
      { level: 5, name: 'Oak' },
      { level: 6, name: 'Lighthouse' },
    ]
    for (const { level, name } of levels) {
      const { unmount } = renderCard({
        currentLevel: level,
        levelName: name,
        totalPoints: 0,
        pointsToNextLevel: level === 6 ? 0 : 100,
      })
      expect(screen.getByText(name)).toBeInTheDocument()
      // Verify level icon container exists with correct class
      const icon = document.querySelector('.text-primary-lt')
      expect(icon).toBeInTheDocument()
      unmount()
    }
  })

  it('progress bar shows correct percentage', () => {
    renderCard({
      totalPoints: 247,
      currentLevel: 2,
      pointsToNextLevel: 253,
    })
    // Sprout threshold: 100, Blooming threshold: 500
    // (247 - 100) / (500 - 100) = 147/400 = 36.75%
    const bar = screen.getByRole('progressbar')
    expect(bar).toBeInTheDocument()
    const fill = bar.querySelector('div')
    expect(fill).toHaveStyle({ width: '36.75%' })
  })

  it('max level shows full bar and "Lighthouse — Max Level"', () => {
    renderCard({
      totalPoints: 12000,
      currentLevel: 6,
      levelName: 'Lighthouse',
      pointsToNextLevel: 0,
    })
    expect(screen.getByText('Lighthouse — Max Level')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-label', 'Maximum level reached — Lighthouse')
    const fill = bar.querySelector('div')
    expect(fill).toHaveStyle({ width: '100%' })
  })

  it('multiplier badge shows when > 1x', () => {
    renderCard({ todayMultiplier: 1.5 })
    expect(screen.getByText('1.5x bonus today!')).toBeInTheDocument()
  })

  it('multiplier badge hidden when 1x', () => {
    renderCard({ todayMultiplier: 1 })
    expect(screen.queryByText(/bonus today/)).not.toBeInTheDocument()
  })

  it('progress bar has role="progressbar" with ARIA attributes', () => {
    renderCard({
      totalPoints: 247,
      currentLevel: 2,
      pointsToNextLevel: 253,
    })
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '247')
    expect(bar).toHaveAttribute('aria-valuemin', '100')
    expect(bar).toHaveAttribute('aria-valuemax', '500')
    expect(bar).toHaveAttribute('aria-label', 'Faith points progress toward Blooming')
  })

  it('recent badges render from localStorage (object format)', () => {
    localStorage.setItem(
      'wr_badges',
      JSON.stringify({
        earned: {
          welcome: { earnedAt: '2026-03-15T10:00:00Z' },
          first_prayer: { earnedAt: '2026-03-14T10:00:00Z' },
          streak_7: { earnedAt: '2026-03-13T10:00:00Z' },
          streak_14: { earnedAt: '2026-03-01T10:00:00Z' },
        },
        newlyEarned: [],
        activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
      }),
    )
    renderCard()
    // Should show 3 most recent badges as initial circles
    const badges = document.querySelectorAll('.bg-primary\\/20')
    expect(badges).toHaveLength(3)
    // Verify names resolved from BADGE_MAP via title attributes
    expect(screen.getByTitle('Welcome to Worship Room')).toBeInTheDocument()
    expect(screen.getByTitle('First Prayer')).toBeInTheDocument()
    expect(screen.getByTitle('First Flame')).toBeInTheDocument()
    // 4th badge should not render
    expect(screen.queryByTitle('Steady Flame')).not.toBeInTheDocument()
  })

  it('badge names resolved from BADGE_MAP', () => {
    localStorage.setItem(
      'wr_badges',
      JSON.stringify({
        earned: {
          welcome: { earnedAt: '2026-03-15T10:00:00Z' },
        },
        newlyEarned: [],
        activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 },
      }),
    )
    renderCard()
    // BADGE_MAP resolves 'welcome' to 'Welcome to Worship Room'
    expect(screen.getByTitle('Welcome to Worship Room')).toBeInTheDocument()
  })

  it('corrupted wr_badges shows no badges', () => {
    localStorage.setItem('wr_badges', 'not valid json')
    renderCard({ todayMultiplier: 1 })
    const badgeCircles = document.querySelectorAll('.bg-primary\\/20')
    expect(badgeCircles).toHaveLength(0)
  })

  it('no badges area when wr_badges is empty or absent', () => {
    renderCard({ todayMultiplier: 1 })
    // No badge circles rendered, no crash
    const badgeCircles = document.querySelectorAll('.bg-primary\\/20')
    expect(badgeCircles).toHaveLength(0)
  })
})
