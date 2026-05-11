# Forums Wave: Spec 5.4 — Animation Token Migration (BB-33 Compliance)

**Master Plan Reference:** `_forums_master_plan/round3-master-plan.md` → Spec 5.4 (lines ~4686–4706)
**Source Brief:** `_plans/forums/spec-5-4-brief.md` (authored 2026-05-11 — **brief is binding; brief wins over master plan body where they diverge; this spec's Recon Reality Overrides win over brief where brief's recon (R1/R2/R6/R9) is stale**)
**Branch:** `forums-wave-continued` (long-lived working branch — Eric handles all git operations manually; CC must NOT run any git mutations)
**Date:** 2026-05-11

---

## Affected Frontend Routes

The five files modified by 5.4 are mounted by these routes. Verification covers each.

- `/prayer-wall` (PrayerCard rendered for every feed item; AuthModal mounted via auth-gating; ReportDialog and DeletePrayerDialog accessible from prayer actions; InteractionBar mounted on every PrayerCard)
- `/prayer-wall/:id` (PrayerDetail — uses PrayerCard, InteractionBar, ReportDialog)
- `/prayer-wall/user/:id` (PrayerWallProfile — uses PrayerCard)
- `/prayer-wall/dashboard` (PrayerWallDashboard — uses PrayerCard variants, AuthModal for unauthenticated guard)

Lighthouse Performance ≥ 90 must be verified on each of these four routes per AC #4 / brief Gate 21.

Out of scope (W10): pages files (`PrayerWall.tsx`, `PrayerWallDashboard.tsx`, etc.) — only their component children are migrated.

---

## Metadata

- **ID:** `round3-phase05-spec04-animation-tokens`
- **Phase:** 5 (Prayer Wall Visual Migration — fourth real Phase 5 spec; 5.0 closed without ceremony, 5.1 ✅ shipped, 5.2 ✅ shipped via Spec 14, 5.3 ✅ closed as no-op)
- **Size:** S (downsized from master plan body's M and brief's M — see Recon Reality Override R-RESCOPE below; actual remaining work touches ~5 source files, not the ~17 the brief enumerated)
- **Risk:** Low (per master plan; brief bumped to Low-Medium for token mapping + Tailwind config interaction — those risks materially shrink post-recon since the Tailwind utility migration is already complete and only the setTimeout migration plus token extension remain)
- **Tier:** High (per brief Sections 2 and 14) — pure visual refactor but with non-trivial token-mapping decisions and visual-temporal parity expectations on emotional-peak animations (pulse, whisper)
- **Prerequisites:**
  - **5.3 (2-Line Heading Treatment) ✅** — verified in `_forums_master_plan/spec-tracker.md` row 75 on 2026-05-11
  - **BB-33 (Animation Tokens wave) ✅** — implicit prereq; 194 files migrated, including the prayer-wall Tailwind utility scope this spec's brief mistakenly believed still needed migration

---

## Recon Reality Overrides (2026-05-11)

**This section overrides the brief's Section 5 (Recon Ground Truth) wherever they disagree. The codebase wins on facts; Eric (via the brief) wins on direction. Token-name choices and design decisions in the brief survive; the underlying codebase state has moved on from the brief's snapshot.**

Pattern follows Spec 3.7 § Recon R1/R2/R3 — "Files already exist (do NOT recreate)" override pattern.

### R-OVR1 — `animation.ts` exports are `ANIMATION_DURATIONS` / `ANIMATION_EASINGS`, NOT `DURATION_MS` / `EASING`

**Brief's R1 was stale.** The actual exports at `frontend/src/constants/animation.ts` (verified 2026-05-11):

```typescript
/** Canonical animation duration tokens (ms). All standard UI animations must use these. */
export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
} as const

/** Canonical animation easing tokens. Match Material Design standard curves. */
export const ANIMATION_EASINGS = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const

export type AnimationDuration = keyof typeof ANIMATION_DURATIONS
export type AnimationEasing = keyof typeof ANIMATION_EASINGS
```

**Implications for this spec:**

- Every `DURATION_MS.*` reference in the brief becomes `ANIMATION_DURATIONS.*` in execution.
- Every `EASING.*` reference in the brief becomes `ANIMATION_EASINGS.*` in execution.
- The new token names Eric chose in brief D4 (`pulse: 300`, `ceremony: 600`) **survive** — only the parent constant name changes from `DURATION_MS` to `ANIMATION_DURATIONS`.
- Type exports `AnimationDuration` and `AnimationEasing` already exist; W17 (TypeScript drift) check still required because adding `pulse` and `ceremony` expands the union literal.

**Do NOT introduce a `DURATION_MS` alias.** That would create two parallel exports and reverse the BB-33 wave's discipline. If the planner sees the brief's `DURATION_MS` literal and reflexively adds it, that's a regression.

`09-design-system.md` § "Animation Tokens (BB-33 — canonical)" confirms `ANIMATION_DURATIONS` and `ANIMATION_EASINGS` are the canonical names — that doc is the project's source of truth.

### R-OVR2 — Tailwind utility migration in `components/prayer-wall/` is ALREADY COMPLETE

**Brief's R2 was an artifact of truncated grep results.** Verified 2026-05-11:

```bash
grep -rnE "duration-[0-9]+" frontend/src/components/prayer-wall/ --include="*.tsx" | grep -v __tests__
# → ZERO matches
```

All 14 `duration-*` utility occurrences in `components/prayer-wall/*.tsx` (excluding `__tests__/`) already use canonical token aliases:

| File | Line | Class fragment |
| ---- | ---- | -------------- |
| `CategoryBadge.tsx` | 18 | `transition-[colors,transform] duration-fast` |
| `CategoryFilterBar.tsx` | 72, 92, 115 | `transition-[colors,transform] duration-fast` (×3) |
| `CommentInput.tsx` | 55 | `transition-[colors,transform] duration-fast` |
| `CommentsSection.tsx` | 58 | `transition-all duration-base ease-standard` |
| `ComposerChooser.tsx` | 68 | `transition-[transform,opacity] duration-base ease-decelerate` |
| `ComposerChooser.tsx` | 116 | `transition-[transform,background-color,border-color,box-shadow] duration-fast ease-standard` |
| `InlineComposer.tsx` | 389 | `transition-all duration-base ease-standard motion-reduce:transition-none` |
| `InlineComposer.tsx` | 524 | `transition-colors duration-fast ease-standard` |
| `InteractionBar.tsx` | 49 | `transition-[colors,transform] duration-fast` |
| `QotdComposer.tsx` | 69 | `transition-all duration-base ease-standard motion-reduce:transition-none` |
| `RoomSelector.tsx` | 96 | `transition-[colors,transform] duration-fast` |
| `SaveToPrayersForm.tsx` | 60 | `transition-[grid-template-rows] motion-reduce:transition-none duration-base ease-standard` |
| `WaysToHelpPicker.tsx` | 64 | `transition-colors duration-fast ease-standard` |

This migration was completed under the BB-33 wave (194 files migrated; CLAUDE.md and `09-design-system.md` § "Animation Tokens" document this). Prayer Wall components were part of that wave.

**Implications for this spec:**

- Brief's "files to modify" list of 12 Tailwind utility migrations is **already satisfied**. Do NOT touch those 12 files for Tailwind utility changes.
- Brief's AC #11 ("Grep returns ZERO matches for `duration-\d`") is **already satisfied** — verify by re-running the grep, then mark as satisfied by prior BB-33 wave.
- D1's "round Tailwind utilities" mapping table is moot for execution but stays as design-intent documentation.
- The actual remaining migration surface is the hardcoded `setTimeout` values, not the Tailwind utilities.

### R-OVR3 — `tailwind.config.js` ALREADY has `transitionDuration` token aliases

**Brief's R6 was unverified.** Verified 2026-05-11 at `frontend/tailwind.config.js` lines 50–55:

```javascript
transitionDuration: {
  instant: '0ms',
  fast: '150ms',
  base: '250ms',
  slow: '400ms',
},
transitionTimingFunction: {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
},
```

- File extension is `.js` (NOT `.ts`). R8's "TS import support" concern doesn't apply.
- The four canonical duration tokens (`instant/fast/base/slow`) are already aliased and match `ANIMATION_DURATIONS` 1:1 in value.
- The four canonical easing tokens are already aliased and match `ANIMATION_EASINGS` 1:1.
- Values are HARDCODED as strings (`'150ms'`, not `${ANIMATION_DURATIONS.fast}ms`). This is acceptable drift from the brief's D2 ideal of "import-driven" config — the config is plain CommonJS `.js`, and importing TS sources from a JS config is awkward and unnecessary given the values are stable.

**Implications for this spec:**

- D2's "extend tailwind.config with alias entries" scope shrinks to ONLY adding the two new tokens (`pulse: '300ms'`, `ceremony: '600ms'`) to the existing `transitionDuration` block.
- The brief's "TS-import-from-config" fallback discussion (R8 / D2 footnote) is moot — config is JS, hardcode the values, document the parity invariant in a comment.
- The four existing entries (`instant/fast/base/slow`) are NOT touched. AC #11's "build succeeds" check still applies after the two-line addition.

### R-OVR4 — `ComposerChooser.test.tsx:165` already asserts `'duration-base'` (not `'duration-300'`)

**Brief's R9 was stale.** Verified 2026-05-11 at line 165:

```typescript
expect(dialog.className).toContain('duration-base')
```

**Implications for this spec:**

- D6's exception case (test assertion update) is **not needed**. The assertion was updated as part of the BB-33 wave.
- AC #14 ("ComposerChooser assertion updates to match new Tailwind class form") is **already satisfied**.
- W6 (don't migrate test files' raw timing values in `vi.advanceTimersByTime`) still applies — that part of the brief is correct.

### R-OVR5 — Animation-coupled setTimeout values that REMAIN hardcoded

Brief's R3 enumerated 5 candidate sites; recon confirms 2 with visible literal values and 3 closing-transition dialogs whose exact values need plan-time read.

| File | Line | Source value | Animation-coupled? | In scope per W7 / D3 |
| ---- | ---- | ----------- | ------------------ | -------------------- |
| `PrayerCard.tsx` | 64 | `300` (literal `}, 300)`) | YES — paired with `motion-safe:animate-card-pulse` class removal | YES |
| `InteractionBar.tsx` | 92 | `600` (literal `}, 600)`) | YES — paired with `triggerPulse?.()` + `playSoundEffect('whisper')` coordination | YES |
| `DeletePrayerDialog.tsx` | 24 | `[VERIFY at plan time]` — `closeTimeoutRef.current = setTimeout(() => { setIsClosing(false); setIsOpen(false); ... }, ?)` | Closing transition (post-`setIsClosing(true)`) | YES |
| `AuthModal.tsx` | 89 | `[VERIFY at plan time]` — same closing-transition shape | Closing transition | YES |
| `ReportDialog.tsx` | 60 | `[VERIFY at plan time]` — same closing-transition shape | Closing transition (close button path) | YES |
| `ReportDialog.tsx` | 101 | `[VERIFY at plan time]` — submit auto-close, value gated by `setSubmitted(true)` | UI lifecycle (post-submit feedback) | NO (W7) |
| `ShareDropdown.tsx` | 125 | `COPY_RESET_DELAY` constant (already named — not a hardcoded literal) | UI lifecycle (post-copy feedback) | NO (W7 — already named, no migration needed) |
| `ScriptureReferenceInput.tsx` | 68 | `[VERIFY at plan time]` — debounce timer for scripture lookup | Debounce, NOT animation | NO (W8) |

**Plan-time recon must read the exact values in the 3 closing-transition dialogs before the planner can resolve the token mapping for D1 row "Closing-transition setTimeouts."** The plan recon also confirms the categorization of ReportDialog:101 and ScriptureReferenceInput:68 (UI lifecycle / debounce respectively) by reading surrounding context.

`ShareDropdown.tsx:125`'s `COPY_RESET_DELAY` constant is a named UI-feedback duration; it stays as-is (already satisfies the "no magic numbers" intent even though it's not in `ANIMATION_DURATIONS`).

### R-RESCOPE — Re-scope from M to S

Given R-OVR2 and R-OVR3, the actual remaining work is:

