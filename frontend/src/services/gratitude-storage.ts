import { getLocalDateString } from '@/utils/date';

export interface GratitudeEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  items: string[];     // 1-3 non-empty strings, each max 150 chars
  createdAt: string;   // ISO 8601
}

const STORAGE_KEY = 'wr_gratitude_entries';
const MAX_ENTRIES = 365;

export function getGratitudeEntries(): GratitudeEntry[] {
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

export function getTodayGratitude(): GratitudeEntry | null {
  const today = getLocalDateString();
  const entries = getGratitudeEntries();
  return entries.find((e) => e.date === today) ?? null;
}

export function saveGratitudeEntry(items: string[]): GratitudeEntry {
  const today = getLocalDateString();
  const entries = getGratitudeEntries();
  const existingIndex = entries.findIndex((e) => e.date === today);

  const entry: GratitudeEntry = {
    id: existingIndex >= 0 ? entries[existingIndex].id : crypto.randomUUID(),
    date: today,
    items: items.filter((s) => s.trim().length > 0).map((s) => s.trim().slice(0, 150)),
    createdAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }

  // Prune oldest entries beyond MAX_ENTRIES
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entry;
}

export function getGratitudeStreak(): number {
  const entries = getGratitudeEntries();
  if (entries.length === 0) return 0;

  // Sort by date descending
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  const today = getLocalDateString();
  let streak = 0;
  let expectedDate = today;

  for (const entry of sorted) {
    if (entry.date === expectedDate) {
      streak++;
      // Move expectedDate to previous day
      const d = new Date(expectedDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      expectedDate = getLocalDateString(d);
    } else if (entry.date < expectedDate) {
      break;
    }
  }

  return streak;
}
