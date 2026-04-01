import type { ReadingPlanMeta } from '@/types/reading-plans'

export const READING_PLAN_METADATA: ReadingPlanMeta[] = [
  {
    id: 'finding-peace-in-anxiety',
    title: 'Finding Peace in Anxiety',
    description:
      'A 7-day journey through Scripture to find calm in the chaos. Discover how God meets you in your worry and leads you to a peace that surpasses understanding.',
    theme: 'anxiety',
    durationDays: 7,
    difficulty: 'beginner',
    coverEmoji: '🕊️',
  },
  {
    id: 'walking-through-grief',
    title: 'Walking Through Grief',
    description:
      'A 14-day companion for seasons of loss. Scripture meets you in your sorrow, offering comfort without rushing you through the process.',
    theme: 'grief',
    durationDays: 14,
    difficulty: 'intermediate',
    coverEmoji: '🕯️',
  },
  {
    id: 'the-gratitude-reset',
    title: 'The Gratitude Reset',
    description:
      'A 7-day reset for your perspective. When life feels heavy, gratitude has a way of shifting your focus from what is missing to what is already here.',
    theme: 'gratitude',
    durationDays: 7,
    difficulty: 'beginner',
    coverEmoji: '🌻',
  },
  {
    id: 'knowing-who-you-are-in-christ',
    title: 'Knowing Who You Are in Christ',
    description:
      'A 21-day deep dive into your identity as a child of God. When the world defines you by performance, mistakes, or comparisons, Scripture tells a different story.',
    theme: 'identity',
    durationDays: 21,
    difficulty: 'intermediate',
    coverEmoji: '👑',
  },
  {
    id: 'the-path-to-forgiveness',
    title: 'The Path to Forgiveness',
    description:
      'A 14-day journey toward freedom through forgiveness. Whether you need to forgive someone else or receive forgiveness yourself, Scripture lights the way.',
    theme: 'forgiveness',
    durationDays: 14,
    difficulty: 'intermediate',
    coverEmoji: '🔓',
  },
  {
    id: 'learning-to-trust-god',
    title: 'Learning to Trust God',
    description:
      'A 7-day plan for when faith feels fragile. Explore what it means to trust God when life is uncertain and the path ahead is unclear.',
    theme: 'trust',
    durationDays: 7,
    difficulty: 'beginner',
    coverEmoji: '🤲',
  },
  {
    id: 'hope-when-its-hard',
    title: "Hope When It's Hard",
    description:
      "A 7-day lifeline for seasons of discouragement. When hope feels distant, these scriptures remind you that God's promises hold even in the hardest moments.",
    theme: 'hope',
    durationDays: 7,
    difficulty: 'beginner',
    coverEmoji: '🌅',
  },
  {
    id: 'healing-from-the-inside-out',
    title: 'Healing from the Inside Out',
    description:
      'A 21-day deep journey into emotional and spiritual healing. For wounds that go deeper than the surface — places where only God can reach.',
    theme: 'healing',
    durationDays: 21,
    difficulty: 'intermediate',
    coverEmoji: '💚',
  },
  {
    id: 'discovering-your-purpose',
    title: 'Discovering Your Purpose',
    description:
      'A 14-day exploration of what you were made for. When life feels aimless or you are questioning your direction, Scripture reveals a God who designed you with intention.',
    theme: 'purpose',
    durationDays: 14,
    difficulty: 'intermediate',
    coverEmoji: '🧭',
  },
  {
    id: 'building-stronger-relationships',
    title: 'Building Stronger Relationships',
    description:
      'A 7-day guide to deeper, healthier connections. Whether you want to strengthen a marriage, repair a friendship, or learn to love more like Jesus, Scripture has wisdom for every relationship.',
    theme: 'relationships',
    durationDays: 7,
    difficulty: 'beginner',
    coverEmoji: '🤝',
  },
]

export function getReadingPlanMeta(id: string): ReadingPlanMeta | undefined {
  return READING_PLAN_METADATA.find((p) => p.id === id)
}
