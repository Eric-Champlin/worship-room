import type { MoodValue, MoodLabel } from '@/types/dashboard';

export interface MoodOption {
  value: MoodValue;
  label: MoodLabel;
  color: string;
  verse: string;
  verseReference: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    value: 1,
    label: 'Struggling',
    color: '#D97706',
    verse: 'The Lord is near to the brokenhearted, and saves those who have a crushed spirit.',
    verseReference: 'Psalm 34:18',
  },
  {
    value: 2,
    label: 'Heavy',
    color: '#C2703E',
    verse: 'Cast your burden on the Lord, and he will sustain you.',
    verseReference: 'Psalm 55:22',
  },
  {
    value: 3,
    label: 'Okay',
    color: '#8B7FA8',
    verse: 'Be still, and know that I am God.',
    verseReference: 'Psalm 46:10',
  },
  {
    value: 4,
    label: 'Good',
    color: '#2DD4BF',
    verse: 'Give thanks to the Lord, for he is good, for his loving kindness endures forever.',
    verseReference: 'Psalm 107:1',
  },
  {
    value: 5,
    label: 'Thriving',
    color: '#34D399',
    verse: 'This is the day that the Lord has made. We will rejoice and be glad in it!',
    verseReference: 'Psalm 118:24',
  },
];

export const MOOD_COLORS: Record<MoodValue, string> = {
  1: '#D97706',
  2: '#C2703E',
  3: '#8B7FA8',
  4: '#2DD4BF',
  5: '#34D399',
};

export const MAX_MOOD_TEXT_LENGTH = 280;
export const MOOD_TEXT_WARNING_THRESHOLD = 250;
export const VERSE_DISPLAY_DURATION_MS = 3000;
export const MAX_MOOD_ENTRIES = 365;
