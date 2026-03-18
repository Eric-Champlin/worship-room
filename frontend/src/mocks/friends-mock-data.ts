import type { FriendProfile, FriendRequest, FriendsData } from '@/types/dashboard'

// Helper to create relative timestamps
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
}

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

// 10 mock friends matching spec table exactly
export const MOCK_FRIENDS: FriendProfile[] = [
  {
    id: 'friend-sarah-m',
    displayName: 'Sarah M.',
    avatar: '',
    level: 4,
    levelName: 'Flourishing',
    currentStreak: 45,
    faithPoints: 3200,
    weeklyPoints: 145,
    lastActive: hoursAgo(2),
  },
  {
    id: 'friend-james-k',
    displayName: 'James K.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 12,
    faithPoints: 850,
    weeklyPoints: 95,
    lastActive: daysAgo(1),
  },
  {
    id: 'friend-maria-l',
    displayName: 'Maria L.',
    avatar: '',
    level: 5,
    levelName: 'Oak',
    currentStreak: 90,
    faithPoints: 6500,
    weeklyPoints: 170,
    lastActive: minutesAgo(30),
  },
  {
    id: 'friend-david-r',
    displayName: 'David R.',
    avatar: '',
    level: 2,
    levelName: 'Sprout',
    currentStreak: 3,
    faithPoints: 280,
    weeklyPoints: 40,
    lastActive: daysAgo(3),
  },
  {
    id: 'friend-rachel-t',
    displayName: 'Rachel T.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 0,
    faithPoints: 720,
    weeklyPoints: 0,
    lastActive: daysAgo(5),
  },
  {
    id: 'friend-daniel-p',
    displayName: 'Daniel P.',
    avatar: '',
    level: 1,
    levelName: 'Seedling',
    currentStreak: 7,
    faithPoints: 85,
    weeklyPoints: 55,
    lastActive: hoursAgo(6),
  },
  {
    id: 'friend-grace-h',
    displayName: 'Grace H.',
    avatar: '',
    level: 4,
    levelName: 'Flourishing',
    currentStreak: 60,
    faithPoints: 3800,
    weeklyPoints: 160,
    lastActive: hoursAgo(1),
  },
  {
    id: 'friend-matthew-s',
    displayName: 'Matthew S.',
    avatar: '',
    level: 2,
    levelName: 'Sprout',
    currentStreak: 0,
    faithPoints: 200,
    weeklyPoints: 0,
    lastActive: daysAgo(8),
  },
  {
    id: 'friend-hannah-w',
    displayName: 'Hannah W.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 28,
    faithPoints: 1100,
    weeklyPoints: 110,
    lastActive: hoursAgo(4),
  },
  {
    id: 'friend-joshua-b',
    displayName: 'Joshua B.',
    avatar: '',
    level: 6,
    levelName: 'Lighthouse',
    currentStreak: 180,
    faithPoints: 12000,
    weeklyPoints: 170,
    lastActive: minutesAgo(15),
  },
]

// Pending incoming request senders
const EMMA_C: FriendProfile = {
  id: 'user-emma-c',
  displayName: 'Emma C.',
  avatar: '',
  level: 2,
  levelName: 'Sprout',
  currentStreak: 5,
  faithPoints: 150,
  weeklyPoints: 30,
  lastActive: hoursAgo(3),
}

const LUKE_A: FriendProfile = {
  id: 'user-luke-a',
  displayName: 'Luke A.',
  avatar: '',
  level: 3,
  levelName: 'Blooming',
  currentStreak: 14,
  faithPoints: 600,
  weeklyPoints: 80,
  lastActive: hoursAgo(1),
}

// Pending outgoing request recipient
const NAOMI_F: FriendProfile = {
  id: 'user-naomi-f',
  displayName: 'Naomi F.',
  avatar: '',
  level: 1,
  levelName: 'Seedling',
  currentStreak: 2,
  faithPoints: 40,
  weeklyPoints: 20,
  lastActive: daysAgo(2),
}

// Suggestions ("People You May Know")
export const MOCK_SUGGESTIONS: FriendProfile[] = [
  {
    id: 'user-caleb-w',
    displayName: 'Caleb W.',
    avatar: '',
    level: 2,
    levelName: 'Sprout',
    currentStreak: 8,
    faithPoints: 220,
    weeklyPoints: 45,
    lastActive: hoursAgo(5),
  },
  {
    id: 'user-lydia-p',
    displayName: 'Lydia P.',
    avatar: '',
    level: 3,
    levelName: 'Blooming',
    currentStreak: 19,
    faithPoints: 780,
    weeklyPoints: 90,
    lastActive: hoursAgo(2),
  },
  {
    id: 'user-micah-j',
    displayName: 'Micah J.',
    avatar: '',
    level: 1,
    levelName: 'Seedling',
    currentStreak: 1,
    faithPoints: 30,
    weeklyPoints: 15,
    lastActive: daysAgo(1),
  },
]

// All unique mock users for search (excludes current user — caller must filter)
export const ALL_MOCK_USERS: FriendProfile[] = [
  ...MOCK_FRIENDS,
  EMMA_C,
  LUKE_A,
  NAOMI_F,
  ...MOCK_SUGGESTIONS,
]

/**
 * Creates default seeded FriendsData for a new user.
 * The `currentUserId` is used as the `to` field in incoming requests
 * and the `from` field in outgoing requests.
 */
export function createDefaultFriendsData(currentUserId: string): FriendsData {
  const currentUserProfile: FriendProfile = {
    id: currentUserId,
    displayName: 'You',
    avatar: '',
    level: 1,
    levelName: 'Seedling',
    currentStreak: 0,
    faithPoints: 0,
    weeklyPoints: 0,
    lastActive: new Date().toISOString(),
  }

  const pendingIncoming: FriendRequest[] = [
    {
      id: 'req-emma-c',
      from: EMMA_C,
      to: currentUserProfile,
      sentAt: hoursAgo(12),
      message: 'Hey! Saw you on the Prayer Wall.',
    },
    {
      id: 'req-luke-a',
      from: LUKE_A,
      to: currentUserProfile,
      sentAt: daysAgo(1),
    },
  ]

  const pendingOutgoing: FriendRequest[] = [
    {
      id: 'req-to-naomi-f',
      from: currentUserProfile,
      to: NAOMI_F,
      sentAt: hoursAgo(6),
    },
  ]

  return {
    friends: [...MOCK_FRIENDS],
    pendingIncoming,
    pendingOutgoing,
    blocked: [],
  }
}
