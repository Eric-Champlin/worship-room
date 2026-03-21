import { cn } from '@/lib/utils'
import {
  DURATION_FILTER_OPTIONS,
  DIFFICULTY_FILTER_OPTIONS,
} from '@/constants/reading-plans'
import type { PlanDifficulty } from '@/types/reading-plans'

interface FilterBarProps {
  selectedDuration: number | null
  selectedDifficulty: PlanDifficulty | null
  onDurationChange: (value: number | null) => void
  onDifficultyChange: (value: PlanDifficulty | null) => void
}

export function FilterBar({
  selectedDuration,
  selectedDifficulty,
  onDurationChange,
  onDifficultyChange,
}: FilterBarProps) {
  return (
    <div className="space-y-4" role="group" aria-label="Filter reading plans">
      <div>
        <span className="mb-2 block text-sm font-medium text-text-light">
          Duration
        </span>
        <div className="flex flex-wrap gap-2">
          {DURATION_FILTER_OPTIONS.map((opt) => {
            const isActive = selectedDuration === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => onDurationChange(opt.value)}
                className={cn(
                  'min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'border border-gray-200 bg-white text-text-dark hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium text-text-light">
          Difficulty
        </span>
        <div className="flex flex-wrap gap-2">
          {DIFFICULTY_FILTER_OPTIONS.map((opt) => {
            const isActive = selectedDifficulty === opt.value
            return (
              <button
                key={opt.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => onDifficultyChange(opt.value)}
                className={cn(
                  'min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'border border-gray-200 bg-white text-text-dark hover:bg-gray-50',
                )}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
