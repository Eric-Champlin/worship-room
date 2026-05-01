# Implementation Plan: DailyHub Holistic Redesign 1A — Foundation + Meditate

**Spec:** `_specs/dailyhub-1a-foundation-and-meditate.md`
**Date:** 2026-05-01
**Branch:** `forums-wave-continued` (current — spec brief explicitly forbids new branches; user manages git manually)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured before iteration-1, see Recon staleness note below)
**Recon Report:** `_plans/forums/dailyhub-redesign-recon.md` (untracked but staged; existence confirmed; the spec body internalizes its findings — read directly during execution if any ambiguity arises)
**Master Spec Plan:** N/A — standalone visual-system spec. Predecessor specs (loaded for context): `_specs/frostedcard-pilot-bible-landing.md` and `_specs/frostedcard-iteration-1-make-it-pop.md`. Their plans live at `_plans/2026-04-30-frostedcard-pilot-bible-landing.md` and `_plans/2026-04-30-frostedcard-iteration-1-make-it-pop.md`.

> **⚠️ Recon staleness flag.** `_plans/recon/design-system.md` was captured before the FrostedCard pilot and iteration-1 shipped, so its values for FrostedCard surface tokens, BackgroundCanvas background, and the violet ramp are stale. **Authoritative current values in this plan come from reading the shipped source files directly** (`frontend/tailwind.config.js`, `FrostedCard.tsx`, `BackgroundCanvas.tsx`, `Button.tsx`). The recon is referenced for cross-page context (Daily Hub Visual Architecture, white pill CTA patterns, textarea glow) but not for the values this spec touches.

---

## Affected Frontend Routes

- `/daily` (default tab — Devotional)
- `/daily?tab=devotional`
- `/daily?tab=pray`
- `/daily?tab=journal`
- `/daily?tab=meditate` (primary visual target of this spec)
- `/bible` (regression check — multi-bloom BackgroundCanvas affects this page too; pilot card variants must continue to render correctly)

---

## Architecture Context

### Files this spec touches (verified via direct file read 2026-05-01)

| File | Role | Currently |
|---|---|---|
| `frontend/tailwind.config.js` | Design tokens | Already has the 6 frosted/gradient shadow tokens shipped by the pilot + iteration-1. Already has the violet ramp (50–900) and `canvas-shoulder` / `canvas-deep`. **Adds:** one new `boxShadow` entry `subtle-button-hover`. |
| `frontend/src/components/ui/BackgroundCanvas.tsx` | Page-level atmospheric canvas | 24 lines. Currently a single-radial-over-linear treatment (post-iteration-1: top-bloom variant `radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) ...)` + radial darkness + diagonal linear). **Updates:** `style.background` to the 5-layer composition. |
| `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` | Test | 32 lines, 3 tests: renders children, applies className, has `min-h-screen + relative + overflow-hidden`. **No exact-background-string assertion** — survives unchanged. |
| `frontend/src/components/ui/Button.tsx` | Reusable button component | 116 lines. Variant union: `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'light' \| 'gradient'`. The `cn()` block has special branches for `light` and `gradient` (both rounded-full pill-shaped). **Updates:** add `'subtle'` to the union, the rounded-md exclusion, the special-case branch, and the size table entries. |
| `frontend/src/components/ui/__tests__/Button.test.tsx` | Test | 274 lines. Has primary, light (with size variants), `asChild`, disabled, `isLoading`, and gradient describe blocks. **Adds:** ~6 subtle-variant tests in a new describe block. |
| `frontend/src/pages/DailyHub.tsx` | DailyHub page (4-tab hub) | 388 lines. Outer at line 214: `<div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">`. `<HorizonGlow />` mounted at line 215. Tab bar tablist at line 247. Active tab style at lines 270–272. **Updates:** swap outer to `<BackgroundCanvas>`, drop `<HorizonGlow />` mount + import, update tablist + active-tab class strings. |
| `frontend/src/pages/__tests__/DailyHub.test.tsx` | Test | 412 lines. Has `bg-hero-bg` assertions at lines 292/293/307 and a HorizonGlow children-count assertion at lines 310–319. Tablist class assertions at lines 324–325 and 331. **Updates:** all noted below in Step 5. |
| `frontend/src/components/daily/MeditateTabContent.tsx` | Meditate tab content | 175 lines. 6 meditation cards rendered inline as rolls-own `<button>` elements (lines 105–168). Conditional `isSuggested` className at lines 121–139. "Suggested" pill at lines 141–145. **Updates:** swap each `<button>` to `<FrostedCard as="button" variant={isSuggested ? 'accent' : 'default'}>` with consolidated className. |
| `frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx` | Test | 229 lines. **Verified: ZERO class-string assertions on FrostedCard surface tokens** (no `bg-white/[0.06]`, no `border-white/[0.12]`, no `bg-primary/10`, no `ring-primary/30`). All 7 tests are behavioral (verse context, navigation, banner coexistence). **No updates required** — runs unchanged. |
| `frontend/src/components/daily/HorizonGlow.tsx` | HorizonGlow component | **NOT MODIFIED.** Stays in place (the spec is explicit). |
| `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx` | HorizonGlow test | **NOT MODIFIED.** 61 lines, stays in place and continues to pass. |

### Predecessor pilot + iteration-1 surface values (authoritative — from `FrostedCard.tsx`)

The Meditate tab uses the FrostedCard component shipped by the pilot + iteration-1. The actual variant surfaces in source today are:

| Variant | Background | Border | Backdrop blur | Shadow | Padding |
|---|---|---|---|---|---|
| `accent` | `bg-violet-500/[0.08]` | `border-violet-400/70` | `backdrop-blur-md md:backdrop-blur-[12px]` | `shadow-frosted-accent` | `p-6` |
| `default` | `bg-white/[0.07]` | `border-white/[0.12]` | `backdrop-blur-sm md:backdrop-blur-md` | `shadow-frosted-base` | `p-6` |
| `subdued` | `bg-white/[0.05]` | `border-white/[0.10]` | `backdrop-blur-sm md:backdrop-blur-md` | none | `p-5` |

Hover (interactive only):
- `accent`: `hover:bg-violet-500/[0.13] hover:shadow-frosted-accent-hover hover:-translate-y-0.5`
- `default`: `hover:bg-white/[0.10] hover:shadow-frosted-hover hover:-translate-y-0.5`
- `subdued`: `hover:bg-white/[0.04]`

Accent variant ALSO carries a top-edge hairline via a `before:` pseudo-element (added in iteration-1) — automatic when the variant is set; consumers don't pass anything.

> ⚠️ **Spec text vs. shipped iteration-1 reality.** The spec body says the migrated meditation tests should assert `'border-white/[0.08]'` (default) and `'border-violet-400/45'` (accent). The shipped iteration-1 FrostedCard uses `'border-white/[0.12]'` and `'border-violet-400/70'`. **The shipped values win.** When the spec text and the shipped FrostedCard disagree, the FrostedCard component is the authority — this plan uses the shipped values throughout. See [UNVERIFIED] flag in Step 6.

### Pattern: provider wrapping for tests

DailyHub tests wrap with `<MemoryRouter>` + `<ToastProvider>` + `<AuthModalProvider>` and mock `useAuth`, `useFaithPoints`, `useSoundEffects`, `@/components/audio/AudioProvider`, and `@/hooks/useScenePlayer`. MeditateTabContent tests wrap with `<MemoryRouter>` + `<AuthProvider>` + `<ToastProvider>` + `<AuthModalProvider>` and mock `useReducedMotion`, `useFaithPoints`, `loadChapterWeb`, and `useNavigate`. Follow these patterns for any new test added to those files.

### Auth gating — implementation details

The Meditate tab's auth gate lives at `MeditateTabContent.tsx` lines 108–112: when a card is clicked while logged out, `authModal?.openAuthModal('Sign in to start meditating')` fires before the navigation. **Preserve this onClick handler verbatim** when migrating to FrostedCard — the FrostedCard `onClick` prop forwards directly to the underlying element, so the existing handler logic moves unchanged into the FrostedCard's `onClick`.

### Dependencies between steps

Steps 1, 2, 3 are independent (token, component, component). Steps 4 and 5 both modify `DailyHub.tsx` — they should land together to avoid intermediate broken states. Step 6 modifies `MeditateTabContent.tsx` and its test (verified zero class-string assertions). Steps run in order 1 → 2 → 3 → (4+5 combined) → 6.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|---|---|---|---|
| Click a Meditate card (Default tier — non-suggested) | Auth modal triggers when logged out (preserved exactly) | Step 6 | `useAuthModal()` + the existing `authModal?.openAuthModal('Sign in to start meditating')` call inside the `onClick` handler (preserved verbatim) |
| Click the Suggested Meditate card (Accent tier) | Same auth-modal behavior — only the visual variant differs | Step 6 | Same handler — the `isSuggested` ternary only switches the FrostedCard `variant` prop, NOT the click handler |
| Click a tab in the DailyHub tab bar | No auth gate (public) | Step 4 | N/A — tab switching is unauthenticated; preserved exactly |
| All other DailyHub interactions (hero greeting, song pick, footer, ambient pill) | No auth-gating change | N/A | Preserved unchanged |

