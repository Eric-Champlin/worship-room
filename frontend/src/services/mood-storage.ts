import type { MoodEntry } from '@/types/dashboard';
import { getLocalDateString } from '@/utils/date';
import { MAX_MOOD_ENTRIES } from '@/constants/dashboard/mood';

const STORAGE_KEY = 'wr_mood_entries';

export function getMoodEntries(): MoodEntry[] {
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

export function hasCheckedInToday(timeOfDay?: 'morning' | 'evening'): boolean {
  const today = getLocalDateString();
  const entries = getMoodEntries();
  return entries.some((e) => e.date === today && (!timeOfDay || (e.timeOfDay ?? 'morning') === timeOfDay));
}

export function saveMoodEntry(entry: MoodEntry): void {
  const entries = getMoodEntries();
  entries.unshift(entry);
  if (entries.length > MAX_MOOD_ENTRIES) {
    entries.length = MAX_MOOD_ENTRIES;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
