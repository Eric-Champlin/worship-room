import { describe, it, expect } from 'vitest';
import { getLevelForPoints, LEVEL_THRESHOLDS, LEVEL_ICON_NAMES } from '../levels';

describe('LEVEL_THRESHOLDS', () => {
  it('has 6 levels', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(6);
  });

  it('starts at Seedling with threshold 0', () => {
    expect(LEVEL_THRESHOLDS[0]).toEqual({ level: 1, name: 'Seedling', threshold: 0 });
  });

  it('ends at Lighthouse with threshold 10000', () => {
    expect(LEVEL_THRESHOLDS[5]).toEqual({ level: 6, name: 'Lighthouse', threshold: 10000 });
  });
});

describe('LEVEL_ICON_NAMES', () => {
  it('has all 6 levels', () => {
    expect(Object.keys(LEVEL_ICON_NAMES)).toHaveLength(6);
    for (let i = 1; i <= 6; i++) {
      expect(LEVEL_ICON_NAMES[i]).toBeDefined();
    }
  });

  it('maps correct Lucide icon names', () => {
    expect(LEVEL_ICON_NAMES[1]).toBe('Sprout');
    expect(LEVEL_ICON_NAMES[2]).toBe('Leaf');
    expect(LEVEL_ICON_NAMES[3]).toBe('Flower2');
    expect(LEVEL_ICON_NAMES[4]).toBe('TreePine');
    expect(LEVEL_ICON_NAMES[5]).toBe('Trees');
    expect(LEVEL_ICON_NAMES[6]).toBe('Landmark');
  });
});

describe('getLevelForPoints', () => {
  it('returns Seedling at 0 points', () => {
    const result = getLevelForPoints(0);
    expect(result).toEqual({ level: 1, name: 'Seedling', pointsToNextLevel: 100 });
  });

  it('returns Seedling at 99 points with pointsToNextLevel=1', () => {
    const result = getLevelForPoints(99);
    expect(result).toEqual({ level: 1, name: 'Seedling', pointsToNextLevel: 1 });
  });

  it('returns Sprout at exactly 100 points', () => {
    const result = getLevelForPoints(100);
    expect(result).toEqual({ level: 2, name: 'Sprout', pointsToNextLevel: 400 });
  });

  it('returns Blooming at exactly 500 points', () => {
    const result = getLevelForPoints(500);
    expect(result).toEqual({ level: 3, name: 'Blooming', pointsToNextLevel: 1000 });
  });

  it('returns Flourishing at exactly 1500 points', () => {
    const result = getLevelForPoints(1500);
    expect(result).toEqual({ level: 4, name: 'Flourishing', pointsToNextLevel: 2500 });
  });

  it('returns Oak at exactly 4000 points', () => {
    const result = getLevelForPoints(4000);
    expect(result).toEqual({ level: 5, name: 'Oak', pointsToNextLevel: 6000 });
  });

  it('returns Lighthouse at exactly 10000 points with pointsToNextLevel=0', () => {
    const result = getLevelForPoints(10000);
    expect(result).toEqual({ level: 6, name: 'Lighthouse', pointsToNextLevel: 0 });
  });

  it('returns Lighthouse at 15000 points with pointsToNextLevel=0', () => {
    const result = getLevelForPoints(15000);
    expect(result).toEqual({ level: 6, name: 'Lighthouse', pointsToNextLevel: 0 });
  });
});