- **2 token-extension edits** (`animation.ts` + `tailwind.config.js`)
- **2 setTimeout migrations with confirmed values** (`PrayerCard.tsx`, `InteractionBar.tsx`)
- **3 setTimeout migrations pending plan-time value read** (`DeletePrayerDialog.tsx`, `AuthModal.tsx`, `ReportDialog.tsx:60`)
- **Optional test addition or update** to `animation.test.ts` for the two new tokens

That's 5 source files and 1 test file — not 17. The risk envelope (Tailwind config edit, `motion-safe:` variant break, broad visual regression sweep) shrinks proportionally. Size moves from M (brief) to S; risk stays Low.

**Tier stays High** because (a) animation-coupled timing preservation is still load-bearing on the two confirmed sites (W5), (b) the closing-transition dialog values still need a judgment call about whether to round to existing tokens (`base`/`slow`) or use the new `pulse` token (D1 trade-off), (c) `prefers-reduced-motion` preservation (W4) still has to be verified post-token addition, and (d) Lighthouse 90+ verification on 4 routes is still in scope.

---

## Goal

Replace hardcoded animation-coupled `setTimeout` durations in Prayer Wall components with named token imports from `frontend/src/constants/animation.ts`. Extend `ANIMATION_DURATIONS` with two new tokens (`pulse: 300`, `ceremony: 600`) that match exact CSS animation / sound effect timing. Extend `tailwind.config.js` `transitionDuration` map with matching aliases so future `duration-pulse` / `duration-ceremony` utility classes resolve correctly.

**Out of scope (per Recon Reality Overrides):** Tailwind utility migration across 12 files (already shipped under BB-33). Test assertion update at `ComposerChooser.test.tsx:165` (already done). Tailwind config alias creation for `fast/base/slow` (already shipped). UI-lifecycle setTimeout tokenization (W7). Debounce timer tokenization (W8). EASING token modifications (D5).

5.4 is a pure-frontend refactor: no backend changes, no schema changes, no API changes, no new dependencies, no public-API changes to any component.

---

## Approach

### Step 1 — Extend `frontend/src/constants/animation.ts` (D4)

Add two new keys to `ANIMATION_DURATIONS`:

```typescript
export const ANIMATION_DURATIONS = {
  instant: 0,
  fast: 150,
  base: 250,
  slow: 400,
  pulse: 300,    // new — PrayerCard pulse animation cleanup (must match CSS pulse keyframe exactly)
  ceremony: 600, // new — InteractionBar whisper-pulse coordination (paired with sound effect timing)
} as const
```

The `AnimationDuration` type export updates implicitly (it derives from `keyof typeof ANIMATION_DURATIONS`).

