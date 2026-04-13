import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrayerListFilter } from '@/types/personal-prayer'

interface PrayerListActionBarProps {
  filter: PrayerListFilter
  onFilterChange: (filter: PrayerListFilter) => void
  counts: { all: number; active: number; answered: number }
  onAddPrayer: () => void
}

const FILTERS: { id: PrayerListFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'answered', label: 'Answered' },
]

export function PrayerListActionBar({
  filter,
  onFilterChange,
  counts,
  onAddPrayer,
}: PrayerListActionBarProps) {
  return (
    <div className="sticky top-[56px] z-30 border-b border-white/10 bg-[rgba(30,11,62,0.85)] backdrop-blur-sm py-3 px-4 sm:top-[94px]">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={onAddPrayer}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition-[colors,transform] duration-fast hover:bg-primary-lt active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add Prayer
        </button>

        <div
          role="radiogroup"
          aria-label="Filter prayers"
          className="flex items-center gap-2 overflow-x-auto scrollbar-none"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={filter === f.id}
              onClick={() => onFilterChange(f.id)}
              className={cn(
                'min-h-[44px] shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                filter === f.id
                  ? 'bg-primary text-white'
                  : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10',
              )}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
