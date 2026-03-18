import { describe, it, expect } from 'vitest';
import { MOCK_MILESTONE_EVENTS } from '../social-mock-data';
import { MOCK_FRIENDS } from '../friends-mock-data';
import type { MilestoneEventType } from '@/types/dashboard';

const VALID_FRIEND_IDS = MOCK_FRIENDS.map((f) => f.id);
const ALL_EVENT_TYPES: MilestoneEventType[] = [
  'streak_milestone',
  'level_up',
  'badge_earned',
  'points_milestone',
];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('MOCK_MILESTONE_EVENTS', () => {
  it('has 12 entries', () => {
    expect(MOCK_MILESTONE_EVENTS).toHaveLength(12);
  });

  it('all event types are represented', () => {
    const typesPresent = new Set(MOCK_MILESTONE_EVENTS.map((e) => e.type));
    for (const type of ALL_EVENT_TYPES) {
      expect(typesPresent.has(type)).toBe(true);
    }
  });

  it('all userIds reference valid mock friends', () => {
    for (const event of MOCK_MILESTONE_EVENTS) {
      expect(VALID_FRIEND_IDS).toContain(event.userId);
    }
  });

  it('timestamps are in the past 7 days', () => {
    const now = Date.now();
    for (const event of MOCK_MILESTONE_EVENTS) {
      const eventTime = new Date(event.timestamp).getTime();
      expect(eventTime).toBeLessThanOrEqual(now);
      expect(now - eventTime).toBeLessThanOrEqual(SEVEN_DAYS_MS);
    }
  });
});
