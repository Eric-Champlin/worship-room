import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useProfileData } from '../useProfileData'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'

// Mock useAuth
const mockUser = { name: 'Eric', id: 'my-user-id' }
let mockIsAuthenticated = true

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockIsAuthenticated ? mockUser : null,
  }),
}))

function setOwnProfileData() {
  localStorage.setItem('wr_settings', JSON.stringify({
    profile: { displayName: 'Eric', avatarId: 'faith-cross', bio: 'Hello!', email: 'e@e.com' },
    notifications: {},
    privacy: { streakVisibility: 'friends', showOnGlobalLeaderboard: true, activityStatus: true, nudgePermission: 'friends', blockedUsers: [] },
  }))
  localStorage.setItem('wr_faith_points', JSON.stringify({
    totalPoints: 500, currentLevel: 3, currentLevelName: 'Blooming', pointsToNextLevel: 1000, lastUpdated: '2026-01-01',
  }))
  localStorage.setItem('wr_streak', JSON.stringify({
    currentStreak: 14, longestStreak: 30, lastActiveDate: '2026-03-18',
  }))
  localStorage.setItem('wr_badges', JSON.stringify({
    earned: { welcome: { earnedAt: '2026-01-01' }, level_1: { earnedAt: '2026-01-01' } },
    newlyEarned: [],
    activityCounts: { ...FRESH_ACTIVITY_COUNTS },
  }))
  localStorage.setItem('wr_mood_entries', JSON.stringify([
    { id: '1', date: '2026-03-18', mood: 4, moodLabel: 'Good', timestamp: Date.now(), verseSeen: 'Psalm 107:1' },
    { id: '2', date: '2026-03-17', mood: 3, moodLabel: 'Okay', timestamp: Date.now() - 86400000, verseSeen: 'Psalm 46:10' },
  ]))
}

function setFriendsData(blocked: string[] = []) {
  localStorage.setItem('wr_friends', JSON.stringify({
    friends: [
      { id: 'friend-sarah-m', displayName: 'Sarah M.', avatar: '', level: 4, levelName: 'Flourishing', currentStreak: 45, faithPoints: 3200, weeklyPoints: 145, lastActive: new Date().toISOString() },
    ],
    pendingIncoming: [
      { id: 'req-1', from: { id: 'user-emma-c', displayName: 'Emma C.', avatar: '', level: 2, levelName: 'Sprout', currentStreak: 5, faithPoints: 150, weeklyPoints: 30, lastActive: new Date().toISOString() }, to: { id: 'my-user-id', displayName: 'Eric', avatar: '', level: 1, levelName: 'Seedling', currentStreak: 0, faithPoints: 0, weeklyPoints: 0, lastActive: new Date().toISOString() }, sentAt: new Date().toISOString() },
    ],
    pendingOutgoing: [
      { id: 'req-2', from: { id: 'my-user-id', displayName: 'Eric', avatar: '', level: 1, levelName: 'Seedling', currentStreak: 0, faithPoints: 0, weeklyPoints: 0, lastActive: new Date().toISOString() }, to: { id: 'user-naomi-f', displayName: 'Naomi F.', avatar: '', level: 1, levelName: 'Seedling', currentStreak: 2, faithPoints: 40, weeklyPoints: 20, lastActive: new Date().toISOString() }, sentAt: new Date().toISOString() },
    ],
    blocked,
  }))
}

describe('useProfileData', () => {
  beforeEach(() => {
    localStorage.clear()
    mockIsAuthenticated = true
  })

  it('returns own profile data from localStorage', () => {
    setOwnProfileData()
    const { result } = renderHook(() => useProfileData('my-user-id'))
    expect(result.current.found).toBe(true)
    expect(result.current.isOwnProfile).toBe(true)
    expect(result.current.displayName).toBe('Eric')
    expect(result.current.avatarId).toBe('faith-cross')
    expect(result.current.totalPoints).toBe(500)
    expect(result.current.currentStreak).toBe(14)
    expect(result.current.daysActive).toBe(2)
    expect(result.current.relationship).toBe('self')
  })

  it('own profile always has statsVisible=true', () => {
    setOwnProfileData()
    const { result } = renderHook(() => useProfileData('my-user-id'))
    expect(result.current.statsVisible).toBe(true)
  })

  it('friend profile with privacy=friends is visible', () => {
    setFriendsData()
    const { result } = renderHook(() => useProfileData('friend-sarah-m'))
    expect(result.current.found).toBe(true)
    expect(result.current.statsVisible).toBe(true)
    expect(result.current.relationship).toBe('friend')
    expect(result.current.totalPoints).toBe(3200)
  })

  it('non-friend with privacy=friends hides stats', () => {
    setFriendsData()
    // user-caleb-w is a suggestion, not a friend
    const { result } = renderHook(() => useProfileData('user-caleb-w'))
    expect(result.current.found).toBe(true)
    expect(result.current.statsVisible).toBe(false)
    expect(result.current.privacyMessage).toBe('This user keeps their stats private')
    expect(result.current.totalPoints).toBeNull()
  })

  it('blocked user hides stats', () => {
    setFriendsData(['friend-sarah-m'])
    const { result } = renderHook(() => useProfileData('friend-sarah-m'))
    expect(result.current.relationship).toBe('blocked')
    expect(result.current.statsVisible).toBe(false)
  })

  it('unknown userId returns found=false', () => {
    const { result } = renderHook(() => useProfileData('nonexistent-user'))
    expect(result.current.found).toBe(false)
  })

  it('relationship detection: pending-outgoing', () => {
    setFriendsData()
    const { result } = renderHook(() => useProfileData('user-naomi-f'))
    expect(result.current.relationship).toBe('pending-outgoing')
  })

  it('relationship detection: pending-incoming', () => {
    setFriendsData()
    const { result } = renderHook(() => useProfileData('user-emma-c'))
    expect(result.current.relationship).toBe('pending-incoming')
  })

  it('badges are always visible regardless of privacy', () => {
    setFriendsData()
    const { result } = renderHook(() => useProfileData('user-caleb-w'))
    expect(result.current.badgeData).toBeTruthy()
    expect(result.current.badgeData.earned).toBeDefined()
  })

  it('mock user has plausible badge data matching level', () => {
    setFriendsData()
    const { result } = renderHook(() => useProfileData('friend-sarah-m'))
    // Sarah is level 4, should have level badges up to 4
    expect(result.current.badgeData.earned['level_4']).toBeDefined()
    expect(result.current.badgeData.earned['level_5']).toBeUndefined()
  })
})
