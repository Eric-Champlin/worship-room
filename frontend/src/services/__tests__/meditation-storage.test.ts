import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getMeditationHistory,
  saveMeditationSession,
  getMeditationMinutesForWeek,
  getMeditationMinutesForRange,
  getMostPracticedType,
} from '../meditation-storage';
import type { MeditationSession } from '@/types/meditation';

function makeSession(overrides: Partial<MeditationSession> = {}): MeditationSession {
  return {
    id: 'test-id-1',
    type: 'breathing',
    date: '2026-03-16',
    durationMinutes: 5,
    completedAt: '2026-03-16T12:00:00.000Z',
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

describe('getMeditationHistory', () => {
  it('returns empty array for missing key', () => {
    expect(getMeditationHistory()).toEqual([]);
  });

  it('returns empty array for corrupted JSON', () => {
    localStorage.setItem('wr_meditation_history', '{not valid json!!!');
    expect(getMeditationHistory()).toEqual([]);
  });

  it('returns empty array for non-array JSON', () => {
    localStorage.setItem('wr_meditation_history', '"hello"');
    expect(getMeditationHistory()).toEqual([]);
  });

  it('returns valid entries', () => {
    const entries = [makeSession()];
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));
    expect(getMeditationHistory()).toEqual(entries);
  });
});

describe('saveMeditationSession', () => {
  it('prepends entry', () => {
    const existing = makeSession({ id: 'old', date: '2026-03-15' });
    localStorage.setItem('wr_meditation_history', JSON.stringify([existing]));

    const newEntry = makeSession({ id: 'new', date: '2026-03-16' });
    saveMeditationSession(newEntry);

    const result = getMeditationHistory();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('new');
    expect(result[1].id).toBe('old');
  });

  it('caps at 365 entries', () => {
    const entries = Array.from({ length: 365 }, (_, i) =>
      makeSession({ id: `entry-${i}`, date: `2025-01-01` }),
    );
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));

    const newEntry = makeSession({ id: 'new-entry', date: '2026-03-16' });
    saveMeditationSession(newEntry);

    const result = getMeditationHistory();
    expect(result).toHaveLength(365);
    expect(result[0].id).toBe('new-entry');
    expect(result.find((e) => e.id === 'entry-364')).toBeUndefined();
  });

  it('handles first-ever save with no existing key', () => {
    const entry = makeSession({ id: 'first' });
    saveMeditationSession(entry);

    const result = getMeditationHistory();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('first');
  });
});

describe('getMeditationMinutesForWeek', () => {
  it('returns 0 for no entries', () => {
    expect(getMeditationMinutesForWeek()).toBe(0);
  });

  it('sums entries in the given week', () => {
    // Week of 2026-03-16 (Monday) to 2026-03-22 (Sunday)
    const entries = [
      makeSession({ id: '1', date: '2026-03-16', durationMinutes: 5 }),
      makeSession({ id: '2', date: '2026-03-18', durationMinutes: 10 }),
      makeSession({ id: '3', date: '2026-03-22', durationMinutes: 3 }),
    ];
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));

    expect(getMeditationMinutesForWeek('2026-03-16')).toBe(18);
  });

  it('excludes entries outside the week', () => {
    const entries = [
      makeSession({ id: '1', date: '2026-03-16', durationMinutes: 5 }),
      makeSession({ id: '2', date: '2026-03-15', durationMinutes: 10 }), // previous week
      makeSession({ id: '3', date: '2026-03-23', durationMinutes: 7 }), // next week
    ];
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));

    expect(getMeditationMinutesForWeek('2026-03-16')).toBe(5);
  });

  it('uses current week start when no argument given', () => {
    vi.useFakeTimers();
    // Wednesday 2026-03-18 → week start is Monday 2026-03-16
    vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0));

    const entries = [
      makeSession({ id: '1', date: '2026-03-16', durationMinutes: 5 }),
      makeSession({ id: '2', date: '2026-03-18', durationMinutes: 10 }),
    ];
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));

    expect(getMeditationMinutesForWeek()).toBe(15);
  });
});

describe('getMeditationMinutesForRange', () => {
  it('filters entries by date range', () => {
    const entries = [
      makeSession({ id: '1', date: '2026-03-10', durationMinutes: 5 }),
      makeSession({ id: '2', date: '2026-03-15', durationMinutes: 10 }),
      makeSession({ id: '3', date: '2026-03-20', durationMinutes: 3 }),
      makeSession({ id: '4', date: '2026-03-25', durationMinutes: 7 }),
    ];
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));

    const result = getMeditationMinutesForRange('2026-03-12', '2026-03-21');
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['2', '3']);
  });

  it('returns empty array when no entries match', () => {
    const entries = [makeSession({ id: '1', date: '2026-03-10' })];
    localStorage.setItem('wr_meditation_history', JSON.stringify(entries));

    const result = getMeditationMinutesForRange('2026-04-01', '2026-04-30');
    expect(result).toEqual([]);
  });
});

describe('getMostPracticedType', () => {
  it('returns the highest count type', () => {
    const entries = [
      makeSession({ type: 'breathing' }),
      makeSession({ type: 'breathing' }),
      makeSession({ type: 'breathing' }),
      makeSession({ type: 'soaking' }),
      makeSession({ type: 'gratitude' }),
    ];

    const result = getMostPracticedType(entries);
    expect(result).toEqual({ type: 'breathing', percentage: 60 });
  });

  it('returns null for empty entries', () => {
    expect(getMostPracticedType([])).toBeNull();
  });

  it('handles tied types by returning one of them', () => {
    const entries = [
      makeSession({ type: 'breathing' }),
      makeSession({ type: 'soaking' }),
    ];

    const result = getMostPracticedType(entries);
    expect(result).not.toBeNull();
    expect(result!.percentage).toBe(50);
    expect(['breathing', 'soaking']).toContain(result!.type);
  });
});
