import { describe, it, expect } from 'vitest';
import {
  BADGE_DEFINITIONS,
  BADGE_MAP,
  LEVEL_UP_VERSES,
  STREAK_THRESHOLDS,
  FRESH_BADGE_DATA,
  FRESH_ACTIVITY_COUNTS,
} from '../badges';

describe('BADGE_DEFINITIONS', () => {
  it('all badge definitions have unique IDs', () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all badge definitions have required fields', () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.id).toBeTruthy();
      expect(badge.name).toBeTruthy();
      expect(badge.description).toBeTruthy();
      expect(badge.category).toBeTruthy();
      expect(badge.celebrationTier).toBeTruthy();
      expect(['streak', 'level', 'activity', 'community', 'special']).toContain(badge.category);
      expect(['toast', 'toast-confetti', 'special-toast', 'full-screen']).toContain(badge.celebrationTier);
    }
  });

  it('total unique badge IDs count is 29', () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    // 7 streak + 6 level + 9 activity milestones + 3 reading plan + 1 full_worship_day + 5 community/first-time + 1 welcome
    expect(new Set(ids).size).toBe(32);
  });
});

describe('streak badges', () => {
  it('7 definitions with correct thresholds', () => {
    const streakBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'streak');
    expect(streakBadges).toHaveLength(7);

    const expectedIds = ['streak_7', 'streak_14', 'streak_30', 'streak_60', 'streak_90', 'streak_180', 'streak_365'];
    for (const id of expectedIds) {
      expect(streakBadges.find((b) => b.id === id)).toBeDefined();
    }
  });

  it('celebration tiers: streak 7/14/30 = toast, 60/90/180/365 = full-screen', () => {
    expect(BADGE_MAP['streak_7'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['streak_14'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['streak_30'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['streak_60'].celebrationTier).toBe('full-screen');
    expect(BADGE_MAP['streak_90'].celebrationTier).toBe('full-screen');
    expect(BADGE_MAP['streak_180'].celebrationTier).toBe('full-screen');
    expect(BADGE_MAP['streak_365'].celebrationTier).toBe('full-screen');
  });
});

describe('level badges', () => {
  it('6 definitions with verses', () => {
    const levelBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'level');
    expect(levelBadges).toHaveLength(6);

    for (let i = 1; i <= 6; i++) {
      const badge = BADGE_MAP[`level_${i}`];
      expect(badge).toBeDefined();
      expect(badge.verse).toBeDefined();
      expect(badge.verse!.text).toBeTruthy();
      expect(badge.verse!.reference).toBeTruthy();
    }
  });
});

describe('activity milestone badges', () => {
  it('9 definitions', () => {
    const expectedIds = [
      'first_prayer', 'prayer_100',
      'first_journal', 'journal_50', 'journal_100',
      'first_meditate', 'meditate_25',
      'first_listen', 'listen_50',
    ];
    for (const id of expectedIds) {
      expect(BADGE_MAP[id]).toBeDefined();
    }
    // Check count of activity category badges (9 milestones + first_prayerwall + 3 reading plan = 13 activity badges)
    const activityBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'activity');
    expect(activityBadges).toHaveLength(13);
  });

  it('celebration tiers: activity milestones at count 1 = toast, higher = toast-confetti', () => {
    expect(BADGE_MAP['first_prayer'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['first_journal'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['first_meditate'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['first_listen'].celebrationTier).toBe('toast');
    expect(BADGE_MAP['first_prayerwall'].celebrationTier).toBe('toast');

    expect(BADGE_MAP['prayer_100'].celebrationTier).toBe('toast-confetti');
    expect(BADGE_MAP['journal_50'].celebrationTier).toBe('toast-confetti');
    expect(BADGE_MAP['journal_100'].celebrationTier).toBe('toast-confetti');
    expect(BADGE_MAP['meditate_25'].celebrationTier).toBe('toast-confetti');
    expect(BADGE_MAP['listen_50'].celebrationTier).toBe('toast-confetti');
  });
});

describe('full_worship_day badge', () => {
  it('is marked repeatable', () => {
    const badge = BADGE_MAP['full_worship_day'];
    expect(badge).toBeDefined();
    expect(badge.repeatable).toBe(true);
  });

  it('has special-toast celebration tier', () => {
    expect(BADGE_MAP['full_worship_day'].celebrationTier).toBe('special-toast');
  });
});

describe('reading plan badges', () => {
  it('3 definitions with correct IDs', () => {
    const expectedIds = ['first_plan', 'plans_3', 'plans_10'];
    for (const id of expectedIds) {
      expect(BADGE_MAP[id]).toBeDefined();
    }
  });

  it('first_plan has toast-confetti tier', () => {
    expect(BADGE_MAP['first_plan'].celebrationTier).toBe('toast-confetti');
  });

  it('plans_3 has toast-confetti tier', () => {
    expect(BADGE_MAP['plans_3'].celebrationTier).toBe('toast-confetti');
  });

  it('plans_10 has full-screen tier with verse', () => {
    const badge = BADGE_MAP['plans_10'];
    expect(badge.celebrationTier).toBe('full-screen');
    expect(badge.verse).toBeDefined();
    expect(badge.verse!.text).toBe('Your word is a lamp to my feet, and a light for my path.');
    expect(badge.verse!.reference).toBe('Psalm 119:105 WEB');
  });
});

describe('community badges', () => {
  it('4 definitions', () => {
    const expectedIds = ['first_friend', 'friends_10', 'encourage_10', 'encourage_50'];
    for (const id of expectedIds) {
      expect(BADGE_MAP[id]).toBeDefined();
    }
    const communityBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'community');
    expect(communityBadges).toHaveLength(4);
  });
});

describe('welcome badge', () => {
  it('exists with toast tier', () => {
    const badge = BADGE_MAP['welcome'];
    expect(badge).toBeDefined();
    expect(badge.id).toBe('welcome');
    expect(badge.celebrationTier).toBe('toast');
    expect(badge.category).toBe('special');
  });
});

describe('BADGE_MAP', () => {
  it('keys match BADGE_DEFINITIONS IDs', () => {
    const definitionIds = new Set(BADGE_DEFINITIONS.map((b) => b.id));
    const mapKeys = new Set(Object.keys(BADGE_MAP));

    expect(mapKeys.size).toBe(definitionIds.size);
    for (const id of definitionIds) {
      expect(BADGE_MAP[id]).toBeDefined();
      expect(BADGE_MAP[id].id).toBe(id);
    }
  });
});

describe('LEVEL_UP_VERSES', () => {
  it('has 6 entries', () => {
    expect(Object.keys(LEVEL_UP_VERSES)).toHaveLength(6);
    for (let i = 1; i <= 6; i++) {
      expect(LEVEL_UP_VERSES[i]).toBeDefined();
      expect(LEVEL_UP_VERSES[i].text).toBeTruthy();
      expect(LEVEL_UP_VERSES[i].reference).toBeTruthy();
    }
  });

  it('contains correct WEB translation text', () => {
    expect(LEVEL_UP_VERSES[1].text).toBe(
      'For we are his workmanship, created in Christ Jesus for good works.',
    );
    expect(LEVEL_UP_VERSES[1].reference).toBe('Ephesians 2:10');

    expect(LEVEL_UP_VERSES[6].text).toBe(
      'You are the light of the world. A city located on a hill can\'t be hidden.',
    );
    expect(LEVEL_UP_VERSES[6].reference).toBe('Matthew 5:14');
  });
});

describe('STREAK_THRESHOLDS', () => {
  it('sorted ascending', () => {
    expect(STREAK_THRESHOLDS).toEqual([7, 14, 30, 60, 90, 180, 365]);
    for (let i = 1; i < STREAK_THRESHOLDS.length; i++) {
      expect(STREAK_THRESHOLDS[i]).toBeGreaterThan(STREAK_THRESHOLDS[i - 1]);
    }
  });
});

describe('FRESH_BADGE_DATA', () => {
  it('has correct shape', () => {
    expect(FRESH_BADGE_DATA.earned).toEqual({});
    expect(FRESH_BADGE_DATA.newlyEarned).toEqual([]);
    expect(FRESH_BADGE_DATA.activityCounts).toEqual({
      pray: 0,
      journal: 0,
      meditate: 0,
      listen: 0,
      prayerWall: 0,
      readingPlan: 0,
      encouragementsSent: 0,
      fullWorshipDays: 0,
    });
  });

  it('FRESH_ACTIVITY_COUNTS has all zero values', () => {
    const keys = Object.keys(FRESH_ACTIVITY_COUNTS);
    expect(keys).toHaveLength(8);
    for (const key of keys) {
      expect(FRESH_ACTIVITY_COUNTS[key as keyof typeof FRESH_ACTIVITY_COUNTS]).toBe(0);
    }
  });
});
