# Implementation Plan: DailyHub Iteration — Make It Right

**Spec:** `_specs/dailyhub-iteration-make-it-right.md`
**Date:** 2026-05-01
**Branch:** forums-wave-continued (DO NOT create a new branch — user manages all git operations)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; ⚠️ stale for Daily Hub specifics: DailyHub 1A/1B/2 redesigns shipped 2026-05-01 after the recon was captured. For Button.tsx, FrostedCard.tsx, and the pull-quote pattern, source-of-truth is the shipped source files + `09-design-system.md`. The recon stays valid for hero-bg color and global tokens only.)
**Recon Report:** N/A — this is an iteration spec; the original DailyHub 1A/1B/2 specs are the recon
**Master Spec Plan:** N/A — iteration spec on top of three already-shipped specs (`_specs/dailyhub-1a-foundation-and-meditate.md`, `_specs/dailyhub-1b-pray-and-journal.md`, `_specs/dailyhub-2-devotional.md`)

---

## Affected Frontend Routes

- `/daily?tab=devotional` — primary surface for Changes 1, 2, 3, 4
- `/daily?tab=pray` — primary surface for Changes 5, 6, 7
- `/daily?tab=journal` — primary surface for Changes 10, 11, 12, 13
- `/bible/john/3` and any active-plan branch of `/bible` — regression surface for Change 8 (`ResumeReadingCard` uses gradient Button)
- `/dashboard` — regression surface for Change 9 (`CelebrationOverlay` uses ghost Button)
- `/prayer-wall` — regression surface for Change 9 (`InlineComposer` and `QotdComposer` use ghost Button on Cancel)
- `/grow/reading-plans` — listed in the spec as a possible RelatedPlanCallout consumer; reconnaissance shows ZERO consumers outside `DevotionalTabContent.tsx`. Verify-with-playwright will visit but no regression is expected.
- `/health` — Health page Back-to-home ghost Button regression (Change 9)
- (Cancel ghost buttons in modals — `SaveToPrayerListForm.tsx`, also Change 9)

---

## Architecture Context

**File patterns and conventions:**

- Daily Hub tab content components (`DevotionalTabContent.tsx`, `PrayerInput.tsx`, `JournalInput.tsx`) use plain `<div>` wrappers with `mx-auto max-w-2xl px-4 py-10 sm:py-14`. Backgrounds are transparent — `<HorizonGlow />` at the DailyHub root provides atmosphere. **Do NOT add `GlowBackground` or per-section bg colors.**
- `Button.tsx` (`frontend/src/components/ui/Button.tsx`) is the canonical button. Variants: `primary | secondary | outline | ghost | light | gradient | subtle`. The `gradient` class string lives at line 49–50 (single tagged template), the `ghost` class string at line 57 (cn() entry). `asChild` mode forwards classes to a child element via `cloneElement`.
- `FrostedCard.tsx` (`frontend/src/components/homepage/FrostedCard.tsx`) is the canonical card. Variants: `accent | default | subdued`. The `eyebrow` prop renders an uppercase tracked label inside the card's top edge with optional violet leading dot. `accent` variant auto-renders a violet dot + violet-300 text; `default` and `subdued` render a `bg-white/40` dot + `text-white/50` text. The `accent` variant has an inner top-edge highlight via `before:bg-gradient-to-r ... via-white/[0.10]` that gives it editorial polish.
- All Daily Hub textarea glow is the canonical violet pattern: `border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. White-glow + cyan-glow are deprecated.
- Animation tokens live at `frontend/src/constants/animation.ts` — do NOT hardcode `200ms` or `cubic-bezier(...)`.
- Constants for content limits live in two files: `frontend/src/constants/content-limits.ts` (canonical for Journal/QOTD/PrayerPost — `JOURNAL_MAX_LENGTH=5000`, `JOURNAL_WARNING_THRESHOLD=4000`, `JOURNAL_DANGER_THRESHOLD=4800`, `PRAYER_POST_MAX_LENGTH=1000`, `QOTD_MAX_LENGTH=500`, `QOTD_WARNING_THRESHOLD=400`) and `frontend/src/constants/daily-experience.ts` (Daily Hub-specific draft keys, prayer chips, breathing phases, meditation types). PRAYER_MAX_LENGTH does not currently exist as a named constant; this spec introduces it.
- Test patterns: Vitest + React Testing Library + jsdom. Tests for daily components live in `frontend/src/components/daily/__tests__/`. Tests for shared UI components live in `frontend/src/components/ui/__tests__/`. Auth-modal-using tests typically `vi.mock('@/components/prayer-wall/AuthModalProvider', ...)` and `vi.mock('@/hooks/useAuth', ...)`. The `RelatedPlanCallout.test.tsx` is the canonical pattern — wrap renders in `<MemoryRouter>` with the v7 future flags.
- Auth gating: `useAuth()` returns `{ isAuthenticated, user, login(), logout() }`. `useAuthModal()` returns `{ openAuthModal(subtitle?: string) }`. The pattern in `RelatedPlanCallout.handleClick`: `if (!isAuthenticated) { e.preventDefault(); authModal?.openAuthModal('Sign in to start this reading plan'); }`. Preserve verbatim across the refactor.

**Confirmed RelatedPlanCallout consumers (single consumer — verified by grep on 2026-05-01):**

- `components/daily/DevotionalTabContent.tsx:327` — only production consumer
- `components/devotional/__tests__/RelatedPlanCallout.test.tsx:29` — test consumer

The spec mentions `/grow/reading-plans` and Bible chapter pages as possible regression surfaces; reconnaissance confirms no consumers there. `/verify-with-playwright` should still visit those routes per the spec (sanity check) but no regression is expected.

**Confirmed gradient Button consumers (Change 8 ripples — verified by grep 2026-05-01):**

| File | Line | Surface | Notes |
|---|---|---|---|
| `components/bible/landing/ResumeReadingCard.tsx` | 32 | `/bible` Resume Reading "Continue reading" | `<Button variant="gradient" size="md" asChild>` — black text picks up via Change 8 |
| `components/daily/DevotionalTabContent.tsx` | 311 | "Pray about today's reading" | Change 3 — picks up automatically |
| `components/daily/JournalInput.tsx` | 346 | "Save Entry" | Change 13 — picks up automatically |
| `components/daily/PrayerInput.tsx` | 169 | "Help Me Pray" | Change 7 — picks up automatically |
| `components/ui/__tests__/Button.test.tsx` | 232, 240, 245, 252, 258, 270 | Tests | Update lines 241 + 266 (`text-violet-900` → `text-black`) |
| `components/music/WorshipPlaylistsTab.tsx` | 30, 43 | `<SectionHeader variant="gradient">` | DIFFERENT component — NOT affected |
| `components/audio/AmbientBrowser.tsx` | 199 | `<SectionHeader variant="gradient">` | DIFFERENT component — NOT affected |
| `components/ui/__tests__/SectionHeader.test.tsx` | 77, 90, 103 | SectionHeader tests | DIFFERENT component — NOT affected |

**Confirmed ghost Button consumers (Change 9 ripples — verified by grep 2026-05-01):**

| File | Line | Surface | Notes |
|---|---|---|---|
| `components/daily/SaveToPrayerListForm.tsx` | 110 | Cancel button (modal) | Daily Hub — dark surface |
| `components/daily/JournalInput.tsx` | 219 | "Try a different prompt" | Change 11 — picks up automatically |
| `components/dashboard/CelebrationOverlay.tsx` | 237 | Dashboard celebration | Dark surface |
| `components/prayer-wall/QotdComposer.tsx` | 100 | Cancel | Prayer Wall — dark surface |
| `components/prayer-wall/InlineComposer.tsx` | 275 | Cancel | Prayer Wall — dark surface |
| `pages/Health.tsx` | 90 | "Back to home" | Diagnostic page (dark) |
| `components/sharing/__tests__/ShareImageButton.test.tsx` | 179 | Test only | `ShareImageButton` has its OWN `ghost` variant prop (not the Button component's). Test asserts `bg-white/10` + `rounded-full` — does NOT assert `text-primary`. NOT affected; do NOT change. |

**All 6 production ghost Button surfaces are on dark-theme backgrounds.** No light-themed consumer found. If one is discovered during execution, flag it and defer to a follow-up spec — do NOT introduce per-instance overrides in this iteration.

**Tests touching the prayer 500-char limit (Change 5 ripple — verified by grep 2026-05-01):**

- `components/daily/__tests__/PrayTabContent.test.tsx:766` — `expect(screen.getByText('9 / 500')).toBeInTheDocument()` → update to `'9 / 1000'`
- `components/daily/__tests__/PrayTabContent.test.tsx:769–784` — "warning color at 400 chars" — uses `'a'.repeat(400)` and `'400 / 500'`. After Change 5, warning threshold becomes 800, so this test must be reworked: either repeat 800 chars and assert `'800 / 1000'` with `text-amber-400`, OR keep 400 chars and assert that color is NOT amber (since 400 < new warning threshold 800). The plan chooses the former — update to assert at the new threshold.

---

## Auth Gating Checklist

This iteration introduces NO new auth gates and modifies NO existing gating behavior. Every interactive element preserves its existing auth posture.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Click "Help Me Pray" while logged out | Auth modal with "Sign in to generate a prayer" (existing) | Step 2 | Existing `useAuth` + `useAuthModal` flow inside `PrayTabContent.tsx` (NOT in `PrayerInput.tsx` — submit handler upstream) — preserved unchanged |
| Click "Save Entry" while logged out | Auth modal with "Sign in to save your journal entries" + "Your draft is safe — we'll bring it back after" if draft is non-empty (existing) | Step 3 | `JournalInput.handleSave` line 142–148 — preserved unchanged |
| Click "Pray about today's reading" while logged out | Switches tab to Pray with contextual prompt; submit triggers existing auth modal | Step 4 | Existing `onSwitchToPray` callback in DevotionalTabContent — preserved unchanged |
| Click "Start this plan" / "Continue this plan" while logged out | Auth modal with "Sign in to start this reading plan" (existing — preserved verbatim) | Step 5 | `RelatedPlanCallout.handleClick` line 25–30 — preserved verbatim, just moved from `<Link>` className to `<Button asChild><Link>` (Link still owns the click handler) |
| Click "Try a different prompt" | Cycles prompt locally — no auth required | Step 8 (Change 9 visual only — no logic change) | N/A (no auth gate exists; visual color change only) |

Visual-only changes (Steps 6, 7) do NOT alter any click behavior, route navigation, or auth gating. The gradient and ghost variants change text colors only.

---

## Design System Values (for UI steps)

Sourced from shipped source files (`Button.tsx`, `FrostedCard.tsx`, `09-design-system.md` § "Textarea Glow Pattern", "FrostedCard Tier System", "White Pill CTA Patterns"), NOT from the recon (which is stale for these tokens).

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Button gradient (post-Change 8) | text color | `text-black` | spec Change 8; replaces `text-violet-900` at Button.tsx line 50 |
| Button gradient (post-Change 8) | background | `bg-gradient-to-br from-violet-400 to-violet-300` (unchanged) | Button.tsx line 50 |
| Button ghost (post-Change 9) | text + hover | `text-white/80 hover:text-white hover:bg-white/5` | spec Change 9; replaces `text-primary hover:bg-primary/5` at Button.tsx line 57 |
| FrostedCard accent | classes | `bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70 rounded-3xl p-6 shadow-frosted-accent` + `before:bg-gradient-to-r ... via-white/[0.10]` top-edge highlight | FrostedCard.tsx line 28–31 |
| FrostedCard accent eyebrow | dot + label | `bg-violet-400` 1.5px×1.5px dot + `text-violet-300 text-xs font-semibold uppercase tracking-[0.15em]` label | FrostedCard.tsx line 80–98 |
| FrostedCard eyebrow spacing | margin below | `mb-4` (provided by FrostedCard internally — eyebrow's own wrapper) | FrostedCard.tsx line 81 |
| Button subtle (used in Change 4 CTA) | classes | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] gap-2 font-medium min-h-[44px]` | Button.tsx line 51–52 |
| Saint quote opening/closing marks (Change 2) | font + size + color | `font-serif text-5xl leading-none text-white/25` | spec Change 2 |
| Saint quote opening mark alignment | inline anchor | `align-top mr-1` (top-of-line-box) | spec Change 2 |
| Saint quote closing mark alignment | inline anchor | `align-bottom ml-1` (bottom-of-line-box) | spec Change 2 |
| Devotional title pre-Change-1 | top padding | `pt-8 sm:pt-10` (~32px / ~40px gap from date) | DevotionalTabContent.tsx line 201 |
| Devotional title post-Change-1 | top padding | `pt-3 sm:pt-4` (~12px / ~16px gap) | spec Change 1 |
| Pray textarea wrapper post-Change-6 | bottom margin | `mb-2` (or `mb-3` if `mb-2` reads too tight) | spec Change 6 |
| Pray draft indicator post-Change-6 | bottom margin | `mb-1` (was `mb-2`) | spec Change 6 |
| Pray nudge error post-Change-6 | bottom margin | `mb-2` (was `mb-4`) | spec Change 6 |
| Journal draft indicator post-Change-10 | bottom margin | `mb-2` (was `mb-4`) | spec Change 10 |
| Journal Save button container post-Change-10 | bottom margin | `mb-4` (was `mb-8`) | spec Change 10 |
| Journal textarea post-Change-12 | resize + max-h | `min-h-[200px] max-h-[500px] w-full resize-y` (was `min-h-[200px] w-full resize-none`) | spec Change 12 |
| PRAYER_MAX_LENGTH | constant | `1000` | spec Change 5 |
| PRAYER_WARNING_THRESHOLD | constant | `800` (80%) | spec Change 5 |
| PRAYER_DANGER_THRESHOLD | constant | `960` (96%) | spec Change 5 |

