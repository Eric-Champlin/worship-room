/**
 * Spec 6.3 — 8 day/night copy pairs (D-CopyPairs).
 *
 * Pair 7 (reactionToast) is intentionally identical day-and-night per
 * Universal Rule W17 — prayer-reaction copy is timeless across hours.
 */
export type NightModeCopyKey =
  | 'heroSubtitle'
  | 'composeFabTooltip'
  | 'composeModalHeading'
  | 'emptyFeedState'
  | 'composePlaceholder'
  | 'greeting'
  | 'reactionToast'
  | 'pageTitle'

export interface NightModeCopyPair {
  day: string
  night: string
}

export const NIGHT_MODE_COPY: Record<NightModeCopyKey, NightModeCopyPair> = {
  heroSubtitle: {
    day: 'What weighs on you today?',
    night: "It's quiet here. You're awake.",
  },
  // composeFabTooltip — partially wired. The visible "Share something" button
  // text on the Prayer Wall hero is not replaced (changing visible day-state
  // copy is out of Spec 6.3 scope). At night, the night variant is wired as the
  // `aria-label` override on the FAB so screen-reader users hear the gentler
  // phrasing during quiet hours. The day variant is reference-only.
  composeFabTooltip: {
    day: "Share what's on your heart",
    night: 'Write something',
  },
  // composeModalHeading — not wired in production. Plan-Time Divergence #4:
  // the ComposerChooser title "What would you like to share?" is a type
  // picker, not a single-composer prompt. InlineComposer renders per-type
  // headers ("Share a Prayer Request", "Share a Testimony", etc.) that carry
  // semantic information the generic night variant would erase. Reference-only
  // for the Spec 6.3 Copy Deck; revisit in a future spec if per-type night
  // variants are authored.
  composeModalHeading: {
    day: "What's on your heart?",
    night: 'Write something quiet',
  },
  emptyFeedState: {
    day: 'The wall is quiet right now.',
    night: "It's quiet tonight. Be the first.",
  },
  composePlaceholder: {
    day: "Share what's weighing on you...",
    night: "Write what's on your mind tonight...",
  },
  // greeting — not wired in production. Prayer Wall hero has a subtitle, not a
  // time-of-day greeting; the Dashboard / Daily Hub greeting surfaces are out
  // of Spec 6.3 scope (Gate-G-SCOPE-PRAYER-WALL-ONLY). Reference-only for the
  // Spec 6.3 Copy Deck; revisit in a future spec if greeting copy is added to
  // the Prayer Wall surface.
  greeting: {
    day: 'Good to see you.',
    night: 'Good evening.',
  },
  reactionToast: {
    day: 'Praying for them.',
    night: 'Praying for them.', // W17 — intentionally identical day-and-night
  },
  // pageTitle.day is canonical reference copy from the Spec 6.3 Copy Deck but
  // is NOT wired in production: the day-state SEO title flows from the
  // canonical `PRAYER_WALL_METADATA` ("Community Prayer Wall | Worship Room"),
  // which has been live and indexed for the entire history of the route.
  // Changing the day-state title would be an SEO-visible change; that decision
  // belongs in a dedicated SEO spec, not Spec 6.3. The night variant IS wired
  // (only fires under nightActive=true) because the brand-defining visual
  // change at night is exactly the kind of moment that warrants a title swap.
  pageTitle: {
    day: 'Prayer Wall • Worship Room',
    night: 'Prayer Wall • Night • Worship Room',
  },
}

/** Convenience helper for `active ? pair.night : pair.day`. */
export function getNightModeCopy(
  key: NightModeCopyKey,
  active: boolean,
): string {
  const pair = NIGHT_MODE_COPY[key]
  return active ? pair.night : pair.day
}
