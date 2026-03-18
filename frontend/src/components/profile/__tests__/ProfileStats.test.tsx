import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileStats } from '../ProfileStats'
import type { ProfileData } from '@/hooks/useProfileData'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'

const BASE_PROFILE: ProfileData = {
  found: true,
  isOwnProfile: false,
  displayName: 'Sarah',
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
  badgeData: { earned: {}, newlyEarned: [], activityCounts: { ...FRESH_ACTIVITY_COUNTS } },
  relationship: 'friend',
}

function renderStats(overrides?: Partial<ProfileData>) {
  return render(<ProfileStats profileData={{ ...BASE_PROFILE, ...overrides }} />)
}

describe('ProfileStats', () => {
  it('renders 3 stat cards with values', () => {
    renderStats()
    expect(screen.getByText('3,200')).toBeTruthy()
    expect(screen.getByText('Faith Points')).toBeTruthy()
    expect(screen.getByText('213')).toBeTruthy()
    expect(screen.getByText('Days Active')).toBeTruthy()
    expect(screen.getByText('Flourishing')).toBeTruthy()
    expect(screen.getByText('Level 4')).toBeTruthy()
  })

  it('shows privacy message when statsVisible=false', () => {
    renderStats({ statsVisible: false, privacyMessage: 'This user keeps their stats private' })
    expect(screen.getByText('This user keeps their stats private')).toBeTruthy()
    expect(screen.queryByText('Faith Points')).toBeNull()
  })
})
