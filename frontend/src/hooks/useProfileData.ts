import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSettings } from '@/services/settings-storage'
import { getFaithPoints, getStreakData } from '@/services/faith-points-storage'
import { getBadgeData } from '@/services/badge-storage'
import { getFriendsData } from '@/services/friends-storage'
import { getMoodEntries } from '@/services/mood-storage'
import { getLevelForPoints } from '@/constants/dashboard/levels'
import { getMockUserProfile, getMockBadgeData } from '@/mocks/profile-mock-data'
import { ALL_MOCK_USERS } from '@/mocks/friends-mock-data'
import type { BadgeData } from '@/types/dashboard'

export type ProfileRelationship =
  | 'self'
  | 'friend'
  | 'pending-outgoing'
  | 'pending-incoming'
  | 'blocked'
  | 'none'

export interface ProfileData {
  found: boolean
  isOwnProfile: boolean
  // User info
  displayName: string
  avatarId: string
  avatarUrl?: string
  userId: string
  bio?: string
  // Stats (null if privacy-hidden)
  totalPoints: number | null
  currentLevel: number | null
  levelName: string | null
  pointsToNextLevel: number | null
  currentStreak: number | null
  longestStreak: number | null
  daysActive: number | null
  // Privacy
  statsVisible: boolean
  privacyMessage?: string
  // Badges (always visible)
  badgeData: BadgeData
  // Relationship
  relationship: ProfileRelationship
}

const NOT_FOUND: ProfileData = {
  found: false,
  isOwnProfile: false,
  displayName: '',
  avatarId: 'default',
  userId: '',
  totalPoints: null,
  currentLevel: null,
  levelName: null,
  pointsToNextLevel: null,
  currentStreak: null,
  longestStreak: null,
  daysActive: null,
  statsVisible: false,
  badgeData: { earned: {}, newlyEarned: [], activityCounts: { pray: 0, journal: 0, meditate: 0, listen: 0, prayerWall: 0, encouragementsSent: 0, fullWorshipDays: 0 } },
  relationship: 'none',
}

export function useProfileData(userId: string): ProfileData {
  const { isAuthenticated, user } = useAuth()

  return useMemo(() => {
    if (!userId) return NOT_FOUND

    const isOwnProfile = isAuthenticated && user?.id === userId

    // --- Own profile: read from localStorage ---
    if (isOwnProfile) {
      const settings = getSettings()
      const faithPoints = getFaithPoints()
      const streakData = getStreakData()
      const badgeData = getBadgeData()
      const moodEntries = getMoodEntries()

      // Count unique dates for "Days Active"
      const uniqueDates = new Set(moodEntries.map((e) => e.date))

      return {
        found: true,
        isOwnProfile: true,
        displayName: settings.profile.displayName || user.name || 'User',
        avatarId: settings.profile.avatarId,
        avatarUrl: settings.profile.avatarUrl,
        userId,
        bio: settings.profile.bio,
        totalPoints: faithPoints.totalPoints,
        currentLevel: faithPoints.currentLevel,
        levelName: faithPoints.currentLevelName,
        pointsToNextLevel: faithPoints.pointsToNextLevel,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        daysActive: uniqueDates.size,
        statsVisible: true, // Always visible for own profile
        badgeData,
        relationship: 'self' as const,
      }
    }

    // --- Other user: look up in friends data and mock data ---
    const friendsData = getFriendsData()

    // Determine relationship
    let relationship: ProfileRelationship = 'none'
    if (friendsData.blocked.includes(userId)) {
      relationship = 'blocked'
    } else if (friendsData.friends.some((f) => f.id === userId)) {
      relationship = 'friend'
    } else if (friendsData.pendingOutgoing.some((r) => r.to.id === userId)) {
      relationship = 'pending-outgoing'
    } else if (friendsData.pendingIncoming.some((r) => r.from.id === userId)) {
      relationship = 'pending-incoming'
    }

    // Find user data — check friends list first, then ALL_MOCK_USERS
    const friendProfile = friendsData.friends.find((f) => f.id === userId)
      ?? friendsData.pendingIncoming.find((r) => r.from.id === userId)?.from
      ?? friendsData.pendingOutgoing.find((r) => r.to.id === userId)?.to
      ?? ALL_MOCK_USERS.find((u) => u.id === userId)

    if (!friendProfile) return NOT_FOUND

    // Get mock profile extras (avatar, badges, privacy)
    const mockProfile = getMockUserProfile(userId)
    const mockBadgeData = getMockBadgeData(userId)

    // Privacy check
    const privacy = mockProfile?.privacy ?? { streakVisibility: 'friends' }
    let statsVisible = false
    if (privacy.streakVisibility === 'everyone') {
      statsVisible = true
    } else if (privacy.streakVisibility === 'friends' && relationship === 'friend') {
      statsVisible = true
    }
    // 'only_me' or blocked → stats always hidden
    if (relationship === 'blocked') {
      statsVisible = false
    }

    const levelInfo = getLevelForPoints(friendProfile.faithPoints)

    return {
      found: true,
      isOwnProfile: false,
      displayName: friendProfile.displayName,
      avatarId: mockProfile?.avatarId ?? 'default',
      userId,
      totalPoints: statsVisible ? friendProfile.faithPoints : null,
      currentLevel: statsVisible ? friendProfile.level : null,
      levelName: statsVisible ? friendProfile.levelName : null,
      pointsToNextLevel: statsVisible ? levelInfo.pointsToNextLevel : null,
      currentStreak: statsVisible ? friendProfile.currentStreak : null,
      longestStreak: statsVisible ? friendProfile.currentStreak : null, // Mock data only has currentStreak
      daysActive: statsVisible ? (mockProfile?.daysActive ?? 0) : null,
      statsVisible,
      privacyMessage: statsVisible ? undefined : 'This user keeps their stats private',
      badgeData: mockBadgeData, // Badges always visible
      relationship,
    }
  }, [userId, isAuthenticated, user])
}