---

## Design System Reminder

Displayed verbatim before each UI step during execution:

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings on dark backgrounds. Caveat font is logo-only (deprecated for headings).
- All Daily Hub tab content components use `mx-auto max-w-2xl px-4 py-10 sm:py-14` and have transparent backgrounds — the `<HorizonGlow />` at the DailyHub root shows through. Do NOT add `GlowBackground` or per-section backgrounds.
- Daily Hub tab headings are REMOVED. Tab content leads directly into the input or activity.
- Pray and Journal textareas use the canonical violet glow: `border-violet-400/30 bg-white/[0.04] shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30 placeholder:text-white/40`. Do NOT introduce white-glow or cyan-glow (both deprecated). DO NOT modify the textarea glow class string in Steps 2, 3, 12.
- Button gradient variant — post-Change-8 — uses `text-black` on `bg-gradient-to-br from-violet-400 to-violet-300`. Do NOT use `text-violet-900` (deprecated) or `text-white` (insufficient contrast).
- Button ghost variant — post-Change-9 — uses `text-white/80 hover:text-white hover:bg-white/5` on dark surfaces. Do NOT use `text-primary` (deprecated for dark surfaces).
- FrostedCard accent variant + `eyebrow` prop renders the eyebrow as a violet leading dot (`bg-violet-400`) + violet-300 uppercase tracked text. The dot is the visual signature of the most prominent tier — DO NOT add a second `<p>` with the same label inside the card (double-render bug).
- Subtle Button (`<Button variant="subtle">`) is glass chrome — `bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm`. Use this on accent-tier surfaces where the high-contrast white pill would read too loud.
- `min-h-[44px]` is mandatory on all interactive elements (touch target). The Button variants `light`, `gradient`, `subtle` enforce this automatically.
- `aria-hidden="true"` on decorative typographic elements (the saint quote's giant quote characters) — do not break this in Step 4.
- Animation tokens live at `frontend/src/constants/animation.ts`. Don't hardcode durations or easings in this iteration (no new animations introduced).

**Forbidden patterns** (from `09-design-system.md` § "Deprecated Patterns"):

- `Caveat` font on headings
- `BackgroundSquiggle` on Daily Hub
- `GlowBackground` per Daily Hub section
- `animate-glow-pulse` on textareas
- White textarea glow (Wave 7) — replaced by violet glow (DailyHub 1B)
- Cyan textarea glow border
- `font-serif italic` on Journal prompts
- "What's On Your Heart/Mind/Spirit?" headings
- `line-clamp-3` on guided prayer card descriptions
- Soft-shadow 8px-radius cards on dark backgrounds
- `text-violet-900` on the gradient Button (post-Change-8 — replaced with `text-black`)
- `text-primary` on the ghost Button (post-Change-9 — replaced with `text-white/80`)

---

## Shared Data Models (from Master Plan)

N/A — this iteration touches no shared data models, no localStorage keys, no TypeScript types beyond existing prop interfaces. The Change 5 constants (`PRAYER_MAX_LENGTH`, `PRAYER_WARNING_THRESHOLD`, `PRAYER_DANGER_THRESHOLD`) are SOURCE constants, NOT localStorage keys — no `11-local-storage-keys.md` update required.

**localStorage keys this spec touches:** None. The existing `wr_prayer_draft` and `wr_journal_draft` continue to work unchanged.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Devotional title `pt-3` (was `pt-8`). Saint quote pull-quote with `text-5xl` opening/closing marks — verify the closing quote does not wrap awkwardly on long quotes; if it does, apply ONE tuning option per Change 2 (text-4xl OR opacity 20% OR inline-block + negative mt-1). RelatedPlanCallout single-column, full padding `p-6`. Pray + Journal textarea→submit gaps tightened. Journal `resize-y` works (browser-native handle is touch-grabbable). Gradient and ghost Button text-color updates apply identically. |
| Tablet | 768px | Devotional title `sm:pt-4`. Saint quote pull-quote layout. RelatedPlanCallout widens with container. Pull-quote layout reads cleanly. |
| Desktop | 1440px | Identical to tablet structurally. RelatedPlanCallout's accent FrostedCard top-edge highlight (`before:bg-gradient-to-r ... via-white/[0.10]`) renders crisply. Saint quote pull-quote: opening quote anchored upper-left of first line, closing quote anchored lower-right of last line. |

**Custom breakpoints:** None. `sm:` (640px) is the only breakpoint used. No flex/grid reorganization, no breakpoint-conditional rendering, no media-query additions.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Saint quote pull-quote (Change 2) | Opening `&ldquo;`, first line of `{devotional.quote.text}` | Same y at every breakpoint (375px, 768px, 1440px). The opening mark uses `align-top` to anchor to the top of the line box of the first line. | Wrapping is expected — the entire `<blockquote>` wraps naturally. The opening mark stays inline with whatever line it falls in (always the first); the closing mark stays inline with the last line. If the opening mark renders on its own line (above the text — current bug), the layout is broken. |
| Saint quote pull-quote (Change 2) | Last line of `{devotional.quote.text}`, closing `&rdquo;` | Same y at every breakpoint. The closing mark uses `align-bottom` to anchor to the bottom of the line box of the last line. | At 375px on a long quote, if the closing mark wraps to its own line (below the text), apply tuning option (a) `text-4xl` reduction OR (b) `inline-block` + negative `mt-1` from Change 2's tuning list. |

No other features in this iteration introduce inline-row layouts. Existing inline rows (chip rows, header dot+icon rows) are preserved unchanged.

---

## Vertical Rhythm

**Expected gaps after this iteration lands** (sourced from spec; targets are eyeball-verified, not pixel-pinned). Verify each at 375px, 768px, 1440px:

| From → To | Pre-spec gap | Expected post-spec gap | Source |
|-----------|-------------|------------------------|--------|
| Devotional date strip → Devotional title | ~32px (mobile) / ~40px (desktop) via `pt-8 sm:pt-10` | ~12px (mobile) / ~16px (desktop) via `pt-3 sm:pt-4` | Change 1 |
| Devotional title → passage section start | ~24px+ via `py-6 sm:py-8` on passage wrapper (unchanged) | Same — entire devotional below title shifts up by Change-1 amount | Change 1 (downstream) |
| Pray textarea bottom edge → "Help Me Pray" Button | dominant gap is textarea wrapper `mb-4` + draft `mb-2` + (optional crisis) + (optional nudge `mb-4`) → ~32–80px depending on what's visible | reduced by ~33–50%: textarea wrapper `mb-2` + draft `mb-1` + (optional nudge `mb-2`) → ~16–32px | Change 6 |
| "Help Me Pray" Button → next downstream content (PrayerResponse / GuidedPrayerSection) | gap is owned by `PrayTabContent.tsx` parent — preserved | Same — Button moves up so downstream content moves up correspondingly. No void. | Change 6 (downstream) |
| Journal textarea wrapper → draft indicator | `mb-2` (preserved) | `mb-2` (kept — already tight) | Change 10 |
| Journal draft indicator → CrisisBanner / Save button | draft `mb-4` + Save container `mb-8` → ~48px | draft `mb-2` + Save container `mb-4` → ~24px | Change 10 |
| "Save Entry" Button → next downstream content (entries list / write-another) | gap is owned by parent — preserved | Same — Button moves up so entries list moves up correspondingly. No void. | Change 10 (downstream) |
| RelatedPlanCallout top → Pray-CTA wrapper above it | `mt-8` (preserved) | `mt-8` (kept — moved from outer `<div>` className to `<FrostedCard className="mt-8">`) | Change 4 |

Gap differences >5px from these targets are flagged as mismatches during `/verify-with-playwright`.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] User is on branch `forums-wave-continued`. Do NOT create a new branch.
- [ ] All three precursor specs (DailyHub 1A, 1B, 2) are merged into `forums-wave-continued`.
- [ ] `pnpm install` is up to date (no missing deps after pulling main).
- [ ] All auth-gated actions from the spec are accounted for (verified — see Auth Gating Checklist).
- [ ] Design system values are verified from shipped source files. The recon at `_plans/recon/design-system.md` is stale for Daily Hub/Button tokens; do NOT use it as a source of truth for those values.
- [ ] One [UNVERIFIED] value flagged: the saint quote pull-quote layout (Change 2) is a NEW pattern — verify at all 3 breakpoints during execution, apply at most ONE tuning option if issues surface.
- [ ] Recon report is the original DailyHub 1A/1B/2 specs themselves; no separate `_plans/recon/<slug>.md` exists.
- [ ] No deprecated patterns introduced: this iteration explicitly removes one (`text-violet-900` on gradient → `text-black`) and one (`text-primary` on ghost → `text-white/80`); it must NOT introduce any from the deprecated list.
- [ ] Branch hygiene: stay on `forums-wave-continued` for the entire plan. No commits during execution unless the user explicitly requests them; the user manages all git operations.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Change 5 — Option A (named constants) vs Option B (hardcoded) | **Option A** — introduce `PRAYER_MAX_LENGTH=1000`, `PRAYER_WARNING_THRESHOLD=800`, `PRAYER_DANGER_THRESHOLD=960` in `frontend/src/constants/daily-experience.ts` next to `PRAYER_DRAFT_KEY` and `DEFAULT_PRAYER_CHIPS` | Spec § Change 5 explicitly states "Prefer Option A". Matches the existing Journal pattern (`JOURNAL_MAX_LENGTH` in `content-limits.ts`). Co-located with other Daily Hub Pray constants (`PRAYER_DRAFT_KEY`, `DEFAULT_PRAYER_CHIPS`). The spec offers `daily-experience.ts` OR `content-limits.ts` — chose `daily-experience.ts` to keep all Pray-feature constants in one place. |
| Saint quote tuning at 375px (Change 2) | **Implement base structure first, eyeball at all 3 breakpoints, then apply at most ONE tuning option if issues surface** | Spec § Change 2 prescribes this exact procedure: "If all three read cleanly, ship as-is. If one or more breakpoints show issues, apply ONE tuning option and re-verify. Do NOT apply multiple tuning options simultaneously without re-verifying after each." |
| Pray textarea-to-submit `mb-2` vs `mb-3` (Change 6) | **Start with `mb-2`. If it reads too tight after eyeball verification, fall back to `mb-3`** | Spec § Change 6 explicitly offers `mb-2 (or mb-3 if mb-2 reads too tight)`. Try the more aggressive value first to honor the rhythm-tightening intent. |
| RelatedPlanCallout `mt-8` placement (Change 4) | **Pass `className="mt-8"` to `<FrostedCard>` — preserves the existing margin** | Spec § Change 4 explicitly states "the `mt-8` is preserved as a `className` override". `FrostedCard` accepts a `className` prop and forwards it via the cn() merge. |
| Light-themed surface using gradient or ghost Button (Changes 8, 9) | **Flag and defer to follow-up spec — do NOT add per-instance overrides in this iteration** | Spec § Change 8 + Change 9 explicitly state this. None found in current enumeration; if discovered during execution, document and defer. |
| `09-design-system.md` doc update for Button text colors | **Defer — flag as documentation TODO, do NOT block plan completion** | Spec § Out of Scope. The doc note about `text-violet-900` on the gradient is a small one-line update; can ship in a follow-up doc-only spec. |
| Update prayer-related test files for 500 → 1000 | **Update `PrayTabContent.test.tsx:766` (`9 / 500` → `9 / 1000`) AND `PrayTabContent.test.tsx:769–784` (warning threshold test)** | Spec § Change 5 cross-references states "Any test file asserting on the 500 limit — update to 1000". The warning test's 400-char threshold is no longer in danger zone (new warning is 800), so the test must repeat 800 chars to trigger the same color assertion. |
| When to update tests for Button text-color changes | **Update `Button.test.tsx` lines 241 + 266 in the same step that modifies `Button.tsx` (Step 6)** | Tests must pass after every step. Updating test + production code in the same step keeps the regression-baseline check (8,811 pass / 11 fail) green. |
| When to land Changes 6 + 10 if visual rhythm differs across the two tabs | **Implement Change 6 first, then Change 10 to MATCH Pray's new rhythm** | Spec § Change 10 states "Match Pray's new rhythm (Change 6) so the two tabs feel visually consistent." Pray is implemented first to establish the canonical proportions. |
| Fallback for the GuidedPrayerSection that mounts below "Help Me Pray" | **Verify it moves up correspondingly after Change 6 lands; no spacing modifications to GuidedPrayerSection** | Spec § Change 6 explicitly tasks the implementer with verifying post-submit downstream movement. GuidedPrayerSection is owned by `PrayTabContent.tsx` parent; not modified by this spec. |

