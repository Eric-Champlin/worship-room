import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { AuthUser } from '@/types/auth'
import type { UserSettings } from '@/types/settings'

// Mocks (hoisted)
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: !!mockAuth.current,
    user: mockAuth.current,
    isAdmin: false,
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

import { PrayerReceiptMini } from '../PrayerReceiptMini'

const AUTHOR_ID = 'author-1'

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

describe('PrayerReceiptMini (Spec 6.1 dashboard)', () => {
  beforeEach(() => {
    mockAuth.current = makeUser(AUTHOR_ID)
    mockSettings.current = {
      ...mockSettings.current,
      prayerWall: { prayerReceiptsVisible: true },
    }
  })

  it('renders Copy Deck "N people are praying for you" when prayingCount > 0 (Gate-34)', () => {
    render(<PrayerReceiptMini postAuthorId={AUTHOR_ID} prayingCount={3} />)
    const mini = screen.getByTestId('prayer-receipt-mini')
    expect(mini).toHaveTextContent('3 people are praying for you')
    // Some verse reference appears (we don't pin which one because day-of-year varies)
    expect(mini.textContent).toMatch(/\w+\s\d+:\d+/)
  })

  it('renders Copy Deck "1 person is praying for you" when prayingCount === 1 (Gate-34)', () => {
    render(<PrayerReceiptMini postAuthorId={AUTHOR_ID} prayingCount={1} />)
    expect(screen.getByTestId('prayer-receipt-mini')).toHaveTextContent(
      '1 person is praying for you',
    )
  })

  it('renders nothing when prayingCount === 0 (Gate-35)', () => {
    const { container } = render(
      <PrayerReceiptMini postAuthorId={AUTHOR_ID} prayingCount={0} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when viewer is NOT the author (W30)', () => {
    mockAuth.current = makeUser('someone-else')
    const { container } = render(
      <PrayerReceiptMini postAuthorId={AUTHOR_ID} prayingCount={5} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when settings.prayerWall.prayerReceiptsVisible=false', () => {
    mockSettings.current = {
      ...mockSettings.current,
      prayerWall: { prayerReceiptsVisible: false },
    }
    const { container } = render(
      <PrayerReceiptMini postAuthorId={AUTHOR_ID} prayingCount={3} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders NO avatar elements (D-Dashboard-mini / Gate-32 defense in depth)', () => {
    render(<PrayerReceiptMini postAuthorId={AUTHOR_ID} prayingCount={5} />)
    const mini = screen.getByTestId('prayer-receipt-mini')
    // No img elements
    expect(mini.querySelectorAll('img').length).toBe(0)
    // No elements with role="img"
    expect(mini.querySelectorAll('[role="img"]').length).toBe(0)
    // No avatar testids
    expect(mini.querySelectorAll('[data-testid*="avatar"]').length).toBe(0)
  })
})
