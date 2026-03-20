import type { DevotionalTheme } from '@/types/devotional'
import type { MoodValue } from '@/types/dashboard'

/**
 * Maps devotional themes to the mood values where they are most thematically relevant.
 * Used to determine whether today's devotional should be recommended after mood check-in.
 */
export const THEME_TO_MOOD: Record<DevotionalTheme, MoodValue[]> = {
  trust: [1, 2],
  gratitude: [4, 5],
  forgiveness: [1, 2],
  identity: [2, 3],
  'anxiety-and-peace': [1, 2],
  faithfulness: [3, 4],
  purpose: [3, 4],
  hope: [1, 2],
  healing: [1, 2],
  community: [4, 5],
}
