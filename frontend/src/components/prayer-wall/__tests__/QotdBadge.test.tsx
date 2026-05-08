import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QotdBadge } from '../QotdBadge'
import { PrayerCard } from '../PrayerCard'
import type { PrayerRequest } from '@/types/prayer-wall'

function basePrayer(overrides: Partial<PrayerRequest> = {}): PrayerRequest {
  return {
    id: 'prayer-test',
    userId: 'user-1',
    authorName: 'Test User',
    authorAvatarUrl: null,
    isAnonymous: false,
    content: 'Test prayer content',
    category: 'other',
    postType: 'prayer_request',
    isAnswered: false,
    answeredText: null,
    answeredAt: null,
    createdAt: '2026-03-22T10:00:00Z',
    lastActivityAt: '2026-03-22T10:00:00Z',
    prayingCount: 0,
    commentCount: 0,
    ...overrides,
  }
}

describe('QotdBadge', () => {
  it('renders text', () => {
    render(<QotdBadge />)
    expect(screen.getByText('Re: Question of the Day')).toBeInTheDocument()
  })

  it('has pill styling', () => {
    render(<QotdBadge />)
    const badge = screen.getByText('Re: Question of the Day')
    expect(badge.className).toContain('rounded-full')
  })
})

describe('PrayerCard with QotdBadge', () => {
  it('shows QotdBadge when qotdId is set', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={basePrayer({ qotdId: 'qotd-1', category: 'discussion' })} />
      </MemoryRouter>,
    )
    expect(screen.getByText('Re: Question of the Day')).toBeInTheDocument()
  })

  it('hides QotdBadge when no qotdId', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrayerCard prayer={basePrayer()} />
      </MemoryRouter>,
    )
    expect(screen.queryByText('Re: Question of the Day')).not.toBeInTheDocument()
  })
})