---

## Implementation Steps

### Step 1: Add Pray-feature character-limit constants

**Objective:** Introduce `PRAYER_MAX_LENGTH`, `PRAYER_WARNING_THRESHOLD`, and `PRAYER_DANGER_THRESHOLD` constants in `frontend/src/constants/daily-experience.ts`. Foundation step for Step 2 (PrayerInput consumes them).

**Files to create/modify:**

- `frontend/src/constants/daily-experience.ts` — add three named exports next to `PRAYER_DRAFT_KEY` and `DEFAULT_PRAYER_CHIPS`

**Details:**

After the existing `PRAYER_DRAFT_KEY` line, add:

```ts
export const PRAYER_MAX_LENGTH = 1000
export const PRAYER_WARNING_THRESHOLD = 800
export const PRAYER_DANGER_THRESHOLD = 960
```

Place above the `MEDITATION_TYPES` block. Keep export ordering consistent with the existing file. No JSDoc required (matches the existing style of unannotated single-line exports).

**Auth gating (if applicable):** N/A — constants change.

**Responsive behavior (UI steps only — write "N/A: no UI impact" for non-UI steps):** N/A: no UI impact.

**Inline position expectations (if this step renders an inline-row layout):** N/A — non-UI step.

**Guardrails (DO NOT):**

- DO NOT touch `JOURNAL_MAX_LENGTH` / `JOURNAL_WARNING_THRESHOLD` / `JOURNAL_DANGER_THRESHOLD` in `frontend/src/constants/content-limits.ts` — Journal limits stay at 5000 / 4000 / 4800.
- DO NOT introduce a `PRAYER_MAX_LENGTH` constant in `content-limits.ts` (it would shadow the new one in `daily-experience.ts`). Single source of truth: `daily-experience.ts`.
- DO NOT change `PRAYER_POST_MAX_LENGTH` in `content-limits.ts` (different feature — Prayer Wall posts).
- DO NOT add JSDoc comments unless there is non-obvious context (the constants are self-explanatory; comments would be noise).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (no new tests for constants) | — | Pure constant exports; downstream tests in Step 2 verify the wiring. |

**Expected state after completion:**

