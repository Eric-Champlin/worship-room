import type { PlanDayContent, ReadingPlan } from '@/types/reading-plans'

import { buildingStrongerRelationships } from './building-stronger-relationships'
import { discoveringYourPurpose } from './discovering-your-purpose'
import { findingPeaceInAnxiety } from './finding-peace-in-anxiety'
import { healingFromTheInsideOut } from './healing-from-the-inside-out'
import { hopeWhenItsHard } from './hope-when-its-hard'
import { knowingWhoYouAreInChrist } from './knowing-who-you-are-in-christ'
import { learningToTrustGod } from './learning-to-trust-god'
import { theGratitudeReset } from './the-gratitude-reset'
import { thePathToForgiveness } from './the-path-to-forgiveness'
import { walkingThroughGrief } from './walking-through-grief'

export const READING_PLANS: ReadingPlan[] = [
  findingPeaceInAnxiety,
  walkingThroughGrief,
  theGratitudeReset,
  knowingWhoYouAreInChrist,
  thePathToForgiveness,
  learningToTrustGod,
  hopeWhenItsHard,
  healingFromTheInsideOut,
  discoveringYourPurpose,
  buildingStrongerRelationships,
]

export function getReadingPlan(id: string): ReadingPlan | undefined {
  return READING_PLANS.find((p) => p.id === id)
}

export function getReadingPlanDay(
  planId: string,
  dayNumber: number,
): PlanDayContent | undefined {
  const plan = getReadingPlan(planId)
  if (!plan) return undefined
  return plan.days.find((d) => d.dayNumber === dayNumber)
}
