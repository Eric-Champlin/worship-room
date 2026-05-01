# Implementation Plan: DailyHub Holistic Redesign 2 — Devotional

**Spec:** `_specs/dailyhub-2-devotional.md`
**Date:** 2026-05-01
**Branch:** `forums-wave-continued` (current — spec brief explicitly forbids new branches; user manages git manually)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; see staleness flag below)
**Recon Report:** `_plans/forums/dailyhub-redesign-recon.md` (loaded — 2026-05-01, internalized by spec body; consult directly for any ambiguity)
**Master Spec Plan:** N/A — standalone visual-system spec. Predecessors: `_specs/dailyhub-1a-foundation-and-meditate.md` (plan: `_plans/2026-05-01-dailyhub-1a-foundation-and-meditate.md`), `_specs/dailyhub-1b-pray-and-journal.md` (plan: `_plans/2026-05-01-dailyhub-1b-pray-and-journal.md`), and the FrostedCard pilot (`_plans/2026-04-30-frostedcard-pilot-bible-landing.md` + `_plans/2026-04-30-frostedcard-iteration-1-make-it-pop.md`).

> **⚠️ Recon staleness flag.** `_plans/recon/design-system.md` was captured 2026-04-05, before the FrostedCard pilot, iteration-1, 1A, and 1B shipped. Its values for FrostedCard surface tokens, accent vs default surfaces, Button gradient/subtle variants, multi-bloom BackgroundCanvas, and the new DailyHub tab-bar treatment are stale. **Authoritative current values in this plan come from reading the shipped source files directly** (`FrostedCard.tsx`, `Button.tsx`, `DevotionalTabContent.tsx`, `DevotionalTabContent.test.tsx`). The `dailyhub-redesign-recon.md` is the live source of truth for migration shape, and the spec body internalizes its findings.

---

## Affected Frontend Routes

- `/daily?tab=devotional` (primary visual target — full devotional flow with all 6 migrated surfaces)
- `/daily?tab=pray` (regression — 1B surface; tab content + canvas + tab bar render unchanged)
- `/daily?tab=journal` (regression — 1B surface; tab content + canvas + tab bar render unchanged)
- `/daily?tab=meditate` (regression — 1A surface; tab content + canvas + tab bar render unchanged)
- `/bible` (regression — multi-bloom canvas / pilot card variants render unchanged)

---

## Architecture Context

### Files this spec touches (verified via direct file read 2026-05-01)

