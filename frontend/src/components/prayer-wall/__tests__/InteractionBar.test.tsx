import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { InteractionBar } from '../InteractionBar'
import type { PrayerRequest, PrayerReaction } from '@/types/prayer-wall'

const mockPrayer: PrayerRequest = {
  id: 'prayer-1',
  userId: 'user-1',
  authorName: 'Sarah',
  authorAvatarUrl: null,
  isAnonymous: false,
  content: 'Test prayer',
  isAnswered: false,
  answeredText: null,
  answeredAt: null,
  createdAt: '2026-02-24T14:30:00Z',
  lastActivityAt: '2026-02-24T14:30:00Z',
  prayingCount: 24,
  commentCount: 3,
}

const mockReactions: PrayerReaction = {
  prayerId: 'prayer-1',
  isPraying: false,
  isBookmarked: false,
}

function renderBar(
  overrides?: Partial<PrayerReaction>,
  callbacks?: Record<string, () => void>,
) {
  const reactions = overrides
    ? { ...mockReactions, ...overrides }
    : mockReactions
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <InteractionBar
        prayer={mockPrayer}
        reactions={reactions}
        onTogglePraying={callbacks?.onTogglePraying ?? vi.fn()}
        onToggleComments={callbacks?.onToggleComments ?? vi.fn()}
        onToggleBookmark={callbacks?.onToggleBookmark ?? vi.fn()}
        isCommentsOpen={false}
      />
    </MemoryRouter>,
  )
}

describe('InteractionBar', () => {
  it('renders 4 interaction buttons with counts', () => {
    renderBar()
    expect(screen.getByLabelText(/pray for this request/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/comments, 3 comments/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/log in to bookmark/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/share this prayer/i)).toBeInTheDocument()
  })

  it('Pray button calls onTogglePraying on click', async () => {
    const user = userEvent.setup()
    const onTogglePraying = vi.fn()
    renderBar(undefined, { onTogglePraying })
    await user.click(screen.getByLabelText(/pray for this request/i))
    expect(onTogglePraying).toHaveBeenCalledOnce()
  })

  it('Pray button shows active state (aria-pressed) when isPraying', () => {
    renderBar({ isPraying: true })
    const btn = screen.getByLabelText(/stop praying for this request/i)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('Comment button calls onToggleComments', async () => {
    const user = userEvent.setup()
    const onToggleComments = vi.fn()
    renderBar(undefined, { onToggleComments })
    await user.click(screen.getByLabelText(/comments, 3 comments/i))
    expect(onToggleComments).toHaveBeenCalledOnce()
  })

  it('Bookmark renders as Link to /login when logged out', () => {
    renderBar()
    const bookmarkLink = screen.getByLabelText(/log in to bookmark/i)
    expect(bookmarkLink).toHaveAttribute('href', '/login')
  })

  it('Share button opens share dropdown on click (desktop)', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByLabelText(/share this prayer/i))
    expect(screen.getByText('Copy link')).toBeInTheDocument()
  })
})
