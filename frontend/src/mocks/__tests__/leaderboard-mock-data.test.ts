import { describe, it, expect } from 'vitest';
import { MOCK_GLOBAL_LEADERBOARD } from '../leaderboard-mock-data';

describe('MOCK_GLOBAL_LEADERBOARD', () => {
  it('has exactly 50 entries', () => {
    expect(MOCK_GLOBAL_LEADERBOARD).toHaveLength(50);
  });

  it('all entries have required fields', () => {
    for (const entry of MOCK_GLOBAL_LEADERBOARD) {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('displayName');
      expect(entry).toHaveProperty('weeklyPoints');
      expect(entry).toHaveProperty('totalPoints');
      expect(entry).toHaveProperty('level');
      expect(entry).toHaveProperty('levelName');
      expect(entry).toHaveProperty('badgeCount');
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.displayName).toBe('string');
      expect(typeof entry.weeklyPoints).toBe('number');
      expect(typeof entry.totalPoints).toBe('number');
      expect(typeof entry.level).toBe('number');
      expect(typeof entry.levelName).toBe('string');
      expect(typeof entry.badgeCount).toBe('number');
    }
  });

  it('weekly points range is 10-170', () => {
    const points = MOCK_GLOBAL_LEADERBOARD.map((e) => e.weeklyPoints);
    expect(Math.min(...points)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...points)).toBeLessThanOrEqual(170);
  });

  it('level distribution is weighted toward lower levels', () => {
    const counts: Record<number, number> = {};
    for (const entry of MOCK_GLOBAL_LEADERBOARD) {
      counts[entry.level] = (counts[entry.level] || 0) + 1;
    }
    // More Seedlings (1) than any other level
    const seedlings = counts[1] || 0;
    const oaks = counts[5] || 0;
    const lighthouses = counts[6] || 0;
    expect(seedlings).toBeGreaterThan(oaks);
    expect(seedlings).toBeGreaterThan(lighthouses);
  });
});
