import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMoodChartData } from '../useMoodChartData';
import { MOOD_COLORS } from '@/constants/dashboard/mood';
import { getLocalDateString } from '@/utils/date';
import type { MoodEntry } from '@/types/dashboard';

function makeMoodEntry(overrides: Partial<MoodEntry> & { date: string; mood: MoodEntry['mood']; moodLabel: MoodEntry['moodLabel'] }): MoodEntry {
  return {
    id: `test-${overrides.date}`,
    text: '',
    timestamp: Date.now(),
    verseSeen: 'Psalm 34:18',
    ...overrides,
  };
}

function seedEntries(entries: MoodEntry[]) {
  localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useMoodChartData', () => {
  it('returns exactly `days` data points (default 7)', () => {
    const { result } = renderHook(() => useMoodChartData());
    expect(result.current).toHaveLength(7);
  });

  it('returns exactly `days` data points for custom value', () => {
    const { result } = renderHook(() => useMoodChartData(30));
    expect(result.current).toHaveLength(30);
  });

  it('data points ordered chronologically (oldest first)', () => {
    const { result } = renderHook(() => useMoodChartData());
    const dates = result.current.map((d) => d.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it('matches mood entries by date string', () => {
    const today = getLocalDateString();
    const twoDaysAgo = getLocalDateString(daysAgo(2));
    const fiveDaysAgo = getLocalDateString(daysAgo(5));

    seedEntries([
      makeMoodEntry({ date: today, mood: 4, moodLabel: 'Good' }),
      makeMoodEntry({ date: twoDaysAgo, mood: 2, moodLabel: 'Heavy' }),
      makeMoodEntry({ date: fiveDaysAgo, mood: 1, moodLabel: 'Struggling' }),
    ]);

    const { result } = renderHook(() => useMoodChartData());

    const todayPoint = result.current.find((d) => d.date === today);
    expect(todayPoint?.mood).toBe(4);
    expect(todayPoint?.moodLabel).toBe('Good');

    const twoDaysAgoPoint = result.current.find((d) => d.date === twoDaysAgo);
    expect(twoDaysAgoPoint?.mood).toBe(2);
    expect(twoDaysAgoPoint?.moodLabel).toBe('Heavy');

    const fiveDaysAgoPoint = result.current.find((d) => d.date === fiveDaysAgo);
    expect(fiveDaysAgoPoint?.mood).toBe(1);
    expect(fiveDaysAgoPoint?.moodLabel).toBe('Struggling');
  });

  it('days without entries return null mood/label/color', () => {
    const today = getLocalDateString();
    const twoDaysAgo = getLocalDateString(daysAgo(2));

    seedEntries([
      makeMoodEntry({ date: today, mood: 5, moodLabel: 'Thriving' }),
      makeMoodEntry({ date: twoDaysAgo, mood: 3, moodLabel: 'Okay' }),
    ]);

    const { result } = renderHook(() => useMoodChartData());

    const nullPoints = result.current.filter((d) => d.mood === null);
    expect(nullPoints).toHaveLength(5);
    nullPoints.forEach((p) => {
      expect(p.moodLabel).toBeNull();
      expect(p.color).toBeNull();
    });
  });

  it('dayLabel matches calendar day name', () => {
    const { result } = renderHook(() => useMoodChartData());
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    result.current.forEach((point) => {
      expect(dayNames).toContain(point.dayLabel);
      // Verify it matches the actual day
      const d = new Date(point.date + 'T12:00:00');
      expect(point.dayLabel).toBe(dayNames[d.getDay()]);
    });
  });

  it('handles empty localStorage (no key)', () => {
    const { result } = renderHook(() => useMoodChartData());
    expect(result.current).toHaveLength(7);
    result.current.forEach((p) => {
      expect(p.mood).toBeNull();
      expect(p.moodLabel).toBeNull();
      expect(p.color).toBeNull();
    });
  });

  it('handles corrupted localStorage JSON', () => {
    localStorage.setItem('wr_mood_entries', '{not valid json!!!');
    const { result } = renderHook(() => useMoodChartData());
    expect(result.current).toHaveLength(7);
    result.current.forEach((p) => {
      expect(p.mood).toBeNull();
    });
  });

  it('handles non-array localStorage value', () => {
    localStorage.setItem('wr_mood_entries', '"string"');
    const { result } = renderHook(() => useMoodChartData());
    expect(result.current).toHaveLength(7);
    result.current.forEach((p) => {
      expect(p.mood).toBeNull();
    });
  });

  it('uses local timezone (not UTC)', () => {
    // Set to a specific date/time — verify date matches local, not UTC
    vi.useFakeTimers();
    // March 16, 2026 at 11:30 PM local time
    vi.setSystemTime(new Date(2026, 2, 16, 23, 30, 0));

    const { result } = renderHook(() => useMoodChartData());
    const lastPoint = result.current[result.current.length - 1];
    // "Today" should be 2026-03-16 in local time
    expect(lastPoint.date).toBe('2026-03-16');
  });

  it('color matches MOOD_COLORS constant', () => {
    const today = getLocalDateString();
    seedEntries([makeMoodEntry({ date: today, mood: 4, moodLabel: 'Good' })]);

    const { result } = renderHook(() => useMoodChartData());
    const todayPoint = result.current.find((d) => d.date === today);
    expect(todayPoint?.color).toBe(MOOD_COLORS[4]);
    expect(todayPoint?.color).toBe('#2DD4BF');
  });
});