| File                                                                    | Lines | Currently                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | This spec changes |
| ----------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `frontend/src/components/daily/DevotionalTabContent.tsx`                | 365   | Imports at line 1–21 do NOT include `Button`. Reflection body at line 252–258 (default FrostedCard `p-5 sm:p-8`). Quote at line 263–271 (default FrostedCard, no explicit `variant` prop, `p-5 sm:p-6`). Reflection question at line 275–297 (FrostedCard with `border-l-2 border-l-primary p-4 sm:p-6` override; embedded white-pill `<button>` for "Journal about this question" inside `<div className="mt-5">` wrapper at line 281–295). "Meditate on this passage" `<Link>` at line 234–241 (rolls-own white pill, NOT a Button). "Pray about today's reading" rolls-own `<button>` at line 299–315 (white pill, fires `onSwitchToPray` callback — NOT navigation). Share + Read Aloud rolls-own pills at line 337–356 (`rounded-xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm`). Passage callout at line 222 (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`) — UNCHANGED. Verse-share icon button at line 213–220 — UNCHANGED. `ref={questionRef}` at line 275 sits on the OUTER `<div className="py-6 sm:py-8" ref={questionRef}>` wrapper. | Steps 1–7         |
| `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` | 550   | Behavioral suite (rendering, date navigation, cross-tab CTAs, completion tracking, verse linking, content order) is intact and must continue passing. Class-string assertions touching migrated surfaces sit at lines 264–270 (question card), 272–277 (Share/Read Aloud action button styling), 344–361 (Tier 3 reflection FrostedCard), 408–415 (question eyebrow tracking + color), 460–471 (Pray CTA pill styling). Quote backdrop-blur assertion at line 285–291 (`bg-white/[0.07]`) PASSES UNCHANGED — the quote stays default FrostedCard. Passage callout assertions at lines 297, 308–342, 373–383, 523–526 PASS UNCHANGED — passage is not migrated.                                                                                                                                                                                                                                                                                                                                                                                                                                              | Step 8            |
| `frontend/src/components/homepage/FrostedCard.tsx`                      | 103   | Already exposes `variant: 'accent' \| 'default' \| 'subdued'`, `eyebrow: string`, `eyebrowColor: 'violet' \| 'white'`. Accent variant carries `bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70` — confirmed at lines 28–31. Default variant carries `bg-white/[0.07] backdrop-blur-sm md:backdrop-blur-md border border-white/[0.12]` — confirmed at lines 32–35. Eyebrow rendered as flex row with violet leading dot when `variant === 'accent'` and `eyebrowColor` unset — confirmed at lines 80–98. **No changes** required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Reference only    |
| `frontend/src/components/ui/Button.tsx`                                 | 117   | Already exposes `variant: 'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'light' \| 'gradient' \| 'subtle'`, `size: 'sm' \| 'md' \| 'lg'`, `asChild: boolean`. Subtle variant: `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover ... gap-2 font-medium min-h-[44px]` — confirmed at lines 51–52. Gradient variant: `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 ... shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 ... gap-2 font-semibold min-h-[44px]` — confirmed at lines 49–50. `asChild` clones the single child element and merges classNames — confirmed at lines 68–84. **No changes** required.                                                                                                                                                                                                                                                                                                       | Reference only    |
| `.claude/rules/09-design-system.md`                                     | ~1100 | § "FrostedCard Tier System (Spec T)" describes Tier 1 (FrostedCard for reading content) and Tier 2 (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` callout). Does NOT currently document the dot-vs-no-dot eyebrow distinction between Tier 1 (accent FrostedCard with eyebrow → has violet leading dot) and Tier 2 (rolls-own callout with eyebrow → has NO dot). Spec § "Design Notes" requests a one-paragraph addition.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Step 9            |

### Test files this spec touches

- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — surgical updates per Step 8.
- All other Daily Hub test files (`PrayTabContent.test.tsx`, `JournalTabContent.test.tsx`, `MeditateTabContent.test.tsx`, `GuidedPrayerSection.test.tsx`, `DevotionalPreviewPanel.test.tsx`, etc.) — out of scope; verify regression baseline only.

### Patterns referenced (already shipped — referenced, not re-defined)

- **FrostedCard accent + eyebrow:** `<FrostedCard variant="accent" eyebrow="Today's reflection">` — pattern shipped in pilot + 1A. Renders violet leading dot before the uppercase eyebrow label.
- **FrostedCard default explicit:** `<FrostedCard variant="default">` — explicit declaration of the default variant for code-review readability (the contrast against the accent reflection body above reads at a glance).
- **Tier 2 scripture-callout idiom:** rolls-own `<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">` — already in use on the passage callout at line 222. The reflection question migrates to use the **identical** class string for visual unification.
- **Tier 2 eyebrow (rolls-own):** `<p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3">` — paragraph treatment with tighter letterspacing (`tracking-[0.15em]`) and quieter opacity (`text-white/50`) than the prior FrostedCard-internal eyebrow (`tracking-widest text-white/70`). **No leading violet dot** (only Tier 1 accent FrostedCard's eyebrow has the dot).
- **Button subtle:** `<Button variant="subtle" size="sm" | "md">` — frosted-glass pill chrome, `min-h-[44px]`, used for "Journal about this question," "Meditate on this passage," "Share today's devotional," "Read aloud."
- **Button gradient:** `<Button variant="gradient" size="lg">` — violet gradient pill chrome, `min-h-[44px]`, `font-semibold`, drop shadow + hover lift. The page's emotional peak — used ONCE on this tab for "Pray about today's reading."
- **Button asChild:** forwards class merging to a single child element. Used for "Meditate on this passage" because the click target is a navigation `<Link>`, not a callback.
- **Button onClick (no asChild):** direct `<Button onClick={...}>` form. Used for "Pray about today's reading" and "Journal about this question" because they fire callback props (`onSwitchToPray` / `onSwitchToJournal`) — NOT navigation.

### Provider wrapping (preserved verbatim from current test file)

The test wraps the component in `<MemoryRouter><ToastProvider><AuthModalProvider>...</AuthModalProvider></ToastProvider></MemoryRouter>`. Mocks: `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`. **Mocks stay UNCHANGED.** Test surgery is purely class-string updates + optional new behavioral assertions — no provider or mock structural changes.

---

## Auth Gating Checklist

| Action                                             | Spec Requirement                                                                                               | Planned In Step | Auth Check Method                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------- |
| Read devotional content                            | Allowed (no gate)                                                                                              | —               | N/A — reading is not gated                               |
| Click previous-day / next-day chevrons             | Allowed (no gate)                                                                                              | —               | N/A — date navigation is not gated                       |
| Click "Meditate on this passage" Link              | Routes to `/meditate/soaking?...` — meditation auth gating handled by Spec Z's logged-out flow (preserved)     | Step 2          | Existing meditation gate downstream — UNCHANGED          |
| Click "Journal about this question" Button         | Fires `onSwitchToJournal` callback; Journal tab textarea reachable without auth; "Save Entry" gate fires later | Step 5          | Existing Journal save-entry gate downstream — UNCHANGED  |
| Click "Pray about today's reading" Button          | Fires `onSwitchToPray` callback; Pray tab textarea reachable without auth; "Help Me Pray" gate fires on submit | Step 6          | Existing Pray "Help Me Pray" gate downstream — UNCHANGED |
| Click "Share today's devotional" Button            | Allowed — clipboard write + toast                                                                              | Step 7          | N/A — sharing is not gated                               |
| Click "Read aloud" Button                          | Allowed — toggles SpeechSynthesis                                                                              | Step 7          | N/A — TTS is not gated                                   |
| Click verse-share icon (next to passage reference) | Allowed — opens SharePanel                                                                                     | — (UNCHANGED)   | N/A — verse sharing is not gated                         |
| Scroll past reflection question                    | Logged-out: nothing fires (predicate `!isAuthenticated                                                         |                 | dayOffset !== 0                                          |     | isCompleted`short-circuits); logged-in: marks devotional read, increments faith points, plays chime, fires`onComplete?.()` | — (UNCHANGED) | Existing IntersectionObserver gate — UNCHANGED |

**Conclusion:** This spec adds zero new auth gates and removes zero existing auth gates. Every gate listed in `02-security.md` § "Auth Gating Strategy" for the `/daily` route is preserved exactly. Only the visual chrome around the click target changes.

---

## Design System Values (for UI steps)

All values verified against shipped source files (`FrostedCard.tsx`, `Button.tsx`) — the recon at `_plans/recon/design-system.md` is stale for these tokens.

| Component                     | Property              | Value                                                                                                                        | Source                                                                  |
| ----------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| FrostedCard accent            | background            | `bg-violet-500/[0.08]`                                                                                                       | `FrostedCard.tsx:29`                                                    |
| FrostedCard accent            | border                | `border border-violet-400/70`                                                                                                | `FrostedCard.tsx:29`                                                    |
| FrostedCard accent            | shadow                | `shadow-frosted-accent`                                                                                                      | `FrostedCard.tsx:29`                                                    |
| FrostedCard accent            | backdrop-blur         | `backdrop-blur-md md:backdrop-blur-[12px]`                                                                                   | `FrostedCard.tsx:29`                                                    |
| FrostedCard accent            | radius                | `rounded-3xl`                                                                                                                | `FrostedCard.tsx:29`                                                    |
| FrostedCard default           | background            | `bg-white/[0.07]`                                                                                                            | `FrostedCard.tsx:33`                                                    |
| FrostedCard default           | border                | `border border-white/[0.12]`                                                                                                 | `FrostedCard.tsx:33`                                                    |
| FrostedCard eyebrow (accent)  | dot color             | `bg-violet-400` (violet leading dot)                                                                                         | `FrostedCard.tsx:84–88`                                                 |
| FrostedCard eyebrow (accent)  | label                 | `text-xs font-semibold uppercase tracking-[0.15em] text-violet-300`                                                          | `FrostedCard.tsx:90–94`                                                 |
| Tier 2 callout (rolls-own)    | wrapper               | `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7`                                        | passage callout at `DevotionalTabContent.tsx:222` (canonical reference) |
| Tier 2 eyebrow (rolls-own)    | label                 | `text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3` (no leading dot)                                        | spec § Functional Requirements 3                                        |
| Button subtle                 | base                  | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm`                                        | `Button.tsx:51–52`                                                      |
| Button subtle                 | hover                 | `hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5`                    | `Button.tsx:52`                                                         |
| Button subtle                 | size sm               | `px-4 py-2 text-sm` + `gap-2 font-medium min-h-[44px]`                                                                       | `Button.tsx:52,61`                                                      |
| Button subtle                 | size md               | `px-6 py-2.5 text-sm` + `gap-2 font-medium min-h-[44px]`                                                                     | `Button.tsx:52,62`                                                      |
| Button gradient               | base                  | `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900`                                               | `Button.tsx:49–50`                                                      |
| Button gradient               | hover                 | `hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5` | `Button.tsx:50`                                                         |
| Button gradient               | size lg               | `px-8 py-3 text-base` + `gap-2 font-semibold min-h-[44px]`                                                                   | `Button.tsx:50,63`                                                      |
| Button shared                 | focus ring (gradient) | `focus-visible:ring-violet-300`                                                                                              | `Button.tsx:50`                                                         |
| Reflection body inner text    | typography            | `text-[17px] leading-[1.8] text-white sm:text-lg` (PRESERVED verbatim)                                                       | `DevotionalTabContent.tsx:253`                                          |
| Quote inner text              | typography            | `font-serif text-xl italic leading-[1.6] text-white sm:text-2xl` (PRESERVED verbatim)                                        | `DevotionalTabContent.tsx:267`                                          |
| Reflection question paragraph | typography            | `text-xl font-medium leading-[1.5] text-white sm:text-2xl mb-5`                                                              | spec § Functional Requirements 3                                        |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- The Daily Hub uses `<HorizonGlow />` at the page root instead of per-section `GlowBackground`. **Do NOT add `GlowBackground` to DevotionalTabContent.** Tab content uses transparent backgrounds — the HorizonGlow shows through.
- All Daily Hub tab content components use `mx-auto max-w-2xl px-4 py-10 sm:py-14` containers with transparent backgrounds. Preserved verbatim by this spec.
- The Daily Hub Devotional tab has NO heading. Tab content leads directly into date navigation + devotional title. **Do NOT add a heading.**
- Devotional readability tiers (Spec T → DailyHub 2): **Tier 1 accent FrostedCard's eyebrow has a violet leading dot. Tier 2 rolls-own callout's eyebrow has NO dot.** This is an externally-visible distinction — Step 9 documents it in `09-design-system.md` § "FrostedCard Tier System".
- The reflection question's wrapping `<div className="py-6 sm:py-8" ref={questionRef}>` is **load-bearing** — `ref={questionRef}` drives the IntersectionObserver that records `recordActivity('devotional', 'devotional')`, plays the chime, and fires `onComplete?.()`. **The ref MUST stay on the OUTER wrapping `<div>`, not on the inner rolls-own callout `<div>`.** Verify by reading the file during execution.
- The "Pray about today's reading" CTA fires a callback (`onSwitchToPray`), NOT navigation. **Use `<Button onClick={...}>` directly — NOT `asChild`, NOT `<Link>`.** Same shape as "Journal about this question."
- The "Meditate on this passage" CTA fires navigation via `<Link to={...}>`. **Use `<Button asChild>` wrapping the existing `<Link>`** so React Router handles SPA nav correctly. The `<Link>` href is `/meditate/soaking?verse=...&verseText=...&verseTheme=...` — preserve verbatim.
- White pill CTA Pattern 1 (inline rolls-own `bg-white text-primary` pill) is being **replaced** by Button variants on this tab. Future tabs will follow.
- Sticky FAB pattern (`pointer-events-none` outer + `pointer-events-auto` inner with `env(safe-area-inset-*)`) is preserved by `DailyAmbientPillFAB` outside this component — UNCHANGED.
- Frosted glass cards use the `FrostedCard` component, not hand-rolled cards. Quote and reflection body migrate to use it correctly. The reflection question becomes a rolls-own Tier 2 callout (NOT a FrostedCard) — the Tier 2 idiom is its own pattern, not a FrostedCard variant.
- Animation token discipline (BB-33): all transitions on FrostedCard / Button come from canonical tokens — `motion-reduce:transition-none`, `duration-base ease-decelerate`, `duration-fast`. **Do NOT introduce hardcoded `200ms` / `cubic-bezier(...)` strings in this migration.** All migrated surfaces inherit token-based transitions from the variant components.
- Inline-row layouts: this spec has no chip rows or label+input pairs. The Share + Read Aloud action row is a flex row at desktop+, but it stacks on mobile by design (`flex-col sm:flex-row`). No same-row alignment is required at mobile — see § Inline Element Position Expectations below.
- Mood colors / GRADIENT_TEXT_STYLE / Caveat-deprecation / cyan-glow-deprecation: irrelevant to this spec — no headings, no mood orbs, no textareas.
- Test surgery (Step 8) is the highest-risk part of this spec. Behavioral coverage MUST be preserved; class-string assertions on migrated elements are updated in lockstep. Do not fabricate test changes that aren't needed — if an assertion already passes after migration, leave it alone.

---

## Shared Data Models (from Master Plan)

N/A — standalone visual-system spec. No new TypeScript interfaces, no new constants, no new mock data.

**localStorage keys this spec touches:**

| Key                                           | Read/Write                                          | Description                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `wr_devotional_reads`                         | Read on mount + Write on intersection observer fire | Existing devotional completion tracking — UNCHANGED. Capped at 365 entries, day-keyed via `new Date().toLocaleDateString('en-CA')`. |
| `wr_echoes_dismissed_session` (via `useEcho`) | (existing usage)                                    | UNCHANGED.                                                                                                                          |

**No new keys introduced.** No `11-local-storage-keys.md` or `11b-local-storage-keys-bible.md` updates required.

---

## Responsive Structure

| Breakpoint | Width                        | Key Layout Changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mobile     | < 640px (375px reference)    | Single-column stack. Reflection body FrostedCard accent uses `p-5` (mobile padding override). Quote FrostedCard default uses `p-5`. Reflection question rolls-own callout uses `px-5 py-6` (matches passage callout's mobile padding). "Journal about this question" Button at `size="sm"`. "Meditate on this passage" Button at `size="md"`. "Pray about today's reading" gradient Button at `size="lg"`. Share + Read Aloud row stacks **vertically** (`flex-col`) with `gap-3`; both Buttons render at `size="md"` (`min-h-[44px]`). FrostedCard accent variant uses `backdrop-blur-md` (~8px) on mobile. |
| Tablet     | 640–1024px (768px reference) | Reflection body uses `sm:p-8`; quote uses `sm:p-6`; question callout uses `sm:px-7 sm:py-7`. Share + Read Aloud row transitions to **horizontal** (`sm:flex-row sm:justify-center`) with `gap-3`. Accent FrostedCard `md:backdrop-blur-[12px]` kicks in (≥768px). Default FrostedCard `md:backdrop-blur-md` kicks in.                                                                                                                                                                                                                                                                                        |
| Desktop    | ≥ 1024px (1440px reference)  | Same tier behavior as tablet. Reflection body's accent eyebrow renders at full intent (violet leading dot + uppercase tracked label). Gradient "Pray about today's reading" Button renders at full intent (gradient pill, `lg` size, drop shadow, hover lift). Multi-bloom canvas (1A) renders all five layers behind tab content.                                                                                                                                                                                                                                                                           |

**Custom breakpoints:** None introduced. The Daily Hub is dark-themed throughout regardless of width — no light-mode breakpoint forks.

---

## Inline Element Position Expectations (UI features with inline rows)

| Element Group                    | Elements                                                | Expected y-alignment            | Wrap Tolerance                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Share + Read Aloud row (tablet+) | "Share today's devotional" Button + "Read aloud" Button | Same y ±5px at 1440px and 768px | Stacked (different y) at < 640px is REQUIRED behavior — `flex-col` switches to `sm:flex-row` at 640px. Stacking below 640px is the design, not a wrapping bug. |

No other inline-row layouts in this feature. The Pray CTA section, the question section, the reflection body, and the quote are all single-element-per-row by design.

---

## Vertical Rhythm

The Devotional tab uses `<div className="py-6 sm:py-8">` blocks around each major section (passage, reflection, quote, question, Pray CTA). These are **PRESERVED VERBATIM** by this spec. The y-spacing between adjacent surfaces is unchanged.

| From → To                                  | Expected Gap                                             | Source                                     |
| ------------------------------------------ | -------------------------------------------------------- | ------------------------------------------ |
| Date navigation → devotional title         | `pt-8 sm:pt-10` (on the `<h3>`)                          | `DevotionalTabContent.tsx:200` (UNCHANGED) |
| Devotional title → passage section         | `py-6 sm:py-8` (passage section wrapper)                 | `DevotionalTabContent.tsx:205` (UNCHANGED) |
| Passage section → reflection body          | `py-6 sm:py-8` (each section's wrapper)                  | `DevotionalTabContent.tsx:251` (UNCHANGED) |
| Reflection body → quote                    | `py-6 sm:py-8` (each section's wrapper)                  | `DevotionalTabContent.tsx:262` (UNCHANGED) |
| Quote → reflection question                | `py-6 sm:py-8` (each section's wrapper)                  | `DevotionalTabContent.tsx:275` (UNCHANGED) |
| Reflection question → Pray CTA             | `py-6 sm:py-8` (each section's wrapper)                  | `DevotionalTabContent.tsx:300` (UNCHANGED) |
| Pray CTA → RelatedPlanCallout (when shown) | `py-6 sm:py-8` rhythm + RelatedPlanCallout's own padding | UNCHANGED                                  |
| Last section → Share/Read Aloud row        | `mt-8 sm:mt-10` (Share/Read Aloud wrapper)               | `DevotionalTabContent.tsx:338` (UNCHANGED) |
| Share/Read Aloud row → bottom of tab       | `pb-8 sm:pb-12` (bottom padding spacer)                  | `DevotionalTabContent.tsx:360` (UNCHANGED) |

`/verify-with-playwright` Step 6e should compare these against `/daily?tab=devotional` after the migration. Any gap difference > 5px is a regression — the wrappers are preserved verbatim, so no gap should drift.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] DevotionalTabContent.tsx is at the exact line numbers cited (current branch, current main checkout). If line numbers have drifted by more than ±5, re-read the file before each step.
- [ ] DevotionalTabContent.test.tsx is 550 lines as the spec body asserts. If significantly larger or smaller, the test surgery audit (Step 8) re-reads the full file before making changes.
- [ ] FrostedCard.tsx exposes `variant: 'accent' | 'default' | 'subdued'` and `eyebrow: string` props (verified — confirmed during recon).
- [ ] Button.tsx exposes `variant: 'subtle' | 'gradient'` and `asChild: boolean` props (verified — confirmed during recon).
- [ ] All auth-gated actions from the spec are accounted for in the Auth Gating Checklist above. Spec is a visual-system change — zero new auth gates, zero removed auth gates.
- [ ] Design system values are verified from shipped source files (`FrostedCard.tsx`, `Button.tsx`); recon at `_plans/recon/design-system.md` is stale and not used as a source of truth for these specific tokens.
- [ ] Recon report at `_plans/forums/dailyhub-redesign-recon.md` is loaded for context; the spec body internalizes its findings.
- [ ] No deprecated patterns are introduced (no `Caveat` headings, no `BackgroundSquiggle` on Daily Hub, no `GlowBackground` per Daily Hub section, no `animate-glow-pulse`, no cyan textarea borders, no italic Lora prompts, no soft-shadow 8px-radius cards on dark backgrounds, no `PageTransition`).
- [ ] `pnpm test` passes the post-Key-Protection regression baseline before execution begins (8,811 pass / 11 pre-existing fail across 7 files). If the baseline has shifted, surface the discrepancy before proceeding.
- [ ] `pnpm tsc --noEmit` (or `pnpm build` typecheck) passes pre-execution. Button variant union already accepts `'subtle' | 'gradient' | 'default' | 'ghost'` — no new type wiring.
- [ ] `/code-review` and `/verify-with-playwright` are queued for after Step 10. Manual eyeball review on `/daily?tab=devotional` is mandatory (no Playwright visual regression infrastructure exists yet).

---

## [UNVERIFIED] Values

None. Every value in this plan is sourced from a shipped source file (`FrostedCard.tsx`, `Button.tsx`, `DevotionalTabContent.tsx`, or `DevotionalTabContent.test.tsx`) read directly during recon. No guessed values. The recon at `_plans/recon/design-system.md` is documented stale and is NOT used as a source.

If a value drifts during execution (e.g., a future commit changes `FrostedCard.tsx`'s accent surface tokens between this plan and execution), Step 0 of `/execute-plan` re-verifies via direct file read before applying any value.

---

## Edge Cases & Decisions

| Decision                                                                                                                    | Choice                                                                                                               | Rationale                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reflection body padding override                                                                                            | Keep `p-5 sm:p-8` (preserved from current code)                                                                      | The reflection body is the page's primary reading surface — generous padding (`sm:p-8`) is appropriate for prose at `text-[17px] sm:text-lg leading-[1.8]`. FrostedCard's default `p-6` would feel cramped.                                          |
| Quote padding override                                                                                                      | Keep `p-5 sm:p-6` (preserved from current code)                                                                      | Quote is supporting commentary, shorter content — narrower padding reads as quieter than the reflection body.                                                                                                                                        |
| Quote `variant="default"` explicit declaration                                                                              | Declare it explicitly even though `default` is the default value                                                     | Code-review readability: with the reflection body above as `variant="accent"`, the explicit `variant="default"` here makes the tier choice readable at a glance.                                                                                     |
| Reflection question wrapper                                                                                                 | Migrate to rolls-own Tier 2 `<div>` (not a FrostedCard)                                                              | The Tier 2 idiom (`rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04]`) is its own pattern, not a FrostedCard variant. Visually unifies with the passage callout above (both Tier 2).                                                         |
| Reflection question eyebrow color                                                                                           | `text-white/50` with `tracking-[0.15em]` (NOT `text-white/70` with `tracking-widest`)                                | Quieter, more refined — Tier 2 callouts use a different eyebrow treatment than FrostedCard accent. Matches the rolls-own Tier 2 idiom.                                                                                                               |
| Reflection question eyebrow leading dot                                                                                     | NO dot (only Tier 1 accent FrostedCard's eyebrow has the dot)                                                        | The left-stripe accent (`border-l-4 border-l-primary/60`) is the Tier 2 signature; adding a dot would double-up on accent. Externally visible distinction documented in Step 9.                                                                      |
| Reflection question CTA                                                                                                     | `<Button variant="subtle" size="sm" type="button" onClick={...}>` (no `asChild`)                                     | The CTA fires `onSwitchToJournal` callback — NOT navigation. Direct `<Button onClick={...}>` form. Removes the wrapping `<div className="mt-5">` because Button absorbs the layout role; spacing now controlled by `mb-5` on the question paragraph. |
| "Meditate on this passage" CTA                                                                                              | `<Button variant="subtle" size="md" asChild>` wrapping `<Link to="/meditate/soaking?...">`                           | The CTA IS navigation. `asChild` forwards class merging to the `<Link>` so React Router handles SPA nav correctly. Existing href preserved verbatim.                                                                                                 |
| "Meditate on this passage" Spec Z routing                                                                                   | Preserve existing `/meditate/soaking?...` href (NOT migrate to `/daily?tab=meditate&verseRef=...`)                   | Out of scope per spec § Out of Scope. The Spec Z meditate-tab fan-out is the canonical contract going forward, but this spec only refreshes Button chrome.                                                                                           |
| "Pray about today's reading" CTA                                                                                            | `<Button variant="gradient" size="lg" type="button" onClick={...}>` (no `asChild`, no `<Link>`)                      | The CTA fires `onSwitchToPray` callback — NOT navigation. Same shape as "Journal about this question." Gradient variant is the page's emotional peak — used ONCE on this tab.                                                                        |
| Share + Read Aloud icon size                                                                                                | Preserve `<Share2 size={18}>` and `<Volume2 size={18}>` (NOT migrate to `h-4 w-4`)                                   | Recon brief showed `h-4 w-4` as an example, but the actual file uses `size={18}`. Larger icons read better on a primary action row at the bottom of the page. Preserve.                                                                              |
| Read Aloud dynamic label                                                                                                    | Preserve `{readAloud.state === 'idle' ? 'Read aloud' : readAloud.state === 'playing' ? 'Pause' : 'Resume'}` verbatim | The `useReadAloud` state machine is preserved. Button's `size="md"` keeps the bounding box stable across all 3 labels.                                                                                                                               |
| Verse-share icon button (next to passage reference)                                                                         | UNCHANGED — stays rolls-own                                                                                          | Out of scope — icon-only affordance migration would change visual density. Future icon-button audit spec.                                                                                                                                            |
| Passage scripture callout                                                                                                   | UNCHANGED                                                                                                            | Already canonical Tier 2 idiom — the visual reference the reflection question now matches. Migrating it would break the reference.                                                                                                                   |
| Date navigation chevrons                                                                                                    | UNCHANGED                                                                                                            | Out of scope — chevron min-h-[44px] / min-w-[44px] touch targets and `cn()` disabled-state styling stay verbatim.                                                                                                                                    |
| `<h3>` devotional title                                                                                                     | UNCHANGED                                                                                                            | `text-2xl font-bold text-white sm:text-3xl` stays verbatim. No new heading hierarchy introduced.                                                                                                                                                     |
| `RelatedPlanCallout`, `EchoCard`, `SharePanel`                                                                              | UNCHANGED                                                                                                            | Shared components used outside DailyHub — explicitly deferred to a future shared-component sweep spec.                                                                                                                                               |
| `IntersectionObserver` + `wr_devotional_reads` write                                                                        | UNCHANGED                                                                                                            | Completion tracking contract preserved verbatim. The `ref={questionRef}` stays on the OUTER wrapping `<div className="py-6 sm:py-8" ref={questionRef}>`, NOT moved onto the new rolls-own callout div.                                               |
| `useReadAloud`, `useSwipe`, `useFaithPoints`, `useSoundEffects`, `useReadingPlanProgress`, `useToast`, `useAuth`, `useEcho` | UNCHANGED                                                                                                            | All hooks preserved verbatim.                                                                                                                                                                                                                        |
| Test mock structure (vi.mock for `useAuth`, `useFaithPoints`, `useReducedMotion`, `useReadAloud`)                           | UNCHANGED                                                                                                            | Behavioral coverage preserved. No mocks for `FrostedCard` or `Button` are introduced (would bypass variant rendering).                                                                                                                               |

---

## Implementation Steps

### Step 1: Add Button import to DevotionalTabContent.tsx

**Objective:** Add the `Button` import that subsequent steps depend on.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — add one import line.

**Details:**

Verify the existing imports at lines 1–21. The file currently imports `FrostedCard`, `cn`, `EchoCard`, `RelatedPlanCallout`, `VerseLink`, `SharePanel`, hooks, types, and data sources, but does NOT import `Button`. Add:

```tsx
import { Button } from "@/components/ui/Button";
```

Place the import alongside the other component imports (after `FrostedCard` at line 6 is a natural slot — sorted alphabetically by path it would be the first `@/components/ui/*` import in the file). Preserve the rest of the import block verbatim.

**Auth gating:** N/A (import-only change).

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do not reorder unrelated imports.
- Do not add a re-export or barrel export — `Button` is already re-exported from `frontend/src/components/index.ts` if needed elsewhere; this consumer imports directly from `@/components/ui/Button` for path consistency with other Daily Hub components.
- Do not change the `FrostedCard` import path or any other existing import.

**Test specifications:**

| Test      | Type | Description                                                                                                                  |
| --------- | ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| (no test) | —    | Import-only change. Tested transitively by Steps 2–7 (Button-rendering tests will fail to compile if the import is missing). |

**Expected state after completion:**

- [ ] `Button` is imported from `@/components/ui/Button` at the top of `DevotionalTabContent.tsx`.
- [ ] `pnpm tsc --noEmit` (or equivalent typecheck) passes.
- [ ] No other imports changed.

---

### Step 2: Migrate "Meditate on this passage" CTA → subtle Button via asChild

**Objective:** Replace the rolls-own white-pill `<Link>` with a `<Button variant="subtle" size="md" asChild>` wrapping the existing `<Link>`. This is the lowest-risk migration — single element, behavioral handler is navigation (no callback state), wrapping `<div>` preserved.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace lines 234–241 (the `<div className="mt-4 flex items-center gap-4">` block containing the `<Link>`).

**Details:**

Locate the "Meditate on this passage" `<Link>` at line 235–240 inside the passage section, below the passage scripture callout. Currently:

```tsx
<div className="mt-4 flex items-center gap-4">
  <Link
    to={`/meditate/soaking?verse=${encodeURIComponent(devotional.passage.reference)}&verseText=${encodeURIComponent(devotional.passage.verses.map((v) => v.text).join(" "))}&verseTheme=${encodeURIComponent(devotional.theme)}`}
    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-gray-100"
  >
    Meditate on this passage &rarr;
  </Link>
</div>
```

Replace with:

```tsx
<div className="mt-4 flex items-center gap-4">
  <Button variant="subtle" size="md" asChild>
    <Link
      to={`/meditate/soaking?verse=${encodeURIComponent(devotional.passage.reference)}&verseText=${encodeURIComponent(devotional.passage.verses.map((v) => v.text).join(" "))}&verseTheme=${encodeURIComponent(devotional.theme)}`}
    >
      Meditate on this passage &rarr;
    </Link>
  </Button>
</div>
```

Key invariants:

- The wrapping `<div className="mt-4 flex items-center gap-4">` is preserved verbatim — it controls the spacing relative to the passage callout above.
- The `<Link>` `to` attribute is preserved verbatim, including the `encodeURIComponent` calls for `devotional.passage.reference`, joined verse text, and `devotional.theme`.
- The arrow character `&rarr;` is preserved.
- The rolls-own `className` on the `<Link>` is removed entirely (Button's `asChild` clones the `<Link>` and merges Button's class string into it; preserving the rolls-own classes would double-up styling).
- `Button asChild` calls `Children.only` and `cloneElement` (per `Button.tsx:74–84`) — pass exactly ONE child (the `<Link>`), no extra siblings, no fragments.
- Button's subtle variant carries `min-h-[44px]` (per `Button.tsx:52`) — touch target preserved.

**Auth gating:**

- Click navigates to `/meditate/soaking?...`. Logged-out users land on the soaking page; the meditation auth modal triggers per Spec Z's logged-out flow (existing gate, UNCHANGED). Logged-in users navigate directly. No new gate.

**Responsive behavior:**

- Desktop (1440px): rendered at `size="md"` (`px-6 py-2.5 text-sm` per Button.tsx:62). `min-h-[44px]` floor.
- Tablet (768px): identical to desktop.
- Mobile (375px): identical sizing — `size="md"` does not have a separate mobile breakpoint.

**Inline position expectations:** N/A — single-element row.

**Guardrails (DO NOT):**

- Do not change the `<Link>` href. The Spec Z routing change to `/daily?tab=meditate&verseRef=...` is explicitly out of scope for this spec.
- Do not migrate the `<Link>` to a `<button onClick={navigate(...)}>` — that would break SPA navigation and `<a>` semantics.
- Do not add `onClick` to the `<Button>` — `asChild` forwards click handling to the `<Link>`.
- Do not pass the `className` from the original rolls-own pill into the `<Link>` — Button's class merging would conflict.
- Do not introduce a sibling element next to the `<Link>` inside `<Button asChild>` — `Children.only` will throw at runtime.

**Test specifications:**

| Test                                                                                  | Type | Description                                                                                                                                                                         |
| ------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `link has all 3 URL params from devotional passage` (existing, line 502–509)          | unit | UNCHANGED — assertion checks `href` contains `/meditate/soaking?verse=`, `verseText=`, `verseTheme=`. Test PASSES after migration because the `<Link>` href is preserved verbatim.  |
| `link meets 44px touch target` (existing, line 511–516)                               | unit | Subtle variant carries `min-h-[44px]` per Button.tsx:52. Class merges into the `<Link>` via `asChild`. Test PASSES — assertion `anchor.className.toContain('min-h-[44px]')` passes. |
| `renders "Meditate on this passage" link in passage section` (existing, line 496–500) | unit | UNCHANGED — text content is preserved. PASSES.                                                                                                                                      |

**Expected state after completion:**

- [ ] "Meditate on this passage" CTA renders as a `<Button variant="subtle" size="md" asChild>` wrapping a `<Link>` with the existing href preserved verbatim.
- [ ] React Router SPA navigation works (clicking the button navigates without a full page reload).
- [ ] `min-h-[44px]` is present on the rendered `<a>` element (verified via existing test `link meets 44px touch target`).
- [ ] All three existing meditate-link tests pass unchanged.
- [ ] No other elements in the file are modified.

---

### Step 3: Migrate reflection body card → FrostedCard accent + eyebrow

**Objective:** Promote the reflection body to FrostedCard accent variant with an eyebrow ("Today's reflection") so it reads as the page's centerpiece.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace lines 252–258 (the `<FrostedCard>` block inside the reflection section).

**Details:**

Locate the reflection body card at line 252–258 (inside the `<div className="py-6 sm:py-8">` reflection section starting at line 251). Currently:

```tsx
<FrostedCard className="p-5 sm:p-8">
  <div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">
    {devotional.reflection.map((paragraph, i) => (
      <p key={i}>{paragraph}</p>
    ))}
  </div>
</FrostedCard>
```

Replace with:

```tsx
<FrostedCard
  variant="accent"
  eyebrow="Today's reflection"
  className="p-5 sm:p-8"
>
  <div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">
    {devotional.reflection.map((paragraph, i) => (
      <p key={i}>{paragraph}</p>
    ))}
  </div>
</FrostedCard>
```

Key invariants:

- The wrapping `<div className="py-6 sm:py-8">` (line 251) is preserved verbatim.
- Inner `<div className="space-y-5 text-[17px] leading-[1.8] text-white sm:text-lg">` is preserved verbatim — typography of reading body unchanged.
- `devotional.reflection.map((paragraph, i) => <p key={i}>{paragraph}</p>)` is preserved verbatim.
- `className="p-5 sm:p-8"` padding override is preserved (FrostedCard's default `p-6` from `FrostedCard.tsx:29` is overridden by the explicit prop — Tailwind merge handled by `cn()`).
- `variant="accent"` triggers: `bg-violet-500/[0.08] backdrop-blur-md md:backdrop-blur-[12px] border border-violet-400/70 rounded-3xl shadow-frosted-accent` plus the gradient `before:` hairline (per `FrostedCard.tsx:29`).
- `eyebrow="Today's reflection"` triggers the eyebrow render block at `FrostedCard.tsx:80–98` — flex row with violet leading dot (`bg-violet-400`) + uppercase tracked label (`text-violet-300 font-semibold tracking-[0.15em]`).
- Hover treatment from FrostedCard accent variant (`hover:bg-violet-500/[0.13] hover:shadow-frosted-accent-hover hover:-translate-y-0.5`) only applies if `onClick` is set; this card has no `onClick`, so the card is non-interactive (no hover lift, no focus ring, no `cursor-pointer`). This matches the spec — the reflection body is read content, not an interactive surface.

**Auth gating:** N/A — reading content is not gated.

**Responsive behavior:**

- Desktop (1440px): `p-8`, `backdrop-blur-[12px]`, full eyebrow render.
- Tablet (768px): `p-8` (`sm:` breakpoint kicks in at 640px), `backdrop-blur-md` until 768px (`md:` kicks in), then `backdrop-blur-[12px]`.
- Mobile (375px): `p-5`, `backdrop-blur-md`. Eyebrow renders identically across breakpoints.

**Inline position expectations:** N/A — single FrostedCard, no inline-row layouts.

**Guardrails (DO NOT):**

- Do not change the inner reading-typography div's class string — `text-[17px] leading-[1.8] text-white sm:text-lg` is the canonical Tier 1 reading content treatment per Spec T (and `09-design-system.md` § "Daily Hub body text readability standard").
- Do not change the `space-y-5` paragraph spacing.
- Do not change the eyebrow text — "Today's reflection" is the canonical label.
- Do not pass `eyebrowColor="white"` — accent variant defaults to violet eyebrow + violet dot per `FrostedCard.tsx:84–94`.
- Do not add an `onClick` — the reflection body is non-interactive read content.
- Do not change the `<FrostedCard>` import — already present at line 6.
- Do not introduce italic styling on the body prose. Italic was removed in Spec T for sustained-reading legibility.

**Test specifications:**

| Test                                                                                        | Type | Description                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update existing test `Tier 3: reflection body is wrapped in FrostedCard` (line 344–351)     | unit | Existing assertion: `frostedCard.className.toContain('bg-white/[0.07]')` — WILL BREAK because accent variant uses `bg-violet-500/[0.08]`. Update assertion to `frostedCard.className.toContain('bg-violet-500/[0.08]')`. Detailed in Step 8. |
| Update existing test `Tier 3: reflection FrostedCard has generous padding` (line 353–361)   | unit | Assertion: `p-5` and `sm:p-8` — UNCHANGED. PASSES because padding override is preserved.                                                                                                                                                     |
| New test (optional but valuable): `eyebrow "Today's reflection" renders on reflection card` | unit | `expect(screen.getByText("Today's reflection")).toBeInTheDocument()`. Detailed in Step 8.                                                                                                                                                    |

**Expected state after completion:**

- [ ] Reflection body is wrapped in `<FrostedCard variant="accent" eyebrow="Today's reflection" className="p-5 sm:p-8">`.
- [ ] "TODAY'S REFLECTION" eyebrow renders with a violet leading dot above the body paragraphs (visible during manual eyeball review).
- [ ] Inner reading content (paragraphs, typography, paragraph spacing) is preserved verbatim.
- [ ] FrostedCard test in DevotionalTabContent.test.tsx is updated to assert `bg-violet-500/[0.08]`. Optional eyebrow test is added.

---

### Step 4: Migrate quote card → FrostedCard default (explicit)

**Objective:** Make the default-tier choice readable in code by adding the explicit `variant="default"` prop.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace lines 263–271 (the quote `<FrostedCard>` block inside the quote section).

**Details:**

Locate the quote card at line 263–271 (inside the `<div className="py-6 sm:py-8">` quote section starting at line 262). Currently:

```tsx
<FrostedCard className="p-5 sm:p-6">
  <span
    className="font-serif text-5xl leading-none text-white/25"
    aria-hidden="true"
  >
    &ldquo;
  </span>
  <blockquote className="mt-2 font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    {devotional.quote.text}
  </blockquote>
  <p className="mt-3 text-sm text-white/80">
    &mdash; {devotional.quote.attribution}
  </p>
</FrostedCard>
```

Replace with:

```tsx
<FrostedCard variant="default" className="p-5 sm:p-6">
  <span
    className="font-serif text-5xl leading-none text-white/25"
    aria-hidden="true"
  >
    &ldquo;
  </span>
  <blockquote className="mt-2 font-serif text-xl italic leading-[1.6] text-white sm:text-2xl">
    {devotional.quote.text}
  </blockquote>
  <p className="mt-3 text-sm text-white/80">
    &mdash; {devotional.quote.attribution}
  </p>
</FrostedCard>
```

Key invariants:

- ONLY change is the addition of `variant="default"`. `default` is the default value of the `variant` prop, so this is a behavioral no-op — but the explicit declaration is intentional for code-review readability.
- All inner content (decorative left quote, italic blockquote, attribution paragraph) is preserved verbatim.
- `className="p-5 sm:p-6"` padding override is preserved.

**Auth gating:** N/A.

**Responsive behavior:**

- Desktop (1440px): `p-6`, `backdrop-blur-md` (`md:` kicks in).
- Tablet (768px): `p-6`, `backdrop-blur-md`.
- Mobile (375px): `p-5`, `backdrop-blur-sm`.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do not remove the italic styling on the blockquote — italic is appropriate for short quoted commentary (kept by Spec T for the quote, unlike the reflection body where italic was removed).
- Do not change the decorative left quote `<span>`'s class string or `aria-hidden` attribute.
- Do not change the attribution paragraph's class string.
- Do not add an `eyebrow` prop — the quote does NOT have an eyebrow per spec § Functional Requirements 2.

**Test specifications:**

| Test                                                                                        | Type | Description                                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing test `quote section has frosted glass styling` (line 285–291)                      | unit | Assertion: `card.className.toContain('bg-white/[0.07]')`. PASSES UNCHANGED — default variant uses `bg-white/[0.07]` per `FrostedCard.tsx:33`. |
| Existing test `quote blockquote has explicit line height and retains italic` (line 385–390) | unit | PASSES UNCHANGED — italic and `leading-[1.6]` preserved.                                                                                      |
| Existing test `quote attribution is text-white/80` (line 426–432)                           | unit | PASSES UNCHANGED — attribution paragraph preserved verbatim.                                                                                  |
| Existing test `quote section has no border-t divider` (line 392–398)                        | unit | PASSES UNCHANGED — wrapping `<div className="py-6 sm:py-8">` preserved.                                                                       |

**Expected state after completion:**

- [ ] Quote card is wrapped in `<FrostedCard variant="default" className="p-5 sm:p-6">`.
- [ ] All inner content (decorative quote, blockquote, attribution) is preserved verbatim.
- [ ] All four existing quote tests pass unchanged.

---

### Step 5: Migrate reflection question card → rolls-own Tier 2 callout (with embedded subtle Button)

**Objective:** Replace the `FrostedCard` (with `border-l-2 border-l-primary` override) with a rolls-own `<div>` whose class string matches the passage callout above (line 222) exactly. Replace the embedded white-pill `<button>` with `<Button variant="subtle" size="sm">`. Preserve the `ref={questionRef}` on the OUTER wrapping `<div>`.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace lines 275–297 (the entire reflection question section).

**Details:**

Locate the reflection question section at line 274–297. Currently:

```tsx
{
  /* Reflection question section */
}
<div className="py-6 sm:py-8" ref={questionRef}>
  <FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">
    <p className="text-xs font-medium uppercase tracking-widest text-white/70">
      Something to think about
    </p>
    <p className="mt-2 text-xl font-medium leading-[1.5] text-white sm:text-2xl">
      {devotional.reflectionQuestion.replace(
        "Something to think about today: ",
        "",
      )}
    </p>
    <div className="mt-5">
      <button
        type="button"
        onClick={() => {
          const reflectionQuestion = devotional.reflectionQuestion.replace(
            "Something to think about today: ",
            "",
          );
          onSwitchToJournal?.(
            devotional.theme,
            reflectionQuestion,
            buildSnapshot(),
          );
        }}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-[colors,transform] duration-fast hover:bg-gray-100 active:scale-[0.98]"
      >
        Journal about this question &rarr;
      </button>
    </div>
  </FrostedCard>
</div>;
```

Replace with:

```tsx
{
  /* Reflection question section */
}
<div className="py-6 sm:py-8" ref={questionRef}>
  <div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">
    <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3">
      Something to think about
    </p>
    <p className="text-xl font-medium leading-[1.5] text-white sm:text-2xl mb-5">
      {devotional.reflectionQuestion.replace(
        "Something to think about today: ",
        "",
      )}
    </p>
    <Button
      variant="subtle"
      size="sm"
      type="button"
      onClick={() => {
        const reflectionQuestion = devotional.reflectionQuestion.replace(
          "Something to think about today: ",
          "",
        );
        onSwitchToJournal?.(
          devotional.theme,
          reflectionQuestion,
          buildSnapshot(),
        );
      }}
    >
      Journal about this question &rarr;
    </Button>
  </div>
</div>;
```

Key invariants:

- **`ref={questionRef}` stays on the OUTER `<div className="py-6 sm:py-8" ref={questionRef}>` (line 275).** It does NOT move onto the new rolls-own callout `<div>`. This is load-bearing — the IntersectionObserver in the `useEffect` at line 88–120 watches `questionRef.current` to detect scroll-past-50% and fire `recordActivity('devotional', 'devotional')`, `playSoundEffect('chime')`, `setIsCompleted(true)`, write `wr_devotional_reads`, and call `onComplete?.()`. Moving the ref would break completion tracking.
- The new rolls-own wrapper class is `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7` — **identical to the passage callout class string at line 222**. Cross-reference at execution time to confirm exact match. Visual unification depends on this.
- Eyebrow paragraph migrates to `text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3`:
  - `tracking-[0.15em]` (NOT `tracking-widest` — quieter letterspacing).
  - `text-white/50` (NOT `text-white/70` — quieter opacity).
  - `mb-3` replaces the prior `mt-2` on the question paragraph; vertical rhythm now lives on the eyebrow's bottom margin instead of the question's top margin.
  - **NO leading violet dot.** Tier 2 callouts have no dot — only Tier 1 accent FrostedCard's eyebrow does.
- Question paragraph: `text-xl font-medium leading-[1.5] text-white sm:text-2xl mb-5`. Adds `mb-5` to replace the prior `<div className="mt-5">` button wrapper; the wrapping div is removed.
- The CTA migrates from a rolls-own white pill `<button>` to `<Button variant="subtle" size="sm" type="button" onClick={...}>`:
  - The `onClick` handler is preserved verbatim — same `replace('Something to think about today: ', '')` transform, same `onSwitchToJournal?.(devotional.theme, reflectionQuestion, buildSnapshot())` call.
  - `type="button"` is explicit (not strictly necessary since this isn't inside a `<form>`, but the Button component's `type` prop convention preserves it and matches 1B's pattern).
  - **NO `asChild`.** This CTA fires a callback (`onSwitchToJournal`), NOT navigation. Direct `<Button onClick={...}>` form.
  - The `<div className="mt-5">` wrapper is removed because Button absorbs the layout role and `mb-5` on the question paragraph above provides the spacing.
- Subtle variant carries `min-h-[44px]` (per `Button.tsx:52`) — touch target preserved.
- Subtle variant's hover treatment (`hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5`) is the new hover affordance; the prior `active:scale-[0.98]` is preserved by Button's base class string (`Button.tsx:45`).

**Auth gating:**

- The CTA fires `onSwitchToJournal` callback. The parent `DailyHub.tsx` routes to the Journal tab with the question as the prompt. The Journal tab's textarea is reachable without auth; the "Save Entry" gate fires later if/when the user attempts to save (1B preserved that gate). No new gate added by this spec.

**Responsive behavior:**

- Desktop (1440px): rolls-own callout uses `px-7 py-7`; Button at `size="sm"` (`px-4 py-2 text-sm` per Button.tsx:61).
- Tablet (768px): identical to desktop (`sm:` breakpoint kicks in at 640px).
- Mobile (375px): rolls-own callout uses `px-5 py-6`; Button at `size="sm"` (same).

**Inline position expectations:** N/A — single Button per row, single eyebrow + question + CTA stack.

**Guardrails (DO NOT):**

- **Do NOT move `ref={questionRef}` onto the inner rolls-own callout `<div>`.** It must stay on the OUTER wrapping `<div>`. Verify by reading the file before and after the change.
- Do not pass `tracking-widest` or `text-white/70` on the eyebrow — those were the FrostedCard-internal eyebrow tokens; this is a Tier 2 rolls-own eyebrow with `tracking-[0.15em] text-white/50`.
- Do not add a leading violet dot to the eyebrow — Tier 2 callouts have no dot. Step 9 documents this distinction.
- Do not migrate the wrapper to `<FrostedCard variant="subdued">` or any FrostedCard variant. The Tier 2 idiom is its own pattern.
- Do not change the `replace('Something to think about today: ', '')` transform — the prefix-stripping is preserved.
- Do not add `asChild` to the Button — this is a callback, not navigation.
- Do not split the `onClick` handler into a separate function (`handleJournalClick`, etc.) — the inline closure is preserved verbatim per spec § Functional Requirements 3.
- Do not delete or alter the `<div className="py-6 sm:py-8" ref={questionRef}>` wrapping div.

**Test specifications:**

| Test                                                                                                                                 | Type | Description                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Update existing test `reflection question card has frosted glass styling with purple border` (line 264–270)                          | unit | Currently checks `closest('[class*="backdrop-blur"]')`. The new rolls-own div has NO `backdrop-blur` — so `closest('[class*="backdrop-blur"]')` will return `null` and the assertion `expect(card).not.toBeNull()` will fail. Update to find the rolls-own callout via a different selector — e.g., `closest('.border-l-4.border-l-primary\\/60')` or a `data-testid`. Detailed in Step 8. |
| Update existing test `reflection question label uses uppercase tracked treatment` (line 408–415)                                     | unit | Currently asserts `tracking-widest` and `text-white/70`. Update to `tracking-[0.15em]` and `text-white/50`. Detailed in Step 8.                                                                                                                                                                                                                                                            |
| Update existing test `question text uses larger font` (line 417–424)                                                                 | unit | Asserts `text-xl` and `leading-[1.5]` on `label.nextElementSibling`. PASSES — the question paragraph is still the next sibling and class is preserved. (Reading the file confirms: the eyebrow `<p>` is followed by the question `<p>` directly.)                                                                                                                                          |
| Existing behavioral test `"Journal about this" calls onSwitchToJournal with theme and stripped reflection question` (line 162–175)   | unit | PASSES UNCHANGED — text content "Journal about this" rendered by Button preserved; click handler preserved verbatim.                                                                                                                                                                                                                                                                       |
| Existing behavioral test `Journal CTA strips "Something to think about today" prefix from reflection question` (line 194–202)        | unit | PASSES UNCHANGED — `replace(...)` transform preserved verbatim.                                                                                                                                                                                                                                                                                                                            |
| Existing behavioral test for completion tracking via `onComplete` (any test in `Completion Tracking` describe block at line 205–235) | unit | PASSES UNCHANGED — `ref={questionRef}` stays on the OUTER wrapping div, IntersectionObserver fires correctly. Critical: if these tests fail post-migration, the ref was moved onto the inner div by mistake.                                                                                                                                                                               |

**Expected state after completion:**

- [ ] Reflection question wrapper migrates from `<FrostedCard className="border-l-2 border-l-primary p-4 sm:p-6">` to a rolls-own `<div className="rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-5 py-6 sm:px-7 sm:py-7">`.
- [ ] The wrapping `<div className="py-6 sm:py-8" ref={questionRef}>` is preserved verbatim — `ref={questionRef}` stays on the OUTER div.
- [ ] Eyebrow renders as `<p className="text-xs font-medium uppercase tracking-[0.15em] text-white/50 mb-3">Something to think about</p>` (no leading dot).
- [ ] Question paragraph renders as `<p className="text-xl font-medium leading-[1.5] text-white sm:text-2xl mb-5">{...}</p>`.
- [ ] CTA renders as `<Button variant="subtle" size="sm" type="button" onClick={...}>Journal about this question &rarr;</Button>`.
- [ ] IntersectionObserver continues to fire correctly when scrolling past the question (verified by manual scroll test + behavioral test pass).
- [ ] All behavioral cross-tab tests pass unchanged.

---

### Step 6: Migrate "Pray about today's reading" CTA → gradient Button (page emotional peak)

**Objective:** Replace the rolls-own white-pill `<button>` with `<Button variant="gradient" size="lg" type="button" onClick={...}>` — the page's emotional peak. This is the only gradient variant on the Devotional tab.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace lines 299–315 (the entire Pray CTA section).

**Details:**

Locate the Pray CTA section at line 299–315. Currently:

```tsx
{
  /* Pray CTA section */
}
<div className="py-6 sm:py-8">
  <div className="flex flex-col items-center gap-3 text-center">
    <p className="text-sm text-white/60">
      Ready to pray about today&apos;s reading?
    </p>
    <button
      type="button"
      onClick={() => {
        const verseText = devotional.passage.verses
          .map((v) => v.text)
          .join(" ");
        const customPrompt = `I'm reflecting on today's devotional about ${devotional.theme}. The passage is ${devotional.passage.reference}: "${verseText}". Help me pray about what I've read.`;
        onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot());
      }}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary transition-[colors,transform] duration-fast hover:bg-gray-100 active:scale-[0.98]"
    >
      Pray about today&apos;s reading &rarr;
    </button>
  </div>