Every spec-defined auth gate is accounted for. The Meditate gate is the only auth-gated action this spec touches; the spec is otherwise a visual surface change.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|---|---|---|---|
| `boxShadow` token (NEW) | `subtle-button-hover` | `0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)` | spec § Token additions |
| `BackgroundCanvas` | `style.background` (NEW — 5 layers) | `radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%), radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%), radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%), radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%), linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)` | spec § Change 1 |
| `BackgroundCanvas` | shell classes | `relative min-h-screen overflow-hidden` (preserved) | `BackgroundCanvas.tsx` line 18 |
| `Button variant="subtle"` | base classes | `rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]` | spec § Change 2 |
| `Button variant="subtle"` | size sm | `px-4 py-2 text-sm` | spec § Change 2, modeled on `light`/`gradient` |
| `Button variant="subtle"` | size md | `px-6 py-2.5 text-sm` | spec § Change 2 |
| `Button variant="subtle"` | size lg | `px-8 py-3 text-base` | spec § Change 2 |
| DailyHub tablist (outer) | base classes | `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md` | spec § Change 3 |
| DailyHub active tab (additional classes) | base classes | `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]` | spec § Change 3 |
| DailyHub inactive tab | base classes | `text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent` (UNCHANGED) | `DailyHub.tsx` line 272 |
| DailyHub outer wrapper | classes | `flex flex-col font-sans` (passed to `BackgroundCanvas`) | spec § Change 4 |
| MeditateTabContent default-state cards | FrostedCard `variant` | `'default'` (renders `bg-white/[0.07] border-white/[0.12] backdrop-blur-sm md:backdrop-blur-md shadow-frosted-base rounded-3xl p-6` per FrostedCard.tsx) | `FrostedCard.tsx` lines 28–31 |
| MeditateTabContent suggested-state cards | FrostedCard `variant` | `'accent'` (renders `bg-violet-500/[0.08] border-violet-400/70 backdrop-blur-md md:backdrop-blur-[12px] shadow-frosted-accent rounded-3xl p-6` + `before:` hairline) | `FrostedCard.tsx` lines 24–27 |
| MeditateTabContent FrostedCard wrapper | extra `className` | `p-4 sm:p-5 text-left` (overrides default `p-6`, preserves `text-left`) | spec § Change 5 |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- **DailyHub uses `HorizonGlow` at the page root, not per-section `GlowBackground`.** This spec REPLACES that usage with `<BackgroundCanvas>` for DailyHub specifically. The `HorizonGlow` component file at `components/daily/HorizonGlow.tsx` STAYS in place even though no longer used by DailyHub — the spec is explicit. Do NOT delete the file. Do NOT delete `HorizonGlow.test.tsx`. (The component is intentionally preserved for potential future use elsewhere.)
- **Tab content components keep their plain wrapper.** All four tab content components (`DevotionalTabContent`, `PrayTabContent`, `JournalTabContent`, `MeditateTabContent`) use `<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">` with transparent backgrounds — the page-level canvas (now multi-bloom) shows through. This spec does NOT change tab content wrappers; only the Meditate cards inside switch from rolls-own to `FrostedCard`.
- **Animation tokens (BB-33).** The Button subtle variant uses `motion-reduce:hover:translate-y-0` per project standard. Do NOT hardcode duration or easing on hover; the existing `transition-[colors,transform] duration-fast motion-reduce:transition-none` shared on the Button base already covers it.
- **Reduced-motion safety net.** Global rule in `frontend/src/styles/animations.css` disables animations when the OS flag is on. Per-component checks are NOT needed. The `motion-reduce:hover:translate-y-0` on the subtle variant is belt-and-suspenders consistent with `light` and `gradient` variants.
- **No deprecated patterns introduced.** This spec adds a `subtle` Button variant (frosted pill), upgrades `BackgroundCanvas` (no new component), updates DailyHub tab bar class strings (no component swap for the tab bar), and migrates Meditate cards to existing `FrostedCard` variants. None of the deprecated patterns from `09-design-system.md` § "Deprecated Patterns" are touched: no `Caveat` headings, no `BackgroundSquiggle` on Daily Hub, no `GlowBackground` on Daily Hub, no `animate-glow-pulse`, no cyan textarea glow, no italic Lora prompts, no hand-rolled card with soft shadow + 8px radius, no `PageTransition`.
- **WAI-ARIA roving-tabindex preservation.** DailyHub's tab bar uses `role="tablist"` + `role="tab"` + `aria-selected` + `tabIndex={isActive ? 0 : -1}` + arrow-key navigation via `handleTabKeyDown`. Step 4 changes ONLY the className strings. Do NOT touch `role`, `aria-*`, `tabIndex`, `tabButtonRefs`, `handleTabKeyDown`, the IntersectionObserver sticky logic, or `useDailyHubTab`.
- **Text color preservation on cards.** The Meditate cards' inner text colors (`text-white`, `text-white/60`, `text-primary` for time chip) survive the FrostedCard migration unchanged — they live on inner elements, not on the rolls-own `<button>` className. Verify the `<h3>`, `<p>`, and time-chip `<p>` text colors render identically post-migration.
- **44px touch target.** `min-h-[44px]` on the Button subtle variant and the existing tab buttons satisfy the touch-target floor. FrostedCard does not enforce `min-h-[44px]` — the Meditate cards are tall enough by content; no override needed.

---

## Shared Data Models (from Master Plan)

N/A — visual-system spec. No TypeScript interfaces, no localStorage keys, no shared constants are introduced or modified.

**localStorage keys this spec touches:** None. Existing keys read by DailyHub and MeditateTabContent (`wr_devotional_reads`, `wr_daily_completion`, `wr_auth_simulated`, `wr_user_name`, `wr_journal_draft`, `wr_prayer_draft`, etc.) are untouched.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | Tab bar pill stays full-width; FrostedCard accent/default tiers use `backdrop-blur-md` (8px) per pilot. Meditation cards remain in their existing 2-column grid (`grid-cols-2`). Multi-bloom canvas's `radial-gradient` ellipses stay at their declared percentages — visually still creates atmospheric warmth on phones. |
| Tablet | 768px | Same tier visual definitions. The `md:` breakpoint kicks in: accent gets `backdrop-blur-[12px]`; default gets `backdrop-blur-md` (8px). Tab bar visual stable. |
| Desktop | 1440px | Same tier behavior. Multi-bloom canvas renders all five layers at full intent — top-center bloom visible above the fold, mid-right bloom visible mid-page, bottom-left bloom visible at the bottom of the long-scroll page. |

**Custom breakpoints:** None. Existing `min-[400px]:` breakpoint on the tab labels (line 276–277 of `DailyHub.tsx`) is untouched — it controls when full vs. sr-only labels show on tabs.

---

## Inline Element Position Expectations

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---|---|---|---|
| DailyHub tab bar (existing — no spec change to layout) | 4 tab pills (Devotional, Pray, Journal, Meditate) | All 4 tabs share y-coordinate at every breakpoint (375px / 768px / 1440px) ±5px | Never wraps — `flex` row with `flex-1` on each pill |
| Meditate card grid (existing — no spec change to layout) | 6 cards in 2 columns | Pairs of cards on each row share y-coordinate ±5px at every breakpoint | Never wraps within a row — `grid grid-cols-2` is rigid |

