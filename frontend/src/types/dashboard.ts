export type MoodValue = 1 | 2 | 3 | 4 | 5;
export type MoodLabel = 'Struggling' | 'Heavy' | 'Okay' | 'Good' | 'Thriving';

export interface MoodEntry {
  id: string;
  date: string;
  mood: MoodValue;
  moodLabel: MoodLabel;
  text?: string;
  timestamp: number;
  verseSeen: string;
}
