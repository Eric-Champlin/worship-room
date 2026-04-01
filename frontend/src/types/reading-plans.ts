export interface PlanVerse {
  number: number
  text: string
}

export interface PlanPassage {
  reference: string
  verses: PlanVerse[]
}

export interface PlanDayContent {
  dayNumber: number
  title: string
  passage: PlanPassage
  reflection: string[]
  prayer: string
  actionStep: string
}

export type PlanTheme =
  | 'anxiety'
  | 'grief'
  | 'gratitude'
  | 'identity'
  | 'forgiveness'
  | 'trust'
  | 'hope'
  | 'healing'
  | 'purpose'
  | 'relationships'

export type PlanDifficulty = 'beginner' | 'intermediate'

export interface ReadingPlan {
  id: string
  title: string
  description: string
  theme: PlanTheme
  durationDays: 7 | 14 | 21
  difficulty: PlanDifficulty
  coverEmoji: string
  days: PlanDayContent[]
}

export type ReadingPlanMeta = Omit<ReadingPlan, 'days'>

export interface PlanProgress {
  startedAt: string
  currentDay: number
  completedDays: number[]
  completedAt: string | null
}

export type ReadingPlanProgressMap = Record<string, PlanProgress>