</div>;
```

Replace with:

```tsx
{
  /* Pray CTA section */
}
<div className="py-6 sm:py-8">
  <div className="flex flex-col items-center gap-3 text-center">
    <p className="text-sm text-white/60">
      Ready to pray about today&apos;s reading?
    </p>
    <Button
      variant="gradient"
      size="lg"
      type="button"
      onClick={() => {
        const verseText = devotional.passage.verses
          .map((v) => v.text)
          .join(" ");
        const customPrompt = `I'm reflecting on today's devotional about ${devotional.theme}. The passage is ${devotional.passage.reference}: "${verseText}". Help me pray about what I've read.`;
        onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot());
      }}
    >
      Pray about today&apos;s reading &rarr;
    </Button>
  </div>
</div>;
```

Key invariants:

- The wrapping `<div className="py-6 sm:py-8">` (line 299) is preserved verbatim.
- The wrapping `<div className="flex flex-col items-center gap-3 text-center">` (line 301) is preserved verbatim — controls centered layout.
- The preceding `<p className="text-sm text-white/60">Ready to pray about today's reading?</p>` is preserved verbatim — does NOT collapse into the Button.
- **NO `asChild`. NO `<Link>`.** This CTA fires `onSwitchToPray` callback — NOT navigation. Direct `<Button onClick={...}>` form. Same shape as Step 5's "Journal about this question" but at gradient variant + `size="lg"`.
- `variant="gradient"` triggers: `rounded-full bg-gradient-to-br from-violet-400 to-violet-300 text-violet-900 hover:from-violet-300 hover:to-violet-200 shadow-gradient-button hover:shadow-gradient-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus-visible:ring-violet-300 gap-2 font-semibold min-h-[44px]` per `Button.tsx:50`.
- `size="lg"` triggers: `px-8 py-3 text-base` per `Button.tsx:63`. Combined with gradient's `font-semibold` and `min-h-[44px]`.
- The inline `customPrompt` template literal is preserved verbatim — concatenates `devotional.theme`, `devotional.passage.reference`, and joined verse text into the conversational prompt.
- The `buildSnapshot()` call is preserved.

