import type { NotificationEntry } from '@/types/dashboard'

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * 13 mock notifications spanning 7 days. 6 unread, 7 read.
 * Names reference friends from friends-mock-data.ts.
 */
export const MOCK_NOTIFICATIONS: NotificationEntry[] = [
  {
    id: 'notif-1',
    type: 'encouragement',
    message: 'Sarah M. sent: Praying for you',
    read: false,
    timestamp: daysAgo(0),
    actionUrl: '/friends',
  },
  {
    id: 'notif-2',
    type: 'friend_request',
    message: 'David R. wants to be your friend',
    read: false,
    timestamp: daysAgo(0),
    actionUrl: '/friends',
    actionData: { friendRequestId: 'friend-david-r' },
  },
  {
    id: 'notif-13',
    type: 'monthly_report',
    message: 'Your February Faith Journey is ready!',
    read: false,
    timestamp: daysAgo(0),
    actionUrl: '/insights/monthly',
  },
  {
    id: 'notif-3',
    type: 'level_up',
    message: 'You leveled up to Sprout!',
    read: false,
    timestamp: daysAgo(1),
    actionUrl: '/',
  },
  {
    id: 'notif-4',
    type: 'friend_milestone',
    message: 'Maria L. hit a 14-day streak!',
    read: false,
    timestamp: daysAgo(1),
    actionUrl: '/friends',
  },
  {
    id: 'notif-5',
    type: 'nudge',
    message: 'James K. is thinking of you',
    read: false,
    timestamp: daysAgo(2),
    actionUrl: '/',
  },
  {
    id: 'notif-6',
    type: 'milestone',
    message: 'You earned First Light!',
    read: true,
    timestamp: daysAgo(2),
    actionUrl: '/',
    actionData: { badgeName: 'First Light' },
  },
  {
    id: 'notif-7',
    type: 'encouragement',
    message: 'Grace H. sent: Keep going!',
    read: true,
    timestamp: daysAgo(3),
    actionUrl: '/friends',
  },
  {
    id: 'notif-8',
    type: 'weekly_recap',
    message: 'Your weekly recap is ready',
    read: true,
    timestamp: daysAgo(3),
    actionUrl: '/',
  },
  {
    id: 'notif-9',
    type: 'friend_milestone',
    message: 'Joshua B. leveled up to Blooming!',
    read: true,
    timestamp: daysAgo(4),
    actionUrl: '/friends',
  },
  {
    id: 'notif-10',
    type: 'milestone',
    message: 'You earned Burning Bright!',
    read: true,
    timestamp: daysAgo(5),
    actionUrl: '/',
    actionData: { badgeName: 'Burning Bright' },
  },
  {
    id: 'notif-11',
    type: 'encouragement',
    message: 'Sarah M. sent: Proud of you',
    read: true,
    timestamp: daysAgo(6),
    actionUrl: '/friends',
  },
  {
    id: 'notif-12',
    type: 'friend_milestone',
    message: 'Maria L. earned Prayer Warrior!',
    read: true,
    timestamp: daysAgo(7),
    actionUrl: '/friends',
  },
]