- [ ] `frontend/src/constants/daily-experience.ts` exports `PRAYER_MAX_LENGTH=1000`, `PRAYER_WARNING_THRESHOLD=800`, `PRAYER_DANGER_THRESHOLD=960`
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` baseline unchanged (8,811 pass / 11 fail per CLAUDE.md)

---

### Step 2: PrayerInput — wire new constants + tighten textarea→submit rhythm (Changes 5 + 6)

**Objective:** Replace hardcoded `500`/`400`/`480` in PrayerInput with the new `PRAYER_*_LENGTH` constants, AND tighten the textarea→submit rhythm by reducing three bottom margins by ~33–50%.

**Files to create/modify:**

- `frontend/src/components/daily/PrayerInput.tsx` — import new constants, replace hardcoded values, reduce margins

**Details:**

**Imports (line 6):**

Update the existing import line to add the three new constants:

```tsx
import {
  DEFAULT_PRAYER_CHIPS,
  PRAYER_DRAFT_KEY,
  PRAYER_MAX_LENGTH,
  PRAYER_WARNING_THRESHOLD,
  PRAYER_DANGER_THRESHOLD,
} from '@/constants/daily-experience'
```

**Textarea `maxLength` (line 137):**

Replace `maxLength={500}` with `maxLength={PRAYER_MAX_LENGTH}`.

**CharacterCount usage (line 145):**

Replace:

```tsx
<CharacterCount current={text.length} max={500} warningAt={400} dangerAt={480} id="pray-char-count" />
```

with:

```tsx
<CharacterCount
  current={text.length}
  max={PRAYER_MAX_LENGTH}
  warningAt={PRAYER_WARNING_THRESHOLD}
  dangerAt={PRAYER_DANGER_THRESHOLD}
  id="pray-char-count"
/>
```

**Rhythm tightening (Change 6) — three margin updates:**

- Line 126: `<div className="mb-4">` → `<div className="mb-2">`. Wraps the textarea + char-count display.
- Line 149: `<div className="mb-2 flex h-4 items-center justify-end" aria-live="polite">` → `<div className="mb-1 flex h-4 items-center justify-end" aria-live="polite">`. Draft saved indicator.
- Line 161: `<p id="pray-error" className="mb-4 flex items-center gap-1.5 text-sm text-red-400" role="alert">` → `<p id="pray-error" className="mb-2 flex items-center gap-1.5 text-sm text-red-400" role="alert">`. Nudge error.

**Do not touch:**

- The textarea's own className (line 139) — the violet glow class string is preserved verbatim.
- The Button on line 168–177 — Change 7 picks up automatically via Step 6.
- The chips section (lines 110–124) — out of scope.
- `<CrisisBanner text={text} />` at line 158 — its internal margins are owned by its own component.
- The retry-prompt message at line 104–108.

**Auth gating (if applicable):**

- "Help Me Pray" submit is auth-gated upstream in `PrayTabContent.tsx` (NOT in PrayerInput). Preserve the `onSubmit(text)` callback contract — don't change it.
- This step does NOT introduce or remove auth checks.

**Responsive behavior (UI steps only — write "N/A: no UI impact" for non-UI steps):**

- Desktop (1440px): tighter rhythm; textarea + char-count + draft indicator + (optional crisis) + (optional nudge) + Button read as a connected unit.
- Tablet (768px): identical layout; same rhythm.
- Mobile (375px): identical layout; same rhythm. Verify the 1000-char limit accommodates the long contextual prompt from Devotional → Pray flow.

**Inline position expectations (if this step renders an inline-row layout):** N/A — vertical stack only.

**Guardrails (DO NOT):**

- DO NOT modify the textarea glow class string (line 139) — violet glow is canonical.
- DO NOT change the button's variant from `gradient` (Change 7 lands via Step 6 globally; preserve `<Button variant="gradient" size="lg">`).
- DO NOT introduce `mb-3` as a first-pass value — start with `mb-2` per the spec; only fall back to `mb-3` after visual review.
- DO NOT delete the `aria-live="polite"` zone on the draft indicator wrapper.
- DO NOT delete the `role="alert"` on the nudge error.
- DO NOT remove the `aria-describedby` / `aria-invalid` chain on the textarea.
- DO NOT adjust the textarea's `rows` (8), `min-h-[200px]`, `max-h-[500px]`, or `resize-y` — those are Spec U behavior, preserved unchanged.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `PrayTabContent.test.tsx:766` (existing, update) | unit | Update `'9 / 500'` → `'9 / 1000'`. Verify that typing "Hello God" (9 chars) renders `9 / 1000` in the CharacterCount. |
| `PrayTabContent.test.tsx:769–784` (existing, rework) | unit | Change "warning color at 400 chars" to "warning color at 800 chars". Repeat 800 'a's, assert `'800 / 1000'` carries `text-amber-400`. (At 400 chars under the new thresholds, the count is still neutral — the original test premise no longer holds.) |
| (new test optional) "1000-char input is accepted" | unit | Optional sanity check: type `'a'.repeat(1000)`, assert `'1000 / 1000'` is in the doc and `text-amber-400` or `text-red-400` is applied (danger). Skip if existing tests cover this; do not pad the test count for its own sake. |

**Expected state after completion:**

- [ ] `pnpm typecheck` passes (no signature drift, no unused import).
- [ ] `pnpm test --run components/daily/__tests__/PrayTabContent.test.tsx` passes.
- [ ] Visual verification at `/daily?tab=pray` (manual, 3 breakpoints): textarea bottom edge → "Help Me Pray" gap is noticeably tighter than pre-step. No void below the Button. Type 700+ chars and confirm CharacterCount allows up to 1000, warning at 800, danger at 960.
- [ ] End-to-end test (manual): from Devotional tab, click "Pray about today's reading" with a long-passage devotional. Confirm contextual prompt loads in full, no truncation. (This is the original bug fix.)

---

### Step 3: JournalInput — tighten textarea→save rhythm + manual resize (Changes 10 + 12)

**Objective:** Reduce two bottom margins (draft indicator + Save button container) by ~50% to match Pray's new rhythm. Add `max-h-[500px]` and switch `resize-none` → `resize-y` on the textarea so users can manually expand the writing surface.

**Files to create/modify:**

- `frontend/src/components/daily/JournalInput.tsx` — three className updates

**Details:**

**Rhythm tightening (Change 10) — two margin updates:**

- Line 271: `<div className="relative mb-2">` (textarea wrapper) — KEEP `mb-2` (already tight per spec).
- Line 331: `<div className="mb-4 flex h-5 items-center justify-end" aria-live="polite">` → `<div className="mb-2 flex h-5 items-center justify-end" aria-live="polite">`. Draft saved indicator.
- Line 344: `<div className="mb-8 text-center">` → `<div className="mb-4 text-center">`. Save button container.

**Manual resize (Change 12) — textarea className update:**

Line 283:

Current:

```tsx
className="min-h-[200px] w-full resize-none rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
```

Change to:

```tsx
className="min-h-[200px] max-h-[500px] w-full resize-y rounded-lg border border-violet-400/30 bg-white/[0.04] px-4 pb-10 pt-3 text-lg leading-relaxed text-white placeholder:text-white/40 shadow-[0_0_20px_rgba(167,139,250,0.18),0_0_40px_rgba(167,139,250,0.10)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
```

Two-token edit:

- `resize-none` → `resize-y`
- Insert `max-h-[500px]` after `min-h-[200px]`

**Do not touch:**

- The `onInput={(e) => autoExpand(e.target as HTMLTextAreaElement)}` handler at line 279 — preserved verbatim. The auto-expand and manual resize work simultaneously.
- The `pb-10` padding-bottom — reserves space for the bottom-anchored CharacterCount and voice mic.
- The CharacterCount at line 287–294 — `absolute bottom-2 left-3` positioning preserved.
- The voice mic Button at line 295–327 — `absolute bottom-2 right-2` positioning preserved.
- The "Try a different prompt" Button at line 218–227 — Change 11 lands via Step 7 globally. Preserve `<Button variant="ghost" size="sm">`.
- The Save Entry Button at line 345–353 — Change 13 lands via Step 6 globally. Preserve `<Button variant="gradient" size="lg">`.
- The mode toggle at line 164–197.
- The DevotionalPreviewPanel mounting block at line 199–205.
- Crisis banner at line 341.

**Auth gating (if applicable):**

- "Save Entry" submit is auth-gated inside `JournalInput.handleSave` at line 142–148. Preserved unchanged: `if (!isAuthenticated) { authModal?.openAuthModal(subtitle); return }` with the conditional draft-aware subtitle.
- This step does NOT introduce or remove auth checks.

**Responsive behavior (UI steps only):**

- Desktop (1440px): tighter rhythm — draft saved indicator and Save Entry move up. Resize handle visible at bottom-right of textarea (browser-native chrome). Voice mic still tappable.
- Tablet (768px): identical layout; same rhythm; resize handle works (mouse drag).
- Mobile (375px): identical layout; same rhythm; resize handle is touch-grabbable on iOS/Android (browser-native touch behavior). Verify the resize handle does not visually clash with voice mic at bottom-right (acceptable visual overlap since the resize handle is in textarea chrome, not the document; if it makes voice mic untappable, FLAG it and revert per spec § Change 12 implementer note).

**Inline position expectations (if this step renders an inline-row layout):** N/A — vertical stack.

**Guardrails (DO NOT):**

- DO NOT remove or modify the `onInput={autoExpand}` handler — manual resize and auto-expand coexist.
- DO NOT remove `pb-10` — bottom-anchored CharacterCount + voice mic depend on it.
- DO NOT touch the textarea's violet glow class string (only the resize tokens change).
- DO NOT change the textarea's `rows={6}` or any other prop.
- DO NOT change the JOURNAL_MAX_LENGTH constant (5000) — out of scope.
- DO NOT change the Save Entry Button variant.
- DO NOT change the "Try a different prompt" Button variant.
- DO NOT modify the mode toggle, devotional preview panel, or crisis banner.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `JournalTabContent.test.tsx` (existing, review) | unit | If any test asserts `resize-none` on the journal textarea, update to `resize-y`. Search for the string `resize-none` in `JournalTabContent.test.tsx`; update if found. If not found, no test change needed. |
| (new test) "textarea has manual resize tokens" | unit | Render JournalInput, assert textarea has `resize-y` and `max-h-[500px]` classes. Lightweight class assertion; one test. |
| (new test) "draft indicator and Save button containers carry tightened margins" | unit | Render JournalInput in guided mode with text. Assert the draft indicator wrapper has `mb-2` (not `mb-4`); assert the Save button container has `mb-4` (not `mb-8`). Two assertions; one test. |
| Existing journal-related tests pass unchanged | unit | All existing JournalInput / JournalTabContent / DevotionalPreviewPanel / JournalMilestones tests continue to pass. |

**Expected state after completion:**

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` baseline at 8,811 pass / 11 fail (or improved). No NEW failing files.
- [ ] Visual verification at `/daily?tab=journal` (manual, 3 breakpoints): tighter rhythm; no void below Save button. Drag resize handle at textarea bottom-right — textarea grows up to 500px. Auto-expand still works while typing. Voice mic still tappable.

