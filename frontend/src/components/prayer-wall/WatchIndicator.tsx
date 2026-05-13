import { Eye } from 'lucide-react'
import { WATCH_INDICATOR_COPY } from '@/constants/watch-copy'

/**
 * Spec 6.4 — 3am Watch ambient status indicator chip.
 *
 * Renders in the PrayerWall hero action slot when useWatchMode().active === true.
 * Non-interactive (NOT a button) — purely status, conveys "Watch is on" state.
 *
 * Copy: D-WatchIndicatorCopy — pre-approved by Eric.
 * Typography: Lora italic, muted color (Lora is canonical scripture font; using
 *   it for ambient status text extends its "quiet voice" use case).
 * No popover in v1 (deferred to 6.4b).
 *
 * Accessibility:
 *   - Element is a <span> (semantic non-interactive)
 *   - aria-label provides full context ("3am Watch is on") for screen readers
 *   - No breathing-glow animation in v1 — reduced-motion safety net handles
 *     any future animation via the global rule.
 */
export function WatchIndicator() {
  return (
    <span
      aria-label={WATCH_INDICATOR_COPY.chipAriaLabel}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.07] px-3 py-1 font-serif text-sm italic text-white/70 backdrop-blur-sm"
    >
      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
      {WATCH_INDICATOR_COPY.chipText}
    </span>
  )
}
