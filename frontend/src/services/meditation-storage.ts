import type { MeditationSession } from '@/types/meditation';
import type { MeditationType } from '@/types/daily-experience';
import { getLocalDateString, getCurrentWeekStart } from '@/utils/date';

const STORAGE_KEY = 'wr_meditation_history';
const MAX_ENTRIES = 365;

export function getMeditationHistory(): MeditationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveMeditationSession(session: MeditationSession): void {
  const entries = getMeditationHistory();
  entries.unshift(session);
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function getMeditationMinutesForWeek(weekStartDate?: string): number {
  const weekStart = weekStartDate ?? getCurrentWeekStart();
  const weekStartObj = new Date(weekStart + 'T00:00:00');
  const weekEndObj = new Date(weekStartObj);
  weekEndObj.setDate(weekEndObj.getDate() + 6);
  const weekEnd = getLocalDateString(weekEndObj);

  const entries = getMeditationHistory();
  return entries
    .filter((e) => e.date >= weekStart && e.date <= weekEnd)
    .reduce((sum, e) => sum + e.durationMinutes, 0);
}

export function getMeditationMinutesForRange(
  startDate: string,
  endDate: string,
): MeditationSession[] {
  const entries = getMeditationHistory();
  return entries.filter((e) => e.date >= startDate && e.date <= endDate);
}

export function getMostPracticedType(
  entries: MeditationSession[],
): { type: MeditationType; percentage: number } | null {
  if (entries.length === 0) return null;

  const counts: Partial<Record<MeditationType, number>> = {};
  for (const entry of entries) {
    counts[entry.type] = (counts[entry.type] ?? 0) + 1;
  }

  let maxType: MeditationType | null = null;
  let maxCount = 0;
  for (const [type, count] of Object.entries(counts)) {
    if (count! > maxCount) {
      maxCount = count!;
      maxType = type as MeditationType;
    }
  }

  if (!maxType) return null;

  return {
    type: maxType,
    percentage: Math.round((maxCount / entries.length) * 100),
  };
}