---

### Step 4: DevotionalTabContent — tighten date→title + restructure saint quote (Changes 1 + 2)

**Objective:** Reduce devotional title's `pt-8 sm:pt-10` to `pt-3 sm:pt-4` so date and title read as a unit. Restructure the saint quote to a pull-quote layout where giant opening/closing quote characters anchor inline upper-left / lower-right of the quote text.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — two structural updates: title `pt-*` and saint-quote JSX

**Details:**

**Change 1 — title top padding (line 201):**

Current:

```tsx
<h3 className="pt-8 text-center text-2xl font-bold text-white sm:pt-10 sm:text-3xl">
  {devotional.title}
</h3>
```

Change to:

```tsx
<h3 className="pt-3 text-center text-2xl font-bold text-white sm:pt-4 sm:text-3xl">
  {devotional.title}
</h3>
```

Two-token change: `pt-8` → `pt-3`, `sm:pt-10` → `sm:pt-4`. Everything below the title (passage callout, reflection FrostedCard, saint quote, reflection question, Pray CTA, RelatedPlanCallout, EchoCard, share/read-aloud row, bottom padding) shifts up correspondingly because nothing is anchored to a fixed position.

**Change 2 — saint quote pull-quote (lines 269–278):**

Current:

```tsx
<FrostedCard variant="default" className="p-5 sm:p-6">
  <span className="font-serif text-5xl leading-none text-white/25" aria-hidden="true">
    &ldquo;
  </span>
  <blockquote className="mt-2 font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    {devotional.quote.text}
  </blockquote>
  <p className="mt-3 text-sm text-white/80">&mdash; {devotional.quote.attribution}</p>
</FrostedCard>
```

Change to:

```tsx
<FrostedCard variant="default" className="p-5 sm:p-6">
  <blockquote className="font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    <span
      className="font-serif text-5xl leading-none text-white/25 align-top mr-1"
      aria-hidden="true"
    >
      &ldquo;
    </span>
    {devotional.quote.text}
    <span
      className="font-serif text-5xl leading-none text-white/25 align-bottom ml-1"
      aria-hidden="true"
    >
      &rdquo;
    </span>
  </blockquote>
  <p className="mt-3 text-sm text-white/80">&mdash; {devotional.quote.attribution}</p>
</FrostedCard>
```

Structural changes:

- Move the opening `<span>` INSIDE the `<blockquote>` (was outside above it).
- Add `align-top mr-1` to the opening `<span>`.
- Drop `mt-2` from the `<blockquote>` (no longer needed — opening mark is now inline, not block-above).
- Add a new closing `<span>` AFTER `{devotional.quote.text}`, also INSIDE the `<blockquote>`, with `align-bottom ml-1` and `aria-hidden="true"`.
- Preserve attribution `<p>` exactly: `mt-3 text-sm text-white/80` and `&mdash; {devotional.quote.attribution}`.
- Preserve `FrostedCard variant="default" className="p-5 sm:p-6"`.

**[UNVERIFIED] — pull-quote layout at 375px on long quotes:**

The pull-quote pattern is NEW for this codebase. Best guess: the base structure (above) reads cleanly at all 3 breakpoints. Verification method: after this step lands, capture `/daily?tab=devotional` at 1440px / 768px / 375px. Visually confirm:

- Opening `&ldquo;` is INLINE with the start of the first line of quote text (not on a separate line above).
- Closing `&rdquo;` is INLINE with the end of the last line.
- Neither mark introduces line-height jitter or wraps awkwardly.

Correction method: if 375px on a long quote shows the closing mark wrapping awkwardly, apply ONE tuning option from the spec (in priority order):

1. Reduce both spans from `text-5xl` to `text-4xl`.
2. Add `inline-block` + `vertical-align: top` (or use Tailwind's `align-top`) and a small negative `mt-1` to pull the character up into the line box.
3. Reduce opacity from `text-white/25` to `text-white/20`.

Apply ONE option, re-verify all 3 breakpoints, ship.

**Auth gating:** N/A — visual restructure only. The "Pray about today's reading" Button (line 310–321) and RelatedPlanCallout below it preserve their existing auth gates.

**Responsive behavior (UI steps only):**

- Desktop (1440px): tighter date↔title gap (~16px). Pull-quote with full `text-5xl` opening/closing marks reads as a deliberate composition.
- Tablet (768px): tighter date↔title gap (~16px). Pull-quote reads cleanly.
- Mobile (375px): tighter date↔title gap (~12px). Pull-quote reads cleanly OR requires ONE tuning option per the [UNVERIFIED] verification block above.

**Inline position expectations:**

- Saint quote pull-quote at 1440px and 768px: opening `&ldquo;` shares y with first character of `{devotional.quote.text}` (±5px tolerance — `align-top` anchors the giant span to the top of the first line's line-box). Closing `&rdquo;` shares y with last character of last line (±5px — `align-bottom` anchors to bottom of last line's line-box).
- At 375px: same expectation IF the base structure reads cleanly. If tuning option (b) (inline-block + negative mt-1) is applied, the alignment should still hold.

**Guardrails (DO NOT):**

- DO NOT remove `aria-hidden="true"` from either span — they are decorative.
- DO NOT change the blockquote semantic — it remains `<blockquote>`, screen readers announce the quote text correctly.
- DO NOT introduce a separate heading or label above the saint quote.
- DO NOT change the FrostedCard variant from `default` to `accent` — the saint quote is intentionally the quieter Tier-1 tier (see `09-design-system.md` § "FrostedCard Tier System").
- DO NOT change the attribution `<p>` styling.
- DO NOT touch any other section of DevotionalTabContent (passage, reflection, question, Pray CTA, RelatedPlanCallout, echo, share row).
- DO NOT apply more than one tuning option without re-verifying after each.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `DevotionalTabContent.test.tsx` (existing, review) | unit | Search for assertions about the saint quote that reference the old structure (e.g., asserting opening `&ldquo;` is in a `<span>` adjacent to the `<blockquote>`, asserting `mt-2` on the blockquote, asserting absence of closing `&rdquo;`). Update to match the new pull-quote structure. If no such assertions exist, no test change needed. |
| (new test) "saint quote renders as pull-quote with inline opening/closing marks" | unit | Render DevotionalTabContent. Find the saint quote `<blockquote>`. Assert it contains: (a) the opening `&ldquo;` inside as the first child span with `aria-hidden="true"`, `font-serif`, `text-5xl`, `align-top`, `mr-1`; (b) the closing `&rdquo;` inside as a span with `aria-hidden="true"`, `font-serif`, `text-5xl`, `align-bottom`, `ml-1`; (c) the quote text content. |
| (new test) "devotional title has tightened pt-3 sm:pt-4" | unit | Render DevotionalTabContent. Assert the `<h3>` containing the title has `pt-3` and `sm:pt-4` (not `pt-8` / `sm:pt-10`). |

**Expected state after completion:**

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test --run components/daily/__tests__/DevotionalTabContent.test.tsx` passes.
- [ ] Visual verification at `/daily?tab=devotional` at 3 breakpoints: tightened date↔title gap; saint quote reads as pull-quote.
- [ ] If a tuning option is applied, document it in the Execution Log Notes column with the breakpoint and the issue observed.

---

### Step 5: RelatedPlanCallout — promote to FrostedCard accent + subtle Button (Change 4)

**Objective:** Refactor `RelatedPlanCallout` from a rolls-own `<div>` card with a hand-rolled "Go Deeper" `<p>` and a white pill `<Link>` to `<FrostedCard variant="accent" eyebrow="Go Deeper">` containing `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link>`. Preserve all four props, the auth-modal `handleClick`, and the `ctaText` derivation verbatim.

**Files to create/modify:**

- `frontend/src/components/devotional/RelatedPlanCallout.tsx` — full body refactor (props, hooks, auth logic preserved)
- `frontend/src/components/devotional/__tests__/RelatedPlanCallout.test.tsx` — update assertions about the wrapper/button structure

**Details:**

**Imports (line 1–4):**

Add `Button` and `FrostedCard` imports:

```tsx
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useAuth } from '@/hooks/useAuth'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
```

**Body (lines 13–49):**

Replace the existing return block with:

```tsx
return (
  <FrostedCard variant="accent" eyebrow="Go Deeper" className="mt-8">
    <p className="text-base font-semibold text-white">{planTitle}</p>
    <p className="mt-1 text-sm text-white/60">{planDuration}-day plan</p>
    <Button variant="subtle" size="md" asChild>
      <Link to={`/reading-plans/${planId}`} onClick={handleClick} className="mt-4">
        {ctaText}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </Button>
  </FrostedCard>
)
```

Specific changes from the existing structure:

- Wrapping `<div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-6">` → `<FrostedCard variant="accent" eyebrow="Go Deeper" className="mt-8">`. The accent variant supplies its own padding, border, background, and shadow; the rolls-own classes are removed. The `mt-8` is preserved as a `className` override.
- Standalone `<p className="text-xs uppercase tracking-widest text-white/70">Go Deeper</p>` is REMOVED — `eyebrow="Go Deeper"` on FrostedCard renders it (with the auto-violet leading dot + violet-300 uppercase tracked label). Avoid double-render.
- Plan title `<p>` LOSES its `mt-2` (FrostedCard's eyebrow block already provides `mb-4` below itself).
- Plan duration `<p>` keeps its `mt-1`.
- White pill `<Link>` (`mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100`) is REMOVED. Replaced by `<Button variant="subtle" size="md" asChild>` wrapping the same `<Link>`. The Link keeps its `to`, `onClick={handleClick}`, and the `ctaText` + `<ChevronRight>` children.
- The `mt-4` margin moves from the old Link className to the new inner Link's className (so the gap above the Button is preserved at the same value).
- Add `aria-hidden="true"` to the `<ChevronRight>` (it was missing in the original; cleanup as part of refactor — purely decorative chevron next to text label).

**Preserve verbatim:**

- All four props (`planId`, `planTitle`, `planDuration`, `planStatus`).
- `const ctaText = planStatus === 'unstarted' ? 'Start this plan' : 'Continue this plan'` derivation (lines 22–23).
- `handleClick` callback (lines 25–30) including the auth-modal subtitle `'Sign in to start this reading plan'`.
- `useAuth` and `useAuthModal` hook usage.

**Test updates:**

In `frontend/src/components/devotional/__tests__/RelatedPlanCallout.test.tsx`:

- Existing test "renders with plan title and Go Deeper label" (line 40–45): the `getByText('Go Deeper')` assertion still passes because `FrostedCard` renders the eyebrow as a span with the literal text — verify it doesn't break (FrostedCard's eyebrow span is a `<span>`, not a `<p>`, but the text content is identical; the Testing Library `getByText` is content-based and should still find it).
- Existing test "shows Start this plan for unstarted plans" — still passes (text content unchanged).
- Existing test "shows Continue this plan for active plans" — still passes.
- Existing test "shows Continue this plan for paused plans" — still passes.
- Existing test "link navigates to /reading-plans/:planId" — still passes (`<Link>` is preserved; the closest `<a>` to the "Start this plan" text is still the Link).
- Existing test "auth modal on Start click for logged-out users" — still passes (handleClick logic unchanged).
- (new test) "renders inside a FrostedCard accent variant with violet eyebrow dot": render, find the eyebrow text, walk up to find a sibling/ancestor span with `bg-violet-400` class. Lightweight class assertion.
- (new test) "CTA renders as subtle Button with min-h-[44px]": find the `<a>` (closest to the "Start this plan" text), assert `min-h-[44px]`, `bg-white/[0.07]`, `text-white`, `rounded-full` (subtle Button glass chrome — confirmed via Button.tsx line 51–52).

