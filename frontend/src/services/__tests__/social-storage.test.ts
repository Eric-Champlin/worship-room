import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SocialInteractionsData, Nudge } from '@/types/dashboard';
import {
  SOCIAL_KEY,
  MILESTONE_KEY,
  NOTIFICATIONS_KEY,
  getSocialInteractions,
  saveSocialInteractions,
  getMilestoneFeed,
  saveMilestoneFeed,
  getEncouragementCountToday,
  canEncourage,
  getLastNudge,
  canNudge,
  isRecapDismissedThisWeek,
  addNotification,
} from '../social-storage';
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date';

const USER_ID = 'current-user';
const FRIEND_A = 'friend-sarah-m';
const FRIEND_B = 'friend-james-k';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeEncouragement(from: string, to: string, timestamp?: string) {
  return {
    id: `enc-${Math.random().toString(36).substring(2, 8)}`,
    fromUserId: from,
    toUserId: to,
    message: 'Keep going!',
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

function makeNudge(from: string, to: string, timestamp?: string): Nudge {
  return {
    id: `nudge-${Math.random().toString(36).substring(2, 8)}`,
    fromUserId: from,
    toUserId: to,
    timestamp: timestamp ?? new Date().toISOString(),
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('getSocialInteractions', () => {
  it('returns empty default when no data', () => {
    const result = getSocialInteractions();
    expect(result).toEqual({
      encouragements: [],
      nudges: [],
      recapDismissals: [],
    });
  });

  it('handles corrupted JSON', () => {
    localStorage.setItem(SOCIAL_KEY, 'not valid json{{{');
    const result = getSocialInteractions();
    expect(result).toEqual({
      encouragements: [],
      nudges: [],
      recapDismissals: [],
    });
  });

  it('handles malformed data structure', () => {
    localStorage.setItem(SOCIAL_KEY, JSON.stringify({ encouragements: 'not-array' }));
    const result = getSocialInteractions();
    expect(result).toEqual({
      encouragements: [],
      nudges: [],
      recapDismissals: [],
    });
  });
});

describe('saveSocialInteractions', () => {
  it('persists to localStorage', () => {
    const data: SocialInteractionsData = {
      encouragements: [makeEncouragement(USER_ID, FRIEND_A)],
      nudges: [],
      recapDismissals: [],
    };
    saveSocialInteractions(data);
    const result = getSocialInteractions();
    expect(result.encouragements).toHaveLength(1);
    expect(result.encouragements[0].toUserId).toBe(FRIEND_A);
  });
});

describe('getMilestoneFeed', () => {
  it('returns empty array when no data', () => {
    const result = getMilestoneFeed();
    expect(result).toEqual([]);
  });

  it('handles corrupted JSON', () => {
    localStorage.setItem(MILESTONE_KEY, '{bad json!!!');
    const result = getMilestoneFeed();
    expect(result).toEqual([]);
  });

  it('handles non-array data', () => {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify({ not: 'array' }));
    const result = getMilestoneFeed();
    expect(result).toEqual([]);
  });
});

describe('saveMilestoneFeed', () => {
  it('enforces 20-event FIFO cap', () => {
    const events = Array.from({ length: 25 }, (_, i) => ({
      id: `ms-${i}`,
      type: 'streak_milestone' as const,
      userId: FRIEND_A,
      displayName: 'Sarah M.',
      avatar: '',
      detail: `${i}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    }));
    saveMilestoneFeed(events);
    const stored = getMilestoneFeed();
    expect(stored).toHaveLength(20);
    // Should keep the last 20 (most recent by array position)
    expect(stored[0].id).toBe('ms-5');
    expect(stored[19].id).toBe('ms-24');
  });

  it('stores events under the cap without truncation', () => {
    const events = Array.from({ length: 10 }, (_, i) => ({
      id: `ms-${i}`,
      type: 'level_up' as const,
      userId: FRIEND_A,
      displayName: 'Sarah M.',
      avatar: '',
      detail: 'Blooming',
      timestamp: new Date().toISOString(),
    }));
    saveMilestoneFeed(events);
    expect(getMilestoneFeed()).toHaveLength(10);
  });
});

describe('getEncouragementCountToday', () => {
  it('counts correctly for today only', () => {
    const today1 = makeEncouragement(USER_ID, FRIEND_A);
    const today2 = makeEncouragement(USER_ID, FRIEND_A);
    const today3 = makeEncouragement(USER_ID, FRIEND_A);
    const yesterday1 = makeEncouragement(USER_ID, FRIEND_A, daysAgo(1));
    const yesterday2 = makeEncouragement(USER_ID, FRIEND_A, daysAgo(1));

    saveSocialInteractions({
      encouragements: [today1, today2, today3, yesterday1, yesterday2],
      nudges: [],
      recapDismissals: [],
    });

    expect(getEncouragementCountToday(USER_ID, FRIEND_A)).toBe(3);
  });
});

describe('canEncourage', () => {
  it('returns false at limit', () => {
    const encouragements = Array.from({ length: 3 }, () =>
      makeEncouragement(USER_ID, FRIEND_A),
    );
    saveSocialInteractions({ encouragements, nudges: [], recapDismissals: [] });
    expect(canEncourage(USER_ID, FRIEND_A)).toBe(false);
  });

  it('returns true for different friends', () => {
    const encouragements = Array.from({ length: 3 }, () =>
      makeEncouragement(USER_ID, FRIEND_A),
    );
    saveSocialInteractions({ encouragements, nudges: [], recapDismissals: [] });
    expect(canEncourage(USER_ID, FRIEND_B)).toBe(true);
  });

  it('returns true when under limit', () => {
    const encouragements = [makeEncouragement(USER_ID, FRIEND_A)];
    saveSocialInteractions({ encouragements, nudges: [], recapDismissals: [] });
    expect(canEncourage(USER_ID, FRIEND_A)).toBe(true);
  });
});

describe('getLastNudge', () => {
  it('returns most recent nudge', () => {
    const older = makeNudge(USER_ID, FRIEND_A, daysAgo(5));
    const newer = makeNudge(USER_ID, FRIEND_A, daysAgo(2));
    saveSocialInteractions({
      encouragements: [],
      nudges: [older, newer],
      recapDismissals: [],
    });
    const last = getLastNudge(USER_ID, FRIEND_A);
    expect(last?.id).toBe(newer.id);
  });

  it('returns undefined when no nudges', () => {
    expect(getLastNudge(USER_ID, FRIEND_A)).toBeUndefined();
  });
});

describe('canNudge', () => {
  it('returns false within 7 days', () => {
    const nudge = makeNudge(USER_ID, FRIEND_A, daysAgo(3));
    saveSocialInteractions({ encouragements: [], nudges: [nudge], recapDismissals: [] });
    expect(canNudge(USER_ID, FRIEND_A)).toBe(false);
  });

  it('returns true after 7 days', () => {
    const nudge = makeNudge(USER_ID, FRIEND_A, daysAgo(8));
    saveSocialInteractions({ encouragements: [], nudges: [nudge], recapDismissals: [] });
    expect(canNudge(USER_ID, FRIEND_A)).toBe(true);
  });

  it('returns true when no previous nudge', () => {
    expect(canNudge(USER_ID, FRIEND_A)).toBe(true);
  });
});

describe('isRecapDismissedThisWeek', () => {
  it('returns true when current week dismissed', () => {
    const weekStart = getCurrentWeekStart();
    saveSocialInteractions({
      encouragements: [],
      nudges: [],
      recapDismissals: [weekStart],
    });
    expect(isRecapDismissedThisWeek()).toBe(true);
  });

  it('returns false for different week', () => {
    saveSocialInteractions({
      encouragements: [],
      nudges: [],
      recapDismissals: ['2025-01-06'],
    });
    expect(isRecapDismissedThisWeek()).toBe(false);
  });

  it('returns false when no dismissals', () => {
    expect(isRecapDismissedThisWeek()).toBe(false);
  });
});

describe('addNotification', () => {
  it('appends entry to wr_notifications', () => {
    addNotification({ type: 'encouragement', message: 'Test 1' });
    addNotification({ type: 'nudge', message: 'Test 2' });

    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe('encouragement');
    expect(parsed[0].message).toBe('Test 1');
    expect(parsed[0].read).toBe(false);
    expect(parsed[0].id).toMatch(/^notif-/);
    expect(parsed[1].type).toBe('nudge');
  });

  it('handles corrupted existing data gracefully', () => {
    localStorage.setItem(NOTIFICATIONS_KEY, 'corrupt{{{');
    addNotification({ type: 'encouragement', message: 'Recovery test' });

    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe('Recovery test');
  });
});
