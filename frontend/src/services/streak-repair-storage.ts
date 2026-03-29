import type { StreakRepairData } from '@/types/dashboard';
import { getCurrentWeekStart } from '@/utils/date';

const REPAIRS_KEY = 'wr_streak_repairs';

export function freshRepairData(): StreakRepairData {
  return {
    previousStreak: null,
    lastFreeRepairDate: null,
    repairsUsedThisWeek: 0,
    weekStartDate: getCurrentWeekStart(),
  };
}

export function getRepairData(): StreakRepairData {
  try {
    const raw = localStorage.getItem(REPAIRS_KEY);
    if (!raw) return freshRepairData();

    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return freshRepairData();
    }

    const data = parsed as StreakRepairData;

    // Lazy weekly reset: if stored weekStartDate is before current Monday, reset weekly counters
    const currentWeekStart = getCurrentWeekStart();
    if (data.weekStartDate < currentWeekStart) {
      return {
        previousStreak: data.previousStreak ?? null,
        lastFreeRepairDate: data.lastFreeRepairDate ?? null,
        repairsUsedThisWeek: 0,
        weekStartDate: currentWeekStart,
      };
    }

    return {
      previousStreak: data.previousStreak ?? null,
      lastFreeRepairDate: data.lastFreeRepairDate ?? null,
      repairsUsedThisWeek: typeof data.repairsUsedThisWeek === 'number' ? data.repairsUsedThisWeek : 0,
      weekStartDate: data.weekStartDate ?? currentWeekStart,
    };
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return freshRepairData();
  }
}

export function saveRepairData(data: StreakRepairData): boolean {
  try {
    localStorage.setItem(REPAIRS_KEY, JSON.stringify(data));
    return true;
  } catch (_e) {
    // localStorage may be unavailable
    return false;
  }
}

export function capturePreviousStreak(oldStreak: number): void {
  if (oldStreak <= 1) return;

  const data = getRepairData();

  // Do not overwrite if already set — preserve the original pre-reset value
  if (data.previousStreak !== null) return;

  data.previousStreak = oldStreak;
  saveRepairData(data);
}

export function isFreeRepairAvailable(): boolean {
  const data = getRepairData();
  // After lazy weekly reset, lastFreeRepairDate is preserved but weekStartDate is current.
  // Free repair is available if never used OR if last use was in a previous week.
  if (data.lastFreeRepairDate === null) return true;

  const currentWeekStart = getCurrentWeekStart();
  // If the last free repair date is before the current week start, it's available
  return data.lastFreeRepairDate < currentWeekStart;
}

export function clearPreviousStreak(): void {
  const data = getRepairData();
  data.previousStreak = null;
  saveRepairData(data);
}
