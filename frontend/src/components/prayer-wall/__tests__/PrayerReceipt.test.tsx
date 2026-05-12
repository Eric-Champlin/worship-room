import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render as rtlRender, screen, type RenderOptions } from '@testing-library/react'

import { ToastProvider } from '@/components/ui/Toast'
import type { AuthUser } from '@/types/auth'
import type { PrayerReceiptResponse } from '@/types/prayer-receipt'
import type { UserSettings } from '@/types/settings'

// PrayerReceipt uses useToast (Spec 6.1 share-rate-limit 429 soft block).
// Wrap every render with ToastProvider so the hook resolves.
function render(ui: React.ReactElement, options?: RenderOptions) {
  return rtlRender(ui, {
    wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    ...options,
  })
}

// Mocks must be hoisted before imports of the SUT
const mockAuth = vi.hoisted(() => ({
  current: null as AuthUser | null,
}))
const mockSettings = vi.hoisted(() => ({
  current: {
    profile: { displayName: '', avatarId: 'default', bio: '', email: '' },
    notifications: {} as UserSettings['notifications'],
    privacy: {} as UserSettings['privacy'],
    prayerWall: { prayerReceiptsVisible: true },
  } as UserSettings,
}))
const mockReceipt = vi.hoisted(() => ({
  data: null as PrayerReceiptResponse | null,
  loading: false,
  error: null as null,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: !!mockAuth.current,
    user: mockAuth.current,
    isAdmin: !!mockAuth.current?.isAdmin,
    isBooting: false,
    login: vi.fn(),
    register: vi.fn(),
    requestPasswordReset: vi.fn(),
    logout: vi.fn(),
    simulateLogin: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: mockSettings.current,
    updateProfile: vi.fn(),
    updateNotifications: vi.fn(),
    updatePrivacy: vi.fn(),
    unblockUser: vi.fn(),
    updatePrayerWall: vi.fn(),
  }),
}))

vi.mock('@/hooks/usePrayerReceipt', () => ({
  usePrayerReceipt: (_postId: string, enabled: boolean) =>
    enabled
      ? {
          data: mockReceipt.data,
          loading: mockReceipt.loading,
          error: mockReceipt.error,
          refetch: vi.fn(),
        }
      : { data: null, loading: false, error: null, refetch: vi.fn() },
}))

import { PrayerReceipt } from '../PrayerReceipt'

const AUTHOR_ID = 'author-1'
const POST_ID = 'post-1'

function makeUser(id: string): AuthUser {
  return {
    id,
    name: 'Author',
    displayName: 'Author',
    email: 'a@test',
    firstName: 'Author',
    lastName: 'Person',
    isAdmin: false,
    timezone: null,
    isEmailVerified: false,
    termsVersion: null,
    privacyVersion: null,
  }
}

