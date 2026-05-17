import { useRovingTabindex } from '@/hooks/useRovingTabindex'
import { cn } from '@/lib/utils'
import {
  VISIBILITY_OPTIONS,
  type PostVisibility,
} from '@/constants/visibility-options'

interface VisibilitySelectorProps {
  value: PostVisibility
  onChange: (next: PostVisibility) => void
  disabled?: boolean
}

/**
 * Spec 7.7 — Visibility tier selector for the Prayer Wall composer. Three
 * chips (Public / Friends / Private), short factual tooltips on hover, full
 * keyboard navigation via roving tabindex, role="radiogroup" semantics.
 *
 * Controlled component — consumer owns the selected value. Mirrors the
 * category-pills pattern at InlineComposer.tsx:629-633 with the Visual Rollout
 * active-state treatment (bg-violet-500/[0.13] + border-violet-400/45) per
 * 09-design-system.md § "Active-State and Selection Patterns".
 */
export function VisibilitySelector({
  value,
  onChange,
  disabled,
}: VisibilitySelectorProps) {
  const initialIndex = VISIBILITY_OPTIONS.findIndex((opt) => opt.value === value)
  const { getItemProps } = useRovingTabindex({
    itemCount: VISIBILITY_OPTIONS.length,
    onSelect: (index) => onChange(VISIBILITY_OPTIONS[index].value),
    orientation: 'horizontal',
    initialIndex: initialIndex >= 0 ? initialIndex : 0,
  })

  return (
    <fieldset className="mt-3" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium text-white/70">
        Visibility
      </legend>
      <div
        role="radiogroup"
        aria-label="Post visibility"
        className="flex flex-nowrap gap-2"
      >
        {VISIBILITY_OPTIONS.map((opt, index) => {
          const itemProps = getItemProps(index)
          const Icon = opt.icon
          const isSelected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              title={opt.tooltip}
              onClick={() => onChange(opt.value)}
              className={cn(
                'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-fast ease-standard',
                isSelected
                  ? 'border-violet-400/45 bg-violet-500/[0.13] text-white'
                  : 'border-white/[0.12] bg-white/[0.07] text-white/70 hover:bg-white/[0.12]'
              )}
              tabIndex={itemProps.tabIndex}
              onKeyDown={itemProps.onKeyDown}
              ref={itemProps.ref}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
