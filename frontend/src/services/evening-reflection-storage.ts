import { getLocalDateString } from '@/utils/date';
import { EVENING_REFLECTION_STORAGE_KEY, EVENING_HOUR_THRESHOLD } from '@/constants/dashboard/evening-reflection';

export function hasReflectedToday(): boolean {
  const stored = localStorage.getItem(EVENING_REFLECTION_STORAGE_KEY);
  return stored === getLocalDateString();
}

export function markReflectionDone(): void {
  localStorage.setItem(EVENING_REFLECTION_STORAGE_KEY, getLocalDateString());
}

export function isEveningTime(): boolean {
  return new Date().getHours() >= EVENING_HOUR_THRESHOLD;
}

export function hasAnyActivityToday(dailyActivities: Record<string, boolean | number>): boolean {
  return Object.entries(dailyActivities)
    .filter(([key]) => key !== 'pointsEarned' && key !== 'multiplier')
    .some(([, value]) => value === true);
}
