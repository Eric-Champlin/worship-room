export type FeatureKey =
  | 'pray'
  | 'journal'
  | 'meditate'
  | 'music'
  | 'sleepRest'
  | 'prayerWall'
  | 'localSupport'

export interface QuizOption {
  label: string
  points: Partial<Record<FeatureKey, number>>
}

export interface QuizQuestion {
  question: string
  options: QuizOption[]
}

export interface QuizDestination {
  key: FeatureKey
  name: string
  route: string
  ctaLabel: string
  description: string
  verse: string
  verseReference: string
}

// Ordered with 'pray' first for tiebreaker resolution
export const FEATURE_KEYS: FeatureKey[] = [
  'pray',
  'journal',
  'meditate',
  'music',
  'sleepRest',
  'prayerWall',
  'localSupport',
]

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'What brought you here today?',
    options: [
      {
        label: 'Going through a hard time',
        points: { pray: 2, localSupport: 1 },
      },
      {
        label: 'Want to grow my faith',
        points: { meditate: 2, journal: 1 },
      },
      {
        label: 'Feeling anxious or stressed',
        points: { music: 2, meditate: 1 },
      },
      {
        label: 'All of the above',
        points: { pray: 1, journal: 1, meditate: 1, music: 1 },
      },
    ],
  },
  {
    question: 'How are you feeling right now?',
    options: [
      {
        label: 'I need comfort',
        points: { pray: 2, music: 1 },
      },
      {
        label: 'I feel stuck in my faith',
        points: { meditate: 2, journal: 1 },
      },
      {
        label: "I'm okay but want more",
        points: { journal: 2, prayerWall: 1 },
      },
      {
        label: "I'm doing well",
        points: { prayerWall: 2, music: 1 },
      },
    ],
  },
  {
    question: 'What sounds most helpful?',
    options: [
      {
        label: 'Prayer and scripture',
        points: { pray: 3 },
      },
      {
        label: 'Writing out my thoughts',
        points: { journal: 3 },
      },
      {
        label: 'Quiet reflection',
        points: { meditate: 3 },
      },
      {
        label: 'Worship music',
        points: { music: 3 },
      },
    ],
  },
  {
    question: 'When do you most need support?',
    options: [
      {
        label: 'Mornings',
        points: { pray: 1, journal: 1 },
      },
      {
        label: 'During stressful moments',
        points: { pray: 1, music: 1 },
      },
      {
        label: 'At night / bedtime',
        points: { sleepRest: 2, music: 1 },
      },
      {
        label: 'Throughout the day',
        points: { journal: 1, prayerWall: 1 },
      },
    ],
  },
  {
    question: "What's your experience with faith practices?",
    options: [
      {
        label: 'I practice regularly',
        points: { prayerWall: 2, journal: 1 },
      },
      {
        label: 'I try but not consistent',
        points: { meditate: 1, music: 1 },
      },
      {
        label: 'I used to but stopped',
        points: { pray: 1, meditate: 1 },
      },
      {
        label: "I'm brand new",
        points: { pray: 2, localSupport: 1 },
      },
    ],
  },
]

export const QUIZ_DESTINATIONS: QuizDestination[] = [
  {
    key: 'pray',
    name: 'Prayer',
    route: '/scripture',
    ctaLabel: 'Prayer',
    description:
      "It sounds like you could use a moment with God. Share what's on your heart and receive a personalized scripture and prayer.",
    verse: 'Cast all your anxiety on him because he cares for you.',
    verseReference: '1 Peter 5:7',
  },
  {
    key: 'journal',
    name: 'Journaling',
    route: '/journal',
    ctaLabel: 'Journaling',
    description:
      'Writing is a powerful way to process your thoughts. Let guided prompts help you reflect on what God is doing in your life.',
    verse: 'Search me, God, and know my heart; test me and know my anxious thoughts.',
    verseReference: 'Psalm 139:23',
  },
  {
    key: 'meditate',
    name: 'Meditation',
    route: '/meditate',
    ctaLabel: 'Meditation',
    description:
      'A quiet moment of reflection can bring clarity and peace. Explore scripture-based meditations at your own pace.',
    verse: 'Be still, and know that I am God.',
    verseReference: 'Psalm 46:10',
  },
  {
    key: 'music',
    name: 'Worship Music',
    route: '/music',
    ctaLabel: 'Worship Music',
    description:
      "Sometimes worship music speaks when words can't. Let curated playlists meet you where you are.",
    verse: 'Sing to the Lord a new song, for he has done marvelous things.',
    verseReference: 'Psalm 98:1',
  },
  {
    key: 'sleepRest',
    name: 'Sleep & Rest',
    route: '/music/sleep',
    ctaLabel: 'Sleep & Rest',
    description:
      'Nighttime can be the hardest. Let calming scripture and gentle sounds help you find rest.',
    verse: 'In peace I will lie down and sleep, for you alone, Lord, make me dwell in safety.',
    verseReference: 'Psalm 4:8',
  },
  {
    key: 'prayerWall',
    name: 'Prayer Wall',
    route: '/prayer-wall',
    ctaLabel: 'Prayer Wall',
    description:
      "You're not alone in this. See what others are praying for and find encouragement in community.",
    verse: 'Carry each other\u2019s burdens, and in this way you will fulfill the law of Christ.',
    verseReference: 'Galatians 6:2',
  },
  {
    key: 'localSupport',
    name: 'Local Support',
    route: '/churches',
    ctaLabel: 'Local Support',
    description:
      'Sometimes the next step is a real conversation. Find churches and Christian counselors near you.',
    verse: 'Where two or three gather in my name, there am I with them.',
    verseReference: 'Matthew 18:20',
  },
]

/**
 * Calculate the recommended quiz destination based on selected answers.
 * Tiebreaker: 'pray' wins ties (first in FEATURE_KEYS order).
 */
export function calculateResult(answers: (number | null)[]): QuizDestination {
  const scores: Record<FeatureKey, number> = {
    pray: 0,
    journal: 0,
    meditate: 0,
    music: 0,
    sleepRest: 0,
    prayerWall: 0,
    localSupport: 0,
  }

  for (let i = 0; i < QUIZ_QUESTIONS.length; i++) {
    const answerIndex = answers[i]
    if (answerIndex === null || answerIndex === undefined) continue

    const option = QUIZ_QUESTIONS[i].options[answerIndex]
    if (!option) continue

    for (const [key, value] of Object.entries(option.points)) {
      scores[key as FeatureKey] += value as number
    }
  }

  // Find the feature with the highest score.
  // FEATURE_KEYS is ordered with 'pray' first, so on ties pray wins.
  let winnerKey: FeatureKey = FEATURE_KEYS[0]
  let maxScore = scores[winnerKey]

  for (const key of FEATURE_KEYS) {
    if (scores[key] > maxScore) {
      maxScore = scores[key]
      winnerKey = key
    }
  }

  return QUIZ_DESTINATIONS.find((d) => d.key === winnerKey)!
}
