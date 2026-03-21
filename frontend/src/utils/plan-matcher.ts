const KEYWORD_MAP: { keywords: string[]; planId: string }[] = [
  { keywords: ['anxiety', 'worry', 'stress', 'anxious', 'overwhelmed', 'panic'], planId: 'finding-peace-in-anxiety' },
  { keywords: ['grief', 'loss', 'death', 'mourning', 'died', 'passing', 'gone'], planId: 'walking-through-grief' },
  { keywords: ['gratitude', 'thankful', 'grateful', 'blessings', 'appreciate'], planId: 'the-gratitude-reset' },
  { keywords: ['identity', 'who am i', 'self-worth', 'insecurity', 'confidence'], planId: 'knowing-who-you-are-in-christ' },
  { keywords: ['forgive', 'forgiveness', 'resentment', 'bitter', 'grudge', 'hurt by'], planId: 'the-path-to-forgiveness' },
  { keywords: ['trust', 'doubt', 'uncertain', 'faith wavering', 'hard to believe'], planId: 'learning-to-trust-god' },
  { keywords: ['hope', 'hopeless', 'despair', 'dark times', 'no way out'], planId: 'hope-when-its-hard' },
  { keywords: ['healing', 'broken', 'wounded', 'trauma', 'pain', 'recovering'], planId: 'healing-from-the-inside-out' },
  { keywords: ['purpose', 'meaning', 'direction', 'calling', 'what should i do'], planId: 'discovering-your-purpose' },
  { keywords: ['relationship', 'marriage', 'friendship', 'family', 'lonely', 'isolated'], planId: 'building-stronger-relationships' },
]

const DEFAULT_PLAN_ID = 'learning-to-trust-god'

export function matchPlanByKeywords(input: string): string {
  const lower = input.toLowerCase()
  for (const { keywords, planId } of KEYWORD_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return planId
    }
  }
  return DEFAULT_PLAN_ID
}
