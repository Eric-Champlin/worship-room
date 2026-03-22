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
  eveningMood: number | null;
  eveningMoodLabel: MoodLabel | null;
  eveningColor: string | null;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useMoodChartData(days: number = 7): MoodChartDataPoint[] {
  const raw = localStorage.getItem('wr_mood_entries') ?? '';

  return useMemo(() => {
    const entries = getMoodEntries();

    // Group entries by date, separating morning and evening
    const morningMap = new Map<string, typeof entries[0]>();
    const eveningMap = new Map<string, typeof entries[0]>();
    for (const e of entries) {
      const isEvening = e.timeOfDay === 'evening';
      const map = isEvening ? eveningMap : morningMap;
      if (!map.has(e.date)) {
        map.set(e.date, e);
      }
    }

    const result: MoodChartDataPoint[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      const dayOfWeek = d.getDay();
      const morning = morningMap.get(dateStr);
      const evening = eveningMap.get(dateStr);

      result.push({
        date: dateStr,
        dayLabel: DAY_LABELS[dayOfWeek],
        mood: morning ? morning.mood : null,
        moodLabel: morning ? morning.moodLabel : null,
        color: morning ? MOOD_COLORS[morning.mood as MoodValue] : null,
        eveningMood: evening ? evening.mood : null,
        eveningMoodLabel: evening ? evening.moodLabel : null,
        eveningColor: evening ? MOOD_COLORS[evening.mood as MoodValue] : null,
      });
    }

    return result;
  }, [raw, days]);
}
