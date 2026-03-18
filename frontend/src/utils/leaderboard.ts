import type { DailyActivityLog } from '@/types/dashboard';
import { getCurrentWeekStart } from '@/utils/date';

export function getWeeklyPoints(activities: DailyActivityLog): number {
  const weekStart = getCurrentWeekStart();
  return Object.entries(activities)
    .filter(([date]) => date >= weekStart)
    .reduce((sum, [, day]) => sum + day.pointsEarned, 0);
}

/** Sort by weekly points (descending), break ties with total points */
export function sortByWeeklyPoints<
  T extends { weeklyPoints: number; faithPoints?: number; totalPoints?: number },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
    const aTotal = a.totalPoints ?? a.faithPoints ?? 0;
    const bTotal = b.totalPoints ?? b.faithPoints ?? 0;
    return bTotal - aTotal;
  });
}

/** Sort by total points (descending), break ties with weekly points */
export function sortByTotalPoints<
  T extends { faithPoints?: number; totalPoints?: number; weeklyPoints: number },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTotal = a.totalPoints ?? a.faithPoints ?? 0;
    const bTotal = b.totalPoints ?? b.faithPoints ?? 0;
    if (bTotal !== aTotal) return bTotal - aTotal;
    return b.weeklyPoints - a.weeklyPoints;
  });
}
