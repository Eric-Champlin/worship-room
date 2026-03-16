import { describe, it, expect, vi, afterEach } from 'vitest';
import { getLocalDateString, getYesterdayDateString, getCurrentWeekStart } from '../date';

afterEach(() => {
  vi.useRealTimers();
});

describe('getLocalDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    const date = new Date(2026, 2, 16); // March 16, 2026 (month is 0-indexed)
    expect(getLocalDateString(date)).toBe('2026-03-16');
  });

  it('uses local timezone (not UTC)', () => {
    // 11:30pm EST on March 16 = March 17 UTC
    // getLocalDateString should return the LOCAL date, not UTC
    const date = new Date(2026, 2, 16, 23, 30, 0); // 11:30pm local time, March 16
    expect(getLocalDateString(date)).toBe('2026-03-16');
  });

  it('works with a custom Date argument', () => {
    const date = new Date(2025, 0, 1); // Jan 1, 2025
    expect(getLocalDateString(date)).toBe('2025-01-01');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(getLocalDateString(date)).toBe('2026-01-05');
  });

  it('defaults to current date when called with no args', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    expect(getLocalDateString()).toBe('2026-03-16');
  });
});

describe('getYesterdayDateString', () => {
  it('returns the previous day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    expect(getYesterdayDateString()).toBe('2026-03-15');
  });

  it('handles month boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0)); // March 1
    expect(getYesterdayDateString()).toBe('2026-02-28');
  });

  it('handles year boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0)); // Jan 1
    expect(getYesterdayDateString()).toBe('2025-12-31');
  });
});

describe('getCurrentWeekStart', () => {
  it('returns Monday for a Wednesday', () => {
    vi.useFakeTimers();
    // March 18, 2026 is a Wednesday
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0));
    expect(getCurrentWeekStart()).toBe('2026-03-16'); // Monday March 16
  });

  it('returns Monday for a Monday', () => {
    vi.useFakeTimers();
    // March 16, 2026 is a Monday
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    expect(getCurrentWeekStart()).toBe('2026-03-16');
  });

  it('returns previous Monday for a Sunday', () => {
    vi.useFakeTimers();
    // March 22, 2026 is a Sunday
    vi.setSystemTime(new Date(2026, 2, 22, 12, 0, 0));
    expect(getCurrentWeekStart()).toBe('2026-03-16'); // Previous Monday
  });

  it('handles month boundary', () => {
    vi.useFakeTimers();
    // March 1, 2026 is a Sunday
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0));
    expect(getCurrentWeekStart()).toBe('2026-02-23'); // Previous Monday in Feb
  });
});