**Auth gating:**

- The CTA fires `onSwitchToPray` callback. The parent `DailyHub.tsx` routes to the Pray tab with the contextual prompt. The Pray tab's textarea is reachable without auth; the "Help Me Pray" gate fires when the user submits (1B preserved that gate). No new gate added.

**Responsive behavior:**

- Desktop (1440px): `size="lg"` → `px-8 py-3 text-base` + `font-semibold min-h-[44px]`. Hover lift (`hover:-translate-y-0.5`) and shadow change.
- Tablet (768px): identical to desktop.
- Mobile (375px): identical to desktop. The Button's intrinsic `min-h-[44px]` satisfies the touch target floor.
- `motion-reduce:hover:translate-y-0` disables the hover lift when the OS `prefers-reduced-motion` flag is on. `motion-reduce:transition-none` (from Button base, line 43) disables the transition.

**Inline position expectations:** N/A — Button is centered below the preceding paragraph; both elements stack vertically via `flex-col`.

**Guardrails (DO NOT):**

- **Do NOT use `asChild` or wrap a `<Link>`.** This is a callback, not navigation.
- Do not split the `onClick` handler into a separate function — the inline closure is preserved verbatim per spec § Functional Requirements 5.
- Do not change the `customPrompt` template literal — it's the contextual prompt the Pray tab consumes.
- Do not delete or alter the preceding `<p>` "Ready to pray about today's reading?" element.
- Do not introduce a second gradient Button on this tab — gradient is reserved for THE emotional peak, used ONCE.
- Do not change the wrapping flex container's class string (`flex flex-col items-center gap-3 text-center`) — Button is centered via this layout, not via Button's own width controls.

