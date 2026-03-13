import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FilterState } from '@/hooks/useAmbientSearch'
import type { SoundMood, SoundActivity, SoundIntensity } from '@/types/music'

function formatTagValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const QUICK_ACCESS_ACTIVITIES: SoundActivity[] = ['prayer', 'sleep', 'relaxation', 'study']

const FILTER_DIMENSIONS: {
  key: keyof FilterState
  label: string
  values: string[]
}[] = [
  { key: 'mood', label: 'Mood', values: ['peaceful', 'uplifting', 'contemplative', 'restful'] satisfies SoundMood[] },
  { key: 'activity', label: 'Activity', values: ['prayer', 'sleep', 'study', 'relaxation'] satisfies SoundActivity[] },
  { key: 'intensity', label: 'Intensity', values: ['very_calm', 'moderate', 'immersive'] satisfies SoundIntensity[] },
  { key: 'scriptureTheme', label: 'Scripture Theme', values: ['trust', 'comfort', 'praise', 'lament'] },
]

interface AmbientFilterBarProps {
  filters: FilterState
  onToggleFilter: (dimension: keyof FilterState, value: string) => void
  activeFilterCount: number
  isFilterPanelOpen: boolean
  onSetFilterPanelOpen: (open: boolean) => void
}

export function AmbientFilterBar({
  filters,
  onToggleFilter,
  activeFilterCount,
  isFilterPanelOpen,
  onSetFilterPanelOpen,
}: AmbientFilterBarProps) {
  const isFilterActive = isFilterPanelOpen || activeFilterCount > 0

  return (
    <div className="w-full">
      {/* Chip bar */}
      <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
        {/* Filter toggle chip */}
        <button
          type="button"
          aria-expanded={isFilterPanelOpen}
          aria-label="Toggle content filters"
          onClick={() => onSetFilterPanelOpen(!isFilterPanelOpen)}
          className={cn(
            'flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm',
            isFilterActive
              ? 'border-primary bg-primary text-white'
              : 'border-gray-300 bg-white text-text-dark',
          )}
        >
          <SlidersHorizontal size={16} />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
              ({activeFilterCount})
            </span>
          )}
        </button>

        {/* Quick-access activity chips */}
        {QUICK_ACCESS_ACTIVITIES.map((activity) => {
          const isActive = filters.activity.includes(activity)
          return (
            <button
              key={activity}
              type="button"
              aria-pressed={isActive}
              aria-label={`Filter by ${formatTagValue(activity)} activity`}
              onClick={() => onToggleFilter('activity', activity)}
              className={cn(
                'min-h-[44px] flex-shrink-0 rounded-full px-4 py-2 text-sm',
                isActive
                  ? 'bg-primary text-white'
                  : 'border border-gray-300 bg-white text-text-dark',
              )}
            >
              {formatTagValue(activity)}
            </button>
          )
        })}
      </div>

      {/* Expanded filter panel */}
      {isFilterPanelOpen && (
        <div
          role="region"
          aria-label="Content filters"
          className="mt-2 animate-fade-in space-y-4 rounded-xl border border-gray-200 bg-white p-4"
        >
          {FILTER_DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-text-light">
                {dim.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {dim.values.map((value) => {
                  const isActive = (filters[dim.key] as string[]).includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`Filter by ${formatTagValue(value)} ${dim.label.toLowerCase()}`}
                      onClick={() => onToggleFilter(dim.key, value)}
                      className={cn(
                        'min-h-[44px] rounded-full px-4 py-2 text-sm',
                        isActive
                          ? 'bg-primary text-white'
                          : 'border border-gray-300 bg-white text-text-dark',
                      )}
                    >
                      {formatTagValue(value)}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { formatTagValue }