If any existing assertion fails because of a no-longer-rendered class (`bg-white/[0.03]`, `border-white/[0.08]`, `bg-white px-6 py-2.5 text-sm font-semibold text-primary`), remove or update that assertion.

**Auth gating:**

- "Start this plan" / "Continue this plan" Button click while logged out → `handleClick` calls `e.preventDefault()` and `authModal?.openAuthModal('Sign in to start this reading plan')`. Preserved verbatim.
- The `e.preventDefault()` works because `Button asChild` forwards the `onClick` handler from the inner `<Link>` (which still owns it). The `cloneElement` in `Button.tsx` lines 78–84 spreads `...props`, but the inner `<Link>`'s `onClick` is on the Link itself, not on the Button. The Link's onClick fires, calls `e.preventDefault()`, blocks navigation, opens auth modal. Confirmed by reviewing Button.tsx asChild logic.

**Responsive behavior (UI steps only):**

- Desktop (1440px): accent FrostedCard renders with violet leading dot + "Go Deeper" eyebrow + violet-300 text. Top-edge highlight (`before:via-white/[0.10]`) renders crisply. Subtle Button glass chrome reads coherent with the accent surface.
- Tablet (768px): identical.
- Mobile (375px): identical, single column. Subtle Button text wraps naturally if needed (long ctaText), but `min-h-[44px]` is preserved.

**Inline position expectations:** The Button + ChevronRight share a row (existing layout); preserved.

**Guardrails (DO NOT):**

