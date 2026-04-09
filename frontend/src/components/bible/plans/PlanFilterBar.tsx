import type { DurationFilter } from '@/lib/bible/plans/planFilters'
import type { PlanTheme } from '@/types/bible-plans'

import { PlanFilterPill } from './PlanFilterPill'

interface PlanFilterBarProps {
  theme: PlanTheme | 'all'
  duration: DurationFilter
  onThemeChange: (theme: PlanTheme | 'all') => void
  onDurationChange: (duration: DurationFilter) => void
}

const THEME_LABELS: Record<PlanTheme | 'all', string> = {
  all: 'All',
  comfort: 'Comfort',
  foundation: 'Foundation',
  emotional: 'Emotional',
  sleep: 'Sleep',
  wisdom: 'Wisdom',
  prayer: 'Prayer',
}

const DURATION_LABELS: Record<DurationFilter, string> = {
  any: 'Any length',
  short: '7 days or less',
  medium: '8\u201321 days',
  long: '22+ days',
}

const THEME_OPTIONS = Object.keys(THEME_LABELS) as Array<PlanTheme | 'all'>
const DURATION_OPTIONS = Object.keys(DURATION_LABELS) as DurationFilter[]

export function PlanFilterBar({ theme, duration, onThemeChange, onDurationChange }: PlanFilterBarProps) {
  return (
    <nav aria-label="Plan filters">
      {/* Theme row */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">Theme</p>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((t) => (
            <PlanFilterPill
              key={t}
              label={THEME_LABELS[t]}
              isActive={theme === t}
              onClick={() => onThemeChange(t)}
            />
          ))}
        </div>
      </div>

      {/* Duration row */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">Duration</p>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <PlanFilterPill
              key={d}
              label={DURATION_LABELS[d]}
              isActive={duration === d}
              onClick={() => onDurationChange(d)}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}
