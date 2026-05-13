# Brief: Spec 6.2b — Prayer Length Options

**Master plan reference:** `_forums_master_plan/round3-master-plan.md` lines 5075-5166

**Spec ID:** `round3-phase06-spec02b-prayer-length-options`

**Phase:** 6 (Slow Sanctuary / Quiet Engagement Loop)

**Size:** M

**Risk:** Low (master plan says Low; brief concurs — purely frontend, uses existing activity infrastructure, no anti-abuse surface)

**Prerequisites:**
- 6.2 (Quick Lift) — must merge first (introduces `PointValues.java` + `BadgeCatalog.java` patterns 6.2b assumes exist; also establishes shared timer-UX vocabulary)
- Existing DailyHub + PrayTabContent: ✅ verified
- Existing `useFaithPoints` hook with `recordActivity`: ✅ verified (already has Spec 6.2-aware `skipBackendDualWrite` option)

**Tier:** **High** (curated prompt content + anti-pressure brand voice gates + accessibility precision; smaller surface than 6.2 but content-quality matters)

**Pipeline:** This brief → `/spec-forums spec-6-2b-brief.md` → `/plan-forums spec-6-2b.md` → execute → review.

**Execution sequencing:** Execute AFTER 6.2 merges. No backend surface conflict with 1.5g (purely frontend on Daily Hub), so could run concurrently with 1.5g after 6.2 merges — BUT recommend serial execution for review-load reasons. Order: 6.1 → 1.5g → 6.2 → 6.2b OR 6.1 → 6.2 → 6.2b → 1.5g.

---

## 1. Branch Discipline

Branch: `forums-wave-continued`. Eric handles all git operations manually. Claude Code NEVER commits, pushes, branches, merges, rebases, or alters git state at any phase. Violation of W1 is grounds to halt execute.

At execute-start, CC verifies via `git status` (read-only) that working tree is clean except for any pending 6.2b work.

---

## 2. Tier — High (not Medium)

6.2b is **High** tier despite being a purely frontend M-size spec.

**Why not Medium:**
- **Prompt content is curated and brand-defining.** ~14 prompts across three lengths (1-min: 2 prompts; 5-min: 5; 10-min: 8). Each prompt is short (5-12 words) but every word matters for the spiritual tone. Analogous to 6.1's 60 verses but smaller scale.
- **Anti-pressure copy gates** apply strictly across the entire surface: length picker labels, completion screen, early-exit affordance, every prompt. Even subtle deviations ("Great job!" vs "You prayed.") corrupt the experience.
- **Silence intervals are a design call**, not a default. 30s vs 60s vs 75s silences shape the spiritual experience differently. Brief locks in specific intervals per length (D-SilenceTiming).
- **Reduced-motion accommodation** requires care — crossfade animations become discrete swaps, but silence intervals stay identical.
- **Screen reader prompt announcement timing** (`role="status"` per master plan) requires Gate-G-A11Y discipline.

