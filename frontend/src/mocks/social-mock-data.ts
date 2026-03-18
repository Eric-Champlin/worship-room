import type { MilestoneEvent } from '@/types/dashboard';

// Helper to compute relative timestamps that stay fresh
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Reference existing mock friends from friends-mock-data.ts:
// friend-sarah-m, friend-james-k, friend-maria-l, friend-david-r,
// friend-grace-h, friend-hannah-w, friend-joshua-b

export function createMockMilestoneEvents(): MilestoneEvent[] {
  return [
    // Today
    {
      id: 'ms-1',
      type: 'streak_milestone',
      userId: 'friend-maria-l',
      displayName: 'Maria L.',
      avatar: '',
      detail: '90',
      timestamp: hoursAgo(2),
    },
    {
      id: 'ms-2',
      type: 'badge_earned',
      userId: 'friend-grace-h',
      displayName: 'Grace H.',
      avatar: '',
      detail: 'Burning Bright',
      timestamp: hoursAgo(5),
    },
    // Yesterday
    {
      id: 'ms-3',
      type: 'level_up',
      userId: 'friend-james-k',
      displayName: 'James K.',
      avatar: '',
      detail: 'Blooming',
      timestamp: hoursAgo(26),
    },
    {
      id: 'ms-4',
      type: 'points_milestone',
      userId: 'friend-joshua-b',
      displayName: 'Joshua B.',
      avatar: '',
      detail: '12,000',
      timestamp: hoursAgo(30),
    },
    // 2 days ago
    {
      id: 'ms-5',
      type: 'streak_milestone',
      userId: 'friend-sarah-m',
      displayName: 'Sarah M.',
      avatar: '',
      detail: '45',
      timestamp: hoursAgo(50),
    },
    {
      id: 'ms-6',
      type: 'badge_earned',
      userId: 'friend-hannah-w',
      displayName: 'Hannah W.',
      avatar: '',
      detail: 'Prayer Warrior',
      timestamp: hoursAgo(52),
    },
    // 3 days ago
    {
      id: 'ms-7',
      type: 'level_up',
      userId: 'friend-grace-h',
      displayName: 'Grace H.',
      avatar: '',
      detail: 'Flourishing',
      timestamp: hoursAgo(74),
    },
    // 4 days ago
    {
      id: 'ms-8',
      type: 'streak_milestone',
      userId: 'friend-david-r',
      displayName: 'David R.',
      avatar: '',
      detail: '7',
      timestamp: hoursAgo(98),
    },
    {
      id: 'ms-9',
      type: 'points_milestone',
      userId: 'friend-sarah-m',
      displayName: 'Sarah M.',
      avatar: '',
      detail: '3,500',
      timestamp: hoursAgo(100),
    },
    // 5 days ago
    {
      id: 'ms-10',
      type: 'badge_earned',
      userId: 'friend-maria-l',
      displayName: 'Maria L.',
      avatar: '',
      detail: 'Faithful Journaler',
      timestamp: hoursAgo(122),
    },
    // 6 days ago
    {
      id: 'ms-11',
      type: 'level_up',
      userId: 'friend-david-r',
      displayName: 'David R.',
      avatar: '',
      detail: 'Sprout',
      timestamp: hoursAgo(146),
    },
    {
      id: 'ms-12',
      type: 'streak_milestone',
      userId: 'friend-hannah-w',
      displayName: 'Hannah W.',
      avatar: '',
      detail: '30',
      timestamp: hoursAgo(148),
    },
  ];
}

export const MOCK_MILESTONE_EVENTS: MilestoneEvent[] = createMockMilestoneEvents();
