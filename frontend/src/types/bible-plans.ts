export type PlanTheme = 'comfort' | 'foundation' | 'emotional' | 'sleep' | 'wisdom' | 'prayer'

export interface PlanPassage {
  book: string // lowercase slug, e.g. "john"
  chapter: number
  startVerse?: number
  endVerse?: number
  label?: string
}

export interface PlanDay {
  day: number // 1-indexed
  title: string
  passages: PlanPassage[]
  devotional?: string
  reflectionPrompts?: string[]
}

export interface Plan {
  slug: string
  title: string
  shortTitle: string
  description: string
  theme: PlanTheme
  duration: number
  estimatedMinutesPerDay: number
  curator: string
  coverGradient: string // Tailwind gradient class, e.g. "from-primary/30 to-hero-dark"
  days: PlanDay[]
}

export type PlanMetadata = Omit<Plan, 'days'>

export interface PlanProgress {
  slug: string
  startedAt: string // ISO date
  currentDay: number
  completedDays: number[]
  completedAt: string | null
  pausedAt: string | null
  resumeFromDay: number | null
  reflection: string | null
  celebrationShown: boolean // true after completion celebration has fired; prevents re-trigger
}

export interface PlansStoreState {
  activePlanSlug: string | null
  plans: Record<string, PlanProgress>
}

export type PlanCompletionResult =
  | { type: 'day-completed'; day: number; isAllComplete: false }
  | { type: 'plan-completed'; day: number; isAllComplete: true }
  | { type: 'already-completed'; day: number }
