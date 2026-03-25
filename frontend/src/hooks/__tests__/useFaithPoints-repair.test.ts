import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFaithPoints } from '../useFaithPoints';
import { getLevelForPoints } from '@/constants/dashboard/levels';

function simulateLogin() {
  localStorage.setItem('wr_auth_simulated', 'true');
  localStorage.setItem('wr_user_name', 'TestUser');
  localStorage.setItem('wr_user_id', 'test-id-123');
}

function wrapper({ children }: { children: ReactNode }) {
  return createElement(AuthProvider, null, children);
}

function setStreak(current: number, longest: number, lastActive: string | null) {
  localStorage.setItem('wr_streak', JSON.stringify({
    currentStreak: current, longestStreak: longest, lastActiveDate: lastActive,
  }));
}

function setFaithPoints(total: number) {
  const levelInfo = getLevelForPoints(total);
  localStorage.setItem('wr_faith_points', JSON.stringify({
    totalPoints: total, currentLevel: levelInfo.level, currentLevelName: levelInfo.name,
    pointsToNextLevel: levelInfo.pointsToNextLevel, lastUpdated: new Date().toISOString(),
  }));
}

function setRepairData(data: {
  previousStreak: number | null;
  lastFreeRepairDate: string | null;
  repairsUsedThisWeek: number;
  weekStartDate: string;
}) {
  localStorage.setItem('wr_streak_repairs', JSON.stringify(data));
}

function getStreak() {
  return JSON.parse(localStorage.getItem('wr_streak')!);
}

function getRepairs() {
  const raw = localStorage.getItem('wr_streak_repairs');
  return raw ? JSON.parse(raw) : null;
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 18, 12, 0, 0)); // March 18, 2026 (Wednesday)
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useFaithPoints — repairStreak (free)', () => {
  beforeEach(() => {
    simulateLogin();
  });

  it('restores streak to previousStreak value', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.previousStreak).toBe(10);

    act(() => { result.current.repairStreak(true); });

    expect(result.current.currentStreak).toBe(10);
  });

  it('sets lastActiveDate to today', () => {
    setStreak(1, 5, '2026-03-17');
    setRepairData({ previousStreak: 5, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    const streak = getStreak();
    expect(streak.lastActiveDate).toBe('2026-03-18');
  });

  it('updates longestStreak if previousStreak exceeds it', () => {
    setStreak(1, 5, '2026-03-18');
    setRepairData({ previousStreak: 15, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    expect(result.current.longestStreak).toBe(15);
  });

  it('clears previousStreak after repair', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    expect(result.current.previousStreak).toBeNull();
    const repairs = getRepairs();
    expect(repairs.previousStreak).toBeNull();
  });

  it('updates free repair tracking', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    const repairs = getRepairs();
    expect(repairs.lastFreeRepairDate).toBe('2026-03-18');
    expect(repairs.repairsUsedThisWeek).toBe(1);
  });
});

describe('useFaithPoints — repairStreak (paid)', () => {
  beforeEach(() => {
    simulateLogin();
  });

  it('deducts exactly 50 points', () => {
    setStreak(1, 10, '2026-03-18');
    setFaithPoints(200);
    setRepairData({ previousStreak: 10, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(false); });

    expect(result.current.totalPoints).toBe(150);
  });

  it('recalculates level after deduction', () => {
    setStreak(1, 5, '2026-03-18');
    setFaithPoints(120); // Sprout (100+)
    setRepairData({ previousStreak: 5, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.levelName).toBe('Sprout');

    act(() => { result.current.repairStreak(false); });

    // 120 - 50 = 70 → Seedling
    expect(result.current.totalPoints).toBe(70);
    expect(result.current.levelName).toBe('Seedling');
  });

  it('does NOT deduct if < 50 points', () => {
    setStreak(1, 5, '2026-03-18');
    setFaithPoints(30);
    setRepairData({ previousStreak: 5, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(false); });

    // No-op
    expect(result.current.totalPoints).toBe(30);
    expect(result.current.currentStreak).toBe(1);
  });

  it('does NOT touch lastFreeRepairDate', () => {
    setStreak(1, 10, '2026-03-18');
    setFaithPoints(200);
    setRepairData({ previousStreak: 10, lastFreeRepairDate: '2026-03-15', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(false); });

    const repairs = getRepairs();
    expect(repairs.lastFreeRepairDate).toBe('2026-03-15');
  });
});

describe('useFaithPoints — repairStreak guards', () => {
  it('noops when not authenticated', () => {
    // No simulateLogin()
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    expect(result.current.currentStreak).toBe(0); // Default state
  });

  it('noops when previousStreak is null', () => {
    simulateLogin();
    setStreak(1, 5, '2026-03-18');
    // No repair data → previousStreak is null

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    expect(result.current.currentStreak).toBe(1); // Unchanged
  });

  it('noops when previousStreak is 1', () => {
    simulateLogin();
    setStreak(0, 5, null);
    setRepairData({ previousStreak: 1, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    act(() => { result.current.repairStreak(true); });

    expect(result.current.currentStreak).toBe(0); // Unchanged
  });
});

describe('useFaithPoints — repair state exposure', () => {
  beforeEach(() => {
    simulateLogin();
  });

  it('previousStreak exposed correctly in state', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 7, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.previousStreak).toBe(7);
  });

  it('isFreeRepairAvailable true when never used', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 5, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.isFreeRepairAvailable).toBe(true);
  });

  it('isFreeRepairAvailable false when already used this week', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 5, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.isFreeRepairAvailable).toBe(false);
  });

  it('unauthenticated state has null previousStreak and false isFreeRepairAvailable', () => {
    // Clear auth to test unauthenticated path
    localStorage.removeItem('wr_auth_simulated');
    localStorage.removeItem('wr_user_name');
    localStorage.removeItem('wr_user_id');

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.previousStreak).toBeNull();
    expect(result.current.isFreeRepairAvailable).toBe(false);
  });
});

