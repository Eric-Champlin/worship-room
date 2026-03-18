import { describe, it, expect, beforeEach } from 'vitest';
import { getGlobalLeaderboard, LEADERBOARD_KEY } from '../leaderboard-storage';

describe('leaderboard-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns data from localStorage when valid', () => {
    const mockData = [
      { id: 'test-1', displayName: 'Test U.', weeklyPoints: 50, totalPoints: 100, level: 1, levelName: 'Seedling', badgeCount: 1 },
    ];
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(mockData));

    const result = getGlobalLeaderboard();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('test-1');
  });

  it('initializes with mock data when localStorage is empty', () => {
    const result = getGlobalLeaderboard();
    expect(result).toHaveLength(50);
    // Should also persist to localStorage
    const stored = localStorage.getItem(LEADERBOARD_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toHaveLength(50);
  });

  it('re-initializes on corrupt JSON', () => {
    localStorage.setItem(LEADERBOARD_KEY, 'not-json{{{');
    const result = getGlobalLeaderboard();
    expect(result).toHaveLength(50);
  });

  it('re-initializes on empty array', () => {
    localStorage.setItem(LEADERBOARD_KEY, '[]');
    const result = getGlobalLeaderboard();
    expect(result).toHaveLength(50);
  });
});
