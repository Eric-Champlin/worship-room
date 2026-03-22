import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasReflectedToday,
  markReflectionDone,
  isEveningTime,
  hasAnyActivityToday,
} from '../evening-reflection-storage';

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('hasReflectedToday', () => {
  it('returns false when no data stored', () => {
    expect(hasReflectedToday()).toBe(false);
  });

  it('returns true when today\'s date is stored', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 20, 0, 0));
    localStorage.setItem('wr_evening_reflection', '2026-03-22');
    expect(hasReflectedToday()).toBe(true);
  });

  it('returns false when yesterday\'s date is stored', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 20, 0, 0));
    localStorage.setItem('wr_evening_reflection', '2026-03-21');
    expect(hasReflectedToday()).toBe(false);
  });
});

describe('markReflectionDone', () => {
  it('stores today\'s date string', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 20, 0, 0));
    markReflectionDone();
    expect(localStorage.getItem('wr_evening_reflection')).toBe('2026-03-22');
  });
});

describe('isEveningTime', () => {
  it('returns true at 18:00', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 18, 0, 0));
    expect(isEveningTime()).toBe(true);
  });

  it('returns true at 23:59', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 23, 59, 0));
    expect(isEveningTime()).toBe(true);
  });

  it('returns false at 17:59', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 17, 59, 0));
    expect(isEveningTime()).toBe(false);
  });

  it('returns false at 0:00', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 22, 0, 0, 0));
    expect(isEveningTime()).toBe(false);
  });
});

describe('hasAnyActivityToday', () => {
  it('returns true when at least one activity is true', () => {
    expect(hasAnyActivityToday({
      mood: true, pray: false, listen: false,
      prayerWall: false, readingPlan: false, meditate: false,
      journal: false, gratitude: false, reflection: false,
      pointsEarned: 5, multiplier: 1,
    })).toBe(true);
  });

  it('returns false when all activities are false', () => {
    expect(hasAnyActivityToday({
      mood: false, pray: false, listen: false,
      prayerWall: false, readingPlan: false, meditate: false,
      journal: false, gratitude: false, reflection: false,
      pointsEarned: 0, multiplier: 1,
    })).toBe(false);
  });

  it('ignores pointsEarned and multiplier (non-activity keys)', () => {
    // Even though pointsEarned is a truthy number, it shouldn't count
    expect(hasAnyActivityToday({
      mood: false, pray: false, listen: false,
      prayerWall: false, readingPlan: false, meditate: false,
      journal: false, gratitude: false, reflection: false,
      pointsEarned: 100, multiplier: 2,
    })).toBe(false);
  });

  it('returns true with multiple activities true', () => {
    expect(hasAnyActivityToday({
      mood: true, pray: true, listen: false,
      prayerWall: false, readingPlan: false, meditate: false,
      journal: false, gratitude: false, reflection: false,
      pointsEarned: 15, multiplier: 1.25,
    })).toBe(true);
  });
});