**Why not xHigh:**
- No content scale (14 prompts vs 60 verses for 6.1).
- No load-bearing privacy invariants (vs. 6.1's friend-attribution leak risk).
- No anti-abuse surface (vs. 6.2's server-authoritative timing).
- No new backend code (master plan confirms: API uses existing POST /api/v1/activity).

**Practical execution implication:** High tier means CC uses Opus 4.7 thinking `xhigh` for spec-from-brief + plan; routine execute steps use `high`. Eric reviews ALL prompt copy before execute (similar to 6.1's Gate-29 verses but lower-ceremony since the brief includes a curated default set Eric can approve or edit).

---

## 3. Visual & Integration Verification

### Frontend (Playwright)

**Length picker flow:**
- Visit `/daily?tab=pray` with no length param → existing PrayTabContent renders + new PrayLengthPicker section ("Start a timed session") prominently visible
- Tap a length (1/5/10) → transitions to PraySession full-screen view; URL updates to `?tab=pray&length=5`
- Visit `/daily?tab=pray&length=5` directly (deep link) → skips picker, starts 5-min session immediately
- Length picker subtitles render correctly: "Quick pause" / "Settled prayer" / "Deep sit"

**Session flow:**
- Full-screen session view: prompts crossfade in/out with 1.5s CSS transitions (reduced-motion: instant swap, no fade)
- Each prompt fades in, holds for silence interval, fades out; next prompt appears
- Final prompt fades out → "Amen." screen for ~3 seconds → redirect back to `/daily?tab=pray` (no length param)
- End-early button (top-right corner) ALWAYS visible during session; never hidden, never requires confirmation modal
- Tap End-early → immediate transition to "Amen." screen with same 3s hold → redirect
- `recordActivity('pray', { length: 5, ended_early: false })` fires on natural completion; `ended_early: true` on early exit
- Activity metadata also includes: `prompts_seen` (number of prompts that completed display before session ended), `audio_used` (boolean: was ambient audio playing)

**Audio (ambient sound during session):**
- Audio toggle visible during session (small icon, doesn't compete with prompts)
- Audio choice persisted to `localStorage.wr_prayer_session_audio_preference` (one of: `none`, `rain`, `birds`, `chime` — plan-recon picks final list from existing Music feature)
- Audio crossfades on track change (if user switches mid-session)
- Audio respects Settings.audio.soundEffectsEnabled toggle (if disabled in Settings, audio doesn't play even if preference set)

**Reduced-motion:**
- Set `prefers-reduced-motion: reduce` in browser → prompt transitions become instant swaps (no crossfade)
- Silence intervals stay identical (D-ReducedMotion is visual-only)
- End-early + Amen screen transitions also instant (no fade)

**Accessibility:**
- Prompt container has `role="status"` (non-intrusive screen-reader announcement)
- Each prompt change triggers a single `aria-live="polite"` update (NOT "assertive" — prompts should never interrupt)
- End-early button reachable via Tab key; `aria-label="End prayer session early"`
- Audio toggle reachable via Tab; `aria-label="Toggle ambient sound"` with state announced ("Off", "Rain", etc.)
- Length picker buttons have descriptive `aria-label` ("1 minute, Quick pause")
- Color contrast on prompt text + button affordances meets WCAG AA in light + dark themes

**Deep-link variants:**
- `?length=1` → starts 1-min session
- `?length=5` → starts 5-min session
- `?length=10` → starts 10-min session
- `?length=invalid` → falls back to picker (NO error, NO redirect; graceful)
- `?length=5&tab=journal` → length param ignored (only honored when tab=pray)

### Backend

NO backend changes for 6.2b. The existing `POST /api/v1/activity` endpoint accepts `{type: "pray", metadata: {length, ended_early, prompts_seen, audio_used}}` and the existing ActivityService handles it. R3 (plan-recon-required) verifies metadata field shape supports arbitrary keys.

Integration verification is purely frontend (existing dual-write flow handles backend persistence).

### Manual verification by Eric after execute

- Complete one 1-minute session naturally; verify activity fires with correct metadata, dashboard updates, +5 points
- Start a 5-minute session, end early at the 2-minute mark; verify activity still fires (`ended_early: true`), still counts toward streak, still awards points
- Start a 10-minute session with ambient audio enabled; verify audio plays for full duration, crossfades work, respects sound settings
- Deep-link directly to `?length=5`; verify picker is bypassed
- Enable reduced-motion in OS; verify prompts swap instantly (no crossfade) but timing is unchanged
- Read every prompt aloud as if it's been said to a friend in genuine emotional need; verify NO prompt creates pressure, guilt, urgency, or comparison
- Verify the "Amen." screen says exactly "Amen." — not "Amen!" not "Great session!" not "You prayed for X minutes!"

## 4. Master Plan Divergences (MPDs)

Deliberate divergences from the stub at lines 5075-5166. Plan/execute MUST honor the brief, not the stub.

**MPD-1: PrayLengthPicker is additive, NOT replacement.**
Stub says "New 'Pray' tab surface at `/daily?tab=pray&length=...`" — ambiguous whether this REPLACES the existing PrayTabContent or AUGMENTS it. Recon (R1) shows `PrayTabContent.tsx` already exists with prayer-prompt-to-journal redirect flow. Brief decides: existing PrayTabContent stays; PrayLengthPicker renders as a NEW section within it ("Start a timed session") prominent CTA. Selecting a length transitions to full-screen PraySession via React Router state change. The existing prayer-prompt-to-journal flow remains accessible as before.

**MPD-2: Prompt copy authored inline in brief, not deferred to plan.**
Stub gives example prompts but no complete set. Brief includes a FULL curated draft set (Section 7 D-Prompts) for all three lengths. Eric reviews + approves before execute; lower-ceremony than 6.1's Gate-29 since there are only ~15 prompts total. Plan may light-edit for fit but cannot replace the curated set wholesale without re-approval.

**MPD-3: Silence intervals locked per length.**
Stub mentions silences directionally ("~75 seconds" for 10-min, "45 seconds" for 1-min). Brief locks specific intervals per prompt per length (D-SilenceTiming). Total session duration math is deterministic, not approximate.

**MPD-4: Activity metadata expanded beyond `{length, ended_early}`.**
Stub mentions `ended_early: true` flag. Brief expands metadata payload to:
```json
{
  "length": 1 | 5 | 10,
  "ended_early": false,
  "prompts_seen": 5,
  "audio_used": true
}
```
Rationale: future analytics ("do users who use audio complete more sessions?") and product-direction signal ("what % of users end early on 10-min sessions?"). The metadata field on ActivityRequest already supports arbitrary keys (R3 plan-recon verifies).

**MPD-5: Audio integration deferred to plan recon, not a hard requirement at brief level.**
Stub mentions "Optional ambient sound selection (leverages Phase 6's Sound Effects settings)" — but the Sound Effects spec (6.11) isn't built yet. Brief decides: 6.2b ships with audio toggle disabled by default. If audio infrastructure exists at plan-recon time (e.g., via existing Music feature), wire it up. If not, ship without audio + add the toggle in a follow-up spec when 6.11 lands.

This prevents 6.2b from being blocked on 6.11. The end-of-session activity still records `audio_used: false` consistently.

**MPD-6: Deep-link param graceful fallback.**
Stub doesn't address invalid `?length=` values. Brief mandates: `?length=invalid` (anything not in {1, 5, 10}) falls back silently to the picker view. NO error toast, NO 404, NO redirect with error message. The user sees the picker; whatever they wanted is unavailable; they pick a valid length and move on.

**MPD-7: "Amen." screen is non-skippable, ~3 seconds.**
Stub mentions "Amen screen" but doesn't specify duration or skippability. Brief decides: 3-second hold, NOT skippable (tap doesn't dismiss; back-navigation doesn't dismiss). After 3 seconds, automatic redirect to `/daily?tab=pray`. Rationale: the Amen is a punctuation mark, the spiritual closure of the session; skipping it cheapens the experience. 3 seconds is short enough to not feel forced, long enough to land.

Exception: hard back-button (browser navigation) is honored — user can leave. But there's no in-app "skip" affordance.

**MPD-8: NO sharing prompt after session.**
Stub says "No sharing prompt after session ends" — brief reinforces and extends: NO "share your session," NO "invite a friend to pray with you," NO confetti, NO badge celebration, NO points-counter animation. The completion screen is just "Amen." Nothing else.

The activity log + faith points + streak increment all happen silently in the background (existing dual-write flow).

**MPD-9: NO progress bar during session.**
Stub says "No 'session X of Y' progress bar." Brief reinforces: there is NO visible indicator of how far into the session the user is. No "3 of 8 prompts complete." No "50% remaining." The user is in time with God; the clock is not the point.

The End-early button is the only escape affordance and is always visible.

**MPD-10: NO crisis-keyword detection in 6.2b.**
Memory notes crisis-keyword detection exists in some Daily Experience surfaces. 6.2b has NO text input field — prompts are read-only, there's no user typing. Crisis detection does not apply here. Brief documents this explicitly to prevent over-engineering.

If user clicks End-early during a prompt that's about emotional content ("What hurts?"), that's NOT a crisis signal; it's a normal user action. NO follow-up modal, NO support-resources nudge.

---

## 5. Recon Ground Truth

Verified on disk during brief recon (R1-R5) or flagged for plan-time recon (R6-R10).

**R1 — DailyHub + PrayTabContent infrastructure: VERIFIED.**
- `frontend/src/pages/DailyHub.tsx` exists with 4-tab layout (Pray, Journal, Meditate, Devotional)
- `frontend/src/components/daily/PrayTabContent.tsx` exists; imports `recordActivity` from `useFaithPoints`, `markPrayComplete` / `markGuidedPrayerComplete` from `useCompletionTracking`, `useAuthModal` for auth gating
- DailyHub line 324 shows `hidden={activeTab !== 'pray'}` pattern for tab visibility
- Existing flow: PrayTabContent has props `prayContext?: PrayContext | null` and `initialContext?: string | null` suggesting it already supports deep-link context loading

**R2 — useFaithPoints hook: VERIFIED.**
- `frontend/src/hooks/useFaithPoints.ts` exists with `recordActivity` export
- Line 131-139 shows Spec 6.2-aware `skipBackendDualWrite` option already implemented ("Required for features whose backend already records the activity inside its [own transaction]")
- For 6.2b: use default (do NOT pass `skipBackendDualWrite`) since 6.2b has no backend endpoint of its own — the dual-write to POST /api/v1/activity is the SOLE persistence path

**R3 — PLAN-RECON-REQUIRED: ActivityRequest metadata shape.**
Plan-time recon reads `backend/src/main/java/com/worshiproom/activity/ActivityRequest.java` to confirm:
- `metadata` field exists and accepts arbitrary JSON object
- OR the field needs widening to support 6.2b's payload
- If widening needed, that's a small backend MPD (brief expects this to NOT be necessary; existing intercession/comment flow likely uses metadata for postId already)

**R4 — PLAN-RECON-REQUIRED: Music feature audio infrastructure.**
Plan reads:
- `frontend/src/pages/Music*` or `/music` route (memory says this feature was built earlier with 24 ambient sounds)
- Find the audio playback hook/component (likely `useAmbientSound` or `AudioPlayer` named pattern)
- Determine if it's reusable as a thin wrapper in PraySession, OR if 6.2b needs its own tiny audio player

If reusable: import and use. If not reusable + simple to build: build minimal HTMLAudioElement-based player with crossfade. If not reusable + complex: defer audio toggle to follow-up spec per MPD-5.

**R5 — React Router + URL state pattern: VERIFIED via DailyHub.**
DailyHub already uses `useSearchParams` (likely from react-router-dom) to read `?tab=` param. 6.2b extends this pattern to read `?length=` param. Plan uses the same hook + setter pattern.

**R6 — PLAN-RECON-REQUIRED: useCompletionTracking hook integration.**
Existing `useCompletionTracking()` hook (per R1) has `markPrayComplete` and `markGuidedPrayerComplete` methods. Plan-time recon reads the hook to determine:
- Should 6.2b's session completion call `markPrayComplete()` (existing untimed pray flow) OR `markGuidedPrayerComplete()` (suggests an existing timed flow)?
- Does the hook handle midnight reset of "completed today" state correctly?
- Are there dashboard-checklist implications (does "completed pray today" badge unlock here)?

**R7 — PLAN-RECON-REQUIRED: Auth gating pattern.**
PrayTabContent uses `useAuthModal()` (R1) for auth-gated actions. Plan decides:
- Does starting a session require auth? Brief recommendation: YES, auth-required (no anonymous prayer sessions; consistent with PrayTabContent's existing pattern)
- If unauthenticated, PrayLengthPicker buttons trigger auth modal instead of session start
- After login, user lands back on PrayLengthPicker (or auto-starts the session they tried to start before login? — plan picks)

**R8 — PLAN-RECON-REQUIRED: localStorage key registry.**
Plan checks `.claude/rules/11-local-storage-keys.md` for the existing localStorage key conventions. Adds:
- `wr_prayer_session_audio_preference` (string: one of allowed audio choices)
If the rules file has a key-naming convention different from `wr_` prefix, follow that pattern instead.

**R9 — PLAN-RECON-REQUIRED: Crossfade animation pattern.**
Plan reads existing CSS transitions for similar use cases (e.g., onboarding flow, devotional reading) to reuse the established crossfade timing values. If no established pattern exists, plan picks:
- Crossfade duration: 1500ms (slow enough to feel reverent, fast enough to not break flow)
- Easing: `ease-in-out` (no harsh acceleration)
- Reduced-motion override: instant swap (0ms transition, opacity 0 → 1 in single frame)

**R10 — PLAN-RECON-REQUIRED: Existing prompt-display pattern (if any).**
The existing PrayTabContent may already have a prompt-display pattern (per its `prayContext` prop suggesting context-loading). Plan-time recon reads PrayTabContent.tsx end-to-end to confirm 6.2b's prompt-display approach is consistent with existing typography, spacing, and theming.

---

## 6. Phase 3 Execution Reality Addendum Gates — Applicability

| Gate | Applicability | Notes |
|------|---------------|-------|
| Gate-1 (Liquibase rules) | **N/A.** | No DB changes for 6.2b. |
| Gate-2 (OpenAPI updates) | **N/A.** | No new endpoints. (Existing POST /api/v1/activity unchanged.) |
| Gate-3 (Copy Deck) | **Applies (HARD).** | All prompt strings, length picker labels, completion screen, deep-link error fallback, audio toggle labels added to Copy Deck. See Gate-G-PROMPT-COPY. |
| Gate-4 (Tests mandatory) | **Applies.** | ~14 tests (3 unit, 8 component integration, 2 Playwright, 1 a11y). |
| Gate-5 (Accessibility) | **Applies (HARD).** | `role="status"` for prompt container, `aria-live="polite"`, focus management on session start/end, keyboard reachability for End-early + audio toggle. See Gate-G-A11Y. |
| Gate-6 (Performance) | **Applies.** | Crossfade animations use CSS opacity transitions only (60fps). No JS RAF loops. Audio playback uses HTMLAudioElement (cheap). |
| Gate-7 (Rate limiting on ALL endpoints) | **N/A.** | No new endpoints. (Existing POST /api/v1/activity already rate-limited by Spec 1.5c-equivalent infrastructure.) |
| Gate-8 (Respect existing patterns) | **Applies.** | Reuse: useFaithPoints.recordActivity, useCompletionTracking, useAuthModal, useSearchParams (URL state), existing CSS variables for theming. |
| Gate-9 (Plain text only) | **Applies (HARD).** | Prompts are PLAIN TEXT only — NO markdown, NO HTML, NO links, NO embedded scripture references rendered as components. Just text. |
| Gate-10 (Crisis detection supersession) | **N/A.** | No text input field; no user-generated content to scan. (MPD-10.) |

**New gates specific to 6.2b:**

**Gate-G-PROMPT-COPY (HARD).**
The 15 prompts (2 + 5 + 8 across three lengths) plus length picker subtitles plus completion screen text plus audio toggle labels are AUTHORED in this brief (Section 7 D-Prompts). Eric reviews + approves before execute. CC executes against the approved set.

During execute, CC MAY light-edit a prompt for fit (e.g., shorten by 1-2 words for layout) but MUST NOT replace a prompt wholesale, MUST NOT add new prompts not in the brief, and MUST NOT change the silence intervals (D-SilenceTiming).

Code review hard-blocks any prompt-array file change that doesn't match the approved set within 2 words per prompt.

**Gate-G-A11Y (accessibility — HARD).**
MUST cover:
- Prompt container has `role="status"` + `aria-live="polite"` (NOT `assertive`)
- Each prompt change updates `aria-label` (and triggers one announcement); silence periods have NO announcements (don't flood screen reader)
- Focus moves to End-early button on session start (so keyboard users can immediately exit if needed)
- Tab order during session: End-early → audio toggle (if visible) → nothing else (no other focusable elements during session)
- Length picker buttons have descriptive `aria-label` combining label + subtitle ("1 minute, Quick pause")
- Color contrast on prompt text meets WCAG AA in both themes
- Axe-core test passes with zero violations
- Screen reader users hear: prompt announcement → silence → next prompt → ... → "Amen." (the Amen screen IS announced)

**Gate-G-ANTI-PRESSURE (HARD).**
NO copy anywhere in the surface contains:
- Comparison ("more than yesterday," "streak ongoing," "X prayers this week")
- Urgency ("don't miss," "quick before," "hurry")
- Guilt ("you almost made it," "keep trying," "try again tomorrow")
- Achievement framing ("great job," "you did it," "unlocked")
- Quota framing ("3 of 8 prompts," "halfway," "final stretch")
- Sharing nudge ("tell a friend," "share your session")

Code review applies a grep-based check on the prompt arrays, completion screen, and audio toggle labels for any of these patterns. The presence of words like "streak," "unlock," "share," "great," "keep," "almost," "hurry," "quick" (in CTA context, not the legitimate "Quick pause" subtitle) triggers manual review.

**Gate-G-DEEP-LINK-GRACEFUL (SOFT).**
Invalid `?length=` values (e.g., `?length=foo`, `?length=99`, `?length=`) fall back silently to the picker view. NO error toast, NO redirect with error message, NO console error visible to user. Integration test covers this fallback path.

---

## 7. Decisions Catalog

The 12 design decisions baked into the brief that plan and execute must honor.

**D-Mechanism: Frontend-only timer; existing activity API for persistence.**
No backend changes. Session runs entirely client-side via `setInterval` (or `setTimeout` chain). On completion or early exit, calls `recordActivity('pray', metadata)` which uses the existing dual-write flow.

No anti-cheat concerns (vs. 6.2): "pray" activity = 5 points (existing intercession baseline / 2); user can't meaningfully farm by faking sessions because the points payoff is small and there's no per-day cap incentive to spoof multiple sessions.

**D-SilenceTiming: Locked intervals per length.**

*1-minute session (60s total):*
- Prompt 1: visible for 5s, fade-out 1.5s, silence 25s = 31.5s total
- Prompt 2: fade-in 1.5s, visible for 5s, fade-out 1.5s, silence 18s = 26s total
- Amen screen: 3s (counts toward total but not as silence)
- Actual total: 31.5 + 26 + 3 = 60.5s ≈ 60s

*5-minute session (300s total):*
- Prompt 1 (settle): 5s visible + 1.5s fade + 35s silence = 41.5s
- Prompt 2 (intercession): 6s visible + 1.5s fade + 70s silence = 77.5s (longest silence — deep intercession)
- Prompt 3 (hurt): 5s visible + 1.5s fade + 55s silence = 61.5s
- Prompt 4 (gratitude): 5s visible + 1.5s fade + 50s silence = 56.5s
- Prompt 5 (sit with God): 5s visible + 1.5s fade + 55s silence = 61.5s
- Amen screen: 3s
- Actual total: 41.5 + 77.5 + 61.5 + 56.5 + 61.5 + 3 = 301.5s ≈ 300s

*10-minute session (600s total):*
- Prompt 1 (settle): 5s + 1.5s + 60s = 66.5s
- Prompt 2 (presence): 6s + 1.5s + 70s = 77.5s
- Prompt 3 (intercession opens): 6s + 1.5s + 75s = 82.5s
- Prompt 4 (name a person): 6s + 1.5s + 75s = 82.5s
- Prompt 5 (hurt): 6s + 1.5s + 70s = 77.5s
- Prompt 6 (wisdom): 6s + 1.5s + 65s = 72.5s
- Prompt 7 (gratitude): 6s + 1.5s + 75s = 82.5s
- Prompt 8 (silence): 6s + 1.5s + 70s = 77.5s
- Amen screen: 3s
- Actual total: ~602.5s ≈ 600s

Plan may refine the exact decimal seconds for clean math; the rough proportions (settle short, intercession longest, gratitude/silence medium) are fixed.

**D-Prompts: Authored prompt set.** (Gate-G-PROMPT-COPY)

*1-minute session (2 prompts):*
1. "Breathe. What's heavy right now?"
2. "Hand it over."

*5-minute session (5 prompts):*
1. "Settle. Notice your breath."
2. "Who needs prayer today?"
3. "Name what hurts."
4. "Thank God for one thing."
5. "Sit with God in silence."

*10-minute session (8 prompts):*
1. "Settle. Breathe deeply, three times."
2. "Where has God been in your day?"
3. "Who needs prayer? Name them."
4. "Hold one person in your heart."
5. "Name what hurts in your own life."
6. "Where do you need wisdom?"
7. "Thank God for three things."
8. "Sit in silence with the Father."

**Anti-pressure compliance:** No prompt contains comparison, urgency, guilt, achievement framing, or quota framing. Each prompt is an invitation, not a command.

Eric MUST review + approve this set before execute. Edits welcome. Plan may shorten by 1-2 words for layout; cannot replace a prompt wholesale.

**D-PromptShuffle: Per-session shuffle within each length's prompt array.**
At session start, the prompt array is shuffled (Fisher-Yates) so the user gets a different ordering each session. Same prompts, different sequence.

Exception: the FIRST prompt of each length ("Breathe. What's heavy right now?" / "Settle. Notice your breath." / "Settle. Breathe deeply, three times.") is ALWAYS first — it's the settling/opening prompt and must lead. Position 1 is fixed; positions 2+ shuffle.

Exception: the LAST prompt of the 5-min and 10-min sessions ("Sit with God in silence." / "Sit in silence with the Father.") is ALWAYS last — it's the closing prompt that segues into the Amen screen. Last position is fixed.

Net: 1-min has no shuffle (only 2 prompts, both fixed positions). 5-min shuffles positions 2-4. 10-min shuffles positions 2-7.

**D-EarlyExit: Always-visible button; activity still fires.**
End-early button visible in top-right of the session view throughout. Tapping it:
1. Captures current state: `{prompts_seen, length, ended_early: true, audio_used}`
2. Fires `recordActivity('pray', captured)`
3. Transitions immediately to Amen screen (no fade-out of current prompt)
4. Amen screen shows for 3s, then redirects to `/daily?tab=pray`

The early-exit activity STILL awards full 5 points and STILL counts toward dashboard checklist ("completed pray today"). NO partial credit, NO penalty. 

**D-AmenScreen: 3 seconds, just "Amen."**
Text: "Amen." (single word, period included, no exclamation mark, large serif typography matching brand)
Duration: 3000ms (locked)
Not dismissible via tap or in-app navigation
Fades out (or instant swap on reduced-motion) → redirect to `/daily?tab=pray`

No subtitle, no "You prayed," no points display, no streak update animation. Just "Amen."

**D-LengthPickerCopy:**
- Button 1: "1 minute" / subtitle "Quick pause"
- Button 2: "5 minutes" / subtitle "Settled prayer"
- Button 3: "10 minutes" / subtitle "Deep sit"
- Section heading above buttons: "Start a timed session"
- (NO icon decorations; clean text-only buttons; styling consistent with existing PrayTabContent button patterns)

**D-AudioToggle: Disabled by default; opt-in per session.**
Audio toggle visible in session view (small icon, bottom-right or unobtrusive corner). Default state: off (no ambient audio).

When user taps toggle during session, opens a small picker (3-4 options: "Rain," "Birds," "Wind chime," "Off"). Selection persists to `localStorage.wr_prayer_session_audio_preference`. On next session start, the persisted preference auto-activates (unless `"off"` which stays silent).

If user's Settings has `soundEffectsEnabled: false`, the audio toggle is hidden during sessions and `audio_used` is always `false`.

If audio infrastructure isn't available at execute-time (per MPD-5 / R4), the toggle is hidden entirely; `audio_used` is always `false`.

**D-DeepLink: Direct length params start session immediately.**
- `/daily?tab=pray&length=1` → starts 1-min session
- `/daily?tab=pray&length=5` → starts 5-min session
- `/daily?tab=pray&length=10` → starts 10-min session
- `/daily?tab=pray&length=foo` (or anything else) → picker visible, no session started, NO error message (MPD-6)

Deep-link param is consumed on first render and then REMOVED from URL via `replaceState` so refresh doesn't restart the session.

**D-FetchPattern: useFaithPoints.recordActivity (existing).**
No native fetch needed. Existing hook handles dual-write to backend. Frontend just calls `await recordActivity('pray', metadata)` on completion or early-exit.

**D-AuthGating: Auth required to start a session.**
Unauthenticated users see PrayLengthPicker as visible but tapping any button opens auth modal (existing pattern from PrayTabContent). After login, user lands back on PrayLengthPicker — does NOT auto-start the session they attempted before login (avoids the surprise-session UX).

**D-ReducedMotion: Visual-only accommodation.**
`prefers-reduced-motion: reduce` changes:
- Prompt crossfade duration: 1500ms → 0ms (instant swap)
- Amen screen fade-in: 800ms → 0ms
- Length picker hover transitions: 200ms → 0ms

Does NOT change:
- Silence intervals (D-SilenceTiming)
- Total session duration
- Activity recording

**D-PromptArrayLocation: `frontend/src/constants/pray-session-prompts.ts`**
New file (master plan stub line 5111). Structure:
```typescript
export type PrayPrompt = {
  text: string
  silenceMs: number
  fixedPosition?: 'first' | 'last' // for D-PromptShuffle
}

export const PRAY_PROMPTS_1MIN: ReadonlyArray<PrayPrompt> = [/* 2 entries */] as const
export const PRAY_PROMPTS_5MIN: ReadonlyArray<PrayPrompt> = [/* 5 entries */] as const
export const PRAY_PROMPTS_10MIN: ReadonlyArray<PrayPrompt> = [/* 8 entries */] as const
```

Runtime validators (sanity checks at module load):
- 1-min array length = 2
- 5-min array length = 5
- 10-min array length = 8
- First prompt of each = fixedPosition: 'first'
- Last prompt of 5-min and 10-min = fixedPosition: 'last'
- All `text` non-empty, all `silenceMs` positive

Throw at module load if any validation fails (same pattern as 6.1's verses file).

---

## 8. Watch-fors

Organized by theme. ~25 items total.

### Brand voice / anti-pressure (highest priority for this spec)
- W1 (CC-no-git): Claude Code never runs git operations at any phase.
- W2: The completion screen says exactly "Amen." — not "Amen!", not "Great session!", not "You prayed!". Period.
- W3: NO points-counter animation at completion. The +5 points lands silently in the backend; the user sees no number.
- W4: NO streak-impact mention anywhere in the session UI. Streak math happens silently in the dashboard.
- W5: NO sharing prompt. No "share your session," no "invite a friend."
- W6: NO badge unlock celebration in 6.2b. (If a badge happens to unlock due to dashboard-level streak counts triggered by this activity, the existing badge celebration UI handles it elsewhere — NOT in the PraySession surface itself.)
- W7: NO progress bar / progress percentage / "X of Y prompts" indicator anywhere.
- W8: NO countdown timer visible anywhere in the session view. The user feels the timing through prompts + silences, not through a clock.
- W9: Length picker subtitles ("Quick pause," "Settled prayer," "Deep sit") are aspirational, NOT promises. Avoid "better than yesterday" or "deeper than 5-min" framings.
- W10: Prompt copy never uses comparison, urgency, guilt, achievement framing, or quota framing (Gate-G-ANTI-PRESSURE).

### Accessibility
- W11: Prompt container has `role="status"` + `aria-live="polite"` only. NEVER `assertive` (would interrupt screen reader mid-thought).
- W12: Each prompt change triggers ONE announcement; silences are silent for screen reader.
- W13: Focus moves to End-early button on session start (keyboard users can immediately escape).
- W14: Reduced-motion accommodation is visual-only; timing is identical for all users.
- W15: All text meets WCAG AA contrast in both themes.

### Performance
- W16: Crossfade animations use CSS opacity transitions on a single element (no layout thrashing). 60fps on mobile.
- W17: Audio playback (when enabled) uses HTMLAudioElement with `preload="auto"` and a single audio source per session. NO multiple concurrent audio contexts.
- W18: Session state managed via single component-level `useState` (or `useReducer`) — NO context provider, NO Jotai/Zustand. The session is ephemeral.

### URL state
- W19: Deep-link `?length=X` is consumed once on first render then removed from URL via `replaceState`. Page refresh during session does NOT restart it (D-OverlayPersistence pattern from 6.2 doesn't apply here — 6.2b sessions just end on refresh).
- W20: Invalid `?length=` values fall back silently to picker (MPD-6).

### Content fidelity
- W21: Prompt text rendered as plain text. NO markdown rendering, NO HTML, NO embedded scripture-reference components. The prompt is just a string.
- W22: Prompts MUST match the approved set within 2 words (Gate-G-PROMPT-COPY).
- W23: Silence intervals MUST match D-SilenceTiming exactly. CC cannot change these for "better pacing" without re-approval.

### Activity recording
- W24: `recordActivity` is called exactly ONCE per session — on natural completion OR on early exit, never both. If user closes browser mid-session, no activity is recorded (acceptable; session was abandoned, not completed).
- W25: Activity metadata includes `prompts_seen` (count of prompts that completed display before session ended). 1-min completed = 2; 5-min completed = 5; 10-min completed = 8; early exit at prompt 3 of 10-min = 3.

---

## 9. Test Specifications

~14 tests total. Frontend-only (no backend changes → no new backend tests).

### Frontend unit tests (~3)
- `pray-session-prompts.ts` module load: validates array lengths (2/5/8), validates fixedPosition entries, validates non-empty text. Throws on mismatch.
- `shufflePrompts` function: given a length, returns array with first prompt fixed at position 0; for 5-min and 10-min, last prompt fixed at last position; positions 2..N-1 are shuffled (verify by running 100 times and checking distribution).
- `PrayLengthPicker` component: renders 3 buttons with correct labels and subtitles; each button has correct `aria-label`.

### Frontend component integration tests (~8) using Vitest fake timers
- `<PraySession length={1}>` renders prompt 1 immediately; advances time 31.5s; verifies prompt 2 visible; advances time 26s; verifies Amen screen; advances 3s; verifies redirect.
- `<PraySession length={5}>` runs full 5-min session with fake timers; verifies all 5 prompts visible in order; verifies activity fired with correct metadata.
- End-early at prompt 3 of 10-min session → activity fires with `{ended_early: true, prompts_seen: 3, length: 10}`; redirects to Amen screen; redirects to /daily after 3s.
- Deep-link via `?length=5` query param → session starts immediately; URL has `length` param removed after first render (`replaceState` called).
- Deep-link with `?length=invalid` → picker view rendered; no session started; no error toast.
- Audio toggle change persists to `localStorage.wr_prayer_session_audio_preference`.
- Reduced-motion preference (`matchMedia` mock returns `(prefers-reduced-motion: reduce)` match) → prompt transitions have `transition-duration: 0ms` in computed style.
- Auth gating: unauthenticated user taps PrayLengthPicker button → auth modal opens; session NOT started.

### Playwright E2E (~2 scenarios)
- **1-minute session happy path:** Login, navigate to `/daily?tab=pray`, click "1 minute" picker button, verify session view opens, wait ~62s real time, verify Amen screen, verify redirect to `/daily?tab=pray`, verify dashboard shows pray activity completed, verify +5 points.
- **Early-exit variant:** Login, click "5 minutes", wait ~30s (mid-session), click End-early button, verify immediate transition to Amen, wait 3s, verify redirect, verify activity recorded with `ended_early: true`.

Note: 1-minute Playwright is acceptable wall-clock cost (~70s including setup). 5-min and 10-min full Playwright runs are NOT in test scope — fake-timer integration tests cover those at near-instant speeds.

### Accessibility test (~1)
- Axe-core scan on length picker view: zero violations
- Axe-core scan on session view (during prompt display): zero violations
- Axe-core scan on Amen screen: zero violations

---

## 10. Files

### To CREATE

**Frontend:**
- `frontend/src/pages/daily/PraySession.tsx` — full-screen session view (timer, prompts, End-early button, audio toggle, Amen screen handoff)
- `frontend/src/components/daily/PrayLengthPicker.tsx` — 3-button picker (1/5/10 minutes); rendered inside existing PrayTabContent
- `frontend/src/components/daily/PrayTimer.tsx` — internal timer logic component (uses setTimeout chain; exposes onPromptChange, onComplete, onEarlyExit callbacks)
- `frontend/src/components/daily/PrayCompletionScreen.tsx` — the "Amen." screen (3s hold then redirect)
- `frontend/src/components/daily/PrayAudioToggle.tsx` — audio toggle component (only rendered if R4 plan-recon finds audio infrastructure)
- `frontend/src/constants/pray-session-prompts.ts` — the curated prompt arrays (D-Prompts content)
- `frontend/src/hooks/usePraySession.ts` — session orchestration hook (manages prompt index, fires `recordActivity` on completion/exit)
- Test files mirroring each component (`__tests__/*.test.tsx`)
- `frontend/tests/e2e/pray-session.spec.ts` — Playwright suite

### To MODIFY

**Frontend:**
- `frontend/src/components/daily/PrayTabContent.tsx` — add `<PrayLengthPicker />` section (above or below existing content, plan picks placement)
- `frontend/src/pages/DailyHub.tsx` — if needed, handle the `?length=` param read + pass through to PrayTabContent / PraySession
- `.claude/rules/11-local-storage-keys.md` — document `wr_prayer_session_audio_preference` key + allowed values

**Frontend types (if needed per R3):**
- `frontend/src/types/dashboard.ts` — if `ActivityType` union doesn't already include `pray`, verify it does (already should per memory + recon)

### NOT to modify (explicit non-targets)
- Backend: NO backend changes for 6.2b. The existing ActivityService + ActivityController + POST /api/v1/activity handle the pray activity already. (R3 verifies metadata field shape; if it needs widening, that's the ONLY backend change — a small DTO update.)
- `useFaithPoints.ts`: existing hook, NOT modified (use it as-is)
- `useCompletionTracking.ts`: existing hook, NOT modified (R6 confirms whether to call markPrayComplete or markGuidedPrayerComplete)
- 6.1's Prayer Receipt code: orthogonal
- 6.2's Quick Lift code: orthogonal (different surface; different mechanics)
- Settings page: NO new toggle. Audio toggle is per-session, not a global setting.

### To DELETE
None. 6.2b is purely additive.

---

## 11. Acceptance Criteria

**Functional (from master plan):**
- A. Three-button length picker on Daily Hub Pray tab (1 / 5 / 10 minutes).
- B. Full-screen timer renders current prompt + End-early button (NO countdown numbers, NO progress bar).
- C. Prompts fade in/out with CSS transitions; reduced-motion = instant swaps.
- D. Prompt order shuffled per session (within first/last fixed positions).
- E. Session completes with "Amen." screen → redirects to `/daily?tab=pray` → fires `recordActivity('pray', metadata)`.
- F. Early exit still records activity with `ended_early: true` flag; still awards full +5 points; still counts toward streak.
- G. Audio preference persisted to `localStorage.wr_prayer_session_audio_preference` (if audio infrastructure exists per R4).
- H. No streak penalty for early exit.
- I. URL query param `?length=5` deep-links into a 5-minute session directly.
- J. Screen reader announces each prompt as `role="status"` + `aria-live="polite"`.
- K. 14+ tests covering prompt shuffling, activity recording, early-exit flow, length deep-linking, audio persistence, reduced-motion, auth gating, accessibility.

**Brand voice (brief-mandated):**
- L. Completion screen says exactly "Amen." — no exclamation, no celebration copy.
- M. NO points display, NO streak indicator, NO badge celebration in session UI.
- N. NO sharing prompt after session.
- O. NO progress bar / progress percentage during session.
- P. Prompts pass Gate-G-ANTI-PRESSURE grep check.

**Accessibility:**
- Q. `role="status"` + `aria-live="polite"` on prompt container; never `assertive`.
- R. Focus moves to End-early button on session start.
- S. Axe-core scans pass with zero violations (picker, session, Amen screen).
- T. Reduced-motion accommodation: visual-only; timing unchanged.
- U. WCAG AA color contrast in both themes.

**Deep-link handling:**
- V. `?length=invalid` falls back silently to picker.
- W. `?length=X` param is consumed once + removed from URL via `replaceState`.

**Performance:**
- X. Crossfade animations at 60fps on mobile.
- Y. Session state ephemeral (no persistence across reload; no context provider).

---

## 12. Out of Scope

Explicitly NOT in 6.2b (some are deferred to future specs, some are anti-features):

- **Custom user-authored prompts.** Future spec if user feedback shows demand.
- **Group prayer sessions** ("pray together for 5 minutes with a friend"). Different feature category.
- **Voice-guided sessions** (audio narration of prompts). Accessibility consideration; deferred to a future a11y-focused spec.
- **Specific prayer lists loaded into session** ("pray for everyone on my prayer list"). Different feature.
- **Custom length picker** (e.g., user-picked 3 minutes). Three locked options only; per master plan stub line 5156 recommendation.
- **Session resumption across page reload.** Sessions are ephemeral; reload = lost session.
- **Streak-based unlocks tied to Pray sessions.** Existing streak math handles this orthogonally; no new streak surface in 6.2b.
- **Notification on session completion** ("You prayed for 5 minutes!"). Anti-pressure; the activity log is the only record needed.
- **Cross-session analytics dashboards** ("You've prayed 15 times this month"). Existing dashboard handles activity counts; no new analytics surface.
- **Premium length options** (e.g., 30-minute sessions paywalled). Free for everyone; no premium gating.

---

## 13. Tier Rationale

**Why High not Medium:** Content curation (15 prompts), anti-pressure brand voice gates (HARD), accessibility precision (`role="status"` semantics matter). Even though it's a frontend-only spec with no backend changes, the spiritual-experience quality demands care at every layer.

**Why High not xHigh:** Smaller content scale than 6.1 (15 prompts vs 60 verses), no anti-abuse surface (vs 6.2), no novel architecture. The discipline is in execution fidelity, not in design originality.

**Practical execution implication:**
- spec-from-brief: Opus 4.7 thinking xhigh (locks in prompt copy + silence timing precision)
- plan-from-spec: Opus 4.7 thinking xhigh (R3-R10 recon must be thorough)
- execute: high for routine code, xhigh on `pray-session-prompts.ts` content fidelity + Gate-G-ANTI-PRESSURE compliance
- review: high baseline, xhigh focus on prompt copy + Amen screen + early-exit UX

---

## 14. Recommended Planner Instruction

```
Plan execution for Spec 6.2b per /Users/Eric/worship-room/_plans/forums/spec-6-2b-brief.md.

Tier: High. Use Opus 4.7 thinking depth xhigh.

Honor all 10 MPDs, 12 decisions, ~25 watch-fors, ~14 tests, and 4 new gates
(Gate-G-PROMPT-COPY, Gate-G-A11Y, Gate-G-ANTI-PRESSURE, Gate-G-DEEP-LINK-GRACEFUL).

Required plan-time recon (R3-R10):
- R3: read ActivityRequest.java; confirm metadata field accepts arbitrary keys
- R4: locate Music feature audio infrastructure; decide if reusable for ambient
  audio toggle, or defer audio toggle to follow-up spec
- R6: read useCompletionTracking hook; decide markPrayComplete vs
  markGuidedPrayerComplete
- R7: confirm auth gating pattern from existing PrayTabContent
- R8: verify .claude/rules/11-local-storage-keys.md conventions for new key
- R9: read existing CSS transition patterns; pick crossfade duration
- R10: read full PrayTabContent.tsx; confirm prompt-display approach
  consistent with existing styling

Plan-time divergences from brief: document in a Plan-Time Divergences section
(same pattern as 6.1's plan). Justifiable divergences welcome; surface them.

Do NOT plan for execution while Spec 6.2 is running. The plan can be authored
at any time. Execute waits for 6.2 to fully merge.

The authored prompt set in Section 7 D-Prompts is BRIEF-LEVEL CONTENT.
Generate the plan referencing it verbatim. CC during execute may light-edit
(within 2 words per prompt) for layout fit but MUST NOT replace or restructure
any prompt without re-approval from Eric.

Per W1, you do not run any git operations at any phase.
```

---

## 15. Verification Handoff (Post-Execute)

After CC finishes execute and produces the per-step Execution Log:

**Eric's verification checklist:**

1. Review code diff section by section.
2. Open the prompt arrays file (`pray-session-prompts.ts`); verify all 15 prompts match the brief's approved set within 2 words per prompt.
3. Manually complete a 1-minute session end-to-end; verify timing feels right (settle prompt for 31.5s, transition, second prompt for 26s, Amen for 3s).
4. Manually complete a 5-minute session; pay attention to the intercession prompt's 70s silence — verify it feels reverent, not interminable.
5. Manually start a 10-minute session and end early at the 3-minute mark; verify activity records with `ended_early: true`, `prompts_seen: 3`; verify +5 points still awarded.
6. Try deep-link `?length=5`; verify session starts directly, picker is bypassed.
7. Try deep-link `?length=invalid`; verify picker renders gracefully (no error).
8. Enable reduced-motion in OS; verify prompts swap instantly (no crossfade); verify timing is identical.
9. Try with screen reader (VoiceOver or NVDA); verify each prompt is announced once, silences are silent, Amen screen is announced.
10. Run axe-core on all three views; verify zero violations.
11. Visual sanity: verify NO countdown numbers, NO progress bar, NO points display, NO sharing CTA anywhere.
12. Read every prompt aloud one more time — verify nothing creates pressure, guilt, or comparison.

**If all clean:** Eric commits, pushes, opens MR, merges to master. Tracker updates: 6.2b flips ⬜ → ✅.

---

## 16. Prerequisites Confirmed

- **6.2 (Quick Lift):** must merge first (establishes shared timer-UX vocabulary; introduces PointValues.java/BadgeCatalog.java patterns 6.2b doesn't NEED but coexists with cleanly)
- **6.1 (Prayer Receipt):** ✅ (executing/recently shipped)
- **Existing DailyHub + PrayTabContent infrastructure:** ✅ verified via R1
- **Existing `useFaithPoints.recordActivity`:** ✅ verified via R2
- **Existing auth-modal pattern:** ✅ (used by PrayTabContent today)
- **Music feature audio infrastructure:** plan-recon-required (R4); MPD-5 defers gracefully if not found
- **localStorage rules file:** ✅ (mentioned in master plan stub line 5117)

**Execution sequencing:**
Safest order: 6.1 → 1.5g → 6.2 → 6.2b OR 6.1 → 6.2 → 6.2b → 1.5g. Eric picks. 6.2b cannot execute concurrently with 6.2 (shared PrayTabContent surface? — actually not, but the cognitive load of two simultaneous frontend executions justifies serial).

After 6.2 merges to master:
- Rebase/merge `forums-wave-continued` onto master
- Eric reviews + approves the prompt set in Section 7 D-Prompts (edits welcome)
- Run `/spec-forums spec-6-2b-brief.md` → generates spec file
- Run `/plan-forums spec-6-2b.md` → generates plan file (with R3-R10 plan-time recon)
- Eric reviews plan
- Run `/execute-plan-forums YYYY-MM-DD-spec-6-2b.md` → executes
- Eric reviews code + manual verification
- Eric commits + pushes + MRs + merges

---

## End of Brief
