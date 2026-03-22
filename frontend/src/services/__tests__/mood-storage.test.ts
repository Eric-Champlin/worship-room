import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getMoodEntries, hasCheckedInToday, saveMoodEntry } from '../mood-storage';
import type { MoodEntry } from '@/types/dashboard';

function makeMoodEntry(overrides: Partial<MoodEntry> = {}): MoodEntry {
  return {
    id: 'test-id-1',
    date: '2026-03-16',
    mood: 3,
    moodLabel: 'Okay',
    timestamp: 1742140800000,
    verseSeen: 'Psalm 46:10',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getMoodEntries', () => {
  it('returns empty array for missing key', () => {
    expect(getMoodEntries()).toEqual([]);
  });

  it('returns empty array for corrupted JSON', () => {
    localStorage.setItem('wr_mood_entries', '{not valid json!!!');
    expect(getMoodEntries()).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    localStorage.setItem('wr_mood_entries', '"hello"');
    expect(getMoodEntries()).toEqual([]);
  });

  it('returns valid entries', () => {
    const entries = [makeMoodEntry()];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(getMoodEntries()).toEqual(entries);
  });
});

describe('hasCheckedInToday', () => {
  it('returns true when entry exists for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-16' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday()).toBe(true);
  });

  it('returns false when no entry for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-15' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday()).toBe(false);
  });

  it('returns false for empty entries', () => {
    expect(hasCheckedInToday()).toBe(false);
  });

  it('returns true for morning when timeOfDay is morning', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-16', timeOfDay: 'morning' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday('morning')).toBe(true);
  });

  it('returns false for evening when only morning entry exists', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-16', timeOfDay: 'morning' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday('evening')).toBe(false);
  });

  it('returns true for evening when evening entry exists', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-16', timeOfDay: 'evening' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday('evening')).toBe(true);
  });

  it('treats missing timeOfDay as morning (backward compat)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-16' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday('morning')).toBe(true);
    expect(hasCheckedInToday('evening')).toBe(false);
  });

  it('returns true with no args for any entry today (backward compat)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
    const entries = [makeMoodEntry({ date: '2026-03-16', timeOfDay: 'evening' })];
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));
    expect(hasCheckedInToday()).toBe(true);
  });
});

describe('saveMoodEntry', () => {
  it('prepends entry to array', () => {
    const existing = makeMoodEntry({ id: 'old', date: '2026-03-15' });
    localStorage.setItem('wr_mood_entries', JSON.stringify([existing]));

    const newEntry = makeMoodEntry({ id: 'new', date: '2026-03-16' });
    saveMoodEntry(newEntry);

    const result = getMoodEntries();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('new');
    expect(result[1].id).toBe('old');
  });

  it('caps at 365 entries', () => {
    const entries = Array.from({ length: 365 }, (_, i) =>
      makeMoodEntry({ id: `entry-${i}`, date: `2025-01-${String(i + 1).padStart(2, '0')}` })
    );
    localStorage.setItem('wr_mood_entries', JSON.stringify(entries));

    const newEntry = makeMoodEntry({ id: 'new-entry', date: '2026-03-16' });
    saveMoodEntry(newEntry);

    const result = getMoodEntries();
    expect(result).toHaveLength(365);
    expect(result[0].id).toBe('new-entry');
    // Oldest entry should be removed
    expect(result.find((e) => e.id === 'entry-364')).toBeUndefined();
  });

  it('handles first-ever save with no existing key', () => {
    const entry = makeMoodEntry({ id: 'first' });
    saveMoodEntry(entry);

    const result = getMoodEntries();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('first');
  });
});
