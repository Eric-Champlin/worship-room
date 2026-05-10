import { useId } from 'react'
import { cn } from '@/lib/utils'
import {
  HELP_TAG_ORDER,
  HELP_TAG_LABELS,
  WAYS_TO_HELP_PICKER_LABEL,
  type HelpTag,
} from '@/constants/ways-to-help'

interface WaysToHelpPickerProps {
  value: HelpTag[]
  onChange: (next: HelpTag[]) => void
  helperText?: string
}

/**
 * Spec 4.7b — Composer chip-group for selecting practical-help tags on a
 * prayer_request post. Multi-select, accessible, keyboard-friendly. Uses
 * `role="group"` (not radiogroup — radio is single-select). 44px minimum
 * touch target on every chip.
 */
export function WaysToHelpPicker({
  value,
  onChange,
  helperText,
}: WaysToHelpPickerProps) {
  const labelId = useId()
  const helperId = useId()

  const toggle = (tag: HelpTag) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else {
      onChange([...value, tag])
    }
  }

  return (
    <div
      className="mt-3"
      role="group"
      aria-labelledby={labelId}
      aria-describedby={helperText ? helperId : undefined}
      data-testid="ways-to-help-picker"
    >
      <p id={labelId} className="mb-2 text-sm font-medium text-white/70">
        {WAYS_TO_HELP_PICKER_LABEL}
      </p>
      {helperText && (
        <p id={helperId} className="mb-2 text-xs text-white/60">
          {helperText}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {HELP_TAG_ORDER.map((tag) => {
          const selected = value.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(tag)}
              className={cn(
                'min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-fast ease-standard',
                selected
                  ? 'border-white/30 bg-white/15 text-white'
                  : 'border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/10',
              )}
            >
              {HELP_TAG_LABELS[tag]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
