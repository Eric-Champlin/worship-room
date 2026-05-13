import { useRef, useState } from 'react'
import { WatchOptInConfirmModal } from './WatchOptInConfirmModal'
import { WATCH_SETTINGS_COPY } from '@/constants/watch-copy'
import type { WatchPreference } from '@/types/settings'

interface WatchToggleProps {
  /** Current persisted preference. */
  value: WatchPreference
  /** Called when the user CONFIRMS a new preference (off / auto-after-modal / on-after-modal). */
  onChange: (next: WatchPreference) => void
}

/**
 * Spec 6.4 — 3am Watch 3-state radio toggle for Settings → Sensitive features.
 *
 * D-OptInFlow:
 *   - Tap "On" or "Auto" → opens <WatchOptInConfirmModal /> (does NOT persist)
 *     - "Yes, turn on" in modal → persists the pending value via onChange
 *     - "Not right now" / Esc → reverts to current value
 *   - Tap "Off" → persists immediately via onChange (D-OptOutFriction)
 *
 * Plan-Time Divergence #2: uses a custom 3-radio layout (NOT RadioPillGroup)
 * because D-SettingsToggleCopy requires per-option descriptions, which the
 * canonical RadioPillGroup doesn't support. The layout uses role="radiogroup"
 * + role="radio" semantics AND mirrors RadioPillGroup's keyboard navigation
 * (Arrow keys move selection within the group; roving tabindex puts only the
 * selected radio in the tab order) per WAI-ARIA Authoring Practices.
 *
 * Copy: D-SettingsToggleCopy — pre-approved by Eric.
 */
export function WatchToggle({ value, onChange }: WatchToggleProps) {
  const [pendingValue, setPendingValue] = useState<WatchPreference | null>(null)
  const groupRef = useRef<HTMLDivElement>(null)

  const selectValue = (next: WatchPreference) => {
    if (next === value) return // no-op selecting current
    if (next === 'off') {
      // Opt-out is friction-free (D-OptOutFriction)
      onChange('off')
      return
    }
    // Opt-in requires confirmation (D-OptInFlow + W9)
    setPendingValue(next)
  }

  // WAI-ARIA Radio Group keyboard pattern — arrow keys move focus AND
  // selection within the group, wrapping at both ends. Mirrors the canonical
  // RadioPillGroup behavior (see frontend/src/components/settings/RadioPillGroup.tsx).
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const options = WATCH_SETTINGS_COPY.options
    let nextIndex: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      nextIndex = (index + 1) % options.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      nextIndex = (index - 1 + options.length) % options.length
    }
    if (nextIndex === null) return
    selectValue(options[nextIndex].value as WatchPreference)
    const radios = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="radio"]',
    )
    radios?.[nextIndex]?.focus()
  }

  const handleConfirm = () => {
    if (pendingValue) onChange(pendingValue)
    setPendingValue(null)
  }

  const handleDecline = () => {
    setPendingValue(null) // revert pending — toggle stays at `value`
  }

  return (
    <div>
      <div className="mb-2">
        <p className="text-sm font-medium text-white">
          {WATCH_SETTINGS_COPY.toggleLabel}
        </p>
        <p className="mt-1 text-sm text-white/60">
          {WATCH_SETTINGS_COPY.toggleDescription}
        </p>
      </div>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={WATCH_SETTINGS_COPY.toggleLabel}
        className="space-y-2"
      >
        {WATCH_SETTINGS_COPY.options.map((option, index) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              aria-describedby={`watch-option-${option.value}-desc`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectValue(option.value as WatchPreference)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-full min-h-[44px] rounded-2xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                selected
                  ? 'border-white/30 bg-white/15 text-white'
                  : 'border-white/[0.12] bg-white/[0.05] text-white/80 hover:bg-white/[0.08]'
              }`}
            >
              <div className="text-sm font-semibold">{option.label}</div>
              <div
                id={`watch-option-${option.value}-desc`}
                className="mt-0.5 text-xs text-white/60"
              >
                {option.description}
              </div>
            </button>
          )
        })}
      </div>
      <WatchOptInConfirmModal
        isOpen={pendingValue !== null}
        onConfirm={handleConfirm}
        onDecline={handleDecline}
      />
    </div>
  )
}
