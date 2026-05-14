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

/**
 * Spec 6.6b — REPLACES the shipped subhead. Load-bearing copy per Gate-G-COPY:
 * the live Spec 6.6 master plan stub's own notes flag this as the single most
 * important copy on the page. Rendered Lora italic, `<h2>` within `<main>`.
 */
export const ANSWERED_WALL_SUBHEAD_6_6B = 'Gratitude, not comparison.' as const

/**
 * Backwards-compatible alias for the old subhead constant. Test files and any
 * remaining old call sites continue to import `ANSWERED_WALL_SUBHEAD`; this
 * alias forwards to the new string so the underlying rendered copy is correct
 * everywhere while the import name stays stable. Pre-existing tests asserting
 * the old string SHOULD fail and be updated to reference the new copy.
 */
export const ANSWERED_WALL_SUBHEAD = ANSWERED_WALL_SUBHEAD_6_6B

/**
 * Spec 6.6b — intro paragraph mounted below the hero subhead. Calm context,
 * NOT a CTA. Acknowledges the survivorship-bias problem ("This page is not
 * the whole story") so the wall doesn't read as a leaderboard of "winners".
 */
export const ANSWERED_WALL_INTRO =
  'These are prayer requests whose authors chose to share an update. Many prayers go unanswered, or are answered quietly, or are still being waited on. This page is not the whole story — it is just the part some people felt moved to share.' as const

/**
 * Spec 6.6b — missing-answer-text fallback rendered on AnsweredCard when a
 * post has `is_answered=true` but `answered_text` is null/empty. Rendered in
 * a quieter italic style than the answer text itself.
 */
export const ANSWERED_TEXT_MISSING_FALLBACK =
  "This prayer was marked answered. The author hasn't shared an update." as const

// Spec 6.6b — D-Copy specifies "{n} praising with you · {n} celebrating" as
// the separate-count display format. The shipped UI realizes this by rendering
// the two counts INSIDE their respective buttons ("Praising with you (12)" +
// "Celebrate (3)") rather than as a single combined string with the `·`
// separator. Per-button counts satisfy D-Copy's intent — counts are visible,
// separate, and not summed — without duplicating information beside the
// buttons. A `buildPraisingCelebratingCount(praising, celebrating)` helper was
// considered for a standalone string surface and removed (it had no call site;
// adding one would duplicate counts the buttons already render). If a future
// spec wants the combined display in a non-button context (e.g., a summary
// row), reintroduce the helper at that time.

/** Spec 6.6b — Celebrate reaction button labels. */
export const CELEBRATE_LABEL = 'Celebrate' as const
export const CELEBRATE_INACTIVE_ARIA_LABEL =
  'Celebrate this answered prayer' as const
export const CELEBRATE_ACTIVE_ARIA_LABEL =
  "You're celebrating this answered prayer. Tap to remove." as const

/** Spec 6.6b — "Share an update" / "Edit your update" author affordances. */
export const SHARE_UPDATE_LABEL = 'Share an update' as const
export const EDIT_UPDATE_LABEL = 'Edit your update' as const

/** Spec 6.6b — Un-mark answered affordance + confirmation copy. */
export const UNMARK_ANSWERED_LABEL = 'Un-mark as answered' as const
export const UNMARK_ANSWERED_CONFIRM =
  'Remove this from the Answered Wall? You can mark it answered again anytime.' as const

/** Spec 6.6b — Category filter chip definitions (deliberately five + All; see MH_OMISSION_RATIONALE). */
export const ANSWERED_CATEGORY_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'health', label: 'Health' },
  { value: 'family', label: 'Family' },
  { value: 'work', label: 'Work' },
  { value: 'grief', label: 'Grief' },
  { value: 'gratitude', label: 'Gratitude' },
] as const

/**
 * Spec 6.6b — "Why no Mental Health filter" rationale. Embedded as a code
 * comment on AnsweredCategoryFilter.tsx per Gate-G-MH-OMISSION HARD. Exported
 * here for documentation / grep discoverability. Do NOT add a Mental Health
 * chip without revisiting this rationale — the omission is deliberate
 * anti-pressure design.
 */
export const MH_OMISSION_RATIONALE =
  "There is intentionally no 'Mental Health' category chip on the Answered Wall. Mental-health prayers being 'answered' is genuinely complicated theological and clinical territory — healing is rarely linear, and a filter chip on a celebration surface risks implying a tidy resolution narrative that does not serve people living in that territory. This omission is a deliberate anti-pressure design decision from the Spec 6.6 master plan, carried forward by Spec 6.6b. Do not add a Mental Health chip without revisiting this rationale." as const

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
