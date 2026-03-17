import { useMemo } from 'react';
import { getMoodEntries } from '@/services/mood-storage';
import { MOOD_COLORS } from '@/constants/dashboard/mood';
import { getLocalDateString } from '@/utils/date';
import type { MoodValue, MoodLabel } from '@/types/dashboard';

export interface MoodChartDataPoint {
  date: string;
  dayLabel: string;
  mood: number | null;
  moodLabel: MoodLabel | null;
  color: string | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useMoodChartData(days: number = 7): MoodChartDataPoint[] {
  const raw = localStorage.getItem('wr_mood_entries') ?? '';

  return useMemo(() => {
    const entries = getMoodEntries();
    const entryMap = new Map(entries.map((e) => [e.date, e]));

    const result: MoodChartDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayOfWeek = d.getDay();
      const entry = entryMap.get(dateStr);

      result.push({
        date: dateStr,
        dayLabel: DAY_LABELS[dayOfWeek],
        mood: entry ? entry.mood : null,
        moodLabel: entry ? entry.moodLabel : null,
        color: entry ? MOOD_COLORS[entry.mood as MoodValue] : null,
      });
    }

    return result;
  }, [raw, days]);
}
