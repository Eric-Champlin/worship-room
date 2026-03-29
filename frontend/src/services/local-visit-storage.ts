import type { LocalSupportCategory } from '@/types/local-support';
import { getLocalDateString } from '@/utils/date';

export interface LocalVisit {
  id: string;
  placeId: string;
  placeName: string;
  placeType: 'church' | 'counselor' | 'cr';
  visitDate: string; // YYYY-MM-DD
  note: string;
}

export const STORAGE_KEY = 'wr_local_visits';
export const MAX_ENTRIES = 500;

export function getVisits(): LocalVisit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (_e) {
    // localStorage may be unavailable or data malformed
    return [];
  }
}

export function getVisitsByPlace(placeId: string): LocalVisit[] {
  return getVisits().filter((v) => v.placeId === placeId);
}

export function getVisitsByDate(date: string): LocalVisit[] {
  return getVisits().filter((v) => v.visitDate === date);
}

export function hasVisitedToday(placeId: string): boolean {
  const today = getLocalDateString();
  return getVisits().some((v) => v.placeId === placeId && v.visitDate === today);
}

export function addVisit(visit: Omit<LocalVisit, 'id'>): LocalVisit {
  const newVisit: LocalVisit = {
    ...visit,
    id: crypto.randomUUID(),
  };
  const visits = getVisits();
  visits.unshift(newVisit);
  if (visits.length > MAX_ENTRIES) {
    visits.length = MAX_ENTRIES;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  return newVisit;
}

export function updateVisitNote(visitId: string, note: string): void {
  const visits = getVisits();
  const visit = visits.find((v) => v.id === visitId);
  if (!visit) return;
  visit.note = note.slice(0, 300);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

export function removeVisit(visitId: string): void {
  const visits = getVisits().filter((v) => v.id !== visitId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

export function getUniqueVisitedPlaces(): {
  total: number;
  churches: number;
  counselors: number;
  cr: number;
} {
  const visits = getVisits();
  const uniqueByType = new Map<string, 'church' | 'counselor' | 'cr'>();
  for (const v of visits) {
    if (!uniqueByType.has(v.placeId)) {
      uniqueByType.set(v.placeId, v.placeType);
    }
  }
  let churches = 0;
  let counselors = 0;
  let cr = 0;
  for (const type of uniqueByType.values()) {
    if (type === 'church') churches++;
    else if (type === 'counselor') counselors++;
    else if (type === 'cr') cr++;
  }
  return { total: uniqueByType.size, churches, counselors, cr };
}

export function categoryToPlaceType(
  cat: LocalSupportCategory,
): 'church' | 'counselor' | 'cr' {
  switch (cat) {
    case 'churches':
      return 'church';
    case 'counselors':
      return 'counselor';
    case 'celebrate-recovery':
      return 'cr';
  }
}
