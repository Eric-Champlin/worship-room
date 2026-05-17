import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrayerCard } from '../PrayerCard'
import type { PrayerRequest } from '@/types/prayer-wall'

const BASE_PRAYER: PrayerRequest = {
  id: 'prayer-base',
  userId: 'user-1',
  authorName: 'Sarah',
  authorAvatarUrl: 'https://i.pravatar.cc/150?u=user1',
  isAnonymous: false,
  content: 'Please pray for my family.',
  category: 'family',
  postType: 'prayer_request',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-02-24T14:30:00Z',
  lastActivityAt: '2026-02-24T14:30:00Z',
  prayingCount: 5,
  commentCount: 1,
}

function renderCard(prayer: PrayerRequest) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrayerCard prayer={prayer} />
    </MemoryRouter>,
  )
}

describe('PrayerCard — Spec 7.6 FromFriendChip', () => {
  it('renders FromFriendChip when prayer.isFromFriend === true', () => {
    renderCard({ ...BASE_PRAYER, isFromFriend: true })
    expect(screen.getByText('From a friend')).toBeInTheDocument()
  })

  it('does NOT render FromFriendChip when prayer.isFromFriend === false', () => {
    renderCard({ ...BASE_PRAYER, isFromFriend: false })
    expect(screen.queryByText('From a friend')).not.toBeInTheDocument()
  })

  it('does NOT render FromFriendChip when isFromFriend is undefined (strict-true guard)', () => {
    // Omit isFromFriend entirely — undefined should fall through to no-chip.
    const prayer = { ...BASE_PRAYER }
    // Be explicit: do not set isFromFriend.
    renderCard(prayer)
    expect(screen.queryByText('From a friend')).not.toBeInTheDocument()
  })

  it('shows both chip AND "Anonymous" author for anonymous friend post (Gate-G-ANONYMOUS-CHIP-RESPECTED)', () => {
    renderCard({
      ...BASE_PRAYER,
      id: 'prayer-anon-friend',
      userId: null,
      authorName: 'Anonymous',
      authorAvatarUrl: null,
      isAnonymous: true,
      isFromFriend: true,
    })
    expect(screen.getByText('From a friend')).toBeInTheDocument()
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })

  it('chip is in the same chip-row parent as the CategoryBadge', () => {
    // Use a content that doesn't include the category word so we can uniquely
    // locate the category pill (prayer content + category overlap on family/work/etc.).
    const prayer: PrayerRequest = {
      ...BASE_PRAYER,
      id: 'prayer-chip-row',
      content: 'Pray for a difficult situation.',
      category: 'family',
      isFromFriend: true,
    }
    renderCard(prayer)
    const chip = screen.getByTestId('from-friend-chip')
    // CategoryBadge renders the category label as "Family" (capitalized).
    const categoryEl = screen.getByText('Family')
    // Both elements should share the same chip-row parent <div>.
    const chipRow = chip.closest('div')
    const categoryRow = categoryEl.closest('div')
    expect(chipRow).not.toBeNull()
    expect(categoryRow).not.toBeNull()
    // Same parent div confirms they're in the same flex chip row.
    expect(chipRow).toBe(categoryRow)
  })
})
