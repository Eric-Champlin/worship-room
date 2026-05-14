/**
 * Spec 6.6 — Answered Wall copy deck. All user-facing strings live here per
 * Universal Rule 5 (i18n-ready constants module).
 *
 * Every string passes the Anti-Pressure Copy Checklist (Universal Rule 12):
 *   - No comparison framing
 *   - No urgency
 *   - No exclamation points near vulnerable content
 *   - No therapy-app jargon
 *   - No streak-as-shame
 *   - No false scarcity
 *
 * Voice: warm pastor's-wife — quiet celebration, not a leaderboard.
 *
 * Eric-approved before execute per Gate-G-COPY.
 */

export const ANSWERED_WALL_HEADING = 'Answered' as const

export const ANSWERED_WALL_SUBHEAD =
  'Prayers the community has watched God move in.' as const

export const ANSWERED_WALL_EMPTY_STATE =
  'No answered prayers yet. When someone marks a prayer answered, their testimony will live here.' as const

/** Button label visible on viewport widths sm+ alongside the count. */
export const PRAISING_LABEL = 'Praising with you' as const

/** Inactive aria-label (button toggles isPraising=false → true). */
export const PRAISING_INACTIVE_ARIA_LABEL = 'Praising with you' as const

/** Active aria-label (button toggles isPraising=true → false). */
export const PRAISING_ACTIVE_ARIA_LABEL =
  "You're praising with this answered prayer. Tap to remove." as const

/** aria-label for the prominent "How this was answered" region on AnsweredCard. */
export const ANSWER_TEXT_REGION_LABEL = 'How this was answered' as const

/** Lowercase prefix for the relative answered-at timestamp ("answered 3 days ago"). */
export const ANSWERED_TIMESTAMP_PREFIX = 'answered ' as const

export const ANSWERED_NAV_TAB_ALL = 'All' as const
export const ANSWERED_NAV_TAB_ANSWERED = 'Answered' as const
