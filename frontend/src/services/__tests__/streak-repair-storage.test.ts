import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  freshRepairData,
  getRepairData,
  saveRepairData,
  capturePreviousStreak,
  isFreeRepairAvailable,
  clearPreviousStreak,
} from '../streak-repair-storage';

const REPAIRS_KEY = 'wr_streak_repairs';

// Mock getCurrentWeekStart to control week boundaries
vi.mock('@/utils/date', () => ({
  getLocalDateString: vi.fn(() => '2026-03-18'),
  getCurrentWeekStart: vi.fn(() => '2026-03-16'), // Monday of current week
}));

import { getCurrentWeekStart } from '@/utils/date';
const mockGetCurrentWeekStart = getCurrentWeekStart as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  mockGetCurrentWeekStart.mockReturnValue('2026-03-16');
});

afterEach(() => {
  vi.restoreAllMocks();
});

// --- getRepairData ---

describe('getRepairData', () => {
  it('returns fresh data when key missing', () => {
    const data = getRepairData();
    expect(data).toEqual({
      previousStreak: null,
      lastFreeRepairDate: null,
      repairsUsedThisWeek: 0,
      weekStartDate: '2026-03-16',
    });
  });

  it('recovers from corrupted JSON', () => {
    localStorage.setItem(REPAIRS_KEY, '{not valid!!!');
    const data = getRepairData();
    expect(data.previousStreak).toBeNull();
    expect(data.repairsUsedThisWeek).toBe(0);
  });

  it('recovers from non-object JSON (array)', () => {
    localStorage.setItem(REPAIRS_KEY, '[]');
    const data = getRepairData();
    expect(data).toEqual(freshRepairData());
  });

  it('performs lazy weekly reset when weekStartDate is past Monday', () => {
    const oldData = {
      previousStreak: 5,
      lastFreeRepairDate: '2026-03-10',
      repairsUsedThisWeek: 2,
      weekStartDate: '2026-03-09', // Previous Monday
    };
    localStorage.setItem(REPAIRS_KEY, JSON.stringify(oldData));

    const data = getRepairData();
    expect(data.repairsUsedThisWeek).toBe(0);
    expect(data.weekStartDate).toBe('2026-03-16');
    // previousStreak and lastFreeRepairDate preserved
    expect(data.previousStreak).toBe(5);
    expect(data.lastFreeRepairDate).toBe('2026-03-10');
  });

  it('does NOT reset when same week', () => {
    const currentWeekData = {
      previousStreak: 3,
      lastFreeRepairDate: '2026-03-17',
      repairsUsedThisWeek: 1,
      weekStartDate: '2026-03-16',
    };
    localStorage.setItem(REPAIRS_KEY, JSON.stringify(currentWeekData));

    const data = getRepairData();
    expect(data.repairsUsedThisWeek).toBe(1);
    expect(data.weekStartDate).toBe('2026-03-16');
  });

  it('handles missing fields gracefully', () => {
    localStorage.setItem(REPAIRS_KEY, JSON.stringify({ weekStartDate: '2026-03-16' }));
    const data = getRepairData();
    expect(data.previousStreak).toBeNull();
    expect(data.lastFreeRepairDate).toBeNull();
    expect(data.repairsUsedThisWeek).toBe(0);
  });
});

// --- saveRepairData ---

describe('saveRepairData', () => {
  it('saves data to localStorage', () => {
    const data = { ...freshRepairData(), previousStreak: 7 };
    const result = saveRepairData(data);
    expect(result).toBe(true);
    expect(JSON.parse(localStorage.getItem(REPAIRS_KEY)!)).toEqual(data);
  });

  it('handles localStorage failure', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const result = saveRepairData(freshRepairData());
    expect(result).toBe(false);
    spy.mockRestore();
  });
});

// --- capturePreviousStreak ---

describe('capturePreviousStreak', () => {
  it('stores value when > 1', () => {
    capturePreviousStreak(5);
    const data = getRepairData();
    expect(data.previousStreak).toBe(5);
  });

  it('ignores value of 1', () => {
    capturePreviousStreak(1);
    const data = getRepairData();
    expect(data.previousStreak).toBeNull();
  });

  it('ignores value of 0', () => {
    capturePreviousStreak(0);
    const data = getRepairData();
    expect(data.previousStreak).toBeNull();
  });

  it('does NOT overwrite existing value (preserves original pre-reset)', () => {
    // First capture: streak of 3
    capturePreviousStreak(3);
    expect(getRepairData().previousStreak).toBe(3);

    // Second capture: higher streak of 8 — should NOT overwrite
    capturePreviousStreak(8);
    expect(getRepairData().previousStreak).toBe(3);
  });

  it('does NOT overwrite even with lower value', () => {
    const data = { ...freshRepairData(), previousStreak: 10 };
    saveRepairData(data);

    capturePreviousStreak(5);
    expect(getRepairData().previousStreak).toBe(10);
  });
});

// --- isFreeRepairAvailable ---

describe('isFreeRepairAvailable', () => {
  it('returns true when never used', () => {
    expect(isFreeRepairAvailable()).toBe(true);
  });

  it('returns false after use this week', () => {
    const data = {
      ...freshRepairData(),
      lastFreeRepairDate: '2026-03-17', // Tuesday of current week (after Monday 03-16)
      weekStartDate: '2026-03-16',
    };
    saveRepairData(data);
    expect(isFreeRepairAvailable()).toBe(false);
  });

  it('returns true when last use was in a previous week', () => {
    const data = {
      ...freshRepairData(),
      lastFreeRepairDate: '2026-03-10', // Previous week
      weekStartDate: '2026-03-16',
    };
    saveRepairData(data);
    // lastFreeRepairDate '2026-03-10' < currentWeekStart '2026-03-16' → true
    expect(isFreeRepairAvailable()).toBe(true);
  });

  it('resets on new week (lazy reset clears weekly counters)', () => {
    // Set data from old week
    const data = {
      previousStreak: null,
      lastFreeRepairDate: '2026-03-12', // Thursday of old week
      repairsUsedThisWeek: 1,
      weekStartDate: '2026-03-09', // Old Monday
    };
    localStorage.setItem(REPAIRS_KEY, JSON.stringify(data));

    // Now reading triggers lazy reset, but lastFreeRepairDate is still '2026-03-12'
    // which is < currentWeekStart '2026-03-16', so free repair is available
    expect(isFreeRepairAvailable()).toBe(true);
  });
});

// --- clearPreviousStreak ---

describe('clearPreviousStreak', () => {
  it('sets previousStreak to null', () => {
    capturePreviousStreak(7);
    expect(getRepairData().previousStreak).toBe(7);

    clearPreviousStreak();
    expect(getRepairData().previousStreak).toBeNull();
  });

  it('is safe to call when already null', () => {
    clearPreviousStreak();
    expect(getRepairData().previousStreak).toBeNull();
  });
});
