import { useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ANSWERED_CATEGORY_CHIPS } from '@/constants/answered-wall-copy'

/**
 * Spec 6.6b — Answered Wall category filter chip row.
 *
 * Renders exactly six chips: All (default), Health, Family, Work, Grief,
 * Gratitude. The active chip is driven by the URL `?category=` query param.
 * Tap a chip → updates the URL; "All" clears the param entirely.
 *
 * There is intentionally no 'Mental Health' category chip. Mental-health
 * prayers being 'answered' is genuinely complicated theological and clinical
 * territory — healing is rarely linear, and a filter chip on a celebration
 * surface risks implying a tidy resolution narrative that does not serve
 * people living in that territory. This omission is a deliberate
 * anti-pressure design decision from the Spec 6.6 master plan, carried
 * forward by Spec 6.6b. Do not add a Mental Health chip without revisiting
 * that rationale. (Gate-G-MH-OMISSION HARD — code review hard-blocks any
 * addition of a Mental Health chip OR the removal of this comment.)
 *
 * Accessibility: rendered as a `role="radiogroup"` with each chip as
 * `role="radio"` + `aria-checked`. Browsers handle arrow-key navigation
 * between siblings within a radiogroup by default.
 *
 * URL discipline: the active state is the `?category=` query param, NOT
 * localStorage. Refresh preserves the filter; URL sharing preserves the
 * filter. "All" clears the param entirely so the URL stays clean when the
 * user backs out of filtering.
 */
export function AnsweredCategoryFilter() {
  const [searchParams, setSearchParams] = useSearchParams()
  const active = searchParams.get('category') ?? 'all'

  const handleSelect = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') {
      next.delete('category')
    } else {
      next.set('category', value)
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <div
      role="radiogroup"
      aria-label="Filter answered prayers by category"
      className="flex flex-wrap justify-center gap-2"
    >
      {ANSWERED_CATEGORY_CHIPS.map((chip) => {
        const selected = active === chip.value
        return (
          <button
            key={chip.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => handleSelect(chip.value)}
            className={cn(
              'inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-fast',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
              selected
                ? 'border border-white/30 bg-white/15 text-white'
                : 'border border-white/[0.12] bg-white/[0.05] text-white/70 hover:bg-white/[0.10] hover:text-white',
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}
