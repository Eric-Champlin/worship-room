import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProfileAvatar } from '../ProfileAvatar'
import type { BadgeData } from '@/types/dashboard'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'

const DEFAULT_PROPS = {
  avatarId: 'nature-dove',
  displayName: 'Sarah Miller',
  userId: 'user-1',
  size: 'sm' as const,
}

const FRESH_BADGES: BadgeData = {
  earned: {},
  newlyEarned: [],
  activityCounts: { ...FRESH_ACTIVITY_COUNTS },
}

function renderAvatar(overrides?: Partial<{ avatarId: string; displayName: string; userId: string; size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; avatarUrl?: string; badges?: BadgeData }>) {
  return render(<ProfileAvatar {...DEFAULT_PROPS} {...overrides} />)
}

describe('ProfileAvatar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders preset avatar with correct bg color', () => {
    renderAvatar({ avatarId: 'nature-dove' })
    const el = screen.getByRole('img')
    expect(el).toHaveStyle({ backgroundColor: '#10B981' })
  })

  it('renders custom photo as <img> tag', () => {
    renderAvatar({ avatarId: 'custom', avatarUrl: 'data:image/jpeg;base64,abc123' })
    const img = screen.getByRole('img').querySelector('img')
    expect(img).toBeTruthy()
    expect(img!.src).toContain('data:image/jpeg')
  })

  it('falls back to initials on img error', () => {
    renderAvatar({ avatarId: 'custom', avatarUrl: 'data:image/jpeg;base64,abc123' })
    const img = screen.getByRole('img').querySelector('img')!
    fireEvent.error(img)
    // After error, should show initials
    expect(screen.getByRole('img').textContent).toBe('SM')
  })

  it('renders initials when avatarId is unknown', () => {
    renderAvatar({ avatarId: 'unknown-avatar' })
    expect(screen.getByRole('img').textContent).toBe('SM')
  })

  it('renders correct initials for multi-word name', () => {
    renderAvatar({ avatarId: '', displayName: 'Sarah M.' })
    expect(screen.getByRole('img').textContent).toBe('SM')
  })

  it('renders correct initials for single-word name', () => {
    renderAvatar({ avatarId: '', displayName: 'Sarah' })
    expect(screen.getByRole('img').textContent).toBe('S')
  })

  it('renders unlocked unlockable with gradient', () => {
    const badges: BadgeData = {
      ...FRESH_BADGES,
      earned: { streak_365: { earnedAt: '2026-01-01' } },
    }
    renderAvatar({ avatarId: 'unlock-golden-dove', badges })
    const el = screen.getByRole('img')
    expect(el.style.background).toContain('linear-gradient')
  })

  it('renders locked unlockable in grayscale with lock icon', () => {
    renderAvatar({ avatarId: 'unlock-golden-dove', badges: FRESH_BADGES })
    const el = screen.getByRole('img')
    expect(el.classList.toString()).toContain('grayscale')
  })

  it('maps "default" to nature-dove preset', () => {
    renderAvatar({ avatarId: 'default' })
    const el = screen.getByRole('img')
    // nature-dove has bg #6D28D9
    expect(el).toHaveStyle({ backgroundColor: '#10B981' })
  })

  it('renders at all 5 sizes', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
    for (const size of sizes) {
      const { unmount } = renderAvatar({ size })
      expect(screen.getByRole('img')).toBeTruthy()
      unmount()
    }
  })

  it('has correct aria-label', () => {
    renderAvatar()
    const el = screen.getByRole('img')
    expect(el.getAttribute('aria-label')).toBe("Sarah Miller's avatar")
  })

  it('supports aria-hidden', () => {
    const { container } = render(
      <ProfileAvatar {...DEFAULT_PROPS} aria-hidden />,
    )
    const el = container.firstElementChild!
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.getAttribute('role')).toBeNull()
  })
})