This spec does NOT introduce new inline-row layouts. Both tables document existing layouts that must continue to behave correctly post-migration. `/verify-with-playwright` should confirm tab bar y-alignment is preserved after the class-string update (no element changes height enough to break alignment) and Meditate grid pairs continue to share y after the FrostedCard wrapper swap (FrostedCard's internal padding/border may differ slightly from the rolls-own classes, but pairs in the same grid row should remain aligned).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|---|---|---|
| Hero greeting → Tab bar | unchanged | `DailyHub.tsx` line 223 (`pt-36 pb-6 sm:pt-40 sm:pb-8 lg:pt-44`) preserved |
| Tab bar → Tab content first element | unchanged | Tab content wrappers use `py-10 sm:py-14` (preserved) |
| Tab content (Meditate) → Song Pick | unchanged | Song Pick mounts after the tab panel |
| Song Pick → SiteFooter | unchanged | Existing footer placement preserved |
| Card-to-card spacing within Meditate grid | unchanged | `gap-4 sm:gap-6` on `grid-cols-2` (line 97 of `MeditateTabContent.tsx`) preserved |

`/verify-with-playwright` should compare these against the pre-spec captured values and flag any gap difference >5px as a regression. The FrostedCard padding override `p-4 sm:p-5` is intentionally chosen to match the existing `p-4 sm:p-5` on the rolls-own buttons — card heights should not drift.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] You are on branch `forums-wave-continued` (the spec brief explicitly forbids new branches; user manages git manually). If on a different branch, STOP and ask the user.
- [ ] The FrostedCard pilot (`_specs/frostedcard-pilot-bible-landing.md`) and iteration-1 (`_specs/frostedcard-iteration-1-make-it-pop.md`) are merged or otherwise present in the working tree. The Meditate migration depends on `FrostedCard` having `variant: 'accent' | 'default' | 'subdued'`. Verify by reading `frontend/src/components/homepage/FrostedCard.tsx` lines 3 and 23 — both must reference the variant system.
- [ ] `frontend/tailwind.config.js` already carries the iteration-1 token set (violet ramp 50–900, `canvas-shoulder`, `canvas-deep`, the 6 frosted/gradient shadow tokens). Verify by grep: `grep -E '(violet-500|frosted-accent|gradient-button)' frontend/tailwind.config.js` should return matches.
- [ ] `frontend/src/components/ui/Button.tsx` already has the `gradient` variant special-case branch (line 49–50 referenced above). The subtle variant addition extends this branch shape; if `gradient` is missing, the iteration-1 work is incomplete.
- [ ] `frontend/src/components/ui/BackgroundCanvas.tsx` exists with the iteration-1 single-radial-over-linear background. Verify by grep: `grep -c 'radial-gradient' frontend/src/components/ui/BackgroundCanvas.tsx` should return at least 1.
- [ ] All auth-gated actions from the spec are accounted for in this plan (verified — only the Meditate card-click gate, preserved exactly in Step 6).
- [ ] Design system values are verified — current FrostedCard surface values read directly from `FrostedCard.tsx` source on 2026-05-01 (see Architecture Context table).
- [ ] All `[UNVERIFIED]` values are flagged with verification methods (1 flag in Step 6 — see below).
- [ ] No deprecated patterns used — verified above in Design System Reminder.

### [UNVERIFIED] values

```
[UNVERIFIED] MeditateTabContent.test.tsx — assertions on FrostedCard surface tokens after migration
→ Best guess: The spec text says assert 'border-white/[0.08]' (default) and 'border-violet-400/45' (accent),
  but the shipped iteration-1 FrostedCard.tsx uses 'border-white/[0.12]' and 'border-violet-400/70'.
  This plan uses the shipped values when writing test assertions.
→ To verify: After Step 6 lands, the executor must read FrostedCard.tsx VARIANT_CLASSES and confirm
  the test assertions match the shipped border classes (NOT the spec text).
→ If wrong: The shipped FrostedCard is the authority. Update test assertions to whatever
  FrostedCard.tsx VARIANT_CLASSES.{default,accent}.base actually contains. The spec text
  in `_specs/dailyhub-1a-foundation-and-meditate.md` § Testing has documented this drift
  and the FrostedCard component wins.
```

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Should `BackgroundCanvas` accept a per-page bloom prop? | NO — single shared composition | Both `/bible` (short page) and `/daily` (long page) benefit from the multi-bloom. Spec explicitly says "this update affects BOTH BibleLanding and DailyHub" via the shared component. Adding a prop now would be premature abstraction. If a future page needs different blooms, address then. |
| Should `Button variant="subtle"` get its own focus-visible ring color? | NO — share `focus-visible:ring-primary` | Spec says "shared focus-visible rule works for subtle as-is. No focus ring override needed." `light` shares the same ring; `gradient` overrides to `ring-violet-300`. `subtle` matches `light`'s pattern. |
| Should the DailyHub tab bar's IntersectionObserver sentinel move with the canvas swap? | NO — preserved exactly | The sentinel at line 235 is a positional marker for sticky shadow logic. Swapping the outer wrapper from `<div>` to `<BackgroundCanvas>` does not affect sibling layout. The sentinel + `useEffect` IntersectionObserver continue to fire correctly. |
| Should `<HorizonGlow />` be deleted from the codebase since DailyHub no longer mounts it? | NO — file stays in place | Spec is explicit. The component file at `components/daily/HorizonGlow.tsx` stays. Its dedicated test `HorizonGlow.test.tsx` stays. This preserves the option of re-using HorizonGlow on other surfaces. The cost of keeping a 200-line component file with passing tests is trivial; the cost of having to rebuild it later is high. |
| Should we delete the test "renders HorizonGlow as a root-level decorative layer" or rewrite it as a BackgroundCanvas test? | DELETE | Spec says: "REMOVE the children-count assertion. The HorizonGlow component itself still has its own test file [...] which continues to verify the component's rendering — that test keeps the 5-children assertion in scope where it belongs." A new BackgroundCanvas-on-DailyHub test would be redundant: BackgroundCanvas has its own tests, and the DailyHub root container test (lines 302–308 — updated to drop `bg-hero-bg` and optionally add `radial-gradient` style assertion) covers integration. |
| Should the Meditate amber celebration banner migrate to FrostedCard too? | NO — stays rolls-own | Spec is explicit. The amber surface is intentionally not card-shaped — `motion-safe:animate-golden-glow` + amber-200 border is a celebratory treatment that the FrostedCard variant system doesn't represent. Forcing it into the variant system would lose the design intent. |
| Should `VersePromptCard` migrate? | NO — stays rolls-own | Spec is explicit. Shared component used across multiple tabs and pages; out of scope for this DailyHub-1A spec. |
| Should `eyebrow` prop be used on the suggested Meditate card? | NO | Spec is explicit: "The accent variant in this context does NOT use the eyebrow prop because the card's content (icon + title + description + 'Suggested' pill) already establishes its featured-ness." |
| Should the inner "Suggested" pill (lines 141–145 of `MeditateTabContent.tsx`) be restyled to match FrostedCard's eyebrow component? | NO — preserve verbatim | Spec is explicit: "Keep the inner 'Suggested' pill — it's a separate child element, not part of the card chrome." The pill renders `bg-primary/10 text-primary` and is content-level, not chrome-level. |

---

## Implementation Steps

### Step 1: Add `subtle-button-hover` shadow token to `tailwind.config.js`

**Objective:** Add the one new design token this spec needs so the Button subtle variant in Step 3 can reference `shadow-subtle-button-hover` directly.

**Files to create/modify:**
- `frontend/tailwind.config.js` — add one entry to `theme.extend.boxShadow`

**Details:**

In `frontend/tailwind.config.js` `theme.extend.boxShadow` (currently lines 62–69 with 6 entries), add a 7th entry:

```js
'subtle-button-hover': '0 0 16px rgba(139,92,246,0.10), 0 4px 12px rgba(0,0,0,0.30)',
```

Place it alphabetically or after `gradient-button-hover` — order does not matter for Tailwind compilation. The existing 6 tokens (`frosted-base`, `frosted-hover`, `frosted-accent`, `frosted-accent-hover`, `gradient-button`, `gradient-button-hover`) stay unchanged. No new colors. No other config changes.

**Auth gating (if applicable):** N/A — config file.

**Responsive behavior:** N/A — no UI impact (token only).

**Inline position expectations:** N/A — no UI rendering.

**Guardrails (DO NOT):**

- DO NOT add any other tokens. Spec is explicit: violet ramp, canvas tones, frosted shadows, and gradient shadows already exist from the pilot/iteration-1; only one new shadow is needed for this spec.
- DO NOT modify any existing token values. Iteration-1 surface opacities are load-bearing for the FrostedCard tier system.
- DO NOT change `theme.extend.colors`, `keyframes`, `animation`, or any other section.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| (none — verified indirectly) | unit | Step 3's Button subtle-variant tests assert the rendered className contains `shadow-subtle-button-hover`. If the token is missing from `tailwind.config.js`, Tailwind compiles `shadow-subtle-button-hover` as a no-op class, which still passes the className substring assertion BUT produces no actual shadow. Verify visually in Step 3's manual check that hovering the subtle button produces a violet glow. |

**Expected state after completion:**
- [ ] `frontend/tailwind.config.js` `theme.extend.boxShadow` has a 7th entry: `subtle-button-hover` with the specified value
- [ ] `pnpm tsc --noEmit` passes (no type changes — should still pass cleanly)
- [ ] `pnpm test` passes (no test changes — full suite still green)
- [ ] No other section of `tailwind.config.js` modified

---

### Step 2: Multi-bloom `BackgroundCanvas` upgrade

**Objective:** Replace the single-radial-over-linear background with a five-layer composition that supplies continuous atmospheric warmth across the full scroll height of long pages.

**Files to create/modify:**
- `frontend/src/components/ui/BackgroundCanvas.tsx` — replace `CANVAS_BACKGROUND` constant
- `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` — verify but expect no changes

**Details:**

In `frontend/src/components/ui/BackgroundCanvas.tsx`, lines 9–13 currently declare:

```tsx
const CANVAS_BACKGROUND = `
  radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) 0%, transparent 60%),
  radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
  linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
