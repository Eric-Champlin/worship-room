import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { InteractionBar } from '../InteractionBar'
import type { PrayerRequest, PrayerReaction } from '@/types/prayer-wall'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), logout: vi.fn() }),
}))

const mockPrayer: PrayerRequest = {
  id: 'prayer-1',
  userId: 'user-1',
  authorName: 'Sarah',
  authorAvatarUrl: null,
  isAnonymous: false,
  content: 'Test prayer',
  category: 'health',
  postType: 'prayer_request',
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

  it('Bookmark renders as button when logged out', () => {
    renderBar()
    const bookmarkBtn = screen.getByLabelText(/log in to bookmark/i)
    expect(bookmarkBtn.tagName).toBe('BUTTON')
  })

  it('Share button opens share dropdown on click (desktop)', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(screen.getByLabelText(/share this prayer/i))
    expect(screen.getByText('Copy link')).toBeInTheDocument()
  })

  // Spec 4.6 — encouragement per-type behavior
  describe('encouragement post type', () => {
    function renderEncouragement(
      overrides?: Partial<PrayerReaction>,
      callbacks?: Record<string, () => void>,
    ) {
      const encouragement: PrayerRequest = {
        ...mockPrayer,
        id: 'prayer-enc',
        postType: 'encouragement',
        category: 'other',
        prayingCount: 4,
        commentCount: 0,
      }
      const reactions = overrides ? { ...mockReactions, ...overrides } : mockReactions
      return render(
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <InteractionBar
            prayer={encouragement}
            reactions={reactions}
            onTogglePraying={callbacks?.onTogglePraying ?? vi.fn()}
            onToggleComments={callbacks?.onToggleComments ?? vi.fn()}
            onToggleBookmark={callbacks?.onToggleBookmark ?? vi.fn()}
            isCommentsOpen={false}
          />
        </MemoryRouter>,
      )
    }

    it('renders Heart icon (not HandHelping) for encouragement', () => {
      renderEncouragement()
      const reactionButton = screen.getByLabelText(/send thanks for this encouragement/i)
      const icon = reactionButton.querySelector('svg[aria-hidden="true"]')
      expect(icon).toBeInTheDocument()
      const className = icon!.getAttribute('class') ?? ''
      expect(/lucide-heart/.test(className)).toBe(true)
    })

    it('reaction button reads "Send thanks for this encouragement" when not praying', () => {
      renderEncouragement()
      expect(
        screen.getByLabelText(/send thanks for this encouragement \(4 praying\)/i),
      ).toBeInTheDocument()
    })

    it('reaction button reads "Remove thanks" when active', () => {
      renderEncouragement({ isPraying: true })
      expect(screen.getByLabelText(/remove thanks \(4 praying\)/i)).toBeInTheDocument()
    })

    it('comment button is ABSENT from DOM for encouragement', () => {
      renderEncouragement()
      expect(screen.queryByLabelText(/comments,/i)).not.toBeInTheDocument()
    })

    it('comment button IS present for prayer_request, testimony, question, discussion', () => {
      const types: Array<PrayerRequest['postType']> = [
        'prayer_request',
        'testimony',
        'question',
        'discussion',
      ]
      for (const postType of types) {
        const { unmount } = render(
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <InteractionBar
              prayer={{ ...mockPrayer, postType }}
              reactions={mockReactions}
              onTogglePraying={vi.fn()}
              onToggleComments={vi.fn()}
              onToggleBookmark={vi.fn()}
              isCommentsOpen={false}
            />
          </MemoryRouter>,
        )
        expect(screen.getByLabelText(/comments,/i)).toBeInTheDocument()
        unmount()
      }
    })

    it('bookmark and share buttons remain present for encouragement', () => {
      renderEncouragement()
      expect(screen.getByLabelText(/log in to bookmark/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/share this prayer/i)).toBeInTheDocument()
    })

    it('floating "+1 thanks" text appears on tap for encouragement', async () => {
      const user = userEvent.setup()
      renderEncouragement()
      await user.click(screen.getByLabelText(/send thanks for this encouragement/i))
      expect(await screen.findByText('+1 thanks')).toBeInTheDocument()
    })

    it('floating "+1 prayer" text appears on tap for prayer_request (regression guard)', async () => {
      const user = userEvent.setup()
      renderBar()
      await user.click(screen.getByLabelText(/pray for this request/i))
      expect(await screen.findByText('+1 prayer')).toBeInTheDocument()
    })
  })

  describe('ceremony animation', () => {
    it('animation elements appear on pray click when not praying', async () => {
      const user = userEvent.setup()
      renderBar()
      await user.click(screen.getByLabelText(/pray for this request/i))

      const floatText = screen.getByText('+1 prayer')
      expect(floatText).toBeInTheDocument()
      expect(floatText).toHaveAttribute('aria-hidden', 'true')
      expect(floatText.className).toContain('pointer-events-none')
    })

    it('no animation elements on untoggle (isPraying=true)', async () => {
      const user = userEvent.setup()
      renderBar({ isPraying: true })
      await user.click(screen.getByLabelText(/stop praying for this request/i))

      expect(screen.queryByText('+1 prayer')).not.toBeInTheDocument()
    })

    it('ripple and float text have aria-hidden', async () => {
      const user = userEvent.setup()
      renderBar()
      await user.click(screen.getByLabelText(/pray for this request/i))

      const wrapper = screen.getByText('+1 prayer').parentElement!
      const hiddenSpans = wrapper.querySelectorAll('span[aria-hidden="true"]')
      // At least ripple + float text = 2 aria-hidden spans
      expect(hiddenSpans.length).toBeGreaterThanOrEqual(2)
    })

    it('pray button preserves aria-pressed after animation click', async () => {
      const user = userEvent.setup()
      renderBar()
      const btn = screen.getByLabelText(/pray for this request/i)
      expect(btn).toHaveAttribute('aria-pressed', 'false')

      await user.click(btn)
      // aria-pressed is controlled by isPraying prop, not animation state
      expect(btn).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