- DO NOT add a `<p>` with "Go Deeper" — the eyebrow prop renders it. Double-rendering is a documented bug class for FrostedCard accent.
- DO NOT change the `handleClick` logic or the auth modal subtitle string.
- DO NOT change any of the four props' types.
- DO NOT remove the asChild wrapping — the Link MUST be the actual interactive element so `useNavigate` semantics, accessibility (`<a>` element), and `min-h-[44px]` all work. The `Button asChild` pattern is canonical for clickable navigation.
- DO NOT introduce a per-instance prop for prominence (e.g., `variant?: 'accent' | 'default'`) — the spec is explicit: accent treatment is the new default.
- DO NOT use the homepage primary white pill pattern (`bg-white text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)]`) — it would read too loud against an accent surface. Spec § Change 4 specifies subtle Button.
- DO NOT change the import path of `FrostedCard` — the canonical import is `@/components/homepage/FrostedCard` (this is its current location).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| (existing tests, review) | unit | All 6 existing tests in RelatedPlanCallout.test.tsx should pass after the refactor. Run them; update only if a class-assertion-based test fails (none expected to). |
| (new test) "renders inside FrostedCard accent variant" | unit | Render RelatedPlanCallout; assert that the outermost element has `bg-violet-500/[0.08]` (the accent variant's hallmark class). |
| (new test) "eyebrow renders with violet leading dot" | unit | Render RelatedPlanCallout; find the "Go Deeper" text node; walk up to the parent flex container; assert it contains a `<span>` with `bg-violet-400`. |
| (new test) "CTA renders as subtle Button" | unit | Render RelatedPlanCallout; find the link element via `getByText('Start this plan').closest('a')`; assert classes `bg-white/[0.07]`, `text-white`, `rounded-full`, `min-h-[44px]`, `mt-4`. |
| (new test) "preserves auth modal trigger when logged out" | unit | Already covered by existing line 68–73 test; no change needed. |
| (new test) "preserves all four props" | unit | Already covered by existing tests for `planId` (line 62–66), `planTitle` (line 40–45), `planDuration` (line 40–45), `planStatus` (47–60); no change needed. |

**Expected state after completion:**

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test --run components/devotional/__tests__/RelatedPlanCallout.test.tsx` passes (existing tests + new tests).
- [ ] Visual verification at `/daily?tab=devotional` at 3 breakpoints: "Go Deeper" eyebrow with violet dot, plan title + duration, subtle "Start this plan" Button with chevron. Auth modal triggers on click while logged out.

---

### Step 6: Button.tsx — gradient text-black (Change 8) + test updates

**Objective:** Single-token replacement of `text-violet-900` → `text-black` in the `gradient` variant class string at `Button.tsx` line 50. Update Button test assertions at lines 241 and 266 from `text-violet-900` to `text-black`.

**Files to create/modify:**

- `frontend/src/components/ui/Button.tsx` — line 50 className update
- `frontend/src/components/ui/__tests__/Button.test.tsx` — lines 241 + 266 assertion updates

**Details:**

**Button.tsx line 49–50:**

Current:

```ts
variant === 'gradient' &&
  'rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]',
```

Change to:

```ts
variant === 'gradient' &&
  'rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-black hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]',
```

Single-token edit: `text-violet-900` → `text-black`.

**Button.test.tsx line 239–242:**

Current:

```tsx
it('gradient variant uses violet-900 text color', () => {
  render(<Button variant="gradient">Go</Button>)
  expect(screen.getByRole('button').className).toContain('text-violet-900')
})
```

Change to:

```tsx
it('gradient variant uses black text color', () => {
  render(<Button variant="gradient">Go</Button>)
  expect(screen.getByRole('button').className).toContain('text-black')
})
```

Two changes: test name string + assertion.

**Button.test.tsx line 256–267:**

Current:

```tsx
it('gradient variant + asChild forwards classes to child', () => {
  render(
    <Button variant="gradient" asChild>
      <a href="/x">Go</a>
    </Button>,
  )
  const link = screen.getByRole('link', { name: 'Go' })
  expect(link.tagName).toBe('A')
  expect(link.className).toContain('bg-gradient-to-br')
  expect(link.className).toContain('rounded-full')
  expect(link.className).toContain('text-violet-900')
})
```

Change line 266: `expect(link.className).toContain('text-violet-900')` → `expect(link.className).toContain('text-black')`.

**Do not touch:**

- Button.tsx line 22–27 (`text-primary` on `light` variant) — Change 9 ripples to `ghost`, not `light`. Preserved.
- Button.tsx line 47–48 (`text-primary` on `light` variant cn() entry) — preserved.
- Button.tsx line 56 (`text-primary` on `outline` variant) — preserved.
- Button.test.tsx line 25 (`expect(btn.className).toContain('text-primary')`) — that's on the `light` variant test, not gradient. Preserved.
- All `SectionHeader variant="gradient"` usages (different component) — NOT affected.
- The four production gradient Button consumers (ResumeReadingCard, DevotionalTabContent Pray-CTA, JournalInput Save Entry, PrayerInput Help Me Pray) — they pick up `text-black` automatically through the variant. Verify via `/verify-with-playwright` after the step.

**Auth gating:** N/A — visual color change.

**Responsive behavior (UI steps only):**

- All breakpoints: gradient buttons (4 production consumers) render with `text-black` instead of `text-violet-900`. Stronger contrast.

**Inline position expectations:** N/A — no layout change.

**Guardrails (DO NOT):**

- DO NOT change `bg-gradient-to-br from-violet-400 to-violet-300` — only the text color.
- DO NOT change `hover:from-violet-300 hover:to-violet-200` — only the text color.
- DO NOT change `shadow-gradient-button` / `hover:shadow-gradient-button-hover` / `hover:-translate-y-0.5` / `motion-reduce:hover:translate-y-0` / `focus-visible:ring-violet-300` / `min-h-[44px]` / `font-semibold` — preserved.
- DO NOT touch the cn() entries below line 50 (`light`, `outline`, `ghost`, `primary`, `secondary`, sizing) — out of scope.
- DO NOT introduce `text-hero-bg` or any other near-black token. The spec is explicit: `text-black`.
- DO NOT update `09-design-system.md` Button variant doc inline (deferred per spec § Out of Scope).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Button.test.tsx:240–242` (existing, update) | unit | Rename and update assertion: `text-violet-900` → `text-black`. |
| `Button.test.tsx:256–267` (existing, update) | unit | Update line 266 assertion: `text-violet-900` → `text-black`. |
| Other `Button.test.tsx` tests | unit | All other gradient-related tests pass unchanged (they assert `bg-gradient-to-br`, `from-violet-400`, `to-violet-300`, `rounded-full`, `min-h-[44px]`, `shadow-gradient-button` — none of which change). |
| `SectionHeader.test.tsx` | unit | Should be unaffected — different component. Verify by running. |

**Expected state after completion:**

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test --run components/ui/__tests__/Button.test.tsx` passes (all gradient and other variant tests).
- [ ] `pnpm test` baseline at 8,811 pass / 11 fail (or improved). No NEW failing files. The full suite runs cleanly because all 4 production gradient Button consumers have no test assertions on the text color (verified by grep — none of `ResumeReadingCard.test.tsx`, the various Daily Hub tests, etc. assert `text-violet-900` directly; they assert text content like "Continue reading" / "Save Entry" / "Help Me Pray" / "Pray about today's reading").
- [ ] Visual verification at `/daily?tab=devotional` ("Pray about today's reading"), `/daily?tab=pray` ("Help Me Pray"), `/daily?tab=journal` ("Save Entry"), `/bible/john/3` (or any chapter — ResumeReadingCard "Continue reading"): all four render with black text on violet gradient.

---

### Step 7: Button.tsx — ghost text-white/80 (Change 9) + test review

**Objective:** Three-token replacement of `text-primary hover:bg-primary/5` → `text-white/80 hover:text-white hover:bg-white/5` in the `ghost` variant entry at Button.tsx line 57. Review Button.test.tsx for any ghost-specific assertions on `text-primary` and update them. Review ShareImageButton.test.tsx (already verified to be unaffected — its `ghost` is its own prop, not the Button component's ghost variant).

**Files to create/modify:**

- `frontend/src/components/ui/Button.tsx` — line 57 cn() entry update
- `frontend/src/components/ui/__tests__/Button.test.tsx` — review for ghost-specific assertions; update if found

**Details:**

**Button.tsx line 57:**

Current:

```ts
'text-primary hover:bg-primary/5': variant === 'ghost',
```

Change to:

```ts
'text-white/80 hover:text-white hover:bg-white/5': variant === 'ghost',
```

Three-token edit:

- `text-primary` → `text-white/80`
- `hover:bg-primary/5` → `hover:bg-white/5`
- Plus `hover:text-white` to brighten on hover

**Button.test.tsx review:**

Search for any `it(...)` block that tests the `ghost` variant specifically. From a fresh read of `Button.test.tsx`, there is NO existing `describe('ghost variant')` block (unlike the explicit `gradient variant`, `subtle variant`, and `isLoading prop` describe blocks). The line 25 `text-primary` assertion is on the `light` variant — preserved unchanged.

If a ghost-variant test is found during execution: update the assertion from `text-primary` to `text-white/80` (and optionally add a hover:text-white assertion). If no ghost-variant test exists, no test change needed.

(Optional new test) "ghost variant uses white text on dark surface": render `<Button variant="ghost">G</Button>`, assert `text-white/80`, `hover:text-white`, `hover:bg-white/5` are present. Lightweight — three classes; one test. Adds explicit coverage for the new pattern.

**ShareImageButton.test.tsx (no change):**

Verified during reconnaissance — `ShareImageButton` has its own internal `ghost` variant prop (different from the Button component). Test at line 174–185 asserts `bg-white/10` and `rounded-full`, NOT `text-primary`. No update required.

**Do not touch:**

- Button.tsx line 47–48 (`light` variant) — `text-primary` is preserved.
- Button.tsx line 56 (`outline` variant) — `text-primary` is preserved.
- Button.tsx line 54 (`primary` variant) — `bg-primary text-white` is preserved.
- The 6 production ghost Button consumers are all on dark surfaces — verified during reconnaissance. They pick up `text-white/80` automatically.

**Auth gating:** N/A — visual color change.

**Responsive behavior (UI steps only):**

- All breakpoints: ghost buttons (6 production consumers) render with `text-white/80` instead of `text-primary`. Hover state brightens to `text-white` and adds `bg-white/5` background.

**Inline position expectations:** N/A — no layout change.

**Guardrails (DO NOT):**

- DO NOT change `text-primary` on the `light` or `outline` variant.
- DO NOT change `bg-primary` on the `primary` variant.
- DO NOT introduce a per-instance override for any production ghost consumer in this iteration (defer per spec § Out of Scope).
- DO NOT touch ShareImageButton — it has its own ghost variant.
- DO NOT update `09-design-system.md` ghost variant doc inline (deferred per spec § Out of Scope).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `Button.test.tsx` ghost-variant assertion review | unit | Search for ghost-variant tests. If any exist asserting `text-primary`, update to `text-white/80`. (Reconnaissance suggests none exist; this step verifies.) |
| (new test, optional) "ghost variant uses white text + hover-brighten + hover bg" | unit | Render `<Button variant="ghost">G</Button>`, assert `text-white/80`, `hover:text-white`, `hover:bg-white/5`. |
| `ShareImageButton.test.tsx:174–185` ("ghost variant has correct classes") | unit | Should pass unchanged — asserts `bg-white/10` and `rounded-full`, neither of which changes. Verify by running. |
| The 6 production ghost consumers | regression | No test changes needed for SaveToPrayerListForm, JournalInput's "Try a different prompt", CelebrationOverlay, QotdComposer, InlineComposer, Health.tsx — none assert text color. Verify by running their respective test files. |

**Expected state after completion:**

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test --run components/ui/__tests__/Button.test.tsx` passes.
- [ ] `pnpm test --run components/sharing/__tests__/ShareImageButton.test.tsx` passes (unchanged).
- [ ] Full suite at baseline 8,811 pass / 11 fail (or improved). No NEW failing files.
- [ ] Visual verification: `/daily?tab=journal` "Try a different prompt" renders with white/80 text that brightens to white on hover. `/dashboard` (CelebrationOverlay during a celebration animation) renders with white text. `/prayer-wall` (InlineComposer Cancel + QotdComposer Cancel) renders with white text. `/health` "Back to home" renders with white text.

---

### Step 8: Final regression verification + plan-level acceptance check

**Objective:** Run the full test suite, run the build, run lint, and exhaustively verify every acceptance criterion in the spec.

**Files to create/modify:** None — verification step.

**Details:**

**Run gates:**

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

All four MUST pass:

- `pnpm typecheck` — zero TS errors.
- `pnpm lint` — zero lint errors.
- `pnpm test` — baseline at 8,811 pass / 11 fail (the 11 are pre-existing per CLAUDE.md regression baseline). NO NEW failing files. NO net increase in failure count.
- `pnpm build` — succeeds without warnings.

**Manual eyeball verification at 3 breakpoints (375px / 768px / 1440px):**

- `/daily?tab=devotional`:
  - [ ] Date strip + title read as a tight unit (~12–16px gap)
  - [ ] No void below the title; entire section below has shifted up
  - [ ] Saint quote pull-quote layout renders; opening `&ldquo;` inline with first line, closing `&rdquo;` inline with last line. If a tuning option was applied at any breakpoint, document it.
  - [ ] "Pray about today's reading" Button has black text on violet gradient (Change 8 verified)
  - [ ] "Go Deeper" callout renders as accent FrostedCard with violet leading dot + violet-300 tracked text + subtle Button "Start this plan" with glass chrome and white text

- `/daily?tab=pray`:
  - [ ] Tighter rhythm between textarea and "Help Me Pray" — no void below button
  - [ ] "Help Me Pray" Button has black text on violet gradient
  - [ ] Type 700+ chars, confirm CharacterCount allows up to 1000 (warning at 800, danger at 960)
  - [ ] Trigger "Pray about today's reading" from Devotional → confirm contextual prompt loads in full WITHOUT truncation (the original bug fix)

- `/daily?tab=journal`:
  - [ ] Tighter rhythm between textarea and "Save Entry" — no void below button
  - [ ] White text on "Try a different prompt" (hovers to brighter white, bg-white/5 hover background)
  - [ ] Manual resize handle works on textarea — drag to expand up to 500px
  - [ ] Auto-expand still works while typing
  - [ ] Voice mic still tappable
  - [ ] Black text on "Save Entry" Button

- `/daily?tab=meditate`:
  - [ ] Multi-bloom canvas, meditation cards, verse-aware Spec Z banner all render identically (no regression)

- `/bible/john/3` (or any active chapter):
  - [ ] ResumeReadingCard's "Continue reading" Button renders with black text on violet gradient

- `/dashboard`:
  - [ ] CelebrationOverlay's ghost Button renders white text (trigger a celebration to verify, or visually inspect when a celebration is active)

- `/prayer-wall`:
  - [ ] InlineComposer Cancel ghost Button renders white text
  - [ ] QotdComposer Cancel ghost Button renders white text

- `/health`:
  - [ ] "Back to home" ghost Button renders white text

- `/grow/reading-plans`:
  - [ ] No regression. RelatedPlanCallout is NOT mounted here (verified by grep).

- Sweep `/`, `/register`, `/login`, `/insights`, `/friends`, `/settings`, `/music`, `/local-support/churches`, `/local-support/counselors`, `/local-support/celebrate-recovery`, `/ask`:
  - [ ] No light-themed surface surfaces a gradient or ghost Button with broken contrast. If any does, FLAG as a follow-up spec — do NOT fix in this iteration.

**Pre-execution constants check (re-verify before sign-off):**

- [ ] `frontend/src/constants/daily-experience.ts` has `PRAYER_MAX_LENGTH=1000`, `PRAYER_WARNING_THRESHOLD=800`, `PRAYER_DANGER_THRESHOLD=960`.
- [ ] `frontend/src/constants/content-limits.ts` is UNCHANGED — `JOURNAL_MAX_LENGTH=5000`, `JOURNAL_WARNING_THRESHOLD=4000`, `JOURNAL_DANGER_THRESHOLD=4800`, `PRAYER_POST_MAX_LENGTH=1000` (unrelated to Daily Hub Pray).

**Documentation (deferred):**

- [ ] `09-design-system.md` Button variant doc note still says `text-violet-900` — flag as documentation TODO for a follow-up doc-only spec. Do NOT block this plan.

**Auth gating:** N/A — verification step.

**Responsive behavior:** Listed above per route × breakpoint.

**Inline position expectations:** Saint quote pull-quote y-alignment per Inline Element Position Expectations table.

**Guardrails (DO NOT):**

- DO NOT commit or push during this step. The user manages all git operations.
- DO NOT introduce a follow-up spec inline — flag any out-of-scope finding for the user to decide.
- DO NOT modify `09-design-system.md` inline — doc updates are out of scope.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Full suite green | regression | `pnpm test` at baseline 8,811 pass / 11 fail. NO NEW failing files. |
| Build green | regression | `pnpm build` succeeds without warnings. |
| Lint green | regression | `pnpm lint` passes. |
| Typecheck green | regression | `pnpm typecheck` passes. |
| Manual e2e (Devotional → Pray bug fix) | manual | The original bug — contextual prompt truncation — is fixed. |

**Expected state after completion:**

- [ ] All four CI gates green.
- [ ] All acceptance criteria from spec § Acceptance Criteria checked off.
- [ ] All [UNVERIFIED] values resolved (saint quote pull-quote verified at 3 breakpoints; tuning option applied if needed and documented).
- [ ] Plan complete; ready for `/code-review` and `/verify-with-playwright`.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `PRAYER_*_LENGTH` constants in `daily-experience.ts` |
| 2 | 1 | PrayerInput wires constants + tightens rhythm (Changes 5 + 6) |
| 3 | — | JournalInput tightens rhythm + manual resize (Changes 10 + 12). Independent of Step 2 (different file) but ordered after to keep visual rhythm consistent across both tabs |
| 4 | — | DevotionalTabContent: title pt-3 + saint quote pull-quote (Changes 1 + 2). Independent of Steps 1-3 |
| 5 | — | RelatedPlanCallout refactor to FrostedCard accent + subtle Button (Change 4). Independent of Steps 1-4 |
| 6 | — | Button.tsx gradient → `text-black` (Change 8). Independent of Steps 1-5; ripple affects 4 production gradient Button consumers (Help Me Pray, Save Entry, Pray-about-today's-reading, Continue reading) |
| 7 | — | Button.tsx ghost → `text-white/80` (Change 9). Independent of Steps 1-6; ripple affects 6 production ghost Button consumers |
| 8 | 1, 2, 3, 4, 5, 6, 7 | Final regression verification + acceptance check |

Steps 1-7 can be implemented in any order EXCEPT Step 2 must follow Step 1 (PrayerInput needs the constants). The plan orders them logically: foundation (Step 1) → tab-content rhythm (Steps 2, 3) → devotional content (Steps 4, 5) → app-wide Button patterns (Steps 6, 7) → final verification (Step 8). This grouping keeps related changes together for clean rollback if needed.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add Pray-feature character-limit constants | [COMPLETE] | 2026-05-01 | Added PRAYER_MAX_LENGTH=1000, PRAYER_WARNING_THRESHOLD=800, PRAYER_DANGER_THRESHOLD=960 to `frontend/src/constants/daily-experience.ts` directly after PRAYER_DRAFT_KEY. tsc --noEmit clean. |
| 2 | PrayerInput — wire new constants + tighten textarea→submit rhythm | [COMPLETE] | 2026-05-01 | PrayerInput.tsx: imported PRAYER_MAX_LENGTH/WARNING/DANGER constants. Replaced hardcoded 500/400/480 in maxLength + CharacterCount. Tightened margins: textarea wrapper mb-4→mb-2, draft mb-2→mb-1, nudge mb-4→mb-2. Updated PrayTabContent.test.tsx: '9 / 500'→'9 / 1,000', warning test reworked from 400→800 chars at '800 / 1,000' (commas required because CharacterCount uses toLocaleString). 72/72 PrayTabContent tests pass. |
| 3 | JournalInput — tighten textarea→save rhythm + manual resize | [COMPLETE] | 2026-05-01 | JournalInput.tsx: textarea resize-none→resize-y + added max-h-[500px]. Draft indicator mb-4→mb-2. Save container mb-8→mb-4. Added 2 new tests in JournalTabContent.test.tsx accessibility block. 56/56 Journal tests pass. |
| 4 | DevotionalTabContent — tighten date→title + restructure saint quote | [COMPLETE] | 2026-05-01 | DevotionalTabContent.tsx: Title pt-8 sm:pt-10 → pt-3 sm:pt-4 (Change 1). Saint quote restructured to pull-quote — opening &ldquo; (align-top mr-1) + closing &rdquo; (align-bottom ml-1) both inside blockquote, both aria-hidden. mt-2 dropped from blockquote (Change 2). Added 2 new tests. 60/60 DevotionalTabContent tests pass. |
| 5 | RelatedPlanCallout — promote to FrostedCard accent + subtle Button | [COMPLETE] | 2026-05-01 | RelatedPlanCallout.tsx fully refactored: imports Button + FrostedCard. Outer div→FrostedCard variant=accent eyebrow="Go Deeper" className=mt-8. Standalone Go Deeper p removed (eyebrow handles it). White pill Link replaced by Button variant=subtle size=md asChild wrapping Link. Link's mt-4 + onClick=handleClick preserved. Added aria-hidden on ChevronRight. All four props + handleClick unchanged. 9/9 tests pass (6 existing + 3 new). |
| 6 | Button.tsx — gradient text-black + test updates | [COMPLETE] | 2026-05-01 | Button.tsx line 50: text-violet-900 → text-black (single-token edit). Button.test.tsx lines 239-242 + 256-267: text-violet-900 → text-black (test name + 2 assertions updated). 34/34 Button tests pass. |
| 7 | Button.tsx — ghost text-white/80 + test review | [COMPLETE] | 2026-05-01 | Button.tsx line 57: text-primary hover:bg-primary/5 → text-white/80 hover:text-white hover:bg-white/5 (three-token edit). Added new "ghost variant" describe block with one test in Button.test.tsx. 35/35 Button tests pass; ShareImageButton 10/10 unaffected. |
| 8 | Final regression verification + plan-level acceptance check | [COMPLETE] | 2026-05-01 | Gates: tsc --noEmit clean, pnpm lint clean, pnpm build green, full pnpm test = 9,391 pass / 1 fail. Verified the 1 failure (useFaithPoints.test.ts:96 — pre-existing schema drift around `intercession` field) reproduces on a clean checkout via `git stash`, so it is NOT a regression introduced by this plan. Touched-file suite: 232/232 pass across PrayTabContent, JournalTabContent, DevotionalTabContent, RelatedPlanCallout, Button. Constants policy enforced: content-limits.ts unchanged for Journal (5000/4000/4800); daily-experience.ts now exports PRAYER_MAX_LENGTH=1000, PRAYER_WARNING_THRESHOLD=800, PRAYER_DANGER_THRESHOLD=960; no PRAYER_*_LENGTH in content-limits.ts. Manual visual verification at 3 breakpoints + browser eyeball of saint quote pull-quote behavior is left to the user (no headless server started in this session). |
