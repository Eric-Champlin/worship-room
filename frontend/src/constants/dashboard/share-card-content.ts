// Share-specific constants for celebration canvas cards.
// These are distinct from the overlay messages in badge-icons.ts.

/** Streak milestone messages for share cards (all 7 milestones) */
export const STREAK_SHARE_MESSAGES: Record<number, string> = {
  7: 'One week of faithfulness. Every day matters.',
  14: 'Two weeks of showing up. A rhythm is forming.',
  30: "One month of showing up. That's not discipline — that's devotion.",
  60: 'Two months of walking with God. Your roots are deep.',
  90: "Three months. You've built something rare and beautiful.",
  180: "Half a year of faithfulness. Look how far you've come.",
  365: 'One full year. Every single day. This is extraordinary.',
}

/** Level-up share card verses (WEB translation) — distinct from LEVEL_UP_VERSES used in overlay */
export const LEVEL_SHARE_CONTENT: Record<
  number,
  { name: string; icon: string; verse: string; reference: string }
> = {
  2: {
    name: 'Sprout',
    icon: '🌱',
    verse: 'He will be like a tree planted by the streams of water.',
    reference: 'Psalm 1:3',
  },
  3: {
    name: 'Blooming',
    icon: '🌸',
    verse: 'The desert will rejoice and blossom like a rose.',
    reference: 'Isaiah 35:1',
  },
  4: {
    name: 'Flourishing',
    icon: '🌿',
    verse: 'The righteous shall flourish like the palm tree.',
    reference: 'Psalm 92:12',
  },
  5: {
    name: 'Oak',
    icon: '🌳',
    verse: 'They may be called trees of righteousness, the planting of the LORD, that he may be glorified.',
    reference: 'Isaiah 61:3',
  },
  6: {
    name: 'Lighthouse',
    icon: '🏠',
    verse: "You are the light of the world. A city located on a hill can't be hidden.",
    reference: 'Matthew 5:14',
  },
}

/** Mood labels for monthly share card */
export const MOOD_SHARE_LABELS: Record<number, string> = {
  1: 'Struggling',
  2: 'Heavy',
  3: 'Okay',
  4: 'Good',
  5: 'Thriving',
}

/** Badge category → emoji mapping for canvas share cards */
export const BADGE_CATEGORY_EMOJI: Record<string, string> = {
  streak: '🔥',
  level: '🌱',
  activity: '⭐',
  community: '🤝',
  special: '✨',
  challenge: '🎯',
  meditation: '🧘',
  'prayer-wall': '🙏',
  bible: '📖',
  gratitude: '💛',
  'local-support': '📍',
  listening: '🎵',
}
