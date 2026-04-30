import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import { InlineComposer } from '../InlineComposer'
import { CategoryFilterBar } from '../CategoryFilterBar'
import { PrayerCard } from '../PrayerCard'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest } from '@/types/prayer-wall'

// ---------------------------------------------------------------------------
// InlineComposer challenge mock
// ---------------------------------------------------------------------------

vi.mock('@/lib/challenge-calendar', () => ({
  getActiveChallengeInfo: () => ({
    challengeId: 'pray40-lenten-journey',
    daysRemaining: 20,
    calendarDay: 10,
  }),
}))

vi.mock('@/data/challenges', () => ({
  getChallenge: (id: string) => {
    if (id === 'pray40-lenten-journey') {
      return {
        id: 'pray40-lenten-journey',
        title: 'Pray40: A Lenten Journey',
        themeColor: '#6B21A8',
        icon: 'Heart',
        durationDays: 40,
        dailyContent: [],
      }
    }
    return undefined
  },
  CHALLENGES: [],
}))

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}))

// ---------------------------------------------------------------------------
// Tests: InlineComposer Challenge Checkbox
// ---------------------------------------------------------------------------

describe('InlineComposer — challenge integration', () => {
  it('shows challenge checkbox during active season', () => {
    render(
      <MemoryRouter>
        <InlineComposer isOpen onClose={vi.fn()} onSubmit={vi.fn()} />
      </MemoryRouter>,
    )
    expect(screen.getByLabelText(/This is a/)).toBeInTheDocument()
    expect(screen.getByText('Pray40: A Lenten Journey')).toBeInTheDocument()
  })

  it('checking checkbox passes challengeId on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(
      <MemoryRouter>
        <InlineComposer isOpen onClose={vi.fn()} onSubmit={onSubmit} />
      </MemoryRouter>,
    )

    // Type content
    const textarea = screen.getByLabelText('Prayer request')
    fireEvent.change(textarea, { target: { value: 'Please pray for me' } })

    // Check challenge checkbox
    const checkbox = screen.getByRole('checkbox', { name: /This is a/ })
    fireEvent.click(checkbox)

    // Select a category
    fireEvent.click(screen.getByText('Health'))

    // Submit
    fireEvent.click(screen.getByText('Submit Prayer Request'))

    expect(onSubmit).toHaveBeenCalledWith(
      'Please pray for me',
      false,
      'health',
      'pray40-lenten-journey',
      expect.any(String),
    )
  })

  it('unchecked checkbox does not pass challengeId', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(
      <MemoryRouter>
        <InlineComposer isOpen onClose={vi.fn()} onSubmit={onSubmit} />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Prayer request'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByText('Health'))
    fireEvent.click(screen.getByText('Submit Prayer Request'))

    expect(onSubmit).toHaveBeenCalledWith('Test', false, 'health', undefined, expect.any(String))
  })

  it('checkbox has accessible label association', () => {
    render(
      <MemoryRouter>
        <InlineComposer isOpen onClose={vi.fn()} onSubmit={vi.fn()} />
      </MemoryRouter>,
    )
    const checkbox = screen.getByRole('checkbox', { name: /This is a/ })
    expect(checkbox).toHaveAttribute('id', 'challenge-prayer-checkbox')
  })
})

// ---------------------------------------------------------------------------
// Tests: CategoryFilterBar Challenge Filter
// ---------------------------------------------------------------------------

describe('CategoryFilterBar — challenge filter', () => {
  const baseCounts: Record<PrayerCategory, number> = {
    health: 5,
    'mental-health': 0,
    family: 3,
    work: 2,
    grief: 1,
    gratitude: 4,
    praise: 2,
    relationships: 1,
    other: 0,
    discussion: 2,
  }

  it('shows "Challenge Prayers" pill during active season', () => {
    render(
      <CategoryFilterBar
        activeCategory={null}
        onSelectCategory={vi.fn()}
        categoryCounts={baseCounts}
        showCounts={false}
        challengeFilter={{ id: 'pray40', title: 'Pray40', color: '#6B21A8' }}
        isChallengeFilterActive={false}
        onToggleChallengeFilter={vi.fn()}
      />,
    )
    expect(screen.getByText('Pray40 Prayers')).toBeInTheDocument()
  })

  it('does not show challenge pill when no challengeFilter', () => {
    render(
      <CategoryFilterBar
        activeCategory={null}
        onSelectCategory={vi.fn()}
        categoryCounts={baseCounts}
        showCounts={false}
      />,
    )
    expect(screen.queryByText(/Prayers$/)).not.toBeInTheDocument()
  })

  it('challenge pill calls onToggleChallengeFilter when clicked', () => {
    const onToggle = vi.fn()
    render(
      <CategoryFilterBar
        activeCategory={null}
        onSelectCategory={vi.fn()}
        categoryCounts={baseCounts}
        showCounts={false}
        challengeFilter={{ id: 'pray40', title: 'Pray40', color: '#6B21A8' }}
        isChallengeFilterActive={false}
        onToggleChallengeFilter={onToggle}
      />,
    )
    fireEvent.click(screen.getByText('Pray40 Prayers'))
    expect(onToggle).toHaveBeenCalled()
  })

  it('challenge pill uses aria-pressed', () => {
    render(
      <CategoryFilterBar
        activeCategory={null}
        onSelectCategory={vi.fn()}
        categoryCounts={baseCounts}
        showCounts={false}
        challengeFilter={{ id: 'pray40', title: 'Pray40', color: '#6B21A8' }}
        isChallengeFilterActive={true}
        onToggleChallengeFilter={vi.fn()}
      />,
    )
    expect(screen.getByText('Pray40 Prayers')).toHaveAttribute('aria-pressed', 'true')
  })
})

// ---------------------------------------------------------------------------
// Tests: PrayerCard Challenge Badge
// ---------------------------------------------------------------------------

describe('PrayerCard — challenge badge', () => {
  const basePrayer: PrayerRequest = {
    id: 'p1',
    userId: 'u1',
    authorName: 'Sarah',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Please pray for me',
    category: 'health',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-03-23T10:00:00Z',
    lastActivityAt: '2026-03-23T10:00:00Z',
    prayingCount: 5,
    commentCount: 0,
  }

  it('shows challenge badge when challengeId present', () => {
    render(
      <MemoryRouter>
        <PrayerCard prayer={{ ...basePrayer, challengeId: 'pray40-lenten-journey' }} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Pray40')).toBeInTheDocument()
  })

  it('shows no badge when no challengeId', () => {
    render(
      <MemoryRouter>
        <PrayerCard prayer={basePrayer} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Pray40')).not.toBeInTheDocument()
  })
})