`
```

Replace with:

```tsx
const CANVAS_BACKGROUND = `
  radial-gradient(ellipse 50% 35% at 50% 8%, rgba(167,139,250,0.10) 0%, transparent 60%),
  radial-gradient(ellipse 45% 30% at 80% 50%, rgba(167,139,250,0.06) 0%, transparent 65%),
  radial-gradient(ellipse 50% 35% at 20% 88%, rgba(167,139,250,0.08) 0%, transparent 65%),
  radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
  linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
`
```

Layer accounting:
- Layer 1 (top-center bloom): Y position changes from `20%` (iteration-1) to `8%` and adds nothing else
- Layer 2 (NEW): mid-right bloom at `80% 50%`, opacity `0.06`
- Layer 3 (NEW): bottom-left bloom at `20% 88%`, opacity `0.08`
- Layer 4 (preserved): radial darkness at `60% 50%`, opacity `0.65`
- Layer 5 (preserved): diagonal linear gradient base

The component's children, `className`-via-`cn()` merging, and shell classes `relative min-h-screen overflow-hidden` are NOT changed — only the `CANVAS_BACKGROUND` template string.

For the test file, read `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` and verify the 3 existing tests (renders children, applies className, has `min-h-screen + relative + overflow-hidden`) DO NOT assert on the exact `style.background` string. Confirmed via direct read on 2026-05-01: zero such assertions exist. **No test updates required.**

**Auth gating (if applicable):** N/A — visual component.

**Responsive behavior:**

- Desktop (1440px): All 5 layers render. Top-center bloom near `~8%` from top, mid-right bloom at `~50%/80%`, bottom-left bloom at `~88%/20%`, plus the radial darkness and diagonal linear base.
- Tablet (768px): Same 5 layers; ellipse percentages render relatively to viewport — visual proportion unchanged.
- Mobile (375px): Same 5 layers; on phones, the user mostly sees the top bloom prominently and glimpses subsequent blooms on scroll.

**Inline position expectations:** N/A — single decorative div.

**Guardrails (DO NOT):**

- DO NOT change the JSX shape of `BackgroundCanvas` (still a single `<div>` with inline `style`, children inside).
- DO NOT change the props interface (`children`, `className`).
- DO NOT change the shell classes `relative min-h-screen overflow-hidden`.
- DO NOT add animation, parallax, or scroll-driven behavior to the canvas. The 5-layer composition is intentionally static.
- DO NOT extract the per-layer values into individual constants. Keeping them in one template string makes future tuning safer (one place to edit). If they need extraction later, that's a separate refactor spec.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| existing: `'renders children'` | unit | Continues to pass — children prop passes through unchanged |
| existing: `'applies custom className alongside base classes'` | unit | Continues to pass — `cn()` merge unchanged |
| existing: `'has min-h-screen + relative + overflow-hidden in the merged className'` | unit | Continues to pass — shell classes unchanged |

If any test file in the codebase (outside `BackgroundCanvas.test.tsx`) asserts on `BackgroundCanvas`'s exact background string, update it. Verify via `grep -r "radial-gradient(ellipse 50% 35% at 50% 20%" frontend/src/` before this step lands. **Expected: zero matches outside the source file itself.**

