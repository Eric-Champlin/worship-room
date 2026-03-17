import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useListenTracker } from '../useListenTracker';

// Mock useAudioState
let mockIsPlaying = false;
vi.mock('@/components/audio/AudioProvider', () => ({
  useAudioState: () => ({ isPlaying: mockIsPlaying }),
}));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 2, 16, 12, 0, 0));
  mockIsPlaying = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useListenTracker', () => {
  it('timer starts when isPlaying becomes true', () => {
    mockIsPlaying = false;
    const { rerender } = renderHook(
      ({ isAuth }) => useListenTracker(isAuth),
      { initialProps: { isAuth: true } },
    );

    // No activity yet
    expect(localStorage.getItem('wr_daily_activities')).toBeNull();

    // Start playing
    mockIsPlaying = true;
    rerender({ isAuth: true });

    // Advance 30 seconds + 1 poll interval
    vi.advanceTimersByTime(35_000);

    // Listen should be recorded
    const log = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(log['2026-03-16'].listen).toBe(true);
  });

  it('timer resets when isPlaying becomes false (pause)', () => {
    mockIsPlaying = true;
    const { rerender } = renderHook(
      ({ isAuth }) => useListenTracker(isAuth),
      { initialProps: { isAuth: true } },
    );

    // Advance 20 seconds (not enough)
    vi.advanceTimersByTime(20_000);

    // Pause
    mockIsPlaying = false;
    rerender({ isAuth: true });

    // Resume
    mockIsPlaying = true;
    rerender({ isAuth: true });

    // Advance another 20 seconds (only 20 since resume, not 40 total)
    vi.advanceTimersByTime(20_000);

    // Should NOT be recorded yet (timer reset on pause)
    expect(localStorage.getItem('wr_daily_activities')).toBeNull();

    // Advance another 15 seconds (now 35 since resume)
    vi.advanceTimersByTime(15_000);

    // Now it should be recorded
    const log = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(log['2026-03-16'].listen).toBe(true);
  });

  it('recordActivity("listen") called after 30 continuous seconds', () => {
    mockIsPlaying = true;
    renderHook(() => useListenTracker(true));

    // At 25 seconds — not yet
    vi.advanceTimersByTime(25_000);
    expect(localStorage.getItem('wr_daily_activities')).toBeNull();

    // At 35 seconds — should be recorded (poll at 30s or 35s)
    vi.advanceTimersByTime(10_000);
    const log = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(log['2026-03-16'].listen).toBe(true);
  });

  it('listen recorded at most once per day', () => {
    mockIsPlaying = true;
    const { rerender } = renderHook(
      ({ isAuth }) => useListenTracker(isAuth),
      { initialProps: { isAuth: true } },
    );

    // First recording
    vi.advanceTimersByTime(35_000);
    const log1 = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    const points1 = log1['2026-03-16'].pointsEarned;

    // Pause and resume
    mockIsPlaying = false;
    rerender({ isAuth: true });
    mockIsPlaying = true;
    rerender({ isAuth: true });

    // Another 35 seconds
    vi.advanceTimersByTime(35_000);
    const log2 = JSON.parse(localStorage.getItem('wr_daily_activities')!);

    // Points should not have changed
    expect(log2['2026-03-16'].pointsEarned).toBe(points1);
  });

  it('listen resets on new day (midnight rollover)', () => {
    mockIsPlaying = true;
    const { rerender } = renderHook(
      ({ isAuth }) => useListenTracker(isAuth),
      { initialProps: { isAuth: true } },
    );

    // Record on day 1
    vi.advanceTimersByTime(35_000);
    const log1 = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(log1['2026-03-16'].listen).toBe(true);

    // Advance to next day
    vi.setSystemTime(new Date(2026, 2, 17, 12, 0, 0));

    // Pause and resume to trigger new tracking
    mockIsPlaying = false;
    rerender({ isAuth: true });
    mockIsPlaying = true;
    rerender({ isAuth: true });

    vi.advanceTimersByTime(35_000);
    const log2 = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(log2['2026-03-17'].listen).toBe(true);
  });

  it('timer does not start if already recorded today', () => {
    // Pre-seed today's listen activity
    const data = {
      '2026-03-16': {
        mood: false, pray: false, listen: true,
        prayerWall: false, meditate: false, journal: false,
        pointsEarned: 10, multiplier: 1,
      },
    };
    localStorage.setItem('wr_daily_activities', JSON.stringify(data));

    mockIsPlaying = true;
    renderHook(() => useListenTracker(true));

    vi.advanceTimersByTime(60_000);

    // Points should not have changed — no re-recording
    const log = JSON.parse(localStorage.getItem('wr_daily_activities')!);
    expect(log['2026-03-16'].pointsEarned).toBe(10);
  });

  it('timer cleans up on unmount', () => {
    mockIsPlaying = true;
    const { unmount } = renderHook(() => useListenTracker(true));

    // Advance 10 seconds
    vi.advanceTimersByTime(10_000);

    unmount();

    // Advance past threshold — should NOT record since unmounted
    vi.advanceTimersByTime(30_000);
    expect(localStorage.getItem('wr_daily_activities')).toBeNull();
  });
});