**Test specifications:**

| Test                                                                                                                    | Type | Description                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update existing test `CTA button has pill styling` (line 460–465)                                                       | unit | Currently asserts `rounded-full` AND `bg-white`. PARTIALLY BREAKS — gradient variant has `rounded-full` (passes) but does NOT have `bg-white` (the gradient is `bg-gradient-to-br from-violet-400 to-violet-300`). Update to assert `rounded-full` + `bg-gradient-to-br` (or `from-violet-400`). Detailed in Step 8. |
| Existing test `CTA button meets 44px touch target` (line 467–471)                                                       | unit | PASSES UNCHANGED — gradient variant carries `min-h-[44px]` per Button.tsx:50.                                                                                                                                                                                                                                        |
| Existing test `CTA button renders with correct text` (line 455–458)                                                     | unit | PASSES UNCHANGED — text content "Pray about today's reading" is preserved.                                                                                                                                                                                                                                           |
| Existing test `CTA intro text renders` (line 443–446)                                                                   | unit | PASSES UNCHANGED — preceding `<p>` preserved verbatim.                                                                                                                                                                                                                                                               |
| Existing test `CTA intro text has muted styling` (line 448–453)                                                         | unit | PASSES UNCHANGED — preceding `<p>` class string preserved.                                                                                                                                                                                                                                                           |
| Existing test `only one Pray CTA button exists` (line 481–485)                                                          | unit | PASSES UNCHANGED — single Button rendered.                                                                                                                                                                                                                                                                           |
| Existing test `no duplicate bottom CTA wrapper` (line 487–492)                                                          | unit | PASSES UNCHANGED — old wrapper class `.mt-8.flex.justify-center` is not introduced (the Share/Read Aloud row uses `flex flex-col gap-3 sm:flex-row sm:justify-center` which has the responsive `sm:justify-center`, not the un-prefixed `justify-center` the test selector requires).                                |
| Existing behavioral test `"Pray about today's reading" calls onSwitchToPray with theme and rich context` (line 177–192) | unit | PASSES UNCHANGED — `customPrompt` template literal and `onSwitchToPray` call preserved verbatim. Asserts presence of "today's devotional about", "The passage is", "Help me pray about what I've read" — all preserved.                                                                                              |
| New test (optional but valuable): `"Pray about today's reading" Button uses gradient variant`                           | unit | `expect(button.className).toContain('bg-gradient-to-br')` (or `from-violet-400`). Verifies the gradient showstopper rendered. Detailed in Step 8.                                                                                                                                                                    |