**Expected state after completion:**
- [ ] `BackgroundCanvas.tsx` `CANVAS_BACKGROUND` template literal contains 5 declarations in the order specified
- [ ] `BackgroundCanvas.test.tsx` runs unchanged and passes
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test` passes (no new failures relative to the post-Key-Protection baseline of 8,811 pass / 11 pre-existing fail)
- [ ] Manual eyeball check on `/bible` (regression): page renders with multi-bloom — top-center bloom visible above the fold; on scroll, mid-right bloom appears around mid-page (BibleLanding is short, so the mid-right and bottom-left blooms may not fully come into view)

---

### Step 3: `Button` subtle variant

**Objective:** Add a `'subtle'` variant to the `Button` component — frosted pill with white text and `subtle-button-hover` shadow on hover. Used by Specs 1B and 2 across the four DailyHub tabs.

**Files to create/modify:**
- `frontend/src/components/ui/Button.tsx` — extend variant union, update the `cn()` block, add three size class entries
- `frontend/src/components/ui/__tests__/Button.test.tsx` — append a new `describe('subtle variant', ...)` block with ~6 tests

**Details:**

In `frontend/src/components/ui/Button.tsx`:

1. **Line 14** — extend the variant union from:
   ```ts
   variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient'
   ```
   to:
   ```ts
   variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'light' | 'gradient' | 'subtle'
   ```

2. **Line 46** — update the `rounded-md` exclusion to also exclude `'subtle'`. From:
   ```ts
   variant !== 'light' && variant !== 'gradient' && 'rounded-md',
   ```
   to:
   ```ts
   variant !== 'light' && variant !== 'gradient' && variant !== 'subtle' && 'rounded-md',
   ```

3. **After line 50** (after the `gradient` special-case branch), add a new branch for `subtle`:
   ```ts
   variant === 'subtle' &&
     'rounded-full bg-white/[0.07] border border-white/[0.12] text-white backdrop-blur-sm hover:bg-white/[0.12] hover:border-white/[0.20] hover:shadow-subtle-button-hover hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 gap-2 font-medium min-h-[44px]',
   ```

4. **Lines 56–58 (default size table)** — these size rules already exclude `light` and `gradient`. Extend them to also exclude `subtle`:
   ```ts
   'h-9 px-3 text-sm': size === 'sm' && variant !== 'light' && variant !== 'gradient' && variant !== 'subtle',
   'h-10 px-4': size === 'md' && variant !== 'light' && variant !== 'gradient' && variant !== 'subtle',
   'h-12 px-6 text-lg': size === 'lg' && variant !== 'light' && variant !== 'gradient' && variant !== 'subtle',
   ```

5. **Lines 59–61 (light + gradient size table)** — these currently merge light and gradient into shared size rules. The cleanest minimal extension is to ALSO add explicit subtle rows below each, matching the light/gradient values exactly:
   ```ts
   'px-4 py-2 text-sm': size === 'sm' && (variant === 'light' || variant === 'gradient' || variant === 'subtle'),
   'px-6 py-2.5 text-sm': size === 'md' && (variant === 'light' || variant === 'gradient' || variant === 'subtle'),
   'px-8 py-3 text-base': size === 'lg' && (variant === 'light' || variant === 'gradient' || variant === 'subtle'),
   ```

   This three-OR pattern keeps the size table flat and matches the spec's intent (subtle uses the same pill size grid as light and gradient). An alternative would be three separate rows for subtle — that's also acceptable and matches what the spec text suggests literally; both produce identical CSS. Pick the three-OR form (less duplication, fewer lines, same emitted classes).

6. **`asChild` and `isLoading` patterns:** No changes required. Both branches in the existing component (lines 66–82 for `asChild`, lines 84–104 for `isLoading`) are variant-agnostic.

7. **Focus ring:** No override needed. The shared `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg` on the Button base (line 44) works for subtle as-is.

In `frontend/src/components/ui/__tests__/Button.test.tsx`, append a new `describe('subtle variant', ...)` block at the bottom (after the existing `describe('gradient variant', ...)` block ending at line 273), with 6 tests:

```tsx
describe('subtle variant', () => {
  it('subtle variant renders with bg-white/[0.07]', () => {
    render(<Button variant="subtle">Sub</Button>)
    expect(screen.getByRole('button').className).toContain('bg-white/[0.07]')
  })

  it('subtle variant renders with border-white/[0.12]', () => {
    render(<Button variant="subtle">Sub</Button>)
    expect(screen.getByRole('button').className).toContain('border-white/[0.12]')
  })

  it('subtle variant uses rounded-full', () => {
    render(<Button variant="subtle">Sub</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('rounded-full')
    expect(btn.className).not.toContain('rounded-md')
  })

  it('subtle variant uses min-h-[44px]', () => {
    render(<Button variant="subtle">Sub</Button>)
    expect(screen.getByRole('button').className).toContain('min-h-[44px]')
  })

  it('subtle variant has backdrop-blur-sm', () => {
    render(<Button variant="subtle">Sub</Button>)
    expect(screen.getByRole('button').className).toContain('backdrop-blur-sm')
  })

  it('subtle variant + asChild forwards classes to child', () => {
    render(
      <Button variant="subtle" asChild>
        <a href="/x">Go</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Go' })
    expect(link.tagName).toBe('A')
    expect(link.className).toContain('rounded-full')
    expect(link.className).toContain('bg-white/[0.07]')
    expect(link.className).toContain('text-white')
  })
})
```

**Auth gating (if applicable):** N/A — visual component.

**Responsive behavior:**

- Desktop (1440px): subtle pill with `min-h-[44px]`, hover lifts 0.5px and shows `subtle-button-hover` violet glow shadow
- Tablet (768px): same hover behavior (hover-capable breakpoint)
- Mobile (375px): no hover (touch); `active:scale-[0.98]` provides tap feedback (preserved from Button base, line 45)

**Inline position expectations:** N/A — Button is an atomic element.

**Guardrails (DO NOT):**

- DO NOT add a focus-visible ring override for subtle. The shared `focus-visible:ring-primary` on the base works.
- DO NOT add an `isLoading` special case. The existing isLoading pattern is variant-agnostic and works.
- DO NOT change Button's existing variants (`primary`, `secondary`, `outline`, `ghost`, `light`, `gradient`).
- DO NOT add the subtle variant to a single-OR clause in the rounded-md exclusion line. It needs an explicit `&& variant !== 'subtle'` per the pattern.
- DO NOT move the gradient or light branches. Subtle joins the existing pattern; do not refactor the surrounding code.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| `'subtle variant renders with bg-white/[0.07]'` | unit | Asserts subtle's bg class |
| `'subtle variant renders with border-white/[0.12]'` | unit | Asserts subtle's border class |
| `'subtle variant uses rounded-full'` | unit | Asserts pill shape, no `rounded-md` |
| `'subtle variant uses min-h-[44px]'` | unit | Asserts touch-target floor |
| `'subtle variant has backdrop-blur-sm'` | unit | Asserts frosted blur |
| `'subtle variant + asChild forwards classes to child'` | unit | Asserts asChild correctness for subtle |

All other existing Button tests continue to pass unchanged.

**Expected state after completion:**
- [ ] `Button.tsx` variant union includes `'subtle'`
- [ ] `Button.tsx` `cn()` block has the new subtle branch and updated rounded-md exclusion
- [ ] `Button.tsx` size table has subtle in the existing pill OR-chain (or three new rows — either is acceptable)
- [ ] `Button.test.tsx` has 6 new subtle-variant tests in a new describe block
- [ ] `pnpm tsc --noEmit` passes (variant union widened cleanly)
- [ ] `pnpm test` passes (all existing + 6 new tests green)

---

### Step 4: DailyHub tab bar visual alignment + canvas swap (combined)

**Objective:** Update the DailyHub tab bar to the new violet-accented active-pill treatment and replace the page-level `<div className="...bg-hero-bg">` + `<HorizonGlow />` with `<BackgroundCanvas>`. Both edits land together to avoid an intermediate broken state where the tab bar references new classes against an old canvas.

**Files to create/modify:**
- `frontend/src/pages/DailyHub.tsx` — add BackgroundCanvas import; remove HorizonGlow import + mount; replace outer div; update tablist + active-tab class strings

**Details:**

In `frontend/src/pages/DailyHub.tsx`:

1. **Imports (top of file).** REMOVE:
   ```ts
   import { HorizonGlow } from '@/components/daily/HorizonGlow'
   ```
   (currently line 5 — verify it has no remaining usage in the file before removing). ADD:
   ```ts
   import { BackgroundCanvas } from '@/components/ui/BackgroundCanvas'
   ```

2. **Outer wrapper (line 214).** Replace:
   ```tsx
   <div className="relative flex min-h-screen flex-col overflow-hidden bg-hero-bg font-sans">
   ```
   with:
   ```tsx
   <BackgroundCanvas className="flex flex-col font-sans">
   ```
   The closing `</div>` at line 378 (matching this opening) becomes `</BackgroundCanvas>`. Verify by counting JSX depth that no other `</div>` is inadvertently swapped.

3. **HorizonGlow mount (line 215).** REMOVE the line:
   ```tsx
   <HorizonGlow />
   ```
   The `<SEO ...>` line that currently follows (line 216) becomes the first child of `<BackgroundCanvas>`.

4. **Tablist outer container (line 247).** Replace:
   ```tsx
   className="flex w-full rounded-full border border-white/[0.12] bg-white/[0.06] p-1"
   ```
   with:
   ```tsx
   className="flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md"
   ```

5. **Active tab style (lines 270–272).** Replace:
   ```tsx
   isActive
     ? 'bg-white/[0.12] border border-white/[0.15] text-white shadow-[0_0_12px_rgba(139,92,246,0.15)]'
     : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
   ```
   with:
   ```tsx
   isActive
     ? 'bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]'
     : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent',
   ```
   (The inactive branch is unchanged.)

6. **Everything else preserved:** IntersectionObserver sentinel + sticky-shadow logic (lines 110–123, 235), `useDailyHubTab` (line 71), `handleTabKeyDown` arrow-key navigation (lines 195–211), `tabButtonRefs` (line 196), `handleSwitchTo*` callbacks (lines 133–155), `getAmbientContextForTab` (lines 180–193), all four tab content components, `<DailyAmbientPillFAB />` (line 377), `<TooltipCallout />` (lines 366–374). The Hero `<section>` block (lines 221–232) and the Song Pick block (lines 357–359) are untouched.

7. **Sticky tab bar wrapper (lines 238–243):** UNCHANGED. The wrapper at line 240 already carries `relative sticky top-0 z-40 backdrop-blur-md transition-shadow motion-reduce:transition-none`. Adding `backdrop-blur-md` to the inner tablist (Step 4 detail #4) is intentional — the spec says "we just added it to the inner container too — both should pass."

**Auth gating (if applicable):** N/A — tab switching is unauthenticated and unchanged.

**Responsive behavior:**

- Desktop (1440px): Tab bar is `max-w-xl` centered, 4 tabs each `flex-1`. Active tab pill: violet-tinted bg, violet glow, white text. Sticky behavior fires when sentinel scrolls out of view.
- Tablet (768px): Same layout. Sticky behavior identical.
- Mobile (375px): Same layout. Tab labels follow the `min-[400px]:` breakpoint at line 276 — full label visible above 400px, sr-only below 400px. Touch-friendly via `min-h-[44px]` (line 269).

**Inline position expectations:**

- The 4 tab pills must share y-coordinate at 1440px / 768px / 375px (±5px tolerance). Existing layout — no change. Verify post-spec the tabs still share y.

**Guardrails (DO NOT):**

- DO NOT change the WAI-ARIA roving-tabindex implementation: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex={isActive ? 0 : -1}`. All preserved.
- DO NOT change `handleTabKeyDown` (arrow-key + Home + End navigation).
- DO NOT change `useDailyHubTab` or the URL-query-param-driven tab state (`?tab=` reads/writes are preserved).
- DO NOT change the IntersectionObserver `useEffect` (lines 114–123) or the sentinel (`<div ref={sentinelRef} aria-hidden="true" />` at line 235).
- DO NOT add `min-h-screen`, `overflow-hidden`, `relative`, or `bg-hero-bg` to the BackgroundCanvas's `className` — BackgroundCanvas owns these via its shell.
- DO NOT delete `frontend/src/components/daily/HorizonGlow.tsx` itself. The file stays in place even though `DailyHub.tsx` no longer mounts it.
- DO NOT delete `frontend/src/components/daily/__tests__/HorizonGlow.test.tsx`. The test file stays and continues to pass (it tests HorizonGlow in isolation, not via DailyHub).
- DO NOT change `<TooltipCallout>`, `<DailyAmbientPillFAB>`, `<SongPickSection>`, `<SiteFooter>`, or any of the four tab content components.
- DO NOT add a new test asserting `BackgroundCanvas` is mounted; the optional inline-style assertion (see test specs below) covers it.

**Test specifications:**

This step produces test changes in `frontend/src/pages/__tests__/DailyHub.test.tsx`. Update the following:

| Existing test | Change |
|---|---|
| `'root background uses hero-bg, not dashboard-dark'` (lines 289–294) | REMOVE the `expect(root.className).toContain('bg-hero-bg')` line. KEEP `expect(root.className).not.toContain('bg-dashboard-dark')`. The `not toContain dashboard-dark` assertion still validly applies post-migration. Optionally rename the test to `'root background does not use dashboard-dark'`. |
| `'hero does not have GlowBackground glow orbs'` (lines 296–299) | KEEP UNCHANGED. The hero section still has no `[data-testid="glow-orb"]` after migration. |
| `'root has relative overflow-hidden bg-hero-bg'` (lines 302–308) | REMOVE `expect(root.className).toContain('bg-hero-bg')`. KEEP `expect(root.className).toContain('relative')` and `expect(root.className).toContain('overflow-hidden')` (BackgroundCanvas owns these). OPTIONALLY ADD `expect(root.style.background).toContain('radial-gradient')` to verify BackgroundCanvas inline `style` is mounted. Rename the test to `'root has relative + overflow-hidden + multi-bloom canvas background'` if adding the optional assertion. |
| `'renders HorizonGlow as a root-level decorative layer'` (lines 310–319) | DELETE the entire test. HorizonGlow is no longer mounted by DailyHub. The HorizonGlow component test at `components/daily/__tests__/HorizonGlow.test.tsx` keeps the 5-children assertion in scope where it belongs. |
| `'tab bar has pill-shaped container'` (lines 321–326) | UPDATE: change `expect(tablist.className).toContain('bg-white/[0.06]')` to `expect(tablist.className).toContain('bg-white/[0.07]')`. KEEP `expect(tablist.className).toContain('rounded-full')`. |
| `'active tab has pill indicator with background'` (lines 328–332) | UPDATE: change `expect(activeTab.className).toContain('bg-white/[0.12]')` to `expect(activeTab.className).toContain('bg-violet-500/[0.13]')`. |
| `'inactive tabs have muted text color'` (lines 334–341) | KEEP UNCHANGED — `text-white/50` still applies to inactive tabs. |
| `'tab bar outer wrapper has no background color (transparent for glow bleed-through)'` (lines 343–350) | KEEP UNCHANGED — the outer wrapper assertions reference the STICKY div at line 240 of DailyHub.tsx, which is unchanged in this spec. `not toContain bg-hero-bg` still passes (the outer sticky wrapper never had `bg-hero-bg`); `toContain backdrop-blur-md` still passes (it was already there). |
| `'tab bar outer wrapper uses reduced blur (md not lg)'` (lines 352–358) | KEEP UNCHANGED — same outer sticky wrapper, unchanged in this spec. |
| All other DailyHub tests (greeting, hero minimalism, tab content, tab keyboard nav, URL params, prayContext, etc.) | KEEP UNCHANGED. |

Add no new tests in this step (the spec doesn't require additional integration tests beyond the existing suite and the optional `radial-gradient` style assertion).

**Expected state after completion:**
- [ ] `DailyHub.tsx` imports `BackgroundCanvas`, no longer imports `HorizonGlow`
- [ ] `DailyHub.tsx` outer wrapper is `<BackgroundCanvas className="flex flex-col font-sans">` (no `min-h-screen`, no `overflow-hidden`, no `relative`, no `bg-hero-bg` on its className)
- [ ] `<HorizonGlow />` mount is GONE from `DailyHub.tsx`
- [ ] HorizonGlow component file at `components/daily/HorizonGlow.tsx` UNCHANGED
- [ ] HorizonGlow.test.tsx UNCHANGED and passing
- [ ] Tab bar tablist class: `flex w-full rounded-full border border-white/[0.08] bg-white/[0.07] p-1 backdrop-blur-md`
- [ ] Active tab class includes `bg-violet-500/[0.13] border border-violet-400/45 text-white shadow-[0_0_20px_rgba(139,92,246,0.18)]`
- [ ] Inactive tabs unchanged (`text-white/50 hover:text-white/80 hover:bg-white/[0.04] border border-transparent`)
- [ ] DailyHub.test.tsx tests updated as listed above (1 deletion, 3 substring updates, 1 partial update, all behavioral tests preserved)
- [ ] WAI-ARIA roving-tabindex preserved exactly (verified by the existing `'supports arrow key navigation between tabs'` test continuing to pass)
- [ ] URL `?tab=` state preserved exactly (verified by `'shows Journal tab content when ?tab=journal'` and `'shows Meditate tab content when ?tab=meditate'` continuing to pass)
- [ ] Sticky tab bar IntersectionObserver behavior preserved (verified by the existing `'tab bar outer wrapper has no background color'` test continuing to pass)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test` passes (no new failing files)
- [ ] Manual eyeball check on `/daily?tab=devotional`: page background shows multi-bloom; tab bar active state has violet pill with violet glow; switching tabs moves the violet pill correctly

---

### Step 5: `MeditateTabContent` FrostedCard variant migration

**Objective:** Migrate the 6 meditation cards from rolls-own classes to `<FrostedCard as="button">` with `variant={isSuggested ? 'accent' : 'default'}`. Preserve all auth-modal-trigger logic, "Suggested" pill rendering, content layout, and behavior verbatim.

**Files to create/modify:**
- `frontend/src/components/daily/MeditateTabContent.tsx` — replace rolls-own `<button>` with `<FrostedCard>`; add FrostedCard import
- `frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx` — verified zero class-string assertions on FrostedCard surface tokens (no test changes required); behavioral tests run unchanged

**Details:**

In `frontend/src/components/daily/MeditateTabContent.tsx`:

1. **Imports.** ADD:
   ```ts
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   ```

2. **The `<button>` block at lines 105–168.** Replace:
   ```tsx
   <button
     key={type.id}
     type="button"
     onClick={() => {
       if (!isAuthenticated) {
         authModal?.openAuthModal('Sign in to start meditating')
         return
       }
       // Clear challenge context on navigation
       if (challengeContext) {
         navigate(location.pathname + location.search, { replace: true, state: null })
       }
       navigate(ROUTE_MAP[type.id], {
         ...(meditationVerseContext && { state: { meditationVerseContext } }),
       })
     }}
     className={cn(
       'group rounded-2xl p-4 text-left sm:p-5',
       'transition-all motion-reduce:transition-none duration-base ease-decelerate',
       'active:scale-[0.98]',
       'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
       isSuggested
         ? [
             'border-2 border-primary bg-primary/10 ring-1 ring-primary/30',
             'shadow-[0_0_30px_rgba(139,92,246,0.12),0_4px_20px_rgba(0,0,0,0.3)]',
           ]
         : [
             'border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm',
             'shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]',
             'hover:bg-white/[0.09] hover:border-white/[0.18]',
             'hover:shadow-[0_0_35px_rgba(139,92,246,0.10),0_6px_25px_rgba(0,0,0,0.35)]',
             'hover:-translate-y-0.5',
             'motion-reduce:hover:translate-y-0',
           ]
     )}
   >
     {isSuggested && (
       <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
         Suggested
       </span>
     )}
     <div className="mb-3 flex items-center justify-between">
       {Icon && <Icon className="h-8 w-8 text-primary" />}
       {isAuthenticated && isComplete && (
         <>
           <Check
             className="h-5 w-5 text-success"
             aria-hidden="true"
           />
           <span className="sr-only">{type.title} completed</span>
         </>
       )}
     </div>
     <h3 className="mb-1 text-base font-semibold text-white sm:text-lg">
       {type.title}
     </h3>
     <p className="text-xs text-white/60 sm:text-sm">
       {type.description}
     </p>
     <p className="mt-2 text-xs font-medium text-primary">
       {type.time}
     </p>
   </button>
   ```
   with:
   ```tsx
   <FrostedCard
     key={type.id}
     as="button"
     variant={isSuggested ? 'accent' : 'default'}
     onClick={() => {
       if (!isAuthenticated) {
         authModal?.openAuthModal('Sign in to start meditating')
         return
       }
       if (challengeContext) {
         navigate(location.pathname + location.search, { replace: true, state: null })
       }
       navigate(ROUTE_MAP[type.id], {
         ...(meditationVerseContext && { state: { meditationVerseContext } }),
       })
     }}
     className="p-4 sm:p-5 text-left"
   >
     {isSuggested && (
       <span className="mb-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
         Suggested
       </span>
     )}
     <div className="mb-3 flex items-center justify-between">
       {Icon && <Icon className="h-8 w-8 text-primary" />}
       {isAuthenticated && isComplete && (
         <>
           <Check
             className="h-5 w-5 text-success"
             aria-hidden="true"
           />
           <span className="sr-only">{type.title} completed</span>
         </>
       )}
     </div>
     <h3 className="mb-1 text-base font-semibold text-white sm:text-lg">
       {type.title}
     </h3>
     <p className="text-xs text-white/60 sm:text-sm">
       {type.description}
     </p>
     <p className="mt-2 text-xs font-medium text-primary">
       {type.time}
     </p>
   </FrostedCard>
   ```

3. **Why these specific changes:**
   - The `key={type.id}` prop moves to FrostedCard (still required for React reconciliation).
   - `as="button"` keeps `<button>` semantics; the existing `type="button"` is dropped because FrostedCard does not pass arbitrary props through to the underlying element (verify by reading `FrostedCard.tsx` lines 38–95 — only `children`, `onClick`, `className`, `as`, `tabIndex`, `role`, `onKeyDown`, `variant`, `eyebrow`, `eyebrowColor` are accepted). **If `type="button"` is needed (default-to-submit-on-form-context concerns), document that as a follow-up to extend FrostedCard's prop surface — but the Meditate cards are NOT inside a `<form>`, so `type="button"` is not required for correctness.** The original code's `type="button"` was defensive boilerplate; safe to drop.
   - The `onClick` handler is preserved verbatim (lines 108–120 of original).
   - The `className={cn(...)}` block with the long ternary is REPLACED by the simple `className="p-4 sm:p-5 text-left"` — FrostedCard handles `transition-all motion-reduce:transition-none duration-base ease-decelerate`, `active:scale-[0.98]`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50`, and the variant-driven background/border/shadow internally. The `p-4 sm:p-5` overrides FrostedCard's default `p-6`. The `text-left` overrides FrostedCard's default centering on the `as="button"` semantic (FrostedCard does not center text intrinsically; the `text-left` is defensive in case any consumer-supplied class added `text-center`).
   - The inner content (Suggested pill, icon row, h3, description, time) is rendered VERBATIM as children. No content changes.
   - The focus ring color changes from the original `focus-visible:ring-primary focus-visible:ring-offset-hero-bg` (purple) to FrostedCard's `focus-visible:ring-white/50` (white). This is acceptable: it matches the iteration-1 BibleLanding cards. The change is intentional consistency with the wider Round-3 frosted card system.

4. **The `cn` import (line 17 of original).** The local `cn(...)` call site is removed by the migration. Check the file: if `cn` is used anywhere else in `MeditateTabContent.tsx` post-edit, KEEP the import. If not, REMOVE the import.
   - Verified by direct read on 2026-05-01: the only `cn(...)` usage in `MeditateTabContent.tsx` is the lines 121–139 ternary inside the migrated button. **After migration, REMOVE the `import { cn } from '@/lib/utils'` line.**

5. **Other elements in `MeditateTabContent.tsx` UNCHANGED:**
   - Lines 78–85: amber celebration banner (rolls-own with `motion-safe:animate-golden-glow`) — UNCHANGED.
   - Lines 87–95: VersePromptCard / VersePromptSkeleton — UNCHANGED.
   - Lines 75–77: outer wrappers (`<div>` + `<div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">`) — UNCHANGED.
   - Lines 97: grid wrapper (`<div className="grid grid-cols-2 gap-4 sm:gap-6">`) — UNCHANGED.

In `frontend/src/components/daily/__tests__/MeditateTabContent.test.tsx`:

Verified by direct read on 2026-05-01: zero class-string assertions on FrostedCard surface tokens (no `bg-white/[0.06]`, no `border-white/[0.12]`, no `bg-primary/10`, no `ring-primary/30`, no `border-2 border-primary`). All 7 tests are behavioral. **No test updates required.** The behavioral tests will continue to pass:

- `'renders VersePromptCard when verse params in URL'` — passes (verse banner above the cards)
- `'no card when no verse params'` — passes (cards still render, by text content)
- `'removing card via X does not affect meditation cards'` — passes (cards still render after removal, by text content)
- `'skeleton shows during hydration'` — passes
- `'invalid params show no card'` — passes
- `'all-complete banner and verse card coexist'` — passes (amber banner + verse card co-render)
- `'card click passes meditationVerseContext in state'` — passes; CRITICAL: this test does `screen.getByText('Breathing Exercise').closest('button')!`. Verify post-migration that `<FrostedCard as="button">` renders a `<button>` element so `closest('button')` still works. By reading `FrostedCard.tsx` line 53–54, `<Component>` where `Component='button'` produces a `<button>` element. ✓
- `'verse context clears when isActive becomes false'` — passes

**Auth gating (if applicable):**

- Logged-out users clicking ANY of the 6 meditation cards → `authModal?.openAuthModal('Sign in to start meditating')` fires (preserved verbatim from line 110 of original).
- Logged-in users clicking a meditation card → navigates to `/meditate/<type>` (preserved verbatim).
- The Suggested card has the same auth-gate behavior as the other 5 — only the visual variant differs.

**Responsive behavior:**

- Desktop (1440px): 2-column grid (`grid-cols-2`). Cards have FrostedCard default tier visual: `bg-white/[0.07] border-white/[0.12] backdrop-blur-md shadow-frosted-base rounded-3xl`. Hover lifts 0.5px. Suggested card has accent tier: `bg-violet-500/[0.08] border-violet-400/70 backdrop-blur-[12px] shadow-frosted-accent` plus the top-edge hairline.
- Tablet (768px): Same 2-column grid. Same tier visuals. `md:` breakpoint is the same boundary.
- Mobile (375px): Same 2-column grid. Cards use mobile blur values (`backdrop-blur-md` accent / `backdrop-blur-sm` default). Touch tap → `active:scale-[0.98]` (FrostedCard internal).

**Inline position expectations:**

- Card pairs in the same grid row must share y-coordinate at 1440px / 768px / 375px (±5px tolerance). Existing layout — `grid-cols-2` is rigid, so this is automatic. Verify post-migration that FrostedCard's intrinsic height/border doesn't drift the second card down (unlikely — `p-4 sm:p-5` matches the original rolls-own padding).

**Guardrails (DO NOT):**

- DO NOT change the inner "Suggested" pill markup (lines 141–145 of original — content-level, not chrome-level).
- DO NOT change the icon, h3, description, or time-chip text colors (`text-primary`, `text-white`, `text-white/60`).
- DO NOT change the conditional auth-modal logic (the `if (!isAuthenticated)` branch at lines 109–112).
- DO NOT change the conditional challengeContext-clearing logic (lines 113–116).
- DO NOT change the `meditationVerseContext` state-passing on `navigate` (lines 117–119).
- DO NOT migrate the amber celebration banner — stays rolls-own.
- DO NOT migrate `VersePromptCard` — stays rolls-own.
- DO NOT add an `eyebrow` prop to the Suggested card (spec is explicit).
- DO NOT delete the inner "Suggested" pill — it's a separate child element.
- DO NOT use `<FrostedCard as="div">` — `as="button"` is required for keyboard accessibility and existing `closest('button')` test queries.
- DO NOT keep the `cn` import if no other usage exists in the file post-edit.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| All 7 existing behavioral tests | unit | Continue to pass unchanged after the FrostedCard migration. Verify each runs green. |

No new tests are required for this step. The spec said: "If any test asserts the rolls-own class string... update to assert the FrostedCard variant classes." Since no such assertions exist (verified), no updates are needed.

**Optional defensive additions (not required by the spec, but valuable for catching regressions):**

If the executor wants to add a brief regression test verifying the migration:

```tsx
it('default meditation card renders with FrostedCard default-tier classes', () => {
  renderMeditateTab({ initialUrl: '/daily?tab=meditate' })
  const card = screen.getByText('Breathing Exercise').closest('button')!
  expect(card.className).toContain('bg-white/[0.07]')
  expect(card.className).toContain('rounded-3xl')
})
```

This single test asserts the migration landed correctly without coupling to implementation details. **Optional — add if it feels valuable; skip if pressed for time.** The behavioral suite's `'card click passes meditationVerseContext in state'` test exercises `closest('button')` and would fail loudly if FrostedCard's `as="button"` rendering broke.

**Expected state after completion:**
- [ ] All 6 meditation cards in `MeditateTabContent.tsx` use `<FrostedCard as="button" variant={isSuggested ? 'accent' : 'default'} onClick={handleClick} className="p-4 sm:p-5 text-left">`
- [ ] `cn` import removed from `MeditateTabContent.tsx` if unused after migration
- [ ] `FrostedCard` import added
- [ ] Rolls-own classes (transitions, hover, active:scale, motion-reduce, focus-visible, the long ternary on isSuggested) all DELETED
- [ ] Existing onClick handler, conditional auth-modal trigger, challenge-context clearing, navigation state-passing — all PRESERVED verbatim
- [ ] Inner Suggested pill, icon row, h3, description, and time-chip — all PRESERVED verbatim
- [ ] Amber celebration banner UNCHANGED
- [ ] VersePromptCard usage UNCHANGED
- [ ] All 7 existing behavioral tests in `MeditateTabContent.test.tsx` pass unchanged
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm test` passes (no new failing files)

---

### Step 6: Final verification + manual eyeball checks

**Objective:** After Steps 1–5 land, run the full test suite, the typecheck, and manual visual checks across the affected routes.

**Files to create/modify:** None — verification only.

**Details:**

1. **Run the full test suite:**
   ```bash
   cd frontend && pnpm test
   ```
   Expected: 8,811 + (~6 new subtle-variant tests) pass / 11 pre-existing fail across 7 files (the documented post-Key-Protection regression baseline). Any NEW failing file or fail count > 11 is a regression — STOP and investigate.

2. **Run typecheck:**
   ```bash
   cd frontend && pnpm tsc --noEmit
   ```
   Expected: clean. The Button variant union widening (`'subtle'` added) propagates cleanly because no existing call site uses a non-existent variant string.

3. **Verify [UNVERIFIED] flag from Step 6 is resolved.** The Meditate test file required NO updates per recon — verify by re-reading `MeditateTabContent.test.tsx` and confirming the migration did not surface any class-string assertion needing update. If any test fails on a class-string assertion involving FrostedCard surfaces, update the assertion to match the SHIPPED FrostedCard.tsx values (`bg-white/[0.07]` / `border-white/[0.12]` for default; `bg-violet-500/[0.08]` / `border-violet-400/70` for accent — NOT the spec text values).

4. **Manual eyeball checks** (no Playwright infrastructure for visual regression):

   **On `/daily?tab=meditate`:**
   - [ ] Page background shows multi-bloom atmosphere across full scroll height
     - Top-center bloom visible above the fold (around 8% from top)
     - Mid-right bloom visible mid-page (around 50% from top, 80% from left) on scroll
     - Bottom-left bloom visible at the bottom of the long-scroll page (around 88% from top, 20% from left)
   - [ ] HorizonGlow's positioned glow orbs are GONE from this page
   - [ ] Tab bar active state has a violet-tinted pill with violet glow (NOT the previous near-white pill)
   - [ ] All 6 meditation cards have visible frosted treatment in default state — cards LIFT off the canvas instead of sinking into it
   - [ ] When a meditation is suggested (challenge-context or verse-bridge highlight), the suggested card has visible violet-tinted border + violet glow + lifted appearance — distinct from but not shouting over the surrounding default cards
   - [ ] Amber celebration banner still amber/golden when 6/6 complete (regression check — set up the `wr_daily_completion` localStorage entry per the existing test fixture or simulate by completing all 6 meditations)
   - [ ] VersePromptCard renders unchanged on this tab (regression check — navigate from a Bible verse to Meditate via the Spec Z URL params)

   **On `/daily?tab=devotional`, `/daily?tab=pray`, `/daily?tab=journal`:**
   - [ ] Page background shows the same multi-bloom atmosphere on all four tabs
   - [ ] Tab bar active pill changes color when switching tabs (violet pill follows the active tab)
   - [ ] Devotional, Pray, and Journal tab content cards are UNCHANGED visually (they migrate in Specs 1B and 2; their content cards must look identical to pre-spec)

   **On `/bible` (regression check — multi-bloom canvas affects this page too):**
   - [ ] Page renders correctly with multi-bloom atmosphere — at minimum the top-center bloom is visible above the fold; other blooms visible on scroll if the scroll length permits
   - [ ] VOTD card, ResumeReadingCard, ActivePlanBanner, TodaysPlanCard, QuickActionsRow render unchanged from their post-iteration-1 state
   - [ ] No layout regressions

   **Hover and focus checks (any tab):**
   - [ ] Tab pills still have a hover state on inactive tabs (`hover:text-white/80 hover:bg-white/[0.04]`)
   - [ ] Active tab is unchanged on hover (no separate hover style — it's the active state already)
   - [ ] Focus ring on tabs uses `focus-visible:ring-primary` with `ring-offset-hero-bg`

   **Reduced-motion check (any tab):**
   - [ ] Enable OS-level `prefers-reduced-motion: reduce`, navigate to `/daily?tab=meditate`, hover a meditation card → no `translate-y` (FrostedCard's `motion-reduce:hover:translate-y-0` fires) and no transition shimmer

**Auth gating (if applicable):** Verify with both states.
   - Logged out: clicking any meditation card → auth modal opens with "Sign in to start meditating"
   - Logged in (simulate via `localStorage.setItem('wr_auth_simulated', 'true')` + `localStorage.setItem('wr_user_name', 'Test')`): clicking a meditation card → navigates to `/meditate/<type>`

**Responsive behavior:** All three breakpoints (375px, 768px, 1440px) — verified in browser dev tools or via responsive mode.

**Inline position expectations:** Tab bar y-alignment + Meditate grid pair y-alignment (existing layouts) — verify visually after migration.

**Guardrails (DO NOT):**

- DO NOT skip manual eyeball checks. The project explicitly says no Playwright visual regression infrastructure exists yet — manual review IS the verification path.
- DO NOT consider the spec complete until `/bible` is checked too. The multi-bloom canvas affects both pages; a regression on `/bible` blocks shipping `/daily`.
- DO NOT rely on screenshots from previous specs. The pilot and iteration-1 left both pages in a known state; this spec changes the canvas, so previous screenshots are no longer the reference.

**Test specifications:** N/A — verification step.

**Expected state after completion:**
- [ ] `pnpm test` passes (8,811 + ~6 new = ~8,817 pass / 11 pre-existing fail)
- [ ] `pnpm tsc --noEmit` passes
- [ ] All 4 manual eyeball checks (Meditate tab, three other tabs, BibleLanding regression, hover/focus/reduced-motion) pass
- [ ] [UNVERIFIED] FrostedCard surface-value assertion (Step 6 flag) — N/A in practice because the Meditate test file had zero class-string assertions; no test updates required

---

## Step Dependency Map

| Step | Depends On | Description |
|---|---|---|
| 1 | — | Add `subtle-button-hover` shadow token to `tailwind.config.js`. No dependencies. |
| 2 | — | Multi-bloom `BackgroundCanvas` upgrade. Independent of Steps 1, 3. |
| 3 | 1 | `Button` subtle variant. Depends on Step 1 because the variant references `shadow-subtle-button-hover`; without the token, the class compiles to a no-op. |
| 4 | 2 | DailyHub tab bar visual + canvas swap. Depends on Step 2 because the canvas swap needs the upgraded `BackgroundCanvas`; the tab bar visual update could land alone, but bundling the two file edits in `DailyHub.tsx` reduces risk of intermediate broken state. |
| 5 | — | `MeditateTabContent` FrostedCard migration. Independent of other steps in this spec — depends only on the iteration-1 `FrostedCard` shipped earlier. |
| 6 | 1, 2, 3, 4, 5 | Final verification + manual eyeball checks. Runs after all preceding steps. |

Recommended execution order: 1 → 2 → 3 → 4 → 5 → 6.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | Add `subtle-button-hover` shadow token | [COMPLETE] | 2026-05-01 | `frontend/tailwind.config.js` — added 7th boxShadow entry after `gradient-button-hover`. Typecheck clean. |
| 2 | Multi-bloom `BackgroundCanvas` upgrade | [COMPLETE] | 2026-05-01 | `BackgroundCanvas.tsx` — replaced 3-layer composition with 5-layer (top-center 8%, mid-right 80%/50%, bottom-left 20%/88%, plus preserved darkness + linear). Test file unchanged, all 3 tests pass. |
| 3 | `Button` subtle variant | [COMPLETE] | 2026-05-01 | `Button.tsx` — added `'subtle'` to variant union, special-case branch with shadow-subtle-button-hover, three-OR size table extension, rounded-md exclusion. `Button.test.tsx` — added 6 subtle-variant tests in new describe block. All 34 tests pass; typecheck clean. |
| 4 | DailyHub tab bar visual + canvas swap | [COMPLETE] | 2026-05-01 | `DailyHub.tsx` — replaced HorizonGlow import with BackgroundCanvas, swapped outer div to `<BackgroundCanvas className="flex flex-col font-sans">`, removed `<HorizonGlow />` mount, updated tablist class (`border-white/[0.08] bg-white/[0.07] backdrop-blur-md`), updated active-tab style (`bg-violet-500/[0.13] border-violet-400/45 shadow-[0_0_20px...]`). `DailyHub.test.tsx` — deleted HorizonGlow children-count test, dropped `bg-hero-bg` assertions, updated tab class assertions. Deviation #1: optional `style.background` assertion replaced with `min-h-screen` assertion (jsdom does not parse multi-layer `background` shorthand into `style.background`; raw `getAttribute('style')` also returned empty). All 38 DailyHub + 7 HorizonGlow tests pass; typecheck clean. |
| 5 | `MeditateTabContent` FrostedCard migration | [COMPLETE] | 2026-05-01 | `MeditateTabContent.tsx` — added `FrostedCard` import, removed `cn` import (no longer used), replaced 6 rolls-own buttons with `<FrostedCard as="button" variant={isSuggested ? 'accent' : 'default'} onClick=... className="p-4 sm:p-5 text-left">`. onClick handler preserved verbatim. Suggested pill, icon row, h3, description, time chip — all preserved. All 8 behavioral tests pass; typecheck clean. |
| 6 | Final verification + manual eyeball checks | [COMPLETE] | 2026-05-01 | Full suite: **9,364 pass / 14 fail / 4 failing files** vs pristine parent **9,359 pass / 14 fail / 4 files** = net +5 pass (the 6 new Button subtle tests minus 1 occasional `useFaithPoints` flake), zero new failures, zero new failing files. All 14 failing tests are pre-existing (13 GrowthGarden aria-label drift in 3 files + 1 `useFaithPoints` flake) — confirmed by stashing changes and running on pristine parent. Typecheck clean. **Note: plan baseline of 8,811/11 was stale by 548 tests + 3 fails; parent has accumulated tests/regressions since the plan was authored.** Deviation #2: [UNVERIFIED] flag triggered — the recon at `_plans/forums/dailyhub-redesign-recon.md` missed a SECOND test file at `src/pages/__tests__/MeditateLanding.test.tsx` that asserts on the rolls-own Meditate card class strings. Per plan instruction, updated 3 assertions to match shipped FrostedCard values: `bg-white/[0.07]` + `shadow-frosted-base` (default), `border-violet-400/70` + `shadow-frosted-accent` (accent), `focus-visible:ring-white/50` (interactive focus). Manual eyeball checks deferred to user. |