**Naming rationale (Eric's design call, preserved verbatim from brief D4):**

- `pulse` names the specific UI behavior (PrayerCard pulse on count tick).
- `ceremony` names a longer ritual-feeling timing for the whisper interaction. Avoids overt religious framing per Worship Room's brand voice discipline.

**EASING block UNCHANGED** per D5 / W9. No new easing tokens. No removal of existing easing tokens.

### Step 2 — Extend `frontend/tailwind.config.js` `transitionDuration` (D2)

Add two new entries to the existing `transitionDuration` block (lines 50–55):

```javascript
transitionDuration: {
  instant: '0ms',
  fast: '150ms',
  base: '250ms',
  slow: '400ms',
  pulse: '300ms',    // new — matches ANIMATION_DURATIONS.pulse in constants/animation.ts
  ceremony: '600ms', // new — matches ANIMATION_DURATIONS.ceremony in constants/animation.ts
},
```

A short comment alongside the new entries documents the parity invariant with `constants/animation.ts`. Values are hardcoded (NOT imported from TS) — same convention as the existing four entries; the config file is plain CommonJS `.js`.

The `transitionTimingFunction` block UNCHANGED per D5 / W9.

`motion-safe:` / `motion-reduce:` variant configuration is NOT in this block — those are Tailwind's built-in variants and are unaffected by `transitionDuration` extensions. W4 verification at the end confirms the variants still work.

### Step 3 — Migrate animation-coupled setTimeouts (D3)

For each in-scope site, replace the literal ms with the imported token. The pattern:

```typescript
// before
import { /* existing imports */ } from '...'

setTimeout(() => { /* cleanup */ }, 300)

// after
import { ANIMATION_DURATIONS } from '@/constants/animation'
import { /* existing imports */ } from '...'

setTimeout(() => { /* cleanup */ }, ANIMATION_DURATIONS.pulse)
```

**Site-by-site migration (confirmed values):**

- **`frontend/src/components/prayer-wall/PrayerCard.tsx:64`** — `300` → `ANIMATION_DURATIONS.pulse`. The literal is at the close of `setTimeout(() => { el.classList.remove('motion-safe:animate-card-pulse') }, 300)`. The 300ms must match the CSS pulse keyframe duration exactly — `pulse: 300` was chosen for this constraint.

- **`frontend/src/components/prayer-wall/InteractionBar.tsx:92`** — `600` → `ANIMATION_DURATIONS.ceremony`. The literal is at the close of `setTimeout(() => { setIsAnimating(false) }, 600)` which paces the whisper-pulse animation alongside the sound effect.

**Site-by-site migration (values pending plan-time read):**

- **`frontend/src/components/prayer-wall/DeletePrayerDialog.tsx:24`** — closing-transition setTimeout. Plan recon reads the exact value, then maps per D1:
  - If `200` → `ANIMATION_DURATIONS.base` (rounding +50ms; imperceptible for dialog closing fade)
  - If `300` → `ANIMATION_DURATIONS.pulse` (exact preservation — preferred over rounding to `slow` because exact CSS-transition pairing matters)
  - If something else → planner consults Eric before executing

- **`frontend/src/components/prayer-wall/AuthModal.tsx:89`** — same shape, same mapping logic.

- **`frontend/src/components/prayer-wall/ReportDialog.tsx:60`** — same shape, same mapping logic. Note this is the CLOSE-button path; line 101 is the SUBMIT path and stays raw per W7.

Each closing-transition file imports `ANIMATION_DURATIONS` once at the top of the file and uses the chosen token at the setTimeout call site.

### Step 4 — Tests (Section 9 of brief)

Update `frontend/src/constants/__tests__/animation.test.ts`:

- The existing assertion `expect(Object.keys(ANIMATION_DURATIONS)).toHaveLength(4)` must update to `6` after the two new tokens land.
- The existing assertion `expect(Object.keys(ANIMATION_DURATIONS).sort()).toEqual(['base', 'fast', 'instant', 'slow'])` must update to include `pulse` and `ceremony` in the sorted list.
- Add new assertions: `expect(ANIMATION_DURATIONS.pulse).toBe(300)` and `expect(ANIMATION_DURATIONS.ceremony).toBe(600)`.
- Existing assertion `expect(value).toBeLessThanOrEqual(400)` (the "no duration exceeds 400ms" check) must update — `ceremony: 600` will fail this. Either raise the cap to 600 with a comment explaining the ceremony token's purpose, or remove the cap check (preferred — it's a loose constraint that doesn't carry domain meaning).
- EASING test assertions UNCHANGED (D5).

Component tests for the 5 affected files (PrayerCard, InteractionBar, DeletePrayerDialog, AuthModal, ReportDialog) should pass without modification because the migration changes the literal value passed to setTimeout, NOT the timing semantics observed by tests. Test files use `vi.advanceTimersByTime(N)` with raw numbers describing test-wall-clock progression — those stay as raw numbers per W6.

### Step 5 — Manual verification (Gates 20, 21)

Per brief Section 3, Section 16:

1. PrayerCard pulse animation completes cleanly on prayer count tick (W5 — exact 300ms must be preserved).
2. InteractionBar whisper interaction: pulse class removal coordinates with sound effect playback completion (W5 — exact 600ms must be preserved).
3. Three dialog close transitions (Auth, Report, Delete) feel smooth without cut-off or lingering.
4. `prefers-reduced-motion: reduce` (DevTools → Rendering tab → Emulate CSS prefers-reduced-motion) → PrayerCard pulse animation is suppressed (W4 / Gate 20). The global safety net in `frontend/src/styles/animations.css` should handle this without per-component changes.
5. Lighthouse Performance ≥ 90 on `/prayer-wall`, `/prayer-wall/dashboard`, `/prayer-wall/user/[id]`, `/prayer-wall/[id]` (Gate 21 / AC #4).

### Step 6 — Tracker flip (operational)

After all of the above ship and Eric completes manual visual review + Lighthouse pass, Eric (not CC) flips spec-tracker row 76 from ⬜ to ✅. CC does not edit `_forums_master_plan/spec-tracker.md` in this spec — that's part of the Eric-handles-git discipline.

---

## Files to Create / Modify / NOT to Modify / Delete

### Files to Create

(none)

### Files to Modify

**Constants:**

- `frontend/src/constants/animation.ts` — add `pulse: 300` and `ceremony: 600` to `ANIMATION_DURATIONS` (D4 with corrected name per R-OVR1)

**Tailwind config:**

- `frontend/tailwind.config.js` — add `pulse: '300ms'` and `ceremony: '600ms'` to existing `transitionDuration` map (D2 with corrected scope per R-OVR3 — the `fast/base/slow/instant` entries already exist and are NOT touched)

**Prayer Wall components — setTimeout migration (5 files):**

- `frontend/src/components/prayer-wall/PrayerCard.tsx` — line 64, `300` → `ANIMATION_DURATIONS.pulse`; add named import at top of file
- `frontend/src/components/prayer-wall/InteractionBar.tsx` — line 92, `600` → `ANIMATION_DURATIONS.ceremony`; add named import at top of file
- `frontend/src/components/prayer-wall/DeletePrayerDialog.tsx` — line 24, hardcoded ms → resolved token per D1 (value pending plan-time read); add named import
- `frontend/src/components/prayer-wall/AuthModal.tsx` — line 89, hardcoded ms → resolved token per D1; add named import
- `frontend/src/components/prayer-wall/ReportDialog.tsx` — line 60, hardcoded ms → resolved token per D1; add named import. Line 101 (submit auto-close) UNCHANGED per W7.

**Tests:**

- `frontend/src/constants/__tests__/animation.test.ts` — update length assertion (4→6), update keys-sorted-list assertion, add two new `toBe(300)` / `toBe(600)` assertions, relax or remove the "no duration exceeds 400ms" loose-bound check (which `ceremony: 600` would fail). EASING tests UNCHANGED.

### Files NOT to Modify

Documented intentional non-modifications. Per brief Section 10:

**Already-satisfied scope (R-OVR2 / R-OVR4):**

- All 12 component files listed in brief Section 10's "Tailwind utility migration" subsection — already done by BB-33 wave; their `duration-fast` / `duration-base` usage stays as-is
- `frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx` line 164–165 assertion — already says `'duration-base'`; do NOT change

**Out-of-scope animation surfaces (W6 / W7 / W8 / W9 / W18):**

- `frontend/src/components/prayer-wall/ShareDropdown.tsx` line 125 — uses `COPY_RESET_DELAY` constant (UI feedback, already named, W7)
- `frontend/src/components/prayer-wall/ReportDialog.tsx` line 101 — submit auto-close (UI feedback, W7)
- `frontend/src/components/prayer-wall/ScriptureReferenceInput.tsx` line 68 — scripture lookup debounce (NOT animation, W8)
- All `__tests__/*.tsx` `vi.advanceTimersByTime(N)` calls — stay as raw numbers (W6)
- `frontend/src/components/prayer-wall/PrayerCard.tsx` line 60 `el.classList.add('motion-safe:animate-card-pulse')` — `motion-safe:` variant is load-bearing for `prefers-reduced-motion` (W4); do NOT change
- `frontend/src/components/prayer-wall/ComposerChooser.tsx` line 36 code comment about `0.01ms` reduced-motion technique — CSS-level, not migration target (W18)

**Out-of-scope token surfaces (D5 / W9):**

- `frontend/src/constants/animation.ts` `ANIMATION_EASINGS` block — UNCHANGED (D5)
- All existing `ANIMATION_DURATIONS` entries (`instant/fast/base/slow`) — values UNCHANGED (D5 / W14)
- `frontend/tailwind.config.js` `transitionTimingFunction` block — UNCHANGED (D5)
- `frontend/tailwind.config.js` existing `transitionDuration` entries (`instant/fast/base/slow`) — UNCHANGED

**Out-of-scope files (W10):**

- Pages files: `frontend/src/pages/PrayerWall.tsx`, `PrayerWallDashboard.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx` — out of scope; if any contain hardcoded ms, file follow-up for 5.5 (W10 / W19)
- Other component directories outside `prayer-wall/` — out of scope
- Other consumers of `ANIMATION_DURATIONS` / `ANIMATION_EASINGS` across the codebase (e.g., `frontend/src/components/bible/reader/ReaderBody.tsx`) — UNCHANGED (R10); the additive token extension does not require any existing consumer to be touched

**Out-of-scope architectural surfaces (W11 / W13 / W14 / W15):**

- TypeScript imports in `tailwind.config.js` — config stays as plain JS with hardcoded values (R-OVR3 supersedes brief R8 / D2 fallback discussion)
- `package.json` — no new dependencies (W13)
- `frontend/src/constants/animation.ts` location or constant names — UNCHANGED (W14; only key-level additions)
- Component public APIs (props) — UNCHANGED (W15)
- Backend files — pure-frontend spec

### Files to Delete

(none)

---

## API changes

(none — pure-frontend spec)

---

## Database changes

(none — pure-frontend spec; no Liquibase changesets)

---

## Copy Deck

(no new copy — 5.4 is a pure refactor; brief Section 13 confirms no brand voice surface other than token naming, which `pulse` and `ceremony` satisfy)

---

## Anti-Pressure Copy Checklist

N/A — no user-facing strings added or modified.

---

## Anti-Pressure Design Decisions

N/A — visual-temporal parity is the design goal; pulse / whisper / dialog transitions remain at their current emotional pace.

---

## Acceptance Criteria

### Token extension (animation.ts)

- [ ] `ANIMATION_DURATIONS` exports include `pulse: 300` and `ceremony: 600` in addition to the existing four tokens (corrected name per R-OVR1 — NOT `DURATION_MS`)
- [ ] `instant: 0`, `fast: 150`, `base: 250`, `slow: 400` unchanged
- [ ] `ANIMATION_EASINGS` unchanged (D5)
- [ ] `AnimationDuration` type export remains derived from `keyof typeof ANIMATION_DURATIONS` (no manual literal-union edit; the type expands automatically)
- [ ] No TypeScript errors anywhere in `frontend/src/` after the addition (W17)

### Tailwind config

- [ ] `frontend/tailwind.config.js` `transitionDuration` block contains 6 entries: `instant/fast/base/slow/pulse/ceremony` (R-OVR3 — does NOT recreate the existing four)
- [ ] `pulse: '300ms'` and `ceremony: '600ms'` values match `ANIMATION_DURATIONS.pulse` and `.ceremony` exactly (parity invariant — comment in config documents this)
- [ ] `transitionTimingFunction` block unchanged (D5)
- [ ] `pnpm build` succeeds with no warnings or errors related to Tailwind config or theme extension
- [ ] `motion-safe:` and `motion-reduce:` Tailwind variants still produce the expected utility classes in build output (W4 / Gate 20)

### Animation-coupled setTimeout migration

- [ ] `PrayerCard.tsx:64` uses `ANIMATION_DURATIONS.pulse` (300ms) — exact preservation, matches CSS pulse keyframe (W2 / W5)
- [ ] `InteractionBar.tsx:92` uses `ANIMATION_DURATIONS.ceremony` (600ms) — exact preservation, coordinates with sound effect timing (W2 / W5)
- [ ] `DeletePrayerDialog.tsx:24` uses a named token resolved by plan recon per D1 (`base`, `pulse`, or other per closing-transition value)
- [ ] `AuthModal.tsx:89` uses a named token resolved by plan recon per D1
- [ ] `ReportDialog.tsx:60` uses a named token resolved by plan recon per D1
- [ ] All 5 files have a single `import { ANIMATION_DURATIONS } from '@/constants/animation'` at the top; no inline literals at the setTimeout call sites

### UI lifecycle setTimeout preservation (W7 / W8)

- [ ] `ShareDropdown.tsx:125` UNCHANGED — `COPY_RESET_DELAY` constant remains as-is (W7)
- [ ] `ReportDialog.tsx:101` UNCHANGED — submit auto-close stays as raw value (W7)
- [ ] `ScriptureReferenceInput.tsx:68` UNCHANGED — debounce timer stays as raw value (W8)

### Visual parity (W5 / Gate 18)

- [ ] Manual visual review by Eric: PrayerCard pulse animation completes cleanly without cut-off or lingering on prayer count tick
- [ ] Manual visual review: InteractionBar whisper interaction — pulse class removal coordinates with sound effect playback completion
- [ ] Manual visual review: DeletePrayerDialog, AuthModal, ReportDialog open and close transitions feel temporally identical to pre-migration
- [ ] Manual visual review: pill hover state transitions, composer reveal/collapse, comment section expansion — all unchanged (these are governed by the already-shipped Tailwind utility migration; verification is for absence of regressions)

### Accessibility (W4 / Gate 20)

- [ ] DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce → PrayerCard pulse animation is suppressed (`motion-safe:` variant disables it)
- [ ] DevTools → Emulate prefers-reduced-motion: no-preference → PrayerCard pulse animation is enabled
- [ ] Global `prefers-reduced-motion` rule in `frontend/src/styles/animations.css` is unchanged
- [ ] Universal Rule 17 axe-core tests still pass (no regressions; addendum gate 17 from 4.8 applies indirectly)

### Performance (W12 / Gate 21)

- [ ] Lighthouse Performance ≥ 90 on `/prayer-wall`
- [ ] Lighthouse Performance ≥ 90 on `/prayer-wall/dashboard`
- [ ] Lighthouse Performance ≥ 90 on `/prayer-wall/user/[some-test-user-id]`
- [ ] Lighthouse Performance ≥ 90 on `/prayer-wall/[some-test-prayer-id]`
- [ ] CLS and INP metrics unchanged or improved (animation token addition adds no JS execution, no CSS bloat beyond two map entries)

### Hardcoded values check

- [ ] No `cubic-bezier(` in `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) — already satisfied per brief R4, verified to remain so post-migration
- [ ] No `transition-duration:` CSS-in-JS string literals in `frontend/src/components/prayer-wall/`
- [ ] No `animation-duration:` CSS-in-JS string literals in `frontend/src/components/prayer-wall/`
- [ ] Grep `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) for `setTimeout\(.+, [0-9]+\)` returns ONLY UI-lifecycle / debounce matches (per W7 / W8); all animation-coupled setTimeouts use `ANIMATION_DURATIONS.*`

### Tailwind utility migration (already-satisfied — verification only)

- [ ] Grep `frontend/src/components/prayer-wall/*.tsx` (excluding `__tests__/`) for `duration-[0-9]+` returns ZERO matches — already satisfied per BB-33 wave (R-OVR2); re-verify and mark satisfied without re-doing migration work

### Tests

- [ ] `frontend/src/constants/__tests__/animation.test.ts` length assertion updated to `6` (was 4)
- [ ] `animation.test.ts` keys-sorted-list assertion includes `pulse` and `ceremony` (lexicographic position: between `instant` and `slow`)
- [ ] `animation.test.ts` adds `expect(ANIMATION_DURATIONS.pulse).toBe(300)` and `expect(ANIMATION_DURATIONS.ceremony).toBe(600)`
- [ ] `animation.test.ts` "no duration exceeds 400ms" loose-bound check is removed OR raised to 600ms with a comment (preferred: remove — it was a loose constraint without domain meaning)
- [ ] `animation.test.ts` EASING assertions unchanged
- [ ] No changes to test files in `frontend/src/components/prayer-wall/__tests__/` (W6 — `vi.advanceTimersByTime(N)` calls stay as raw numbers; `ComposerChooser.test.tsx:165` already asserts `'duration-base'` per R-OVR4)
- [ ] Full frontend test suite passes: `pnpm test` from `frontend/`. Post-Spec-13 baseline is 9,830 pass / 1 known fail (`Pray.test.tsx — shows loading then prayer after generating`); 5.4 must not introduce new failures (any NEW failing file or any increase in fail count is a regression)

### No regressions

- [ ] No TypeScript errors: `pnpm build` succeeds
- [ ] No new ESLint violations: `pnpm lint` succeeds (or shows no new violations vs. pre-5.4 baseline)
- [ ] No new dependencies introduced (W13)
- [ ] Bundle size unchanged or trivially different (token extension adds ~30 bytes of source; gzipped bundle delta should be 0 or negligible)
- [ ] BB-33 compliance reference satisfied — `09-design-system.md` § "Animation Tokens" rules continue to hold (R-OVR1's note about `ANIMATION_DURATIONS` being the canonical name is preserved; the `09-design-system.md` text remains accurate)

### Out-of-scope verification

- [ ] Test files NOT migrated (W6)
- [ ] UI lifecycle setTimeouts NOT tokenized (W7)
- [ ] Debounce setTimeouts NOT tokenized (W8)
- [ ] `ANIMATION_EASINGS` NOT modified (D5 / W9)
- [ ] Pages files NOT touched (W10)
- [ ] Other component directories NOT touched
- [ ] `0.01ms` reduced-motion technique reference NOT changed (W18)
- [ ] No new component props for animation timing (W15)
- [ ] `animation.ts` location and exported constant names NOT changed (W14; only key-level additions to `ANIMATION_DURATIONS`)

### Operational

- [ ] Eric (not CC) flips `_forums_master_plan/spec-tracker.md` row 76 from ⬜ to ✅ AFTER manual visual review + Lighthouse passes + merge
- [ ] CC does NOT edit `spec-tracker.md` as part of 5.4 work
- [ ] CC does NOT run any git mutations (branch directive — stay on `forums-wave-continued`)

---

## Testing notes

Total test budget: ~3–5 changes (per brief Section 9; tightened post-recon since the `ComposerChooser` assertion update is already done and the test infrastructure already exists).

**Changes to `animation.test.ts`** (the single test file modified):

1. Update length assertion from `4` to `6` (key count)
2. Update sorted-keys assertion to include `pulse` and `ceremony`
3. Add new `toBe(300)` for `pulse`
4. Add new `toBe(600)` for `ceremony`
5. Remove or raise the "≤ 400ms" loose-bound check

**No new test files.** No new test infrastructure.

**Component tests** (PrayerCard, InteractionBar, DeletePrayerDialog, AuthModal, ReportDialog) require no changes per W6 / R-OVR4 — they exercise behavior, not specific literal values. `vi.advanceTimersByTime(N)` calls in those tests describe test wall-clock progression and use raw numbers that correspond to the post-migration token values (300, 600, etc.) so they continue to work without changes.

**Manual verification** (no test code, per brief Section 9):

- `prefers-reduced-motion` toggle in DevTools → pulse disabled / enabled per OS-level preference (Gate 20)
- Lighthouse Performance 90+ on 4 Prayer Wall routes (Gate 21)
- Visual feel review by Eric — pulse, whisper, dialog transitions, hover states, composer reveal

**Drift detection / Universal Rule 12 check:** The two new tokens (`pulse`, `ceremony`) live in BOTH `constants/animation.ts` and `tailwind.config.js`. If they drift (someone edits one but not the other), the BB-33 source-of-truth invariant breaks. Recommend a follow-up check in 5.5's deprecated-pattern purge or a future audit to grep both files for the canonical names — out of scope for 5.4 itself.

---

## Notes for plan phase recon

The planner running `/plan-forums` MUST:

1. **Re-verify the Recon Reality Overrides** above by re-running:
   - `cat frontend/src/constants/animation.ts` (confirm names `ANIMATION_DURATIONS` / `ANIMATION_EASINGS`)
   - `grep -rnE "duration-[0-9]+" frontend/src/components/prayer-wall/ --include="*.tsx" | grep -v __tests__` (confirm zero matches)
   - `grep -nE "transitionDuration" frontend/tailwind.config.js` (confirm existing block at lines ~50–55)
   - `grep -nE "duration-base|duration-300" frontend/src/components/prayer-wall/__tests__/ComposerChooser.test.tsx` (confirm `duration-base` already in test, no `duration-300`)

2. **Read the exact ms values in the 3 closing-transition dialogs** (R-OVR5):
   - `DeletePrayerDialog.tsx:24` — read the full setTimeout statement including the closing `, N)` argument
   - `AuthModal.tsx:89` — same
   - `ReportDialog.tsx:60` — same (distinct from line 101's submit auto-close)

3. **Decide token mapping for closing-transition dialogs per D1:**
   - If the value is 200ms — map to `ANIMATION_DURATIONS.base` (rounding +50ms; imperceptible)
   - If the value is 300ms — map to `ANIMATION_DURATIONS.pulse` (exact preservation; preferred over `slow` which is 400ms and would lose 100ms feel)
   - If the value is something else — surface to Eric before execution; do NOT silently invent a new token

4. **Confirm out-of-scope categorizations** by reading surrounding context:
   - `ReportDialog.tsx:101` — verify the setTimeout fires after `setSubmitted(true)` and is gated by submit success (UI lifecycle, NOT animation-coupled). Stays out of scope per W7.
   - `ScriptureReferenceInput.tsx:68` — verify the setTimeout is the debounce body for scripture lookup, NOT paired with any CSS animation. Stays out of scope per W8.
   - `ShareDropdown.tsx:125` — uses `COPY_RESET_DELAY` constant which is already a named UI-feedback duration. No migration needed; W7 satisfied by existing constant.

5. **Confirm no token-name collision with existing consumers** (R10):
   - `grep -rnE "ANIMATION_DURATIONS\.(pulse|ceremony)" frontend/src/` — expect zero matches before this spec ships. If any matches exist, surface to Eric (would indicate Bayesian conflict with another in-progress spec).

6. **Read the full `animation.test.ts` file** to confirm the exact assertion strings before drafting the test update. The "no duration exceeds 400ms" check is at line ~30 in the read excerpt above; verify its current shape before deciding whether to remove or raise.

7. **Confirm `09-design-system.md` § "Animation Tokens (BB-33 — canonical)"** — the planner should NOT propose updates to this doc as part of 5.4. The doc's Source of Truth note ("If this table and either of those code locations disagree, the code wins — update the table and grep the rest of the docs") creates a potential follow-up if the docs need updating after `pulse` and `ceremony` ship, but that update is out of scope for the executor and should be filed as a separate doc-update spec or appended to 5.5 if natural.

---

## Out of Scope

Explicit deferrals — do NOT include any of these in 5.4. Brief Section 12 is the canonical list; reproduced and slightly expanded post-recon:

- **Tailwind `duration-*` utility migration** in `components/prayer-wall/` — already shipped under BB-33 (R-OVR2). Re-running this work is a regression, not a deliverable.
- **Tailwind config alias creation for `instant/fast/base/slow`** — already shipped (R-OVR3). Only `pulse` and `ceremony` are added in 5.4.
- **ComposerChooser test assertion update** at line 164–165 — already says `'duration-base'` (R-OVR4).
- **UI lifecycle setTimeout tokenization** (W7): copy-success duration in ShareDropdown, submit auto-close in ReportDialog line 101. These are per-surface UX feedback decisions, not animation timing.
- **Debounce timer tokenization** (W8): ScriptureReferenceInput line 68. This is input debounce, not animation.
- **EASING token modifications** (D5 / W9): `ANIMATION_EASINGS` block stays as-is. Tailwind `transitionTimingFunction` block stays as-is. No new easing tokens. No removal.
- **`cubic-bezier(` migration**: already 0 matches in `components/prayer-wall/*.tsx` (R4); no work needed.
- **Test file migration** (W6): all `vi.advanceTimersByTime(N)` calls in `__tests__/*.tsx` stay as raw numbers.
- **Pages-level animation migration** (`PrayerWall.tsx`, `PrayerWallDashboard.tsx`, `PrayerDetail.tsx`, `PrayerWallProfile.tsx`) (W10): master plan body scopes to `components/prayer-wall/` only. If pages have hardcoded ms, file follow-up for 5.5 or a future spec.
- **Inline frosted pattern at `PrayerWallDashboard.tsx:722`** (W19): defer to 5.5 deprecated-pattern purge.
- **New component props for animation timing** (W15): timing comes from canonical tokens, not per-instance configuration.
- **Visual regression test infrastructure** (D8): 5.4 inherits the manual-visual-review approach from 5.1 / 5.3. No screenshot baselines.
- **`animation.ts` relocation or constant rename** (W14): location at `frontend/src/constants/animation.ts` and names `ANIMATION_DURATIONS` / `ANIMATION_EASINGS` are canonical. Only key-level additions in 5.4.
- **`instant` token usage** (W20): no current 0ms candidates in prayer-wall.
- **`0.01ms` reduced-motion technique changes** (W18): CSS-level pattern, not migration target.
- **Token consumers outside Prayer Wall** (R10): `frontend/src/components/bible/reader/ReaderBody.tsx` and similar consumers of `ANIMATION_DURATIONS` / `ANIMATION_EASINGS` are unchanged. The additive token extension does not require any existing consumer to be touched.
- **Lighthouse improvements beyond preserving 90+** (Gate 21): parity is the goal, not optimization.
- **Adding more easing curves** (D5).
- **Switching from Tailwind to a different styling system** — architectural, not 5.4.
- **Animation library introduction** (Framer Motion, etc.) — out of scope.
- **CSS variable migration** — D2 prefers Tailwind config aliases (already in place); CSS variables not introduced.
- **Importing TS sources into `tailwind.config.js`** — config is plain CommonJS `.js` with hardcoded values per R-OVR3; brief's R8 fallback discussion is moot.
- **Updating `09-design-system.md` § "Animation Tokens"** — the doc text is currently accurate; if a future doc-update spec adds `pulse` and `ceremony` to the canonical duration tokens table, that's a separate spec, NOT 5.4 work.
- **Editing `_forums_master_plan/spec-tracker.md`** — Eric handles tracker flips manually after merge + visual review (per branch directive in brief Section 1).

---

## Out-of-band notes for Eric

This section captures the executor-facing reminders Eric typically wants surfaced at plan / execute time.

1. **Token name correction is the #1 trap.** Brief uses `DURATION_MS` and `EASING` throughout (D2, D4, code samples, AC items, watch-fors). Actual exports are `ANIMATION_DURATIONS` and `ANIMATION_EASINGS`. Every code-level reference in the brief must translate to the actual names at execution time. The planner running `/plan-forums` should flag this prominently in the plan; the executor running `/execute-plan-forums` should never type `DURATION_MS` even once. If the executor accidentally introduces a `DURATION_MS` alias to bridge the brief and reality, that's a regression — reject and re-issue.

2. **Recon overrides are NOT brief invalidation.** The brief's design decisions (D1 hybrid mapping, D2 Tailwind alias approach, D3 animation-coupled vs UI lifecycle, D4 token names, D5 EASING untouched, D6 test files not migrated) all survive recon. Only the brief's recon ground truth (R1, R2, R6, R8, R9) is stale. The brief is correct in spirit and in design intent; reality has just moved forward on the migration mechanics.

3. **Tier stays High** despite size shrinking from M to S. Reasons:
   - Animation-coupled exact-timing preservation on PrayerCard pulse (300ms) and InteractionBar whisper (600ms) is load-bearing (W5). Standard tier rounds these and ships visual regression.
   - Closing-transition dialog values (pending plan-time read) need a judgment call between rounding to `base` or using new `pulse` token (D1).
   - `prefers-reduced-motion` preservation is load-bearing (W4); easy to break via tailwind.config edits.
   - Lighthouse 90+ verification on 4 routes is still in scope.
   - Brief Section 14's "override moments to bump to MAX" still apply (e.g., if CC modifies test files' raw timing — reject).

4. **Branch discipline is strict.** Stay on `forums-wave-continued`. Eric handles all git operations. CC reads `git status` and `git log` for diagnostics only. No `git checkout`, `git commit`, `git push`, `glab mr create`, etc. If CC believes a git operation is needed, surface as a recommendation and STOP.

5. **Spec-tracker is hands-off for CC.** Row 76 stays ⬜ until Eric flips it after manual visual review + Lighthouse pass + merge. CC does not touch `_forums_master_plan/spec-tracker.md`.

6. **Plan recon's must-read list** (Section "Notes for plan phase recon" above):
   - Re-verify the four Recon Reality Overrides
   - Read the exact ms values in 3 closing-transition dialogs (DeletePrayerDialog:24, AuthModal:89, ReportDialog:60)
   - Map closing-transition values to tokens per D1
   - Confirm out-of-scope categorizations by reading context (ReportDialog:101, ScriptureReferenceInput:68, ShareDropdown:125)
   - Confirm no token-name collision via `grep -rnE "ANIMATION_DURATIONS\.(pulse|ceremony)" frontend/src/`
   - Read `animation.test.ts` in full to confirm exact assertion strings before drafting updates

7. **Phase 3 Execution Reality Addendum applicability:** 5.4 is pure-frontend visual refactor. NONE of the Phase 3 backend gates (items 1, 3, 4, 5, 6, 7, 9) apply. Gate 17 (axe-core from 4.8) applies indirectly — the migration must not introduce accessibility regressions. Gate 18 (visual parity from 5.1) applies as the primary deliverable. Gate 19 (brand voice from 5.3) is N/A (no new copy).

8. **Verification handoff** (brief Section 16): after `/code-review` passes, run `/verify-with-playwright _specs/forums/spec-5-4.md`. The verifier exercises Section 3's 12 visual scenarios (pulse, whisper, dialog transitions, hover states, reduced-motion, Lighthouse). Verifier writes to `_plans/forums/spec-5-4-verify-report.md`. If the verifier flags any of the canonical override moments (W2, W5, W7, W4, W6, W10, W13, W17, etc.), abort and bump to MAX.

---

## Master Plan Divergence Summary

For traceability — the brief's MPD-1 through MPD-6 reasoning is preserved (the brief's design call to scope AC #1 to animation contexts, reinterpret AC #3 as "single source of truth + two consumption paths," use hybrid token mapping, treat `transition-duration`/`animation-duration` as vestigial-clean, and treat BB-33 as a compliance reference) — but post-recon the master plan body and the brief BOTH overshoot the actual remaining work. The Recon Reality Overrides section (R-OVR1 through R-OVR5) is the binding interpretation.

| MPD | Brief reinterpretation | Post-recon status |
| --- | --- | --- |
| MPD-1 | Scope AC #1 to animation contexts only; UI lifecycle setTimeouts stay raw | Stands. W7 governs. |
| MPD-2 | "Import from animation.ts" means single source of truth via Tailwind config aliases | Stands, with R-OVR1 name correction. Aliases for `fast/base/slow` already exist; 5.4 adds `pulse/ceremony`. |
| MPD-3 | Token mapping doesn't exist for 200/300/600 — use hybrid approach | Stands. Critical for closing-transition dialog mapping (D1). |
| MPD-4 | `transition-duration` / `animation-duration` grep targets are vestigial — codebase uses Tailwind utilities | Stands. AC items mentioning these are satisfied by absence. |
| MPD-5 | BB-33 is an internal compliance label | **Verified.** `09-design-system.md` § "Animation Tokens (BB-33 — canonical)" is the canonical reference; `ANIMATION_DURATIONS` and `ANIMATION_EASINGS` are the exported names. |
| MPD-6 | Files to modify includes `animation.ts` and `tailwind.config.{ts,js}` (not just `components/prayer-wall/`) | Stands. `tailwind.config.js` extension (R-OVR3) is one of the two token-extension edits in scope. |

---

## See also

- Brief: `_plans/forums/spec-5-4-brief.md` (binding for design intent; recon claims R1/R2/R6/R9 superseded by this spec's Recon Reality Overrides)
- Master plan body: `_forums_master_plan/round3-master-plan.md` lines 4686–4706
- Phase 5 prereqs in tracker: row 73 (5.1 ✅), row 74 (5.2 ✅ via Spec 14), row 75 (5.3 ✅)
- BB-33 canonical docs: `.claude/rules/09-design-system.md` § "Animation Tokens" + § "Reduced-Motion Safety Net"
- Recon override pattern reference: Spec 3.7 R1/R2/R3 (`_specs/forums/spec-3-7.md`)
- Next spec: 5.5 (Deprecated Pattern Purge — remainder, partial-shipped via Spec 14 Step 7)

---

**End of spec.**
