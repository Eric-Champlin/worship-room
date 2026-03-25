import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProfileHeader } from '../ProfileHeader'
import { ToastProvider } from '@/components/ui/Toast'
import type { ProfileData } from '@/hooks/useProfileData'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'

const BASE_PROFILE: ProfileData = {
  found: true,
  isOwnProfile: false,
  displayName: 'Sarah Miller',
  avatarId: 'nature-dove',
  userId: 'friend-sarah-m',
  totalPoints: 3200,
  currentLevel: 4,
  levelName: 'Flourishing',
  pointsToNextLevel: 800,
  currentStreak: 45,
  longestStreak: 45,
  daysActive: 213,
  statsVisible: true,
  badgeData: { earned: { welcome: { earnedAt: '2026-01-01' } }, newlyEarned: [], activityCounts: { ...FRESH_ACTIVITY_COUNTS } },
  relationship: 'friend',
}

const DEFAULT_HANDLERS = {
  onEncourage: vi.fn(),
  onAddFriend: vi.fn(),
  onAcceptRequest: vi.fn(),
  canEncourageToday: true,
}

function renderHeader(profileOverrides?: Partial<ProfileData>, handlerOverrides?: Partial<typeof DEFAULT_HANDLERS>) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ProfileHeader
          profileData={{ ...BASE_PROFILE, ...profileOverrides }}
          {...DEFAULT_HANDLERS}
          {...handlerOverrides}
        />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('ProfileHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders name and avatar', () => {
    renderHeader()
    expect(screen.getByText('Sarah Miller')).toBeTruthy()
  })

  it('shows "Edit Profile" on own profile', () => {
    renderHeader({ isOwnProfile: true, relationship: 'self' })
    expect(screen.getByText('Edit Profile')).toBeTruthy()
  })

  it('shows "Send Encouragement" on friend profile', () => {
    renderHeader({ relationship: 'friend' })
    expect(screen.getByText('Send Encouragement')).toBeTruthy()
  })

  it('shows "Add Friend" on non-friend', () => {
    renderHeader({ relationship: 'none' })
    const btn = screen.getByText('Add Friend')
    fireEvent.click(btn)
    expect(DEFAULT_HANDLERS.onAddFriend).toHaveBeenCalled()
  })

  it('shows "Request Sent" disabled for pending-outgoing', () => {
    renderHeader({ relationship: 'pending-outgoing' })
    const btn = screen.getByText('Request Sent')
    expect(btn).toBeDisabled()
  })

  it('shows "Accept Request" for pending-incoming', () => {
    renderHeader({ relationship: 'pending-incoming' })
    const btn = screen.getByText('Accept Request')
    fireEvent.click(btn)
    expect(DEFAULT_HANDLERS.onAcceptRequest).toHaveBeenCalled()
  })

  it('hides buttons for blocked', () => {
    renderHeader({ relationship: 'blocked' })
    expect(screen.queryByText('Send Encouragement')).toBeNull()
    expect(screen.queryByText('Add Friend')).toBeNull()
    expect(screen.queryByText('Edit Profile')).toBeNull()
  })

  it('hides level/streak when statsVisible=false', () => {
    renderHeader({ statsVisible: false, levelName: 'Flourishing', currentStreak: 45 })
    expect(screen.queryByText('Flourishing')).toBeNull()
    expect(screen.queryByText(/45-day streak/)).toBeNull()
  })

  it('truncates long name with title attribute', () => {
    const longName = 'A'.repeat(35)
    renderHeader({ displayName: longName })
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toContain('...')
    expect(heading.getAttribute('title')).toBe(longName)
  })

  it('shows Friends badge when relationship is friend', () => {
    renderHeader({ relationship: 'friend' })
    expect(screen.getByText('Friends')).toBeTruthy()
  })
})
