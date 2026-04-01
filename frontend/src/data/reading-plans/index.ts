import type { ReadingPlan, PlanDayContent } from '@/types/reading-plans'

// Re-export metadata (lightweight — no daily content)
export { READING_PLAN_METADATA, getReadingPlanMeta } from './metadata'

// Dynamic loaders — load full plan content on demand
const PLAN_LOADERS: Record<string, () => Promise<ReadingPlan>> = {
  'finding-peace-in-anxiety': () =>
    import('./finding-peace-in-anxiety').then((m) => m.findingPeaceInAnxiety),
  'walking-through-grief': () =>
    import('./walking-through-grief').then((m) => m.walkingThroughGrief),
  'the-gratitude-reset': () =>
    import('./the-gratitude-reset').then((m) => m.theGratitudeReset),
  'knowing-who-you-are-in-christ': () =>
    import('./knowing-who-you-are-in-christ').then((m) => m.knowingWhoYouAreInChrist),
  'the-path-to-forgiveness': () =>
    import('./the-path-to-forgiveness').then((m) => m.thePathToForgiveness),
  'learning-to-trust-god': () =>
    import('./learning-to-trust-god').then((m) => m.learningToTrustGod),
  'hope-when-its-hard': () =>
    import('./hope-when-its-hard').then((m) => m.hopeWhenItsHard),
  'healing-from-the-inside-out': () =>
    import('./healing-from-the-inside-out').then((m) => m.healingFromTheInsideOut),
  'discovering-your-purpose': () =>
    import('./discovering-your-purpose').then((m) => m.discoveringYourPurpose),
  'building-stronger-relationships': () =>
    import('./building-stronger-relationships').then((m) => m.buildingStrongerRelationships),
}

export async function loadReadingPlan(id: string): Promise<ReadingPlan | undefined> {
  const loader = PLAN_LOADERS[id]
  if (!loader) return undefined
  return loader()
}

export function getReadingPlanDay(
  plan: ReadingPlan,
  dayNumber: number,
): PlanDayContent | undefined {
  return plan.days.find((d) => d.dayNumber === dayNumber)
}
