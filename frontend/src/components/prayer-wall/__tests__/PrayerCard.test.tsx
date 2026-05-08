import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PrayerCard } from '../PrayerCard'
import type { PrayerCategory } from '@/constants/prayer-categories'
import type { PrayerRequest } from '@/types/prayer-wall'

const SHORT_PRAYER: PrayerRequest = {
  id: 'prayer-short',
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

const LONG_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-long',
  content:
    'Please pray for my mother who was just diagnosed with cancer. She starts chemo next week and we are all scared but trusting in God. She has been the rock of our family for 40 years and I cannot imagine life without her.',
}

const ANONYMOUS_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-anon',
  userId: null,
  authorName: 'Anonymous',
  authorAvatarUrl: null,
  isAnonymous: true,
}

const ANSWERED_PRAYER: PrayerRequest = {
  ...SHORT_PRAYER,
  id: 'prayer-answered',
  isAnswered: true,
  answeredText: 'God answered our prayer! So grateful.',
  answeredAt: '2026-02-20T16:00:00Z',
}

function renderCard(prayer: PrayerRequest, options?: { showFull?: boolean; onCategoryClick?: (category: PrayerCategory) => void }) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrayerCard prayer={prayer} showFull={options?.showFull} onCategoryClick={options?.onCategoryClick} />
    </MemoryRouter>,
  )
}

describe('PrayerCard', () => {
  it('renders author name and formatted date', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.getByText('Sarah')).toBeInTheDocument()
    expect(screen.getByText('Feb 24, 2026')).toBeInTheDocument()
  })

  it('truncates long prayer text and shows "Show more" button', () => {
    renderCard(LONG_PRAYER, {})
    expect(screen.getByText('Show more')).toBeInTheDocument()
    // Text should be truncated
    expect(screen.queryByText(LONG_PRAYER.content)).not.toBeInTheDocument()
  })

  it('expands text on "Show more" click, shows "Show less"', async () => {
    const user = userEvent.setup()
    renderCard(LONG_PRAYER, {})

    await user.click(screen.getByText('Show more'))
    expect(screen.getByText(LONG_PRAYER.content)).toBeInTheDocument()
    expect(screen.getByText('Show less')).toBeInTheDocument()
  })

  it('does NOT show "Show more" for short prayers (< 150 chars)', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('renders "Anonymous" for anonymous prayers without profile link', () => {
    renderCard(ANONYMOUS_PRAYER, {})
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
    // No link to profile
    const links = screen.queryAllByRole('link')
    const profileLinks = links.filter((l) => l.getAttribute('href')?.includes('/prayer-wall/user/'))
    expect(profileLinks).toHaveLength(0)
  })

  it('renders AnsweredBadge when prayer.isAnswered is true', () => {
    renderCard(ANSWERED_PRAYER, {})
    expect(screen.getByText('Answered Prayer')).toBeInTheDocument()
    expect(screen.getByText('God answered our prayer! So grateful.')).toBeInTheDocument()
  })

  it('does not truncate when showFull is true', () => {
    renderCard(LONG_PRAYER, { showFull: true })
    expect(screen.getByText(LONG_PRAYER.content)).toBeInTheDocument()
    expect(screen.queryByText('Show more')).not.toBeInTheDocument()
  })

  it('renders profile link for non-anonymous prayers', () => {
    renderCard(SHORT_PRAYER, {})
    const links = screen.getAllByRole('link')
    const profileLinks = links.filter((l) =>
      l.getAttribute('href')?.includes('/prayer-wall/user/user-1'),
    )
    expect(profileLinks.length).toBeGreaterThan(0)
  })

  it('renders category badge', () => {
    renderCard(SHORT_PRAYER, {})
    expect(screen.getByText('Family')).toBeInTheDocument()
  })

  it('badge click calls onCategoryClick', async () => {
    const user = userEvent.setup()
    const onCategoryClick = vi.fn()
    renderCard(SHORT_PRAYER, { onCategoryClick })
    await user.click(screen.getByText('Family'))
    expect(onCategoryClick).toHaveBeenCalledWith('family')
  })

  it('badge renders as span without onCategoryClick', () => {
    renderCard(SHORT_PRAYER, {})
    const badge = screen.getByText('Family')
    expect(badge.tagName).toBe('SPAN')
  })

  it('renders TypeMarker icon next to the timestamp for prayer_request post type', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const decorativeSvg = header.querySelector('svg[aria-hidden="true"]')
    expect(decorativeSvg).toBeInTheDocument()
    expect(decorativeSvg).toHaveClass('lucide-hand-helping')
  })

  it('TypeMarker icon is decorative (aria-hidden) and uses canonical sizing', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    const icon = header.querySelector('svg[aria-hidden="true"]')!
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('h-3.5', 'w-3.5', 'text-white/40')
  })

  it('header preserves author + em-dash + time element layout (regression)', () => {
    renderCard(SHORT_PRAYER, {})
    const article = screen.getByRole('article')
    const header = article.querySelector('header')!
    expect(header).toHaveTextContent(SHORT_PRAYER.authorName)
    expect(header.textContent).toContain('—')
    const time = header.querySelector('time')!
    expect(time).toBeInTheDocument()
    expect(time).toHaveAttribute('dateTime', SHORT_PRAYER.createdAt)
  })
})
