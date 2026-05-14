// Spec 6.8 — Verse-Finds-You wire types. Mirror the backend response shape
// (camelCase per project convention — see PrayerReceiptResponse precedent).

export type TriggerType = 'post_compose' | 'comment' | 'reading_time'

export type SurfacingReason = 'cooldown' | 'crisis_suppression' | 'disabled' | 'no_match'

export interface VerseDto {
  reference: string
  text: string
}

export interface VerseSurfacingResult {
  verse: VerseDto | null
  cooldownUntil: string | null
  reason: SurfacingReason | null
}

// Spec 6.8 — wr_verse_dismissals localStorage shape. Tracks the 3-in-a-row
// off-ramp counter; the off-ramp prompt fires once when count reaches 3 and
// promptShown flips to true so it never re-fires.
export interface VerseDismissals {
  count: number
  promptShown: boolean
}
