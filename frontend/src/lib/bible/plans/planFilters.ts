import type { PlanMetadata, PlanProgress, PlanTheme } from '@/types/bible-plans'

export type DurationFilter = 'any' | 'short' | 'medium' | 'long'

export interface PlanBrowserSections {
  inProgress: Array<{ plan: PlanMetadata; progress: PlanProgress }>
  browse: PlanMetadata[]
  completed: Array<{ plan: PlanMetadata; progress: PlanProgress }>
}

const VALID_THEMES: ReadonlySet<string> = new Set<string>([
  'comfort',
  'foundation',
  'emotional',
  'sleep',
  'wisdom',
  'prayer',
])

const VALID_DURATIONS: ReadonlySet<string> = new Set<string>([
  'any',
  'short',
  'medium',
  'long',
])

/** Duration filter ranges: short = <=7 days, medium = 8-21 days, long = >=22 days */
export function matchesDuration(duration: number, filter: DurationFilter): boolean {
  switch (filter) {
    case 'any':
      return true
    case 'short':
      return duration <= 7
    case 'medium':
      return duration >= 8 && duration <= 21
    case 'long':
      return duration >= 22
  }
}

/** Parse URL theme param, returning 'all' for invalid values */
export function parseThemeParam(value: string | null): PlanTheme | 'all' {
  if (value === null) return 'all'
  return VALID_THEMES.has(value) ? (value as PlanTheme) : 'all'
}

/** Parse URL duration param, returning 'any' for invalid values */
export function parseDurationParam(value: string | null): DurationFilter {
  if (value === null) return 'any'
  return VALID_DURATIONS.has(value) ? (value as DurationFilter) : 'any'
}

/** Filter plans by theme and duration */
export function filterPlans(
  plans: PlanMetadata[],
  theme: PlanTheme | 'all',
  duration: DurationFilter,
): PlanMetadata[] {
  return plans.filter((p) => {
    if (theme !== 'all' && p.theme !== theme) return false
    if (!matchesDuration(p.duration, duration)) return false
    return true
  })
}

/** Split plans into three sections based on progress state */
export function splitIntoSections(
  allPlans: PlanMetadata[],
  progressMap: Record<string, PlanProgress>,
): PlanBrowserSections {
  const inProgress: PlanBrowserSections['inProgress'] = []
  const browse: PlanMetadata[] = []
  const completed: PlanBrowserSections['completed'] = []

  for (const plan of allPlans) {
    const progress = progressMap[plan.slug]

    if (!progress) {
      browse.push(plan)
      continue
    }

    // Active or paused (not completed) → in-progress
    if (progress.completedAt === null) {
      inProgress.push({ plan, progress })
      continue
    }

    // Completed → completed section
    completed.push({ plan, progress })
  }

  return { inProgress, browse, completed }
}
