import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBadgeData,
  saveBadgeData,
  initializeBadgesForNewUser,
  getOrInitBadgeData,
  addEarnedBadge,
  incrementActivityCount,
  clearNewlyEarned,
  getFriendCount,
} from '../badge-storage';
import { FRESH_ACTIVITY_COUNTS } from '@/constants/dashboard/badges';
import type { BadgeData } from '@/types/dashboard';

function makeBadgeData(overrides: Partial<BadgeData> = {}): BadgeData {
  return {
    earned: {},
    newlyEarned: [],
    activityCounts: { ...FRESH_ACTIVITY_COUNTS },
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('getBadgeData', () => {
  it('returns FRESH_BADGE_DATA when key missing', () => {
    const data = getBadgeData();
    expect(data.earned).toEqual({});
    expect(data.newlyEarned).toEqual([]);
    expect(data.activityCounts).toEqual(FRESH_ACTIVITY_COUNTS);
  });

  it('returns FRESH_BADGE_DATA for corrupted JSON', () => {
    localStorage.setItem('wr_badges', 'not valid json');
    const data = getBadgeData();
    expect(data.earned).toEqual({});
    expect(data.newlyEarned).toEqual([]);
  });

  it('returns FRESH_BADGE_DATA for non-object earned', () => {
    localStorage.setItem('wr_badges', JSON.stringify({ earned: [1, 2, 3] }));
    const data = getBadgeData();
    expect(data.earned).toEqual({});
  });

  it('fills missing activityCounts fields with 0', () => {
    localStorage.setItem('wr_badges', JSON.stringify({
      earned: {},
      newlyEarned: [],
      activityCounts: { pray: 5 },
    }));
    const data = getBadgeData();
    expect(data.activityCounts.pray).toBe(5);
    expect(data.activityCounts.journal).toBe(0);
    expect(data.activityCounts.meditate).toBe(0);
    expect(data.activityCounts.listen).toBe(0);
    expect(data.activityCounts.prayerWall).toBe(0);
    expect(data.activityCounts.encouragementsSent).toBe(0);
    expect(data.activityCounts.fullWorshipDays).toBe(0);
  });

  it('returns valid parsed data', () => {
    const original: BadgeData = {
      earned: { welcome: { earnedAt: '2026-03-17T00:00:00Z' } },
      newlyEarned: ['welcome'],
      activityCounts: { ...FRESH_ACTIVITY_COUNTS, pray: 10 },
    };
    localStorage.setItem('wr_badges', JSON.stringify(original));
    const data = getBadgeData();
    expect(data.earned.welcome.earnedAt).toBe('2026-03-17T00:00:00Z');
    expect(data.newlyEarned).toEqual(['welcome']);
    expect(data.activityCounts.pray).toBe(10);
  });
});

describe('saveBadgeData', () => {
  it('writes to localStorage', () => {
    const data = makeBadgeData({ earned: { welcome: { earnedAt: '2026-03-17T00:00:00Z' } } });
    const result = saveBadgeData(data);
    expect(result).toBe(true);
    const stored = JSON.parse(localStorage.getItem('wr_badges')!);
    expect(stored.earned.welcome.earnedAt).toBe('2026-03-17T00:00:00Z');
  });

  it('returns false on quota exceeded', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const data = makeBadgeData();
    expect(saveBadgeData(data)).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('initializeBadgesForNewUser', () => {
  it('awards welcome and level_1', () => {
    const data = initializeBadgesForNewUser();
    expect(data.earned.welcome).toBeDefined();
    expect(data.earned.welcome.earnedAt).toBeTruthy();
    expect(data.earned.level_1).toBeDefined();
    expect(data.earned.level_1.earnedAt).toBeTruthy();
    expect(data.newlyEarned).toEqual(['welcome', 'level_1']);
  });

  it('persists to localStorage', () => {
    initializeBadgesForNewUser();
    const stored = localStorage.getItem('wr_badges');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.earned.welcome).toBeDefined();
    expect(parsed.earned.level_1).toBeDefined();
  });
});

describe('getOrInitBadgeData', () => {
  it('returns defaults for unauthenticated', () => {
    const data = getOrInitBadgeData(false);
    expect(data.earned).toEqual({});
    expect(data.newlyEarned).toEqual([]);
    // Should NOT read localStorage
    expect(localStorage.getItem('wr_badges')).toBeNull();
  });

  it('initializes on first auth', () => {
    const data = getOrInitBadgeData(true);
    expect(data.earned.welcome).toBeDefined();
    expect(data.earned.level_1).toBeDefined();
    expect(data.newlyEarned).toContain('welcome');
    expect(data.newlyEarned).toContain('level_1');
  });

  it('returns existing data on subsequent auth', () => {
    // First call — initializes
    getOrInitBadgeData(true);
    // Modify data
    const modified = getBadgeData();
    modified.activityCounts.pray = 42;
    saveBadgeData(modified);
    // Second call — reads existing
    const data = getOrInitBadgeData(true);
    expect(data.activityCounts.pray).toBe(42);
    // Should still have welcome badge, not re-initialized
    expect(data.earned.welcome).toBeDefined();
  });
});

describe('addEarnedBadge', () => {
  it('adds new badge to earned and newlyEarned', () => {
    const data = makeBadgeData();
    const result = addEarnedBadge(data, 'first_prayer');
    expect(result.earned.first_prayer).toBeDefined();
    expect(result.earned.first_prayer.earnedAt).toBeTruthy();
    expect(result.newlyEarned).toContain('first_prayer');
  });

  it('skips already-earned non-repeatable badge', () => {
    const data = makeBadgeData({
      earned: { first_prayer: { earnedAt: '2026-03-15T00:00:00Z' } },
    });
    const result = addEarnedBadge(data, 'first_prayer');
    // Should not change earned or add to newlyEarned
    expect(result.earned.first_prayer.earnedAt).toBe('2026-03-15T00:00:00Z');
    expect(result.newlyEarned).not.toContain('first_prayer');
  });

  it('increments count for full_worship_day', () => {
    const data = makeBadgeData({
      earned: { full_worship_day: { earnedAt: '2026-03-15T00:00:00Z', count: 1 } },
    });
    const result = addEarnedBadge(data, 'full_worship_day');
    expect(result.earned.full_worship_day.count).toBe(2);
    expect(result.newlyEarned).toContain('full_worship_day');
  });

  it('creates full_worship_day with count 1 on first earn', () => {
    const data = makeBadgeData();
    const result = addEarnedBadge(data, 'full_worship_day');
    expect(result.earned.full_worship_day.count).toBe(1);
    expect(result.newlyEarned).toContain('full_worship_day');
  });

  it('does not add duplicate to newlyEarned', () => {
    // Test with a repeatable badge that's already in newlyEarned
    const data = makeBadgeData({ newlyEarned: ['full_worship_day'] });
    const result = addEarnedBadge(data, 'full_worship_day');
    const count = result.newlyEarned.filter((id) => id === 'full_worship_day').length;
    expect(count).toBe(1);
  });
});

describe('incrementActivityCount', () => {
  it('increments correct counter', () => {
    const data = makeBadgeData();
    const result = incrementActivityCount(data, 'pray');
    expect(result.activityCounts.pray).toBe(1);
    expect(result.activityCounts.journal).toBe(0);
  });

  it('returns same data for mood type', () => {
    const data = makeBadgeData();
    const result = incrementActivityCount(data, 'mood');
    expect(result.activityCounts).toEqual(data.activityCounts);
  });
});

describe('clearNewlyEarned', () => {
  it('empties the array', () => {
    const data = makeBadgeData({ newlyEarned: ['welcome', 'level_1'] });
    const result = clearNewlyEarned(data);
    expect(result.newlyEarned).toEqual([]);
    // Original should not be mutated
    expect(data.newlyEarned).toEqual(['welcome', 'level_1']);
  });
});

describe('getFriendCount', () => {
  it('returns 0 when wr_friends missing', () => {
    expect(getFriendCount()).toBe(0);
  });

  it('returns 0 for corrupted data', () => {
    localStorage.setItem('wr_friends', 'bad json');
    expect(getFriendCount()).toBe(0);
  });

  it('counts accepted friends', () => {
    localStorage.setItem('wr_friends', JSON.stringify({
      friends: [
        { id: '1', status: 'accepted' },
        { id: '2', status: 'accepted' },
        { id: '3', status: 'pending' },
      ],
    }));
    expect(getFriendCount()).toBe(2);
  });
});

describe('localStorage unavailable', () => {
  it('no crash, returns defaults', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const data = getBadgeData();
    expect(data.earned).toEqual({});
    expect(data.newlyEarned).toEqual([]);
    vi.restoreAllMocks();
  });
});
