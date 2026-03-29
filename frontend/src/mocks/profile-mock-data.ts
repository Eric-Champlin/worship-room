import type { BadgeData, BadgeEarnedEntry } from '@/types/dashboard'
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges'
import { ALL_MOCK_USERS } from './friends-mock-data'

// Map each mock user to a unique avatar preset
const MOCK_USER_AVATARS: Record<string, string> = {
  'friend-sarah-m': 'nature-dove',
  'friend-james-k': 'faith-cross',
  'friend-maria-l': 'water-wave',
  'friend-david-r': 'nature-tree',
  'friend-rachel-t': 'light-star',
  'friend-daniel-p': 'faith-flame',
  'friend-grace-h': 'water-raindrop',
  'friend-matthew-s': 'nature-mountain',
  'friend-hannah-w': 'light-rainbow',
  'friend-joshua-b': 'faith-crown',
  'user-emma-c': 'water-anchor',
  'user-luke-a': 'nature-sunrise',
  'user-naomi-f': 'light-candle',
  'user-caleb-w': 'water-river',
  'user-lydia-p': 'light-lighthouse',
  'user-micah-j': 'faith-fish',
}

// Generate plausible earned badges based on level and streak
function generateMockBadges(level: number, streak: number): Record<string, BadgeEarnedEntry> {
  const earned: Record<string, BadgeEarnedEntry> = {}
  const now = new Date().toISOString()

  // Welcome badge — everyone
  earned['welcome'] = { earnedAt: now }

  // Level badges up to their level
  for (let l = 1; l <= level; l++) {
    earned[`level_${l}`] = { earnedAt: now }
  }

  // Streak badges up to their streak
  const streakThresholds = [7, 14, 30, 60, 90, 180, 365]
  for (const threshold of streakThresholds) {
    if (streak >= threshold) {
      earned[`streak_${threshold}`] = { earnedAt: now }
    }
  }

  // Activity badges based on level (higher level → more activities)
  if (level >= 2) {
    earned['first_prayer'] = { earnedAt: now }
    earned['first_journal'] = { earnedAt: now }
    earned['first_listen'] = { earnedAt: now }
  }
  if (level >= 3) {
    earned['first_meditate'] = { earnedAt: now }
    earned['first_friend'] = { earnedAt: now }
    earned['first_prayerwall'] = { earnedAt: now }
  }
  if (level >= 4) {
    earned['journal_50'] = { earnedAt: now }
    earned['meditate_25'] = { earnedAt: now }
    earned['encourage_10'] = { earnedAt: now }
  }
  if (level >= 5) {
    earned['prayer_100'] = { earnedAt: now }
    earned['listen_50'] = { earnedAt: now }
    earned['friends_10'] = { earnedAt: now }
    earned['full_worship_day'] = { earnedAt: now, count: 3 }
  }
  if (level >= 6) {
    earned['journal_100'] = { earnedAt: now }
    earned['encourage_50'] = { earnedAt: now }
    earned['full_worship_day'] = { earnedAt: now, count: 12 }
  }

  return earned
}

export interface MockUserProfile {
  avatarId: string
  earnedBadges: Record<string, BadgeEarnedEntry>
  daysActive: number
  privacy: { streakVisibility: 'everyone' | 'friends' | 'only_me' }
}

export function getMockUserProfile(userId: string): MockUserProfile | null {
  const user = ALL_MOCK_USERS.find((u) => u.id === userId)
  if (!user) return null

  return {
    avatarId: MOCK_USER_AVATARS[userId] || 'nature-dove',
    earnedBadges: generateMockBadges(user.level, user.currentStreak),
    daysActive: Math.ceil(user.faithPoints / 15),
    privacy: { streakVisibility: 'friends' },
  }
}

export function getMockBadgeData(userId: string): BadgeData {
  const profile = getMockUserProfile(userId)
  if (!profile) {
    return { earned: {}, newlyEarned: [], activityCounts: { ...FRESH_ACTIVITY_COUNTS } }
  }
  return {
    earned: profile.earnedBadges,
    newlyEarned: [],
    activityCounts: { ...FRESH_ACTIVITY_COUNTS },
  }
}