// --- Integration tests (full flow) ---

describe('useFaithPoints — full repair flow (integration)', () => {
  beforeEach(() => {
    simulateLogin();
  });

  it('streak resets → previousStreak captured → free repair → streak restored', () => {
    // Set streak to 7, last active 2 days ago (March 16) — gap on March 17
    setStreak(7, 7, '2026-03-16');

    const { result } = renderHook(() => useFaithPoints(), { wrapper });
    expect(result.current.currentStreak).toBe(7);

    // Record activity — triggers streak reset (missed March 17)
    act(() => { result.current.recordActivity('pray'); });

    // Streak resets to 1, previousStreak captured as 7
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.previousStreak).toBe(7);
    expect(result.current.isFreeRepairAvailable).toBe(true);

    // Free repair
    act(() => { result.current.repairStreak(true); });

    expect(result.current.currentStreak).toBe(7);
    expect(result.current.previousStreak).toBeNull();
    expect(result.current.isFreeRepairAvailable).toBe(false);
  });

  it('paid repair deducts points and restores streak', () => {
    setStreak(1, 10, '2026-03-18');
    setFaithPoints(200);
    setRepairData({ previousStreak: 10, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => { result.current.repairStreak(false); });

    expect(result.current.currentStreak).toBe(10);
    expect(result.current.totalPoints).toBe(150);
    expect(result.current.previousStreak).toBeNull();
  });

  it('week rollover resets free repair availability', () => {
    // Use free repair on Sunday of previous week
    setStreak(1, 8, '2026-03-18');
    setRepairData({
      previousStreak: 8,
      lastFreeRepairDate: '2026-03-15', // Sunday (before current Monday 2026-03-16)
      repairsUsedThisWeek: 1,
      weekStartDate: '2026-03-09', // Previous Monday
    });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // After lazy weekly reset, free repair should be available
    expect(result.current.isFreeRepairAvailable).toBe(true);
  });

  it('repair when previousStreak would be new longestStreak', () => {
    // longestStreak is 5, previousStreak is 10
    setStreak(1, 5, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    act(() => { result.current.repairStreak(true); });

    expect(result.current.currentStreak).toBe(10);
    expect(result.current.longestStreak).toBe(10);
  });

  it('corrupted wr_streak_repairs — graceful recovery, no crash', () => {
    localStorage.setItem('wr_streak_repairs', 'invalid json{{{');
    setStreak(1, 5, '2026-03-18');

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // previousStreak should be null (fresh repair data)
    expect(result.current.previousStreak).toBeNull();

    // repairStreak should noop gracefully
    act(() => { result.current.repairStreak(true); });
    expect(result.current.currentStreak).toBe(1);
  });

  it('localStorage unavailable — no crash, repair noop', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: null, repairsUsedThisWeek: 0, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // Mock localStorage.setItem to throw
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    act(() => { result.current.repairStreak(true); });

    // State should not have changed (repair failed gracefully)
    // The repair tried to write but failed, so streak stays at 1
    expect(result.current.currentStreak).toBe(1);

    spy.mockRestore();
  });

  it('paid repair rolls back faith points if streak write fails', () => {
    setStreak(1, 10, '2026-03-18');
    setFaithPoints(200);
    setRepairData({ previousStreak: 10, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // Mock setItem to succeed for faith_points but fail for streak
    let _callCount = 0;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      _callCount++;
      if (key === 'wr_streak') {
        throw new Error('QuotaExceededError');
      }
      // Allow faith_points write (and rollback write) to proceed
      Storage.prototype.setItem.call(localStorage, key, value);
    });

    act(() => { result.current.repairStreak(false); });

    spy.mockRestore();

    // Faith points should be rolled back to original value
    const fp = JSON.parse(localStorage.getItem('wr_faith_points')!);
    expect(fp.totalPoints).toBe(200);

    // Streak should remain unchanged
    expect(result.current.currentStreak).toBe(1);
  });

  it('free repair noops when free repair already used this week', () => {
    setStreak(1, 10, '2026-03-18');
    setRepairData({ previousStreak: 10, lastFreeRepairDate: '2026-03-17', repairsUsedThisWeek: 1, weekStartDate: '2026-03-16' });

    const { result } = renderHook(() => useFaithPoints(), { wrapper });

    // Attempt free repair when already used
    act(() => { result.current.repairStreak(true); });

    // Should be a no-op
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.previousStreak).toBe(10);
  });
});