**Expected state after completion:**

- [ ] "Pray about today's reading" CTA renders as `<Button variant="gradient" size="lg" type="button" onClick={...}>Pray about today's reading &rarr;</Button>`.
- [ ] The handler logic is preserved verbatim — `customPrompt` template literal calls `onSwitchToPray?.(devotional.theme, customPrompt, buildSnapshot())`.
- [ ] The wrapping flex container (`flex flex-col items-center gap-3 text-center`) is preserved.
- [ ] The "Ready to pray about today's reading?" preceding text is preserved.
- [ ] This is the ONLY gradient Button variant on the Devotional tab (verify by reading the migrated file end-to-end).
- [ ] Updated CTA pill test passes; new gradient assertion test passes (if added).

---

### Step 7: Migrate Share + Read Aloud action buttons → subtle Buttons

**Objective:** Replace the two rolls-own frosted pill `<button>`s with `<Button variant="subtle" size="md">`, preserving the wrapping flex container, icon sizes, and the dynamic Read Aloud label.

**Files to create/modify:**

- `frontend/src/components/daily/DevotionalTabContent.tsx` — replace lines 337–356 (the Share + Read Aloud row).

**Details:**

Locate the Share + Read Aloud row at line 337–356. Currently:

```tsx
{
  /* Share & Read Aloud */
}
<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
  <button
    onClick={handleShareClick}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.98]"
  >
    <Share2 size={18} aria-hidden="true" />
    Share today&apos;s devotional
  </button>
  <button
    onClick={handleReadAloudClick}
    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-medium text-white backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.04)] transition-all motion-reduce:transition-none hover:bg-white/[0.09] hover:border-white/[0.18] hover:shadow-[0_0_20px_rgba(139,92,246,0.08)] active:scale-[0.98]"
  >
    <Volume2 size={18} aria-hidden="true" />
    {readAloud.state === "idle"
      ? "Read aloud"
      : readAloud.state === "playing"
        ? "Pause"
        : "Resume"}
  </button>
</div>;
```

Replace with:

```tsx
{
  /* Share & Read Aloud */
}
<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
  <Button variant="subtle" size="md" onClick={handleShareClick}>
    <Share2 size={18} aria-hidden="true" />
    Share today&apos;s devotional
  </Button>
  <Button variant="subtle" size="md" onClick={handleReadAloudClick}>
    <Volume2 size={18} aria-hidden="true" />
    {readAloud.state === "idle"
      ? "Read aloud"
      : readAloud.state === "playing"
        ? "Pause"
        : "Resume"}
  </Button>
</div>;
```

Key invariants:

- The wrapping flex container `<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">` is preserved verbatim. Mobile: stacks vertically (`flex-col`). Tablet+: horizontal (`sm:flex-row sm:justify-center`).
- Icon sizes preserved as `size={18}` on `<Share2>` and `<Volume2>` (NOT migrated to `h-4 w-4` — the recon brief showed `h-4 w-4` as an example, but the actual file uses `size={18}` and the spec preserves this).
- Icons retain `aria-hidden="true"`.
- The Read Aloud dynamic label `{readAloud.state === 'idle' ? 'Read aloud' : readAloud.state === 'playing' ? 'Pause' : 'Resume'}` is preserved verbatim.
- `handleShareClick` and `handleReadAloudClick` (existing closures defined at lines 139–152) are preserved.
- `type` is omitted — Button defaults to `type="button"` for non-asChild usage (verify against `Button.tsx:13–20`; actually the `type` prop default behavior in Button is the HTML default, but Button is rendered as `<button>` and HTML default is `submit`. **Verify whether the Button component sets `type="button"` automatically or whether we need to pass it explicitly.** Reading `Button.tsx` lines 109–113 — the final `<button>` render does NOT explicitly set `type="button"` if not passed. **Pass `type="button"` explicitly on both Share and Read Aloud Buttons** to prevent any future accidental form-submission risk.

**Adjusted code with explicit `type="button"`:**

```tsx
{
  /* Share & Read Aloud */
}
<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
  <Button variant="subtle" size="md" type="button" onClick={handleShareClick}>
    <Share2 size={18} aria-hidden="true" />
    Share today&apos;s devotional
  </Button>
  <Button
    variant="subtle"
    size="md"
    type="button"
    onClick={handleReadAloudClick}
  >
    <Volume2 size={18} aria-hidden="true" />
    {readAloud.state === "idle"
      ? "Read aloud"
      : readAloud.state === "playing"
        ? "Pause"
        : "Resume"}
  </Button>
</div>;
```

The two `<button>`s are not inside a `<form>` (verify by reading the parent component tree), so the practical risk is zero, but explicit `type="button"` matches 1B's pattern and is consistent with Step 5's question CTA.

**Auth gating:** N/A — sharing and TTS are not gated.

**Responsive behavior:**

- Desktop (1440px): horizontal row, both Buttons at `size="md"` (`px-6 py-2.5 text-sm` per Button.tsx:62) + `min-h-[44px]`. Centered via `sm:justify-center`.
- Tablet (768px): identical to desktop (`sm:` kicks in at 640px).
- Mobile (375px): vertical stack, `gap-3` between Buttons. Both at `size="md"` (`min-h-[44px]`).

**Inline position expectations:**

- At desktop (1440px) and tablet (768px), the Share Button and Read Aloud Button must share a y-coordinate (±5px tolerance — both are `size="md"` so the bounding box height is identical). `/verify-with-playwright` Step 6l should confirm.
- Below 640px, the buttons stack — different y-coordinates by design (`flex-col` switches to `sm:flex-row` at 640px).

**Guardrails (DO NOT):**

- Do not change the wrapping flex container's class string — it controls the responsive stacking.
- Do not migrate `<Share2 size={18}>` to `<Share2 className="h-4 w-4">` — preserve `size={18}`.
- Do not collapse the Read Aloud dynamic label into a static string.
- Do not remove `aria-hidden="true"` from the icons — Button accepts the icon as a child and the icon's accessibility role stays decorative-only.
- Do not pass `aria-label` on the Buttons — the text content "Share today's devotional" / "Read aloud" / "Pause" / "Resume" is the accessible name.
- Do not move `handleShareClick` or `handleReadAloudClick` to a separate file — they are local closures with `useCallback` deps on `showToast`, `readAloud`, and `devotional`.

**Test specifications:**

| Test                                                                                                  | Type | Description                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update existing test `action buttons have frosted glass styling` (line 272–277)                       | unit | Currently asserts `rounded-xl` AND `backdrop-blur-sm` on Share button. The subtle variant uses `rounded-full` (NOT `rounded-xl`) but does have `backdrop-blur-sm`. PARTIAL BREAK. Update assertion to `rounded-full` + `backdrop-blur-sm`. Detailed in Step 8. |
| Existing test `renders Share and Read Aloud buttons` (line 115–119)                                   | unit | PASSES UNCHANGED — text content "Share today" and "Read aloud" preserved.                                                                                                                                                                                      |
| Behavioral test (no existing test, but recommended): `clicking Share fires handleShareClick`          | unit | Optional — current behavior is preserved. Click via `userEvent.click` and assert `navigator.clipboard.writeText` was called or toast was shown.                                                                                                                |
| Behavioral test (no existing test, but recommended): `clicking Read aloud fires handleReadAloudClick` | unit | Optional — current behavior is preserved via `readAloud` mock.                                                                                                                                                                                                 |

**Expected state after completion:**

- [ ] "Share today's devotional" Button renders as `<Button variant="subtle" size="md" type="button" onClick={handleShareClick}>` with `<Share2 size={18} aria-hidden="true" />` icon.
- [ ] "Read aloud" Button renders as `<Button variant="subtle" size="md" type="button" onClick={handleReadAloudClick}>` with `<Volume2 size={18} aria-hidden="true" />` icon.
- [ ] Read Aloud Button's dynamic label preserved exactly: `{readAloud.state === 'idle' ? 'Read aloud' : readAloud.state === 'playing' ? 'Pause' : 'Resume'}`.
- [ ] Wrapping flex container preserved: `<div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">` — vertical-on-mobile / horizontal-on-tablet+ layout intact.
- [ ] Icon sizes preserved as `size={18}` (NOT `h-4 w-4`).
- [ ] At tablet+ (768px+), the two Buttons share a y-coordinate (verified by `/verify-with-playwright` Step 6l).
- [ ] Updated `action buttons have frosted glass styling` test passes (asserts `rounded-full` + `backdrop-blur-sm`).

---

### Step 8: Test surgery on DevotionalTabContent.test.tsx

**Objective:** Update class-string assertions on migrated surfaces in lockstep with Steps 2–7. Preserve all behavioral tests. Add optional eyebrow + gradient assertions.

**Files to create/modify:**

- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — surgical updates only. Re-read the full file at execution time before making changes.

**Details:**

Read the test file in full (lines 1–550) before making any change. The recon estimated ~11 specific assertions; verify the actual count by reading. **Do not fabricate test changes that aren't needed** — if an assertion already passes after migration (e.g., a passage callout assertion, a behavioral assertion, the quote `bg-white/[0.07]` assertion), leave it alone.

Apply these specific updates, in order:

#### 8a. Update `Tier 3: reflection body is wrapped in FrostedCard` (line 344–351)

**Before:**

```tsx
it("Tier 3: reflection body is wrapped in FrostedCard", () => {
  const { container } = renderComponent();
  const reflectionContent = container.querySelector(
    ".space-y-5",
  ) as HTMLElement;
  expect(reflectionContent).not.toBeNull();
  const frostedCard = reflectionContent!.closest(
    '[class*="backdrop-blur"]',
  ) as HTMLElement;
  expect(frostedCard).not.toBeNull();
  expect(frostedCard!.className).toContain("bg-white/[0.07]");
});
```

**After:**

```tsx
it("Tier 1: reflection body uses FrostedCard accent variant", () => {
  const { container } = renderComponent();
  const reflectionContent = container.querySelector(
    ".space-y-5",
  ) as HTMLElement;
  expect(reflectionContent).not.toBeNull();
  const frostedCard = reflectionContent!.closest(
    '[class*="backdrop-blur"]',
  ) as HTMLElement;
  expect(frostedCard).not.toBeNull();
  expect(frostedCard!.className).toContain("bg-violet-500/[0.08]");
  expect(frostedCard!.className).toContain("border-violet-400");
});
```

Rename the test title (the prior "Tier 3" naming was the pre-Spec-T tier numbering; post-Spec-T the reflection body is "Tier 1" per `09-design-system.md` § "FrostedCard Tier System (Spec T)"). The describe block at line 307 (`describe('Container tiers', () => { ... })`) can stay as-is since it's a generic name.

#### 8b. Preserve `Tier 3: reflection FrostedCard has generous padding` (line 353–361)

The padding override `p-5 sm:p-8` is preserved verbatim by Step 3, so the test PASSES unchanged. **Optionally** rename the test title from "Tier 3" to "Tier 1" for documentation drift cleanup:

**Optional rename:**

```tsx
it("Tier 1: reflection FrostedCard has generous padding", () => {
  // body unchanged
});
```

This is documentation drift cleanup, not a behavioral change. Apply only if the rename is unambiguous.

#### 8c. Update `reflection question card has frosted glass styling with purple border` (line 264–270)

**Before:**

```tsx
it("reflection question card has frosted glass styling with purple border", () => {
  renderComponent();
  const questionText = screen.getByText(/Something to think about/);
  const card = questionText.closest('[class*="backdrop-blur"]') as HTMLElement;
  expect(card).not.toBeNull();
  expect(card!.className).toContain("border-l-primary");
});
```

The new rolls-own callout `<div>` has NO `backdrop-blur` class — it uses `bg-white/[0.04]` only. So `closest('[class*="backdrop-blur"]')` will return `null` (or worse, ascend to the page-level FrostedCard above), and the assertion will fail.

**After:**

```tsx
it("reflection question is rolls-own Tier 2 callout with left-stripe accent", () => {
  renderComponent();
  const questionText = screen.getByText(/Something to think about/);
  const callout = questionText.closest(".rounded-xl.border-l-4") as HTMLElement;
  expect(callout).not.toBeNull();
  expect(callout!.className).toContain("border-l-primary/60");
  expect(callout!.className).toContain("bg-white/[0.04]");
});
```

The new selector `.rounded-xl.border-l-4` matches both the passage callout (line 222) and the new question callout. Since the test starts from `questionText.closest(...)`, it scopes to the question section only.

#### 8d. Update `reflection question label uses uppercase tracked treatment` (line 408–415)

**Before:**

```tsx
it("reflection question label uses uppercase tracked treatment", () => {
  renderComponent();
  const label = screen.getByText("Something to think about");
  expect(label.className).toContain("uppercase");
  expect(label.className).toContain("tracking-widest");
  expect(label.className).toContain("text-white/70");
  expect(label.className).toContain("font-medium");
});
```

**After:**

```tsx
it("reflection question label uses uppercase tracked treatment", () => {
  renderComponent();
  const label = screen.getByText("Something to think about");
  expect(label.className).toContain("uppercase");
  expect(label.className).toContain("tracking-[0.15em]");
  expect(label.className).toContain("text-white/50");
  expect(label.className).toContain("font-medium");
});
```

Updated tokens: `tracking-widest` → `tracking-[0.15em]`, `text-white/70` → `text-white/50`. Per spec § Functional Requirements 3.

#### 8e. Update `action buttons have frosted glass styling` (line 272–277)

**Before:**

```tsx
it("action buttons have frosted glass styling", () => {
  renderComponent();
  const shareBtn = screen.getByRole("button", { name: /Share today/i });
  expect(shareBtn.className).toContain("rounded-xl");
  expect(shareBtn.className).toContain("backdrop-blur-sm");
});
```

The subtle Button variant uses `rounded-full` (NOT `rounded-xl`).

**After:**

```tsx
it("action buttons render as subtle Button variant with frosted glass chrome", () => {
  renderComponent();
  const shareBtn = screen.getByRole("button", { name: /Share today/i });
  expect(shareBtn.className).toContain("rounded-full");
  expect(shareBtn.className).toContain("backdrop-blur-sm");
  expect(shareBtn.className).toContain("bg-white/[0.07]");
});
```

The `bg-white/[0.07]` token is added as a regression guard — subtle variant's surface color.

#### 8f. Update `CTA button has pill styling` (line 460–465)

**Before:**

```tsx
it("CTA button has pill styling", () => {
  renderComponent();
  const btn = screen.getByRole("button", { name: /Pray about today.*reading/ });
  expect(btn.className).toContain("rounded-full");
  expect(btn.className).toContain("bg-white");
});
```

The gradient variant uses `bg-gradient-to-br from-violet-400 to-violet-300` — NOT `bg-white`.

**After:**

```tsx
it("Pray CTA renders as gradient Button (page emotional peak)", () => {
  renderComponent();
  const btn = screen.getByRole("button", { name: /Pray about today.*reading/ });
  expect(btn.className).toContain("rounded-full");
  expect(btn.className).toContain("bg-gradient-to-br");
  expect(btn.className).toContain("from-violet-400");
});
```

Asserting both `bg-gradient-to-br` and `from-violet-400` provides a stronger regression guard against future variant drift.

#### 8g. ADD optional eyebrow assertion test

**New test:**

```tsx
it("'Today's reflection' eyebrow renders on accent reflection card", () => {
  renderComponent();
  expect(screen.getByText("Today's reflection")).toBeInTheDocument();
});
```

Add this test inside the `describe('Container tiers', () => { ... })` block at line 307, after the existing reflection-body tests. One-liner that verifies the new `eyebrow` prop fired correctly.

#### 8h. ADD optional Tier 2 unification assertion test (recommended)

**New test:**

```tsx
it("reflection question callout matches passage callout Tier 2 idiom", () => {
  const { container } = renderComponent();
  const callouts = container.querySelectorAll(
    ".rounded-xl.border-l-4.border-l-primary\\/60",
  );
  // Two callouts on the page: the passage callout AND the reflection question callout
  expect(callouts.length).toBe(2);
  callouts.forEach((callout) => {
    expect(callout.className).toContain("bg-white/[0.04]");
  });
});
```

Add inside the `describe('Container tiers', () => { ... })` block. Regression guard against future drift between the two callouts.

#### 8i. Verify all behavioral tests pass UNCHANGED

After applying 8a–8h, run the full test file and confirm:

- All tests in `describe('Date Navigation', () => { ... })` (line 122–159) pass — chevron disable/enable, navigate to prev day.
- All tests in `describe('Cross-tab CTAs', () => { ... })` (line 161–203) pass — `onSwitchToJournal` and `onSwitchToPray` called with correct args.
- All tests in `describe('Completion Tracking', () => { ... })` (line 205–235) pass — completion badge appears for logged-in users with `wr_devotional_reads` set; not shown for past days. **Critical: if `Completion Tracking` tests fail, the `ref={questionRef}` was likely moved onto the inner div by mistake.**
- All tests in `describe('Verse linking', () => { ... })` (line 238–256) pass — passage reference rendered as a `/bible/...` link with `text-white/80`.
- All tests in `describe('Visual atmosphere', () => { ... })` (line 258–263) pass — no glow orbs.
- All tests in `describe('Readability enhancements', () => { ... })` (line 365–433) pass except 8d (already updated).
- All tests in `describe('Pray CTA section', () => { ... })` (line 442–493) pass except 8f (already updated).
- All tests in `describe('Meditate on passage link', () => { ... })` (line 495–517) pass — Step 2 preserved the `<Link>` href and the `min-h-[44px]` class; the `min-h-[44px]` arrives via Button's subtle variant which `asChild` forwards to the `<Link>`.
- All tests in `describe('Content order', () => { ... })` (line 519–549) pass — DOM order is preserved by Steps 2–7.

#### 8j. Do NOT add tests that bypass variant rendering

- Do NOT mock `FrostedCard` or `Button` modules (would bypass variant class string rendering).
- Do NOT replace class-string assertions with `data-testid` attributes solely for the convenience of the test — class-string assertions are the visual-regression guard for this spec.

**Auth gating:** N/A — test surgery only.

**Responsive behavior:** N/A: no UI impact.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do not delete behavioral tests.
- Do not relax assertions from class-string checks to mere `toBeInTheDocument()` — that would weaken the regression guard.
- Do not introduce a `vi.mock('@/components/homepage/FrostedCard', ...)` or `vi.mock('@/components/ui/Button', ...)` — the variant class strings ARE what we're testing.
- Do not rename the `describe('Container tiers', () => { ... })` block unless every nested test title is also updated coherently. Optional rename of "Tier 3" → "Tier 1" inside test titles per 8b is fine, but the describe block name is generic and stays.

**Test specifications:**

| Test                                                                                                                                             | Type       | Description                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------ |
| (8a) `Tier 1: reflection body uses FrostedCard accent variant` (renamed from `Tier 3: ...`)                                                      | unit       | Updated to assert `bg-violet-500/[0.08]` and `border-violet-400`.                                      |
| (8b) `Tier 1: reflection FrostedCard has generous padding` (optional rename from `Tier 3: ...`)                                                  | unit       | Body unchanged; asserts `p-5` and `sm:p-8`. PASSES.                                                    |
| (8c) `reflection question is rolls-own Tier 2 callout with left-stripe accent` (renamed from `... has frosted glass styling with purple border`) | unit       | Updated to use `.rounded-xl.border-l-4` selector and assert `border-l-primary/60` + `bg-white/[0.04]`. |
| (8d) `reflection question label uses uppercase tracked treatment`                                                                                | unit       | Updated tokens: `tracking-[0.15em]` + `text-white/50`.                                                 |
| (8e) `action buttons render as subtle Button variant with frosted glass chrome` (renamed from `... have frosted glass styling`)                  | unit       | Updated to assert `rounded-full` + `backdrop-blur-sm` + `bg-white/[0.07]`.                             |
| (8f) `Pray CTA renders as gradient Button (page emotional peak)` (renamed from `CTA button has pill styling`)                                    | unit       | Updated to assert `rounded-full` + `bg-gradient-to-br` + `from-violet-400`.                            |
| (8g) `'Today's reflection' eyebrow renders on accent reflection card`                                                                            | unit (NEW) | Asserts `screen.getByText("Today's reflection")` is in the document.                                   |
| (8h) `reflection question callout matches passage callout Tier 2 idiom`                                                                          | unit (NEW) | Asserts both callouts (passage + question) share the Tier 2 class string.                              |
| (8i) All behavioral tests                                                                                                                        | unit       | PASS UNCHANGED.                                                                                        |

**Expected state after completion:**

- [ ] All 5 class-string-touching tests (8a, 8c, 8d, 8e, 8f) updated in lockstep with the source migration.
- [ ] 2 new optional tests added (8g, 8h).
- [ ] Optional describe-title rename (8b) applied if unambiguous.
- [ ] All behavioral tests pass unchanged.
- [ ] `pnpm test` passes — DevotionalTabContent.test.tsx pass count is at least equal to pre-migration; no new failures.
- [ ] No mocks bypass variant rendering (no `vi.mock` for `FrostedCard` or `Button`).

---

### Step 9: Documentation update — `09-design-system.md` Tier 1 vs Tier 2 eyebrow distinction

**Objective:** Add a one-paragraph note to `.claude/rules/09-design-system.md` § "FrostedCard Tier System (Spec T)" capturing the dot-vs-no-dot distinction between Tier 1 (FrostedCard accent eyebrow, has violet leading dot) and Tier 2 (rolls-own callout eyebrow, no leading dot).

**Files to create/modify:**

- `.claude/rules/09-design-system.md` — append one paragraph to the existing § "FrostedCard Tier System (Spec T)" sub-section.

**Details:**

Locate the § "FrostedCard Tier System (Spec T)" sub-section inside `09-design-system.md`. The current section reads:

> The Daily Hub devotional uses a content tier system to prioritize reading-heavy elements:
>
> - **Tier 1 (primary reading content):** Standard FrostedCard with `text-white`, `leading-[1.75]` to `leading-[1.8]`, font sizing `text-[17px] sm:text-lg`. Used for: reflection body, saint quote, reflection question. Italic styling removed for readability.
> - **Tier 2 (scripture callout):** `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` — a left-border accent treatment for the devotional passage. Lighter than a full FrostedCard but still distinct from body prose.
>
> This tier system is canonical for any future feature with mixed content density (reading content + accent callouts).

Append a new paragraph below the bullets and before the closing line:

> **Eyebrow distinction (DailyHub 2):** Tier 1 (FrostedCard accent variant) and Tier 2 (rolls-own callout) both support an uppercase tracked eyebrow above the inner content, but they render the eyebrow differently. Tier 1 — when used with `<FrostedCard variant="accent" eyebrow="...">` — renders the eyebrow as a violet leading dot (`bg-violet-400`) followed by the label (`text-violet-300 font-semibold tracking-[0.15em]`). The dot is the visual signature of the most prominent tier. Tier 2 — when used as a rolls-own `<div>` with an inline eyebrow paragraph — renders ONLY the label (`text-white/50 font-medium tracking-[0.15em]`) with NO leading dot. The left-stripe accent (`border-l-4 border-l-primary/60`) is the Tier 2 signature; adding a dot would double up on accent. Apply the dot to Tier 1 eyebrows only.

Also add a brief reference inside the § "Tier 1 (primary reading content)" bullet to clarify the post-DailyHub-2 reflection body's accent treatment:

The Tier 1 bullet currently lists "reflection body, saint quote, reflection question" — post-Spec-2, the reflection body uses **FrostedCard accent** (Tier 1 promoted), the saint quote uses **FrostedCard default** (still Tier 1 by content type but at default visual weight), and the reflection question becomes a **Tier 2 callout**. Update the bullet text to:

> - **Tier 1 (primary reading content):** Standard FrostedCard with `text-white`, `leading-[1.75]` to `leading-[1.8]`, font sizing `text-[17px] sm:text-lg`. Reflection body uses `variant="accent"` with eyebrow ("Today's reflection") + violet leading dot — DailyHub 2 promoted this card to centerpiece tier. Saint quote uses `variant="default"` for a quieter supporting voice. Italic styling removed from reading prose for legibility (kept on the saint quote because short quoted commentary reads well in italic).

The bullet for Tier 2 (scripture callout) gains a sub-sentence noting that DailyHub 2 also migrated the **reflection question** to this idiom:

> - **Tier 2 (scripture callout):** `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3` (or `px-5 py-6 sm:px-7 sm:py-7` for content-heavy callouts) — a left-border accent treatment originally introduced for the devotional passage and extended in DailyHub 2 to the reflection question. Both callouts share the same class string for visual unification across the tab. Lighter than a full FrostedCard but still distinct from body prose.

**Auth gating:** N/A.

**Responsive behavior:** N/A: documentation only.

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do not modify any other section of `09-design-system.md`.
- Do not introduce a new entry in the Deprecated Patterns table — the deprecated patterns inventory is unchanged by this spec (no new patterns deprecated).
- Do not modify `11-local-storage-keys.md` or `11b-local-storage-keys-bible.md` — no new keys introduced.
- Do not modify `04-frontend-standards.md` — design system source of truth is `09-design-system.md`.

**Test specifications:**

| Test      | Type | Description                                  |
| --------- | ---- | -------------------------------------------- |
| (no test) | —    | Documentation update. No automated coverage. |

**Expected state after completion:**

- [ ] § "FrostedCard Tier System (Spec T)" gains a one-paragraph "Eyebrow distinction (DailyHub 2)" note documenting the dot-vs-no-dot rule.
- [ ] Tier 1 bullet updated to mention the reflection body's accent promotion and the saint quote's default tier.
- [ ] Tier 2 bullet updated to mention the reflection question now also uses this idiom.
- [ ] No other rule files are touched.

---

### Step 10: Manual visual verification on `/daily?tab=devotional` + regression sweep

**Objective:** Visually verify the Devotional tab on `/daily?tab=devotional` matches the spec's acceptance criteria, and perform a regression sweep on the other tabs (Pray, Journal, Meditate) and `/bible` to confirm no visual drift.

**Files to create/modify:**

- (none — verification step)

**Details:**

Spec § "Manual visual verification" prescribes the eyeball-review acceptance criteria. Run the dev server (`pnpm dev` from `frontend/`) and navigate to each route in turn. For each, confirm the spec's acceptance criteria visually.

#### 10a. `/daily?tab=devotional` (primary visual target)

- [ ] Reflection body card has visible **violet accent border** + violet glow + **"Today's reflection" eyebrow with violet leading dot** above the body paragraphs.
- [ ] Quote card reads as quieter default tier — no violet border, just standard frosted glass treatment lifting it off the canvas; decorative left quote and italic blockquote render unchanged.
- [ ] Reflection question callout (the "Something to think about" + question + "Journal about this question" CTA) **visually matches the passage callout above it** — both Tier 2 idiom with `border-l-4 border-l-primary/60` left stripe on `bg-white/[0.04]` muted background; the question's eyebrow does NOT have a leading dot.
- [ ] "Meditate on this passage" reads as a quiet subtle pill — frosted glass, white text, hover lift via shadow.
- [ ] "Journal about this question" reads as a quiet subtle pill (same chrome as "Meditate on this passage").
- [ ] **"Pray about today's reading" is the gradient showstopper** — visibly the most important action on the page; gradient pill, lg size, drop shadow, hover lift; the "Ready to pray about today's reading?" preceding text renders unchanged.
- [ ] "Share today's devotional" + "Read aloud" buttons read as quiet subtle pills at the bottom; on mobile they stack vertically with `gap-3`; on tablet+ they sit side-by-side, centered.
- [ ] All shared components (`RelatedPlanCallout` when shown, `EchoCard` when shown, `SharePanel` when opened) look unchanged from before.
- [ ] Navigating away from the day (Previous-day / Next-day chevrons) and back: the date strip and devotional content render correctly; the new visual hierarchy renders correctly on yesterday's / day-before-yesterday's content.

#### 10b. Regression sweep

- [ ] `/daily?tab=pray` — still looks like 1B (textarea has violet glow, "Help Me Pray" gradient showstopper, generated prayer card accent, guided prayer cards default tier).
- [ ] `/daily?tab=journal` — still looks like 1B (toggle has violet active pill, textarea violet glow, "Save Entry" gradient, saved entries default tier).
- [ ] `/daily?tab=meditate` — still looks like 1A (6 meditation cards, multi-bloom canvas, tab bar).
- [ ] `/bible` — BibleLanding renders correctly (multi-bloom canvas, pilot card variants unchanged).
- [ ] DailyAmbientPillFAB still renders bottom-right on all 4 tabs and auto-hides when the AudioDrawer opens.
- [ ] Multi-bloom BackgroundCanvas continues to render all five layers behind the Devotional tab content.
- [ ] HorizonGlow layer renders behind the Devotional tab content.

#### 10c. Behavioral verification

- [ ] Logged-in: scroll past the reflection question on `/daily?tab=devotional`; confirm the "Completed" badge appears next to the date. Refresh — badge persists. (Verifies `wr_devotional_reads` write + `IntersectionObserver` fire + `recordActivity` + `playSoundEffect` still work after the ref-on-outer-div migration.)
- [ ] Logged-in: click "Journal about this question" — confirm the Journal tab opens with the question prefilled in the textarea. (Verifies `onSwitchToJournal` callback + `buildSnapshot()` still fire.)
- [ ] Logged-in: click "Pray about today's reading" — confirm the Pray tab opens with the contextual prompt prefilled. (Verifies `onSwitchToPray` callback + `customPrompt` template literal still fire.)
- [ ] Click "Meditate on this passage" — confirm SPA navigation to `/meditate/soaking?verse=...&verseText=...&verseTheme=...` (no full page reload).
- [ ] Click "Share today's devotional" — confirm clipboard write + toast appearance.
- [ ] Click "Read aloud" — confirm TTS playback starts; click again to confirm pause; click again to confirm resume.

#### 10d. Type & test pass

- [ ] `pnpm tsc --noEmit` passes (typecheck clean).
- [ ] `pnpm test` passes; no new failing files relative to the post-Key-Protection regression baseline (8,811 pass / 11 pre-existing fail across 7 files).
- [ ] DevotionalTabContent.test.tsx behavioral coverage preserved — every previously-passing behavioral test passes after the migration. Updated class-string assertions pass. New optional eyebrow + Tier 2 unification + gradient assertions pass.
- [ ] No tests mock the entire `FrostedCard` or `Button` modules.
- [ ] `pnpm build` passes (production build clean) — verifies typecheck + bundling with no regressions.
- [ ] `pnpm lint` passes (ESLint clean).

#### 10e. Accessibility spot check

- [ ] `min-h-[44px]` is present on every migrated CTA — verified via DevTools Computed tab on each Button.
- [ ] Focus ring renders on each Button when keyboard-focused (Tab through the page).
- [ ] Decorative icons inside the action Buttons (`<Share2 size={18} aria-hidden="true">`, `<Volume2 size={18} aria-hidden="true">`) carry `aria-hidden="true"`.
- [ ] No new `aria-live` region introduced. No heading hierarchy change.
- [ ] No `outline-none` / `focus:outline-none` introduced anywhere.
- [ ] `prefers-reduced-motion: reduce` (set via DevTools "rendering > emulate CSS media") disables hover lift on Buttons (`motion-reduce:hover:translate-y-0`) and disables FrostedCard transitions (`motion-reduce:transition-none`). No animation breakage.

**Auth gating:** N/A.

**Responsive behavior:**

- Run all visual checks at 1440px (desktop), 768px (tablet), and 375px (mobile) viewport widths.

**Inline position expectations:**

- At 768px+: "Share today's devotional" Button and "Read aloud" Button must share a y-coordinate (±5px tolerance — both are `size="md"` so bounding-box height is identical). Verify via DevTools "Computed" tab on both Buttons.
- At < 640px: Buttons stack — different y-coordinates by design.

**Guardrails (DO NOT):**

- Do not commit until `/code-review` passes and `/verify-with-playwright` (if invoked) passes.
- Do not skip the regression sweep on the other tabs — visual drift on Pray / Journal / Meditate is the highest-risk failure mode.

**Test specifications:**

| Test             | Type | Description                                                                      |
| ---------------- | ---- | -------------------------------------------------------------------------------- |
| (manual eyeball) | —    | All acceptance criteria from spec § "Manual visual verification" + this Step 10. |
| (test suite)     | unit | `pnpm test` passes; baseline preserved.                                          |
| (typecheck)      | unit | `pnpm tsc --noEmit` (or `pnpm build`) passes.                                    |

**Expected state after completion:**

- [ ] All acceptance criteria from spec § "Acceptance Criteria" checked off.
- [ ] All visual regression checks pass.
- [ ] All behavioral checks pass.
- [ ] All test/build/typecheck/lint checks pass.
- [ ] Plan ready for `/code-review` and `/verify-with-playwright`.

---

## Step Dependency Map

| Step | Depends On                      | Description                                                                                                                                                 |
| ---- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | —                               | Add Button import.                                                                                                                                          |
| 2    | 1                               | Migrate "Meditate on this passage" CTA → subtle Button asChild.                                                                                             |
| 3    | 1                               | Migrate reflection body → FrostedCard accent + eyebrow.                                                                                                     |
| 4    | —                               | Migrate quote → FrostedCard default explicit. (Step 1 not required since FrostedCard is already imported; explicit `variant="default"` is the only change.) |
| 5    | 1                               | Migrate reflection question → rolls-own Tier 2 callout with embedded subtle Button.                                                                         |
| 6    | 1                               | Migrate "Pray about today's reading" CTA → gradient Button.                                                                                                 |
| 7    | 1                               | Migrate Share + Read Aloud → subtle Buttons.                                                                                                                |
| 8    | 2, 3, 4, 5, 6, 7                | Test surgery — class-string updates + optional new tests. Must come AFTER all source migrations are in place.                                               |
| 9    | (none — independent doc update) | `09-design-system.md` Tier 1 vs Tier 2 eyebrow distinction.                                                                                                 |
| 10   | 1, 2, 3, 4, 5, 6, 7, 8, 9       | Manual visual verification + regression sweep + test/build/typecheck/lint.                                                                                  |

**Recommended execution order:** 1 → 2 → 4 → 3 → 5 → 6 → 7 → 8 → 9 → 10.

Step 4 (quote default explicit) is placed before Steps 3, 5, 6, 7 because it's the safest single-prop addition and provides a quick "is the build still green?" signal before the bigger migrations. Step 8 must come last among code changes because it depends on every source migration being in place.

---

## Execution Log

| Step | Title                                                                                     | Status        | Completion Date | Notes / Actual Files |
| ---- | ----------------------------------------------------------------------------------------- | ------------- | --------------- | -------------------- |
| 1    | Add Button import to DevotionalTabContent.tsx                                             | [NOT STARTED] |                 |                      |
| 2    | Migrate "Meditate on this passage" CTA → subtle Button via asChild                        | [NOT STARTED] |                 |                      |
| 3    | Migrate reflection body card → FrostedCard accent + eyebrow                               | [NOT STARTED] |                 |                      |
| 4    | Migrate quote card → FrostedCard default (explicit)                                       | [NOT STARTED] |                 |                      |
| 5    | Migrate reflection question card → rolls-own Tier 2 callout (with embedded subtle Button) | [NOT STARTED] |                 |                      |
| 6    | Migrate "Pray about today's reading" CTA → gradient Button (page emotional peak)          | [NOT STARTED] |                 |                      |
| 7    | Migrate Share + Read Aloud action buttons → subtle Buttons                                | [NOT STARTED] |                 |                      |
| 8    | Test surgery on DevotionalTabContent.test.tsx                                             | [NOT STARTED] |                 |                      |
| 9    | Documentation update — `09-design-system.md` Tier 1 vs Tier 2 eyebrow distinction         | [NOT STARTED] |                 |                      |
| 10   | Manual visual verification on `/daily?tab=devotional` + regression sweep                  | [NOT STARTED] |                 |                      |
