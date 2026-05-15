import { Users } from 'lucide-react'
import { usePresence } from '@/hooks/usePresence'

export interface PresenceIndicatorProps {
  /** Spec 6.11b — Gate-G-CRISIS-SUPPRESSION. Page-level boolean from `hasAnyCrisisFlag`. */
  suppressed: boolean
}

/**
 * Spec 6.11b — Live Presence indicator.
 *
 * <p>Renders inline in the Prayer Wall feed header. Anti-pressure design:
 * <ul>
 *   <li>Hidden when count is 0 or null (no "be the first" CTA)</li>
 *   <li>Static count (no animation, no pulse, no flash on change)</li>
 *   <li>Non-interactive (no tap target, not in tab order, status only)</li>
 *   <li>{@code role="status"} + {@code aria-live="polite"} — screen reader announces
 *       changes but NOT every poll (React only emits a DOM mutation when count changes)</li>
 * </ul>
 *
 * <p>Suppression: when {@code suppressed} is true (any post on the page has
 * {@code crisisFlag: true}), the component renders null. The hook also exits early
 * to skip the API call entirely.
 */
export function PresenceIndicator({ suppressed }: PresenceIndicatorProps) {
  const { count } = usePresence({ suppressed })

  // Gate-G-CRISIS-SUPPRESSION + Gate-G-ANTI-PRESSURE (hidden at N=0).
  if (suppressed) return null
  if (count === null || count === 0) return null

  const label = count === 1 ? '1 person here' : `${count} people here now`

  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-sm text-white/70"
    >
      <Users aria-hidden="true" size={14} className="opacity-70" />
      <span>{label}</span>
    </div>
  )
}
