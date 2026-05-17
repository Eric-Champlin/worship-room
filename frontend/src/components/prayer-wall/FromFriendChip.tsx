import { Users } from 'lucide-react'

/**
 * Spec 7.6 — small visual chip rendered on PrayerCard when the post is
 * one of up to 3 friend posts pinned to the top of the main Prayer Wall
 * feed. Mirrors CategoryBadge's visual rhythm so the chip integrates
 * naturally into the existing chip row.
 *
 * Anti-pressure: this is an informational cue ("you know this person"),
 * NOT a CTA. Per Gate-G-CHIP-VISUAL-ONLY: no `role="button"`, no `href`,
 * no `onClick`, no hover state beyond standard. The Users icon carries
 * `aria-hidden="true"`; the label "From a friend" is the screen-reader
 * accessible text.
 */
export function FromFriendChip() {
  return (
    <span
      className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-xs text-white/60"
      data-testid="from-friend-chip"
    >
      <Users className="h-3 w-3" aria-hidden="true" />
      From a friend
    </span>
  )
}