describe('PrayerReceipt (Spec 6.1)', () => {
  beforeEach(() => {
    mockAuth.current = makeUser(AUTHOR_ID)
    mockSettings.current = {
      ...mockSettings.current,
      prayerWall: { prayerReceiptsVisible: true },
    }
    mockReceipt.data = null
    mockReceipt.loading = false
  })

  it('renders nothing when prayingCount=0 (Gate-35 hidden at zero)', () => {
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={0} />,
    )
    // The wrapper renders ToastProvider's empty toast container; assert the
    // receipt itself is absent rather than the whole container being empty.
    expect(screen.queryByTestId('prayer-receipt')).toBeNull()
    expect(screen.queryByTestId('prayer-receipt-open-modal')).toBeNull()
  })

  it('renders nothing when viewer is not the author (W30 defense in depth)', () => {
    mockAuth.current = makeUser('someone-else')
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={3} />,
    )
    expect(screen.queryByTestId('prayer-receipt')).toBeNull()
    expect(screen.queryByTestId('prayer-receipt-open-modal')).toBeNull()
  })

  it('renders nothing when settings.prayerWall.prayerReceiptsVisible=false (W25)', () => {
    mockSettings.current = {
      ...mockSettings.current,
      prayerWall: { prayerReceiptsVisible: false },
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={3} />,
    )
    expect(screen.queryByTestId('prayer-receipt')).toBeNull()
    expect(screen.queryByTestId('prayer-receipt-open-modal')).toBeNull()
  })

  it('renders "1 person is praying for you" when prayingCount=1', () => {
    mockReceipt.data = {
      totalCount: 1,
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend One', avatarUrl: null },
      ],
      anonymousCount: 0,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={1} />,
    )
    expect(screen.getByText('1 person is praying for you')).toBeInTheDocument()
  })

  it('renders "N people are praying for you" when prayingCount > 1', () => {
    mockReceipt.data = {
      totalCount: 5,
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Friend A', avatarUrl: null },
        { userId: 'f2', displayName: 'Friend B', avatarUrl: null },
      ],
      anonymousCount: 3,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={5} />,
    )
    expect(screen.getByText('5 people are praying for you')).toBeInTheDocument()
  })

  it('renders at most 3 avatars (friends + anonymous slots, capped)', () => {
    mockReceipt.data = {
      totalCount: 10,
      attributedIntercessors: [
        { userId: 'f1', displayName: 'A', avatarUrl: null },
        { userId: 'f2', displayName: 'B', avatarUrl: null },
        { userId: 'f3', displayName: 'C', avatarUrl: null },
        { userId: 'f4', displayName: 'D', avatarUrl: null },
      ],
      anonymousCount: 6,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={10} />,
    )
    const friendAvatars = screen.queryAllByTestId('prayer-receipt-avatar-friend')
    const anonAvatars = screen.queryAllByTestId('prayer-receipt-avatar-anonymous')
    expect(friendAvatars.length + anonAvatars.length).toBeLessThanOrEqual(3)
  })

  it('sets role="status" on the receipt body and has aria-live="polite"', () => {
    mockReceipt.data = {
      totalCount: 1,
      attributedIntercessors: [],
      anonymousCount: 1,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={1} />,
    )
    // role="status" is on the FrostedCard wrapper; aria-live="polite" is on the inner body
    const body = screen.getByTestId('prayer-receipt')
    expect(body).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByLabelText('Prayer receipt')).toBeInTheDocument()
  })

  it('renders the daily verse in Lora italic (font-serif italic class)', () => {
    mockReceipt.data = {
      totalCount: 1,
      attributedIntercessors: [],
      anonymousCount: 1,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={1} />,
    )
    const verse = screen.getByTestId('prayer-receipt-verse')
    expect(verse.className).toContain('font-serif')
    expect(verse.className).toContain('italic')
  })

  it('uses "A friend" accessible name for non-friend avatar slots', () => {
    mockReceipt.data = {
      totalCount: 3,
      attributedIntercessors: [],
      anonymousCount: 3,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={3} />,
    )
    const anonAvatars = screen.queryAllByTestId('prayer-receipt-avatar-anonymous')
    expect(anonAvatars.length).toBeGreaterThan(0)
    for (const el of anonAvatars) {
      expect(el).toHaveAttribute('aria-label', 'A friend')
    }
  })

  it('exposes friend displayName as accessible name on friend avatar', () => {
    mockReceipt.data = {
      totalCount: 1,
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Sarah', avatarUrl: null },
      ],
      anonymousCount: 0,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={1} />,
    )
    const friendAvatar = screen.getByTestId('prayer-receipt-avatar-friend')
    expect(friendAvatar).toHaveAttribute('aria-label', 'Sarah')
  })

  // --- Master plan AC: "Avatar stack has accessible names listing the first 3 intercessors." ---

  it('trigger button announces first 3 intercessor names + count + action via aria-label', () => {
    mockReceipt.data = {
      totalCount: 5,
      attributedIntercessors: [
        { userId: 'f1', displayName: 'Sarah', avatarUrl: null },
        { userId: 'f2', displayName: 'David', avatarUrl: null },
      ],
      anonymousCount: 3,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={5} />,
    )
    const button = screen.getByTestId('prayer-receipt-open-modal')
    const label = button.getAttribute('aria-label') ?? ''
    // First 3 intercessors named (2 friends + 1 anon slot to fill out the avatar stack).
    expect(label).toContain('Sarah')
    expect(label).toContain('David')
    expect(label).toContain('a friend')
    // Count + action.
    expect(label).toContain('5 people are praying for you')
    expect(label.toLowerCase()).toContain('tap to see')
  })

  it('trigger button aria-label uses plural "N friends" when multiple anon slots present', () => {
    mockReceipt.data = {
      totalCount: 4,
      attributedIntercessors: [],
      anonymousCount: 4,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={4} />,
    )
    const button = screen.getByTestId('prayer-receipt-open-modal')
    const label = button.getAttribute('aria-label') ?? ''
    expect(label).toContain('3 friends') // 3 anon slots in the 3-slot stack
    expect(label).toContain('4 people are praying for you')
  })

  // Universal Rule 9: 44×44px share button touch target. The receipt header is
  // a flex row sharing space with the open-modal trigger; without shrink-0 the
  // share button compresses below 44px wide at narrow viewports (caught in
  // 2026-05-12 verify-with-playwright run at 375px viewport → 28.8px width).
  it('share button has shrink-0 to preserve 44×44 touch target at narrow viewports', () => {
    mockReceipt.data = {
      totalCount: 1,
      attributedIntercessors: [],
      anonymousCount: 1,
    }
    render(
      <PrayerReceipt postId={POST_ID} postAuthorId={AUTHOR_ID} prayingCount={1} />,
    )
    const shareButton = screen.getByTestId('prayer-receipt-share')
    expect(shareButton.className).toContain('h-11')
    expect(shareButton.className).toContain('w-11')
    expect(shareButton.className).toContain('shrink-0')
  })
})
