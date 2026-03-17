import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_POINTS,
  MULTIPLIER_TIERS,
  MAX_DAILY_BASE_POINTS,
  MAX_DAILY_POINTS,
  ALL_ACTIVITY_TYPES,
  ACTIVITY_DISPLAY_NAMES,
} from '../activity-points';

describe('ACTIVITY_POINTS', () => {
  it('has correct values for all 6 activity types', () => {
    expect(ACTIVITY_POINTS.mood).toBe(5);
    expect(ACTIVITY_POINTS.pray).toBe(10);
    expect(ACTIVITY_POINTS.listen).toBe(10);
    expect(ACTIVITY_POINTS.prayerWall).toBe(15);
    expect(ACTIVITY_POINTS.meditate).toBe(20);
    expect(ACTIVITY_POINTS.journal).toBe(25);
  });

  it('sums to MAX_DAILY_BASE_POINTS', () => {
    const total = Object.values(ACTIVITY_POINTS).reduce((sum, v) => sum + v, 0);
    expect(total).toBe(MAX_DAILY_BASE_POINTS);
    expect(total).toBe(85);
  });
});

describe('MULTIPLIER_TIERS', () => {
  it('has 4 tiers sorted by minActivities descending', () => {
    expect(MULTIPLIER_TIERS).toHaveLength(4);
    expect(MULTIPLIER_TIERS[0].minActivities).toBe(6);
    expect(MULTIPLIER_TIERS[1].minActivities).toBe(4);
    expect(MULTIPLIER_TIERS[2].minActivities).toBe(2);
    expect(MULTIPLIER_TIERS[3].minActivities).toBe(0);
  });

  it('has correct multiplier values', () => {
    expect(MULTIPLIER_TIERS[0].multiplier).toBe(2);
    expect(MULTIPLIER_TIERS[1].multiplier).toBe(1.5);
    expect(MULTIPLIER_TIERS[2].multiplier).toBe(1.25);
    expect(MULTIPLIER_TIERS[3].multiplier).toBe(1);
  });
});

describe('MAX_DAILY_POINTS', () => {
  it('equals MAX_DAILY_BASE_POINTS × 2x multiplier', () => {
    expect(MAX_DAILY_POINTS).toBe(MAX_DAILY_BASE_POINTS * 2);
    expect(MAX_DAILY_POINTS).toBe(170);
  });
});

describe('ALL_ACTIVITY_TYPES', () => {
  it('contains all 6 activity types', () => {
    expect(ALL_ACTIVITY_TYPES).toHaveLength(6);
    expect(ALL_ACTIVITY_TYPES).toContain('mood');
    expect(ALL_ACTIVITY_TYPES).toContain('pray');
    expect(ALL_ACTIVITY_TYPES).toContain('listen');
    expect(ALL_ACTIVITY_TYPES).toContain('prayerWall');
    expect(ALL_ACTIVITY_TYPES).toContain('meditate');
    expect(ALL_ACTIVITY_TYPES).toContain('journal');
  });
});

describe('ACTIVITY_DISPLAY_NAMES', () => {
  it('has display names for all 6 types', () => {
    expect(Object.keys(ACTIVITY_DISPLAY_NAMES)).toHaveLength(6);
    expect(ACTIVITY_DISPLAY_NAMES.mood).toBe('Logged mood');
    expect(ACTIVITY_DISPLAY_NAMES.journal).toBe('Journaled');
  });
});
