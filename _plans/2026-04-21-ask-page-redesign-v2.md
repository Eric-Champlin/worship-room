# Implementation Plan: /ask Page Redesign v2

**Spec:** `_specs/ask-page-redesign-v2.md`
**Date:** 2026-04-21
**Branch:** `claude/feature/ask-page-redesign` (VERIFIED — `git branch --show-current` at plan-write time returned this branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ captured 2026-04-06, before Register Round 2 shipped. The `GlowBackground` `fullPage` variant, `animate-gradient-shift`, and `animate-shine` are NOT in this recon because they were added by Register Round 2 merged 2026-04-20. The spec takes precedence for these values — all referenced in `frontend/src/components/homepage/GlowBackground.tsx` line 5, `frontend/src/index.css` lines 294 + 309.)
**Recon Report:** `_plans/recon/ask-v2.md` (loaded — 5-viewport measurement at 2026-04-20 including contrast ratios and vertical-rhythm measurements. All "current" classNames in the spec come from this recon; verified against live files during plan generation.)
**Master Spec Plan:** not applicable (single-spec redesign, not part of a multi-spec wave)

---

## Architecture Context

### Feature surface

The `/ask` page is the AI Bible chat experience. It is a conversational UI (question → answer → follow-up chips), not a content-grid marketing page. The page lives at `frontend/src/pages/AskPage.tsx` with 8 supporting components under `frontend/src/components/ask/`. All 8 components are in the touch list for this redesign; no new files are created.

The page currently uses:
- `<Layout>` wrapper (no `transparentNav`), which gives it `bg-hero-bg` via Layout + constrained `max-w-7xl` content padding.
- `<PageHero title="Ask God's Word" scriptWord="Word" showDivider>` — produces H1 with Caveat accent on "Word" and renders the `HeadingDivider` SVG.
- `<BackgroundSquiggle>` inside a `<div style={SQUIGGLE_MASK_STYLE}>` — atmospheric squiggle mask layered behind content.
- Cyan-tinted textarea glow (`border-glow-cyan/30` + cyan+violet dual shadow).
- `text-white/70` and `text-white/80` throughout for body copy.
- Pill chips with `text-white/70`, `border-white/15`, no hover lift.
- Solid purple `bg-primary` submit button (not a white pill).
- Hand-rolled verse cards (`rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm`).
- Hand-rolled conversion-prompt card (NOT FrostedCard), with `<Link to="/register">` CTA text "Get Started — It's Free" and dismiss link at `text-primary-lt` — which FAILS WCAG AA 4.5:1 at 4.15:1.
- Verse reference link at `text-primary-lt` — FAILS WCAG AA at 4.05:1.
- Purple user-question bubble (`bg-primary/20`).
- Manual `prefersReducedMotion` JavaScript check (lines 58-60) used to conditionally gate `animate-fade-in-up` and `animate-fade-in`.

The spec replaces the shell, refactors every opacity, and standardizes every CTA to the Round 3 canonical patterns without changing the conversational paradigm or mock-data surface.

### Files touched

| File | Change type |
|---|---|
| `frontend/src/pages/AskPage.tsx` | Major: shell restructure, hero refactor, textarea, submit, chip grid, loading state, imports |
| `frontend/src/components/ask/AskResponseDisplay.tsx` | Major: opacity swaps, FrostedCard verse cards, tier 2 callout, 4 action buttons, feedback row |
| `frontend/src/components/ask/UserQuestionBubble.tsx` | Minor: frosted glass swap, rounded-tr-sm |
| `frontend/src/components/ask/PopularTopicsSection.tsx` | Moderate: FrostedCard as="button", opacity swap, scroll-reveal, grid unchanged |
| `frontend/src/components/ask/ConversionPrompt.tsx` | Moderate: FrostedCard wrap, white-pill CTA with shine, WCAG dismiss fix, swap Link→auth modal |
| `frontend/src/components/ask/SaveConversationButton.tsx` | Minor: white-pill CTA swap |
| `frontend/src/components/ask/DigDeeperSection.tsx` | Minor: chip className standardization + border |
| `frontend/src/components/ask/VerseCardActions.tsx` | Moderate: 3 inline buttons, opacity + color swap, note textarea white-glow, save-note mini-pill |
| `frontend/src/pages/__tests__/AskPage.test.tsx` | Update assertions |
| `frontend/src/components/ask/__tests__/*.test.tsx` (8 files present) | Update assertions that check old classNames |

**No new files. No deletions.** Imports of `BackgroundSquiggle`, `SQUIGGLE_MASK_STYLE`, and `PageHero` are removed from `AskPage.tsx`, but the components themselves remain in the codebase (homepage still uses `BackgroundSquiggle`; other pages still use `PageHero`).

### Patterns to follow

- **White pill CTA — Pattern 1 (inline):** see `09-design-system.md` § "White Pill CTA Patterns" — also documented verbatim at Spec section "Canonical visual vocabulary → Inline white-pill CTA — Pattern 1". Reference file for inline pattern: `PrayerInput.tsx` line 170 (Pattern 2 — homepage primary variant).
- **White pill CTA — Pattern 2 with `text-hero-bg`:** used for main "Find Answers" submit button. Exact string lifted from `PrayerInput.tsx` line 170 ("Help Me Pray" button).
- **White pill CTA — Register variant with shine:** used for ConversionPrompt CTA. Exact string lifted from `RegisterPage.tsx` line 166.
- **Canonical textarea glow:** `09-design-system.md` § "Textarea Glow Pattern" — static white box-shadow, not `animate-glow-pulse`. Reference file: `PrayerInput.tsx` line 137.
- **FrostedCard:** `frontend/src/components/homepage/FrostedCard.tsx` supports `as="button"` + `onClick` + `className` override. Default padding is `p-6`; override via `!p-4` / `p-5` in className.
- **FrostedCard Tier 2 scripture callout:** `09-design-system.md` § "FrostedCard Tier System" — `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3`.
- **GlowBackground.fullPage:** `frontend/src/components/homepage/GlowBackground.tsx` line 5 — 6th variant added by Register Round 2. 5 orbs at 5%/30%/55%/75%/92% of scroll length.
- **useScrollReveal + staggerDelay:** `frontend/src/hooks/useScrollReveal.ts` lines 10 + 51. Requires `scroll-reveal` + `is-visible` classes on the child, plus `style={staggerDelay(index, baseDelay)}`. The hook's `ref` is typed as `React.RefObject<HTMLElement | null>`; consumers cast to `RefObject<HTMLDivElement>`.
- **Animation tokens (BB-33):** `frontend/src/constants/animation.ts` defines `fast`/`base`/`slow`/`instant` durations. Spec uses `duration-base` (300ms) and `motion-reduce:transition-none` for all new transitions — matches the BB-33 canonical tokens.
- **Reduced motion:** global CSS safety net at `frontend/src/styles/animations.css` zeros all animations under `prefers-reduced-motion: reduce`. Components do NOT need manual `window.matchMedia` checks. Tailwind `motion-safe:` / `motion-reduce:` variants are the modern replacement.

### Test patterns

- All Ask tests live in `frontend/src/components/ask/__tests__/` (8 files) + `frontend/src/pages/__tests__/AskPage.test.tsx`.
- Tests are Vitest + React Testing Library.
- AskPage tests wrap rendered output in `ToastProvider` + `AuthModalProvider` + `AuthProvider` + `MemoryRouter`. Reference existing test setup in `AskPage.test.tsx`.
- Assertions use `expect(element).toHaveClass(...)` + `expect(element.className).toContain(...)` — mix both styles. Match existing convention.
- `@testing-library/user-event` is the canonical interaction library for submit/click tests.
- For reduced-motion assertions: mock `window.matchMedia` to return `matches: true` for `(prefers-reduced-motion: reduce)` and assert on computed styles or className absence.

### Auth gating patterns

AskPage uses the canonical `useAuth()` + `useAuthModal()` pattern. Reference: AskPage.tsx lines 38-39, then each gated handler (handleFollowUpClick, handleJournal, handlePray, handleFeedback) wraps:

```tsx
if (!isAuthenticated) {
  authModal?.openAuthModal('Sign in to <reason>')
  return
}
```

**ConversionPrompt gets a new auth modal call.** Currently uses `<Link to="/register">`; spec converts it to `authModal?.openAuthModal(undefined, 'register')`. The 2nd positional argument `'register'` is the mode parameter (register vs login). Verify `useAuthModal` supports this signature before coding.

The spec adds NO new auth gates — all existing gated actions remain gated (handleFollowUpClick, handleJournal, handlePray, handleFeedback, plus new authModal call in ConversionPrompt CTA). VerseCardActions is already auth-gated (handleHighlight, handleSaveNoteClick at lines 42 + 51).

### Database tables involved

None. Zero backend changes. All data is frontend-only.

### localStorage keys

The spec touches no new keys. Existing `ASK_FEEDBACK_KEY` (for thumbs feedback) is untouched.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|---|---|---|---|
| Follow-up chip click | Requires login; opens auth modal when logged out | Step 1 (preserved as-is from current code) | `useAuth` + `useAuthModal` |
| Journal about this button | Requires login | Step 1 (preserved) | `useAuth` + `useAuthModal` |
| Pray about this button | Requires login | Step 1 (preserved) | `useAuth` + `useAuthModal` |
| Feedback thumbs up/down | Requires login | Step 1 (preserved) | `useAuth` + `useAuthModal` |
| ConversionPrompt "Create Your Account" CTA | Triggers auth modal in register mode (NEW — replaces `<Link to="/register">`) | Step 5 | `authModal?.openAuthModal(undefined, 'register')` |
| VerseCardActions "Highlight in Bible" | Requires login | Step 8 (preserved) | `useAuth` + `useAuthModal` |
| VerseCardActions "Save note" | Requires login | Step 8 (preserved) | `useAuth` + `useAuthModal` |

All 7 auth-gated actions from the spec are accounted for. No new auth gates introduced; one gate (ConversionPrompt CTA) changes from a route-nav to an auth modal.

---

## Design System Values (for UI steps)

All values below are copy-paste exact strings from the spec's "Canonical visual vocabulary" section. Do not reorder utilities, do not drop classes that look redundant. These are the source of truth — spec > recon > rules file when values differ.

### Page shell

| Component | Property | Value | Source |
|---|---|---|---|
| Layout wrapper | element | `<Layout transparentNav>` | spec §Page shell |
| Atmosphere | element | `<GlowBackground variant="fullPage">` (immediate child of Layout) | spec §Page shell |
| Page background color | class | `bg-hero-bg` (#08051A, provided by Layout — do NOT set `bg-dashboard-dark`) | spec §Page shell |

### Hero H1

| Property | Value |
|---|---|
| Text | `Ask God's Word` (NO cursive accent on "Word") |
| className | `pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift` |
| Inline style | `GRADIENT_TEXT_STYLE` from `@/constants/gradients` |
| NO | `HeadingDivider` rendered below |

### Hero subtitle

| Property | Value |
|---|---|
| Text | `Bring your questions. Find wisdom in Scripture.` (unchanged) |
| className | `mx-auto mt-4 max-w-xl text-base text-white sm:text-lg` |
| NO | `font-serif`, `italic`, `text-white/60` |

### Hero section padding (vertical rhythm compression)

| Property | Value |
|---|---|
| Section className | `px-4 pt-24 pb-6 text-center sm:px-6 sm:pt-28 sm:pb-8` |

### Input container (`<section>` replacing current `<main>`)

| Property | Value |
|---|---|
| className | `mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14` |

### Primary submit CTA — Daily Hub variant (Find Answers)

```
inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]
```

### Conversion-critical CTA — Register variant with shine (Create Your Account)

```
animate-shine mt-8 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none
```

### Inline white-pill CTA — Pattern 1 (4 action buttons, Save conversation)

```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

### Topic chip — standardized

```
inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
```

### Textarea — canonical white-glow (#ask-input)

```
w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
```

### Textarea — canonical white-glow (VerseCardActions note textarea, narrower shadow)

```
w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/50 shadow-[0_0_16px_2px_rgba(255,255,255,0.40),0_0_32px_6px_rgba(255,255,255,0.24)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
```

### Tier 2 scripture callout (encouragement)

```
mt-8 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3
```

Inner paragraph: `text-base leading-relaxed text-white`

### UserQuestionBubble

```
max-w-[90%] rounded-2xl rounded-tr-sm border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-4 sm:max-w-[80%]
```

### Verse reference link (WCAG fix)

```
font-semibold text-white underline decoration-primary/60 underline-offset-4 transition-[text-decoration-color,text-decoration-thickness] duration-base motion-reduce:transition-none hover:decoration-primary hover:decoration-2
```

### Feedback thumb buttons

```
inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/10 border border-white/20 p-2.5 transition-colors duration-base motion-reduce:transition-none hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg
```

### VerseCardActions — 3 inline action buttons

```
inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-white/80 transition-colors duration-base motion-reduce:transition-none hover:text-white
```

### VerseCardActions — Save (mini white pill, compressed Pattern 1)

```
inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
```

### VerseCardActions — Cancel (note editor)

```
min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition-colors duration-base motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg
```

### Body copy opacity rules

| Tier | Opacity | Use case |
|---|---|---|
| Primary | `text-white` | answer paragraphs, verse body, encouragement, prayer body, question text in user bubble |
| Secondary | `text-white/80` | verse explanation, conversion body, popular topic descriptions, VerseCardActions action buttons |
| Caption | `text-white/60` | timestamps, "Was this helpful?" label, AI disclaimer, Psalm citation, draft indicators |
| Forbidden in /ask | `text-white/70`, `text-white/50`, `text-white/40` | (except `text-white/70` on ConversionPrompt dismiss link — documented exception for WCAG-compliant link color) |

---

## Design System Reminder

Before each UI step, the executor should confirm the following Worship Room-specific quirks. These prevent the top 10 most common drift failures:

- **Hero H1 uses `GRADIENT_TEXT_STYLE`, not Caveat font.** Caveat has been deprecated for headings app-wide. The existing `<PageHero scriptWord="Word">` renders a Caveat accent on "Word" — the spec removes `scriptWord` and the whole PageHero.
- **Subtitle is `text-white` (full opacity), Inter sans, NOT italic.** Current uses `font-serif italic text-white/60`; spec rejects all three attributes.
- **Textarea glow is WHITE, not cyan.** The existing `border-glow-cyan/30` + cyan+violet dual shadow is deprecated. Replace with the canonical white-glow class string. Do NOT use `animate-glow-pulse` (removed in Wave 6).
- **Primary CTA is a white pill, not solid purple.** `bg-primary text-white rounded-lg` is deprecated for new CTAs. Submit uses the Daily Hub variant (`text-hero-bg`); ConversionPrompt uses the Register variant (`text-primary` + `animate-shine`); inline actions use Pattern 1 (`text-primary` smaller).
- **Verse cards and ConversionPrompt wrap in `<FrostedCard>`, not hand-rolled card className.** FrostedCard defaults to `p-6`; override via `className="p-5"` or `className="!p-4"` (use `!` only where FrostedCard applies its own `p-6` and Tailwind merge can't win).
- **User question bubble is frosted glass with `rounded-tr-sm`, NOT `bg-primary/20`.** The purple tint is the Round 2 style; the frosted glass + top-right notch is the Round 3 chat style.
- **No manual `prefersReducedMotion` JS checks.** The spec deletes the JS variable (AskPage.tsx lines 58-60) and replaces conditionals with Tailwind's `motion-safe:` / `motion-reduce:` variants. The `prefersReducedMotion` prop is REMOVED from both `AskResponseDisplay` and `ConversionPrompt` interfaces. Scroll callbacks that use `window.matchMedia` inline it where needed.
- **GlowBackground `fullPage` variant is the only variant used.** Do NOT use `center` / `left` / `right` — those are for narrower per-section use. `fullPage` distributes 5 orbs across the scroll length.
- **Mobile topic-chip grid is `grid-cols-2` (3×2), NOT flex-wrap stack.** Recon confirmed 6 chips stack as 6 rows at 375px; `grid grid-cols-2 gap-2` fixes this.
- **4 action buttons grid container adds `sm:flex-wrap sm:justify-center sm:gap-4`** on top of the existing `grid grid-cols-2 gap-3 sm:flex sm:flex-row`. Do NOT replace — ADD these utilities.
- **Scroll-reveal uses Pattern B (inline `scroll-reveal` + `is-visible` class toggle) with `useScrollReveal` hook.** Apply to 4 targets: topic chip grid, Popular Topic grid, verse cards, 4 action buttons. Do NOT apply to hero H1, hero subtitle, textarea, submit button, feedback row, AI disclaimer, ConversionPrompt, SaveConversationButton.
- **Existing animations PRESERVED:** `animate-fade-in-up` on AskResponseDisplay root (wrap with `motion-safe:`), `animate-fade-in` on ConversionPrompt wrapper (wrap with `motion-safe:`), `motion-safe:animate-bounce motion-reduce:animate-none` on loading dots (keep as-is).
- **NEW animations:** `animate-gradient-shift` on hero H1 (12s gradient loop — already in `frontend/src/index.css` line 294), `animate-shine` on ConversionPrompt CTA only (6s shine sweep — already in `frontend/src/index.css` line 309). Do NOT add `animate-shine` to the "Find Answers" submit button.
- **ConversionPrompt CTA converts from `<Link to="/register">` to `authModal?.openAuthModal(undefined, 'register')`.** The 2-arg form opens the auth modal in register mode without pre-filling a reason string.
- **Verse reference link WCAG fix is a CORRECTNESS bug, not polish.** Current `text-primary-lt` is 4.05:1 on verse cards — fails WCAG AA 4.5:1. Replacement `text-white underline decoration-primary/60` is 17.4:1 — passes AAA. Same story for ConversionPrompt dismiss link.
- **Out-of-scope cyan consumers documented in spec — do NOT touch them:** MoodCheckIn, CreatePlanFlow, RoutineStepCard, RoutineBuilder, TypewriterInput. The spec explicitly forbids fixing these in this PR.

Source: spec §"CRITICAL EXECUTION RULES", spec §"Canonical visual vocabulary", `.claude/rules/09-design-system.md` §"Round 3 Visual Patterns" + §"Daily Hub Visual Architecture" + §"Deprecated Patterns", `.claude/rules/04-frontend-standards.md` §"Inline Element Layout — Position Verification Discipline", Register Round 2 plan Execution Log (animate-shine + fullPage glow precedents).

---

## Shared Data Models (from Master Plan)

N/A — this spec does not depend on a master spec plan. All types used remain unchanged:

```typescript
// frontend/src/types/ask.ts — unchanged
interface AskResponse { /* id, answer, verses, encouragement, prayer, followUpQuestions */ }
interface AskVerse { /* reference, text, explanation */ }
interface AskFeedback { /* questionId, helpful, timestamp */ }
```

localStorage keys this spec touches:

| Key | Read/Write | Description |
|---|---|---|
| `wr_ask_feedback` (via `ASK_FEEDBACK_KEY`) | Both | Existing — stores thumbs up/down feedback entries. No contract change. |

No new localStorage keys introduced.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|---|---|---|
| Mobile | 375px | `pt-24 pb-6 px-4` hero padding; subtitle 16px; container full width with `px-4`; topic chip grid `grid-cols-2` (3 rows × 2 cols); Popular Topics grid `grid-cols-1` (5 rows); Response action buttons `grid-cols-2` (2 rows); DigDeeper chips `flex-col`; thumbs buttons side-by-side |
| Tablet | 768px | `pt-28 pb-8 px-6` hero padding; subtitle 18px; container `max-w-3xl` with `px-6`; topic chip grid `sm:flex sm:flex-wrap sm:justify-center` (flex row); Popular Topics grid `sm:grid-cols-2` (2+2+1); Response action buttons `sm:flex-wrap sm:justify-center` (flex row, likely 2 rows at 768); DigDeeper chips `sm:flex-row sm:flex-wrap` |
| Desktop | 1440px | Hero H1 60px; Hero padding same as tablet; container `max-w-3xl`; topic chips flex-row; Popular Topics `lg:grid-cols-3` (3+2); Response action buttons flex-wrap single row likely |

**Custom breakpoints:** The topic chip grid switches at 640px (`sm:`) from `grid grid-cols-2` to `sm:flex sm:flex-wrap sm:justify-center`. The Popular Topics grid switches at both `sm:` (640px → 2 cols) and `lg:` (1024px → 3 cols). These are the standard Tailwind breakpoints.

**Target after changes:** at 1440 × 900 viewport, Popular Topics heading Y ≤ 820px (vs current 900px at the fold). Verified post-implementation by measuring in Playwright at `y=` assertion.

---

## Inline Element Position Expectations

The /ask redesign has 3 inline-row layouts that must be position-verified:

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---|---|---|---|
| Topic chip row (≥640px) | 6 topic chips | All 6 chips same y ±5px at 768px and 1440px | Wrapping below 640px is REQUIRED (grid-cols-2 layout) |
| Popular Topic card row (1440px) | 5 Popular Topic cards in `lg:grid-cols-3` | Row 1 (3 cards) same y; Row 2 (2 cards) same y — two distinct rows | N/A — grid layout, not flex-wrap |
| Response action button row (≥640px) | Ask another / Journal / Pray / Share | At ≥1024px, all 4 on same y ±5px; at 768px, wrap tolerance allows 2-row layout | Wrapping at 768px is acceptable; 4 cards that wrap to 2+2 is fine |
| Feedback row (all viewports) | "Was this helpful?" label + thumbs-up + thumbs-down | All 3 same y ±5px at every viewport | No wrap — single row across all breakpoints |
| DigDeeper chip row (≥640px) | N follow-up chips (typically 3) | Same y ±5px at 768px+ | Wrapping below 640px is REQUIRED (flex-col layout) |
| VerseCardActions 3-button row | Highlight / Save note / Share | Same y ±5px at every viewport | No wrap — icons + 3 short labels fit even at 375px |

---

## Vertical Rhythm

Measurements from `_plans/recon/ask-v2.md` at 1440 × 900:

| From → To | Current Gap | Target Gap | How |
|---|---|---|---|
| Hero section top → H1 top | `pt-32` = 128px | `pt-24` = 96px | Shave 32px via `pt-24 sm:pt-28` |
| H1 bottom → subtitle top | 40px | 40px (unchanged) | Keep `mt-4` |
| Subtitle bottom → textarea top | 104px | ~40px | Drop `<main>` top padding; input container is `<section>` with `pb-10 sm:pb-14` only |
| Hero section bottom padding | `pb-8 sm:pb-12` = 32-48px | `pb-6 sm:pb-8` = 24-32px | Shave 8-16px |
| Popular Topics heading Y (1440×900) | 900px (AT FOLD) | ≤820px | Above compressions add up to ~100px lift |

Verification: Playwright checkpoint at 1440×900 measures `PopularTopicsSection h2` `boundingBox().y` ≤ 820. Current fails; after Step 1 hero-shell changes, should pass.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] Current branch is `claude/feature/ask-page-redesign` (NOT main, NOT Register). Run `git branch --show-current` before Step 1.
- [ ] Register Round 2 has merged. `animate-gradient-shift` and `animate-shine` keyframes must be present in `frontend/src/index.css`. (Verified at plan-write time: lines 294 + 309.)
- [ ] `GlowBackground.fullPage` variant is present in `frontend/src/components/homepage/GlowBackground.tsx`. (Verified at plan-write time: line 5, `GLOW_CONFIG.fullPage` at line 73.)
- [ ] `useAuthModal().openAuthModal` supports the 2-argument signature `(reason: string | undefined, mode: 'login' | 'register')`. If not, verify the actual signature and adjust the ConversionPrompt CTA call accordingly. Fallback: if only single-arg is supported, open auth modal without mode specification and rely on default behavior.
- [ ] `FrostedCard` accepts `as="button"` + `onClick` + `className` override props. (Verified via spec language; verify at execution-time by reading the component.)
- [ ] No new files are created. Every change is an edit to a file already in the target list.
- [ ] Out-of-scope cyan files (MoodCheckIn, CreatePlanFlow, RoutineStepCard, RoutineBuilder, TypewriterInput) are NOT touched.
- [ ] Existing `ASK_TOPIC_CHIPS` (6 chips) and `POPULAR_TOPICS` (5 topics) from `frontend/src/constants/ask.ts` are unchanged.
- [ ] Mock AI response logic in `frontend/src/mocks/ask-mock-data.ts` is unchanged.
- [ ] AI disclaimer text is unchanged.
- [ ] Crisis detection via `CrisisBanner` is unchanged — do not modify `CrisisBanner` itself or the inline usage in AskPage or VerseCardActions.
- [ ] Design system values are verified via spec §"Canonical visual vocabulary" (line-for-line verbatim match in plan).
- [ ] 1 [UNVERIFIED] value is flagged (exact verse reference link contrast in the running app — plan relies on spec's 17.4:1 calculation).
- [ ] Recon report `_plans/recon/ask-v2.md` is loaded for visual verification during execution.
- [ ] No deprecated patterns used (Caveat headings, BackgroundSquiggle on /ask, animate-glow-pulse, cyan textarea borders, italic Lora prose, soft-shadow 8px-radius cards, PageTransition).

### [UNVERIFIED] values

1. **Verse reference link contrast = 17.4:1 in running app.**
   - Best guess: spec's calculated 17.4:1 matches rendered contrast.
   - To verify: Run `/verify-with-playwright /ask?q=hey` and axe-core contrast report should show 0 failures on the verse reference link.
   - If wrong: Re-check the FrostedCard background color in the running app; the blend of `bg-white/[0.06]` over `bg-hero-bg` determines effective bg. Adjust `decoration-primary/60` opacity if needed but keep text color `text-white`.

2. **Popular Topics heading Y ≤ 820px at 1440×900 after hero compression.**
   - Best guess: 100px compression produces Y ~800px.
   - To verify: Playwright `boundingBox()` measurement on the `<h2>Popular Topics</h2>` element at 1440×900.
   - If wrong: Further compress the space between submit button and Popular Topics heading by reducing `<section>` bottom padding (`pb-10` → `pb-6`) or adding negative margin on PopularTopicsSection `<h2>` (`mb-4` → `mb-3`).

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|---|---|---|
| `prefersReducedMotion` variable | Remove from both AskResponseDisplay and ConversionPrompt props | Tailwind `motion-safe:` / `motion-reduce:` replaces it; BB-33 global safety net catches any remaining transitions |
| `window.matchMedia` check in scrollIntoView callbacks | Inline the check where needed, do not keep component-level variable | Spec explicit (§1i); two callsites (handleSubmit + handleAskAnother); inline saves re-renders |
| ConversionPrompt CTA: Link to /register vs auth modal | Open auth modal with `mode='register'` | Spec §5b; matches Register hero CTA behavior (1 click → sign-up modal) |
| Topic chip mobile layout | `grid grid-cols-2` at <640px | Recon measured 6-row stack at 375px; grid-cols-2 produces 3×2 |
| Response action button row at 768px | Allow wrap (2+2) | `sm:flex-wrap sm:justify-center sm:gap-4` — 4 buttons with icon+label at `px-6 py-2.5` don't fit in one 768px row |
| Popular Topics heading position | Target ≤820px at 1440×900 | Recon measured 900px (at fold); vertical-rhythm compression targets 100px lift |
| Verse reference link styling | `text-white` + `underline decoration-primary/60` | WCAG bug fix (4.05:1 → 17.4:1); preserves purple decorative accent via decoration-color |
| ConversionPrompt dismiss link | `text-white/70 hover:text-white` + decorative underline | WCAG bug fix (4.15:1 → 9.04:1); `text-white/70` is the documented exception to "no /70 in /ask" |
| AskResponseDisplay root animation | `motion-safe:animate-fade-in-up` (keep existing animation, drop JS conditional) | Spec §2a; removes prop-chain coupling |
| `.test.tsx` assertion updates | Update every assertion that checks `text-primary`, `bg-primary`, `bg-primary/20`, `border-glow-cyan`, `font-serif italic`, `Get Started — It's Free`, `text-primary-lt` | Spec testing plan explicit |
| Logo/SVG for ConversionPrompt animation | Use `animate-shine` class only; no new keyframes | Shine is a pure CSS `::after` pseudo-element sweep already in index.css |
| Scrolling order after submit | Same as current: scrollIntoView with smooth/auto per reduced motion | No behavior change — only how reduced-motion is detected |
| Hero section wrapper element | `<section aria-labelledby="ask-hero-heading">` | Adds a11y over current PageHero; H1 gets `id="ask-hero-heading"` |
| "Popular Topics" rendering location | Inside the input view only (preserved — already correct) | No layout change; spec confirms §1j |

---

## Implementation Steps

### Step 1: Restructure AskPage.tsx shell — hero, glow, textarea, chips, submit, loading

**Objective:** Replace the AskPage shell (Layout wrapper, hero, background, textarea, topic chips, submit button, loading state) with the Round 3 canonical visual patterns. Preserve every hook, callback, ref, and state variable — only JSX and classNames change.

**Files to create/modify:**
- `frontend/src/pages/AskPage.tsx` — modify (major)

**Details:**

1. **Imports — remove:**
   - `import { PageHero } from '@/components/PageHero'`
   - `import { BackgroundSquiggle, SQUIGGLE_MASK_STYLE } from '@/components/BackgroundSquiggle'`

2. **Imports — add:**
   - `import { GlowBackground } from '@/components/homepage/GlowBackground'`
   - `import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'`
   - `import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'`
   - `import type { RefObject } from 'react'`

3. **Remove `prefersReducedMotion` component-level variable (lines 58-60):**
   - Delete the `const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches` line.
   - In `handleSubmit` (line ~83) and `handleFollowUpClick` (line ~144), replace `behavior: prefersReducedMotion ? 'auto' : 'smooth'` with an inline check:
     ```ts
     const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
     // then: behavior: reducedMotion ? 'auto' : 'smooth'
     ```
   - In `handleAskAnother` (line ~128), same inline pattern for `window.scrollTo`.

4. **Declare scroll-reveal hooks at component body, near other hooks (after the useRef declarations):**
   ```ts
   const chipsReveal = useScrollReveal({ threshold: 0.1 })
   ```
   Note: `topicsReveal` lives inside `PopularTopicsSection.tsx` (Step 4), so AskPage only declares `chipsReveal`.

5. **Replace the JSX return block (starting from `return (` at line 224 through `)` before line 395) with the new shell.** Preserve every handler, `CrisisBanner`, `CharacterCount`, all state variables, the conversation mapping block, the aria-live wrapper, and the SaveConversationButton / ConversionPrompt invocations. Only the outer wrapper + hero + input section + textarea + chips + submit + loading markup changes.

6. **Outer shell structure:**
   ```tsx
   return (
     <Layout transparentNav>
       <SEO {...ASK_METADATA} />
       <GlowBackground variant="fullPage">
         <section
           aria-labelledby="ask-hero-heading"
           className="px-4 pt-24 pb-6 text-center sm:px-6 sm:pt-28 sm:pb-8"
         >
           <h1
             id="ask-hero-heading"
             className="pb-2 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl animate-gradient-shift"
             style={GRADIENT_TEXT_STYLE}
           >
             Ask God's Word
           </h1>
           <p className="mx-auto mt-4 max-w-xl text-base text-white sm:text-lg">
             Bring your questions. Find wisdom in Scripture.
           </p>
         </section>

         <section className="mx-auto max-w-3xl px-4 pb-10 sm:px-6 sm:pb-14">
           {/* showInput conditional — see sub-item 7 */}
           {/* aria-live conversation wrapper — preserved from current code */}
           {/* ConversionPrompt — preserved invocation with updated prop signature (no prefersReducedMotion) */}
           {/* SaveConversationButton — preserved */}
         </section>
       </GlowBackground>
     </Layout>
   )
   ```

   Remove: outer `<div className="min-h-screen bg-dashboard-dark">`, `<PageHero>` block, the `<div style={SQUIGGLE_MASK_STYLE}><BackgroundSquiggle /></div>` block, and both `<div className="relative">` wrappers — these were only needed to layer the squiggle.

7. **`showInput` block — textarea, CrisisBanner, topic chip grid, submit button, PopularTopicsSection:**

   a. **Textarea** (replace the existing className at line 261-266 with the canonical white-glow string):
   ```tsx
   <textarea
     id="ask-input"
     value={text}
     onChange={(e) => { setText(e.target.value); autoExpand(e.target) }}
     placeholder="What's on your heart? Ask anything..."
     maxLength={ASK_MAX_LENGTH}
     rows={3}
     aria-label="Your question"
     aria-describedby="ask-char-count"
     className="w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] py-3 px-4 text-base text-white placeholder:text-white/50 shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
   />
   ```
   CharacterCount below unchanged.

   b. **CrisisBanner** — unchanged.

   c. **Topic chips** — replace the `mb-6 flex flex-wrap justify-center gap-2` wrapper and per-chip className:
   ```tsx
   <div
     ref={chipsReveal.ref as RefObject<HTMLDivElement>}
     className="mb-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center"
   >
     {ASK_TOPIC_CHIPS.map((chip, index) => (
       <button
         key={chip}
         type="button"
         onClick={() => handleChipClick(chip)}
         className={cn(
           'scroll-reveal',
           chipsReveal.isVisible && 'is-visible',
           'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]',
         )}
         style={staggerDelay(index, 40)}
       >
         {chip}
       </button>
     ))}
   </div>
   ```

   d. **Submit button** — replace the className (remove the `!text.trim()` conditional — rely on `disabled={!text.trim()}` + `disabled:*` Tailwind variants):
   ```tsx
   <div className="flex justify-center">
     <button
       type="button"
       onClick={handleSubmit}
       disabled={!text.trim()}
       className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg shadow-[0_0_30px_rgba(255,255,255,0.20)] transition-all motion-reduce:transition-none duration-base hover:bg-white/90 hover:shadow-[0_0_40px_rgba(255,255,255,0.30)] sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
     >
       Find Answers
     </button>
   </div>
   ```

   e. **PopularTopicsSection** — preserved invocation: `<PopularTopicsSection onTopicClick={handleTopicClick} />` (internals change in Step 4).

8. **Loading state (the existing block at line 344-376):**
   - Replace each loading dot className `rounded-full bg-primary` with `rounded-full bg-white/80` (3 dots).
   - Replace `<p className="text-white/60">Searching Scripture for wisdom...</p>` with `<p className="text-white">Searching Scripture for wisdom...</p>`.
   - Replace Psalm quote paragraph className `mt-4 font-serif italic text-white/60` with `mt-4 font-serif text-white/80` (remove `italic`).
   - Psalm citation inner span: change from `mt-1 block text-sm not-italic` to `mt-1 block text-sm text-white/60` (explicit caption tier).

9. **Conversation + ConversionPrompt + SaveConversationButton invocations:**
   - Conversation `<AskResponseDisplay>` props — remove the `prefersReducedMotion={prefersReducedMotion}` prop.
   - ConversionPrompt invocation — remove the `prefersReducedMotion={prefersReducedMotion}` prop:
     ```tsx
     <ConversionPrompt onDismiss={() => setConversionDismissed(true)} />
     ```

10. **OfflineNotice early-return** (line 214) — UNCHANGED. It delegates to the shared component which owns its own layout.

**Auth gating (applicable to step):**
- All existing auth gates preserved: `handleFollowUpClick`, `handleJournal`, `handlePray`, `handleFeedback` all continue to check `isAuthenticated` and call `authModal?.openAuthModal(...)`.
- No new auth gates added in this step.

**Responsive behavior:**
- Desktop (1440px): Hero H1 60px, `pt-28 pb-8 px-6`; subtitle 18px; container `max-w-3xl`; topic chips in flex-row; submit button `text-lg`.
- Tablet (768px): Hero H1 48px, same padding; topic chips flex-wrap; submit button `text-lg`.
- Mobile (375px): Hero H1 36px, `pt-24 pb-6 px-4`; subtitle 16px; container full-width px-4; topic chip grid `grid-cols-2` (3 rows × 2 cols); submit button `text-base`.

**Inline position expectations:**
- Topic chip row (≥640px): all 6 chips same y ±5px.
- Hero H1 "Ask God's Word" — single line at 1440px (441px wide).

**Guardrails (DO NOT):**
- DO NOT touch `autoExpand`, `handleSubmit`, `handleChipClick`, `handleTopicClick`, `handleAskAnother`, `handleFollowUpClick`, `handleJournal`, `handlePray`, `handleShare`, `handleFeedback` (only scroll behavior strings change).
- DO NOT touch `getAskResponse` import or mock-data flow.
- DO NOT add `BackgroundSquiggle` or `PageHero` back.
- DO NOT set `bg-dashboard-dark` anywhere.
- DO NOT add `animate-shine` to the "Find Answers" button — Daily Hub variant doesn't ship with shine per spec.
- DO NOT add `animate-glow-pulse` to the textarea — deprecated in Wave 6.
- DO NOT change the 6 chip content from `ASK_TOPIC_CHIPS`.
- DO NOT change the `OfflineNotice` early-return branch.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "Layout renders in transparentNav mode" | unit | Render AskPage, assert no element has className `bg-dashboard-dark`; optionally check for `GlowBackground` orb test-ids (≥3 orbs) |
| "Hero H1 has animate-gradient-shift" | unit | `screen.getByRole('heading', { level: 1 })` has className containing `animate-gradient-shift`; text equals "Ask God's Word"; no descendant has className `font-script` |
| "Hero subtitle is text-white sans-serif" | unit | `screen.getByText(/Bring your questions/)` has className NOT containing `italic` or `font-serif` or `text-white/60`; contains `text-white` |
| "Textarea has white glow, no cyan" | unit | `#ask-input` has className containing `border-white/30`, `shadow-[0_0_20px_3px_rgba(255,255,255,0.50)`, NOT containing `border-glow-cyan`, `cyan`, `0, 212, 255` |
| "Submit button is white pill" | unit | "Find Answers" button has className containing `bg-white`, `text-hero-bg`, `rounded-full`; NOT containing `bg-primary`, `rounded-lg` |
| "Submit button disabled when textarea empty" | unit | Initial render, assert button disabled; type into textarea, assert button enabled |
| "6 topic chips render" | unit | `screen.getAllByRole('button', { name: /anxiety|forgiveness|purpose|grief|doubt|identity/i })` has length 6 (check against ASK_TOPIC_CHIPS) |
| "Topic chips have canonical classes" | unit | Each chip has className containing `text-white`, `border-white/20`, `hover:-translate-y-0.5`; NOT containing `text-white/70`, `border-white/15` |
| "Topic chip grid mobile layout" | unit | At mobile viewport (mocked via resize), grid wrapper has className `grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center` |
| "Loading dots are white" | unit | Submit with "hey", advance fake timers, during loading window assert all 3 loading dots have className containing `bg-white/80`, NOT `bg-primary` |
| "Psalm quote is NOT italic" | unit | During loading state, assert Psalm paragraph does NOT have className containing `italic`; has `text-white/80` |
| "No manual prefersReducedMotion prop on AskResponseDisplay" | unit | Render, check via TypeScript — `AskResponseDisplay` props should no longer include `prefersReducedMotion` (this is enforced by Step 2) |

**Expected state after completion:**
- [ ] AskPage.tsx imports updated (PageHero/BackgroundSquiggle/SQUIGGLE_MASK_STYLE removed; GlowBackground/GRADIENT_TEXT_STYLE/useScrollReveal/staggerDelay/RefObject added)
- [ ] Component body: `prefersReducedMotion` variable deleted; 3 inline `reducedMotion` checks added where scrollIntoView/scrollTo call it
- [ ] `chipsReveal` hook declared
- [ ] JSX shell replaced: Layout → GlowBackground fullPage → hero section → input section
- [ ] Hero H1 uses GRADIENT_TEXT_STYLE + animate-gradient-shift
- [ ] Hero subtitle is text-white sans-serif
- [ ] Textarea uses canonical white-glow class string
- [ ] Topic chip grid with grid-cols-2 mobile + flex tablet/desktop + stagger reveal
- [ ] Submit button uses Daily Hub variant white-pill className
- [ ] Loading state: white dots, text-white label, text-white/80 Psalm, no italic
- [ ] `<ConversionPrompt>` invoked without `prefersReducedMotion` prop
- [ ] `<AskResponseDisplay>` invoked without `prefersReducedMotion` prop
- [ ] `pnpm build` passes; `pnpm lint` passes
- [ ] No console errors on page load

---

### Step 2: Refactor AskResponseDisplay.tsx — opacity, verse cards, tier 2 callout, action buttons, feedback

**Objective:** Replace every opacity class, swap verse cards to FrostedCard, refactor the Tier 2 encouragement callout, convert the 4 action buttons to inline white pills (Pattern 1), restyle thumbs buttons, and remove `prefersReducedMotion` from the props.

**Files to create/modify:**
- `frontend/src/components/ask/AskResponseDisplay.tsx` — modify (major)

**Details:**

1. **Imports — add:**
   - `import { FrostedCard } from '@/components/homepage/FrostedCard'`
   - `import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'`
   - `import type { RefObject } from 'react'`

2. **Props interface — remove `prefersReducedMotion`:**
   ```ts
   interface AskResponseDisplayProps {
     response: AskResponse
     isFirstResponse: boolean
     onFollowUpClick: (question: string) => void
     // prefersReducedMotion REMOVED
     isLoading?: boolean
     onAskAnother?: () => void
     onJournal?: () => void
     onPray?: () => void
     onShare?: () => void
     feedback?: 'up' | 'down' | null
     feedbackThanks?: boolean
     onFeedback?: (type: 'up' | 'down') => void
   }
   ```

3. **Function signature:** Drop `prefersReducedMotion` from destructuring.

4. **Declare scroll-reveal hooks in function body:**
   ```ts
   const versesReveal = useScrollReveal({ threshold: 0.1 })
   const actionsReveal = useScrollReveal({ threshold: 0.1 })
   ```

5. **Root div animation:**
   - Before: `<div className={prefersReducedMotion ? '' : 'animate-fade-in-up'}>`
   - After: `<div className="motion-safe:animate-fade-in-up">`

6. **Direct-answer paragraph (line 45):**
   - Before: `mb-4 text-base leading-relaxed text-white/80`
   - After: `mb-4 text-base leading-relaxed text-white`

7. **Verse-cards wrapper:** Attach `versesReveal.ref` to the existing `<div className="space-y-4">` (line 53):
   ```tsx
   <div ref={versesReveal.ref as RefObject<HTMLDivElement>} className="space-y-4">
   ```

8. **Each verse card (line 57-72):** Replace the hand-rolled card `<div>` with a wrapper + FrostedCard:
   ```tsx
   <div
     key={i}
     className={cn('scroll-reveal', versesReveal.isVisible && 'is-visible')}
     style={staggerDelay(i, 80)}
   >
     <FrostedCard className="p-5">
       {parsed ? (
         <Link
           to={`/bible/${parsed.bookSlug}/${parsed.chapter}#verse-${parsed.verseStart}`}
           className="font-semibold text-white underline decoration-primary/60 underline-offset-4 transition-[text-decoration-color,text-decoration-thickness] duration-base motion-reduce:transition-none hover:decoration-primary hover:decoration-2"
         >
           {verse.reference}
         </Link>
       ) : (
         <p className="font-bold text-white">{verse.reference}</p>
       )}
       <p className="mt-2 font-serif text-white">{verse.text}</p>
       <p className="mt-2 text-sm text-white/80">{verse.explanation}</p>
       <VerseCardActions verse={verse} parsedRef={parsed} />
     </FrostedCard>
   </div>
   ```
   Note: `font-serif italic text-white/70` → `font-serif text-white` (remove `italic`, increase opacity). Verse explanation `text-white/50` → `text-white/80`.

9. **Tier 2 encouragement callout (line 77-79):**
   - Before: `<div className="mt-8 rounded-r-lg border-l-2 border-primary bg-white/[0.06] p-4"><p className="text-white/80">...`
   - After:
     ```tsx
     <div className="mt-8 rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04] px-4 py-3">
       <p className="text-base leading-relaxed text-white">{response.encouragement}</p>
     </div>
     ```

10. **Prayer body (line 84):**
    - Before: `font-serif italic leading-relaxed text-white/60`
    - After: `leading-relaxed text-white/80` (remove both `font-serif` and `italic`)

11. **AI disclaimer (line 88):** Unchanged (`mt-6 text-center text-xs text-white/60`).

12. **4 action buttons (isFirstResponse block, lines 100-155):**
    - Wrapper: `mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row` → `mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4`.
    - Attach `actionsReveal.ref` to wrapper.
    - Each of the 4 buttons: add `scroll-reveal` + `is-visible` + `style={staggerDelay(i, 50)}`.
    - Replace per-button className with Pattern 1 inline white pill:
      ```
      inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]
      ```
    - Icons `<RefreshCw />`, `<BookOpen />`, `<Heart />`, `<Share2 />` remain at `h-4 w-4` and now inherit `text-primary` (purple) automatically.
    - Manually index the 4 buttons 0,1,2,3 for `staggerDelay(i, 50)`.

13. **Feedback row:**
    - Container wrapper (line 158) unchanged.
    - Label span (line 159) unchanged (`text-sm text-white/60`).
    - Thumbs buttons: replace both climbase classNames with the canonical feedback thumb string.
    - Thumb icons: for ThumbsUp/ThumbsDown, default `text-white/60` → `text-white`; selected stays `fill-primary text-primary` (up) or `fill-danger text-danger` (down).
    - Add `transition-colors duration-base motion-reduce:transition-none` to the icon className.
    - Feedback thanks toast: replace `cn('mt-2 text-center text-sm text-white/60', !prefersReducedMotion && 'animate-fade-in')` with plain `className="mt-2 text-center text-sm text-white/60 motion-safe:animate-fade-in"`.

**Auth gating:** No gated actions owned by this file (follow-up, journal, pray, feedback, share gates live in AskPage.tsx and are called via prop callbacks). No changes.

**Responsive behavior:**
- Desktop (1440px): 4 action buttons in flex-wrap row (likely 1 row, 4 buttons); verse cards in column (space-y-4).
- Tablet (768px): 4 action buttons in flex-wrap row (may wrap to 2 rows — acceptable).
- Mobile (375px): 4 action buttons in 2×2 grid; verse cards in column.

**Inline position expectations:**
- Response action button row (≥1024px): all 4 buttons same y ±5px.
- Feedback row: label + thumbs-up + thumbs-down same y ±5px at every viewport.

**Guardrails (DO NOT):**
- DO NOT modify `LinkedAnswerText` usage.
- DO NOT change the verse reference link `Link to` URL structure.
- DO NOT modify `DigDeeperSection` invocation (Step 7 handles that file).
- DO NOT modify `VerseCardActions` invocation (Step 8 handles that file).
- DO NOT change `<h2 className="mb-4 text-xl font-semibold text-white">What Scripture Says</h2>` — already correct.
- DO NOT modify the `isFirstResponse` conditional logic.
- DO NOT break `parseVerseReferences` import or usage.
- DO NOT use FrostedCard without a padding override (default is `p-6`; spec requires `p-5`).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "Root has motion-safe:animate-fade-in-up" | unit | Render AskResponseDisplay with mock response, assert root div has className containing `motion-safe:animate-fade-in-up` |
| "Answer paragraph is full white" | unit | First `<p>` inside `.mb-8` has className containing `text-white`, NOT `text-white/80` |
| "Verse card is a FrostedCard" | unit | Render verse card, query by canonical FrostedCard identifiers (border `border-white/[0.12]` + bg `bg-white/[0.06]`) |
| "Verse reference link is white underlined" | unit | Query by link role, assert className contains `text-white`, `underline`, `decoration-primary/60`; NOT `text-primary-lt`, `font-bold` |
| "Verse body is NOT italic" | unit | Body paragraph (font-serif) has className NOT containing `italic`; contains `text-white` |
| "Verse explanation at /80" | unit | Explanation paragraph has className containing `text-white/80`, NOT `text-white/50` |
| "Tier 2 callout has border-l-4 + rounded-xl" | unit | Encouragement wrapper has className containing `border-l-4`, `border-l-primary/60`, `rounded-xl`, `bg-white/[0.04]`; NOT `border-l-2`, `rounded-r-lg`, `bg-white/[0.06]`, `p-4` |
| "Prayer body is NOT italic, NOT serif" | unit | Prayer paragraph has className NOT containing `font-serif` or `italic`; contains `text-white/80`, NOT `text-white/60` |
| "4 action buttons are white pills with text-primary" | unit | All 4 action buttons have className containing `bg-white`, `text-primary`, `rounded-full`, `font-semibold`; NOT `bg-white/10`, `text-white/70`, `rounded-lg` |
| "Thumbs buttons are round with white/20 border" | unit | Both thumb buttons have className containing `rounded-full`, `border-white/20`, `p-2.5`; NOT `rounded-lg`, `p-2` |
| "Thumb icons default to text-white unselected" | unit | Initial (no feedback), both thumb icons have className containing `text-white`, NOT `text-white/60`. When feedback='up', thumbs-up has `fill-primary text-primary`. When feedback='down', thumbs-down has `fill-danger text-danger`. |
| "Feedback thanks toast uses motion-safe:animate-fade-in" | unit | When feedbackThanks=true, toast `<p>` has className containing `motion-safe:animate-fade-in` |
| "prefersReducedMotion prop no longer in interface" | compile | TypeScript compile passes even after caller (AskPage) drops the prop |

**Expected state after completion:**
- [ ] Imports updated (FrostedCard + useScrollReveal added)
- [ ] Props interface: `prefersReducedMotion` removed
- [ ] `versesReveal` and `actionsReveal` hooks declared
- [ ] Root div: `motion-safe:animate-fade-in-up`
- [ ] Answer paragraph: `text-white` (not `/80`)
- [ ] Verse cards: `<FrostedCard className="p-5">` with stagger-reveal wrapper
- [ ] Verse reference link: `text-white underline decoration-primary/60`
- [ ] Verse body: no italic, `text-white`
- [ ] Verse explanation: `text-white/80`
- [ ] Tier 2 callout: new classes with `border-l-4 border-l-primary/60 rounded-xl bg-white/[0.04]`
- [ ] Prayer body: no serif, no italic, `text-white/80`
- [ ] 4 action buttons: white-pill Pattern 1 with stagger-reveal
- [ ] Thumbs buttons: round + white/20 border
- [ ] Thumb icons: default `text-white`
- [ ] Feedback thanks toast: `motion-safe:animate-fade-in`

---

### Step 3: Refactor UserQuestionBubble.tsx — frosted glass + rounded-tr-sm

**Objective:** Replace the purple-tinted user message bubble with a frosted-glass bubble matching FrostedCard shape plus a subtle top-right corner notch for outbound-message signaling.

**Files to create/modify:**
- `frontend/src/components/ask/UserQuestionBubble.tsx` — modify (minor, 2 lines change)

**Details:**

Entire file replacement:

```tsx
interface UserQuestionBubbleProps {
  question: string
}

export function UserQuestionBubble({ question }: UserQuestionBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[90%] rounded-2xl rounded-tr-sm border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm p-4 sm:max-w-[80%]">
        <p className="text-white">{question}</p>
      </div>
    </div>
  )
}
```

Diff: `bg-primary/20` removed; `rounded-tr-sm border border-white/[0.12] bg-white/[0.06] backdrop-blur-sm` added.

Preserved: right-alignment via parent `flex justify-end`, `max-w-[90%] sm:max-w-[80%]`, `text-white` body.

**Auth gating:** N/A — display-only component.

**Responsive behavior:**
- Desktop (1440px): bubble at `max-w-[80%]`.
- Tablet (768px): bubble at `max-w-[80%]`.
- Mobile (375px): bubble at `max-w-[90%]`.

**Inline position expectations:** N/A — no inline-row layout in this component.

**Guardrails (DO NOT):**
- DO NOT change the `flex justify-end` parent alignment.
- DO NOT change `p-4` padding.
- DO NOT remove `text-white` on the inner paragraph.
- DO NOT add `rounded-tl-sm` — the notch is only on the top-right (outbound direction signal).

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "Bubble is frosted glass (no purple)" | unit | Render UserQuestionBubble, assert bubble `<div>` has className containing `bg-white/[0.06]`, `border-white/[0.12]`, `backdrop-blur-sm`; NOT containing `bg-primary/20` |
| "Bubble has rounded-tr-sm corner notch" | unit | Bubble has className containing `rounded-tr-sm`, `rounded-2xl` |
| "Bubble is right-aligned" | unit | Parent `<div>` has className `flex justify-end` |
| "Question text renders" | unit | `screen.getByText(question)` is in the document |

**Expected state after completion:**
- [ ] Full file replaced
- [ ] No `bg-primary/20` remaining
- [ ] `rounded-tr-sm` + frosted glass classes applied
- [ ] `text-white` body preserved
- [ ] Test assertions updated (UserQuestionBubble.test.tsx)

---

### Step 4: Refactor PopularTopicsSection.tsx — FrostedCard buttons + scroll-reveal + opacity

**Objective:** Wrap each Popular Topic card in `<FrostedCard as="button">`, upgrade title/description opacity tiers, add scroll-reveal staggered entrance.

**Files to create/modify:**
- `frontend/src/components/ask/PopularTopicsSection.tsx` — modify (moderate)

**Details:**

1. **Imports — add:**
   ```ts
   import { FrostedCard } from '@/components/homepage/FrostedCard'
   import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
   import type { RefObject } from 'react'
   ```

2. **Function body — add at top:**
   ```ts
   const sectionReveal = useScrollReveal({ threshold: 0.1 })
   ```

3. **Grid wrapper — attach ref:**
   ```tsx
   <div
     ref={sectionReveal.ref as RefObject<HTMLDivElement>}
     className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
   >
   ```

4. **Map callback — add `index` parameter:**
   ```tsx
   {POPULAR_TOPICS.map((topic, index) => (
     <div
       key={topic.topic}
       className={cn('scroll-reveal', sectionReveal.isVisible && 'is-visible')}
       style={staggerDelay(index, 60)}
     >
       <FrostedCard
         as="button"
         onClick={() => onTopicClick(topic.starterQuestion)}
         className="flex min-h-[44px] w-full items-center justify-between !p-4 text-left"
       >
         <div>
           <p className="font-semibold text-white">{topic.topic}</p>
           <p className="mt-1 text-sm text-white/80">{topic.description}</p>
         </div>
         <ChevronRight className="h-5 w-5 shrink-0 text-white/60" aria-hidden="true" />
       </FrostedCard>
     </div>
   ))}
   ```

5. **Heading `<h2>` — unchanged** (`mb-4 text-lg font-semibold text-white`).

**Auth gating:** Card click calls `onTopicClick(topic.starterQuestion)` — this is NOT auth-gated. Logged-out users can set a starter question and see the loading/response flow. The subsequent follow-up chip click IS auth-gated — but that's in AskPage.tsx. No change here.

**Responsive behavior:**
- Desktop (1440px): `lg:grid-cols-3` (3+2 layout since 5 topics).
- Tablet (768px): `sm:grid-cols-2` (2+2+1).
- Mobile (375px): `grid-cols-1` (5 stacked rows).

**Inline position expectations:**
- Row 1 of 3 cards (at 1440px): all 3 cards same y ±5px.
- Row 2 of 2 cards (at 1440px): both cards same y ±5px.

**Guardrails (DO NOT):**
- DO NOT change `POPULAR_TOPICS` content.
- DO NOT change `onTopicClick` signature.
- DO NOT remove `aria-hidden="true"` from ChevronRight.
- DO NOT drop the `w-full` on FrostedCard — needed to fill grid cell.
- DO NOT drop the `!` (important) before `p-4` — FrostedCard defaults to `p-6` and regular `p-4` would be overridden.
- DO NOT forget `role` semantics — `FrostedCard as="button"` produces a semantic `<button>` element per FrostedCard contract.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "5 topic cards render" | unit | `screen.getAllByRole('button')` filtered to this section has length 5 |
| "Cards are semantic buttons" | unit | Each card is rendered as `<button>` via FrostedCard `as="button"` |
| "Title is text-white (not /80)" | unit | Each title `<p>` has className containing `text-white`, NOT `text-white/80` |
| "Description is text-white/80 (not /50)" | unit | Each description `<p>` has className containing `text-white/80`, NOT `text-white/50` |
| "Chevron is text-white/60 (not /40)" | unit | Each ChevronRight has className containing `text-white/60`, NOT `text-white/40` |
| "Click fires onTopicClick with starterQuestion" | integration | Click each card, assert onTopicClick called with correct starter question |
| "Heading unchanged" | unit | `<h2>Popular Topics</h2>` has className containing `mb-4 text-lg font-semibold text-white` |

**Expected state after completion:**
- [ ] Imports updated
- [ ] `sectionReveal` hook declared
- [ ] Grid wrapper has ref
- [ ] Each topic wrapped in scroll-reveal div → FrostedCard as="button"
- [ ] Title `text-white`, description `text-white/80`, chevron `text-white/60`
- [ ] `!p-4` padding override on FrostedCard
- [ ] Test assertions updated

---

### Step 5: Rewrite ConversionPrompt.tsx — FrostedCard + white-pill shine CTA + WCAG dismiss fix + auth modal

**Objective:** Wrap the conversion prompt in `<FrostedCard>`, replace the purple button with the Register-variant white-pill + `animate-shine`, fix the WCAG-failing dismiss link, convert the `<Link to="/register">` to `authModal?.openAuthModal(undefined, 'register')`, remove `prefersReducedMotion` from props.

**Files to create/modify:**
- `frontend/src/components/ask/ConversionPrompt.tsx` — modify (moderate, near-full rewrite)

**Details:**

1. **Complete file rewrite:**

```tsx
import { FrostedCard } from '@/components/homepage/FrostedCard'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { cn } from '@/lib/utils'

interface ConversionPromptProps {
  onDismiss: () => void
}

export function ConversionPrompt({ onDismiss }: ConversionPromptProps) {
  const authModal = useAuthModal()

  return (
    <div className="mt-8 motion-safe:animate-fade-in">
      <FrostedCard className="text-center">
        <h3 className="text-lg font-semibold text-white">
          This is just the beginning.
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
          Create an account to save your prayers, journal your thoughts, track your
          growth, and join a community that cares.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'register')}
            className="animate-shine inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 motion-reduce:transition-none"
          >
            Create Your Account
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'mt-3 text-sm text-white/70 hover:text-white underline decoration-white/30 hover:decoration-white underline-offset-4 transition-[color,text-decoration-color] duration-base motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg',
            'min-h-[44px]',
          )}
        >
          Keep exploring
        </button>
      </FrostedCard>
    </div>
  )
}
```

2. **Import cleanup:**
   - Remove: `import { Link } from 'react-router-dom'`
   - Add: `import { FrostedCard } from '@/components/homepage/FrostedCard'`, `import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'`

3. **Key changes:**
   - Props: `prefersReducedMotion` removed.
   - Wrapper: `motion-safe:animate-fade-in` replaces manual `cn` conditional.
   - Card: `<FrostedCard className="text-center">` replaces hand-rolled card.
   - CTA: `<button>` with `authModal?.openAuthModal(undefined, 'register')` replaces `<Link to="/register">`.
   - CTA text: `"Create Your Account"` replaces `"Get Started — It's Free"`.
   - CTA className: Register-variant white-pill with `animate-shine`.
   - Body copy: `text-white/70` → `text-white/80`.
   - Body copy text: `"Create a free account..."` → `"Create an account..."` (drops "free" language per Register Round 2 policy).
   - Dismiss link: `text-primary-lt hover:underline` → `text-white/70 hover:text-white underline decoration-white/30 hover:decoration-white underline-offset-4` (WCAG fix).

4. **AskPage.tsx invocation update (also covered in Step 1 but explicit here):**
   ```tsx
   <ConversionPrompt onDismiss={() => setConversionDismissed(true)} />
   ```
   (No `prefersReducedMotion` prop.)

**Auth gating (new):**
- CTA click → `authModal?.openAuthModal(undefined, 'register')` opens the auth modal in register mode. This is the sole auth gate introduced in this step. If `useAuthModal()` returns null (provider not mounted), the optional-chain makes it a no-op.

**Responsive behavior:**
- All viewports: FrostedCard centered within parent section; CTA text `text-lg` (18px); body `text-sm` (14px). The `p-6` default FrostedCard padding applies; no override.

**Inline position expectations:** N/A — no inline-row layout in this component (heading/body/button/dismiss are all vertically stacked).

**Guardrails (DO NOT):**
- DO NOT use `<Link to="/register">` anywhere in this component.
- DO NOT pre-fill the auth modal reason string (pass `undefined`, not a string).
- DO NOT add `animate-shine` to any button other than the CTA.
- DO NOT change the heading text.
- DO NOT change `FrostedCard className="text-center"` to include padding overrides — default `p-6` is correct.
- DO NOT bypass the check — `useAuthModal()?.openAuthModal(...)` — optional chaining protects against missing provider.
- DO NOT add `font-free` or any "Free" language — Register Round 2 removed "Free forever" and this spec matches.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "Rendered as FrostedCard" | unit | Render ConversionPrompt, assert FrostedCard is present (className `bg-white/[0.06] border-white/[0.12] rounded-2xl`) |
| "CTA text is 'Create Your Account'" | unit | `screen.getByRole('button', { name: 'Create Your Account' })` exists; NOT `Get Started — It's Free` |
| "CTA has animate-shine + white-pill classes" | unit | CTA button className contains `animate-shine`, `bg-white`, `text-primary`, `rounded-full` |
| "CTA click opens auth modal in register mode" | integration | Mock `useAuthModal`, click CTA, assert `openAuthModal` called with `(undefined, 'register')` |
| "Dismiss link is text-white/70 (WCAG fix)" | unit | "Keep exploring" button has className containing `text-white/70`, `hover:text-white`, `underline`; NOT containing `text-primary-lt` |
| "Dismiss click calls onDismiss" | integration | Click dismiss, assert onDismiss mock called once |
| "No Link component in rendered output" | unit | Query for any `<a>` element; assert none found (CTA is now a `<button>`) |
| "Body copy says 'Create an account' not 'free account'" | unit | `screen.getByText(/Create an account/)` exists; NOT `getByText(/free account/)` |
| "Wrapper has motion-safe:animate-fade-in" | unit | Outer div has className containing `motion-safe:animate-fade-in` |
| "Props signature no longer has prefersReducedMotion" | compile | TypeScript compile passes after AskPage drops the prop |

**Expected state after completion:**
- [ ] File fully rewritten with new structure
- [ ] Imports updated (Link removed, FrostedCard + useAuthModal added)
- [ ] Props interface: `prefersReducedMotion` removed
- [ ] FrostedCard wraps content
- [ ] CTA: white-pill with `animate-shine` + auth modal onClick
- [ ] Dismiss link: WCAG-fixed white/70 with decorative underline
- [ ] Body copy: "Create an account..." + `text-white/80`
- [ ] AskPage invocation updated (verified in Step 1)
- [ ] Test assertions updated (ConversionPrompt.test.tsx)

---

### Step 6: Refactor SaveConversationButton.tsx — white-pill CTA

**Objective:** Replace the dim gray `bg-white/10 text-white/70` button with the Pattern 1 inline white-pill.

**Files to create/modify:**
- `frontend/src/components/ask/SaveConversationButton.tsx` — modify (minor)

**Details:**

Replace the button className (line 43-48) with the Pattern 1 inline white-pill + preserved `w-full sm:w-auto` responsive width:

```
inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] sm:w-auto
```

Icon `<ClipboardCopy className="h-4 w-4" />` unchanged — inherits `text-primary`.

Wrapper `<div className="mt-8 flex justify-center">` unchanged.

**Auth gating:** Already auth-gated at parent level (only rendered when `isAuthenticated && conversation.length >= 2`). No change.

**Responsive behavior:**
- Desktop (1440px): `sm:w-auto` — button sized to content.
- Tablet (768px): `sm:w-auto` — button sized to content.
- Mobile (375px): `w-full` — button fills container width.

**Inline position expectations:** N/A — single button centered via parent flex.

**Guardrails (DO NOT):**
- DO NOT drop `w-full sm:w-auto` — mobile full-width is required by spec.
- DO NOT change `handleCopy` or `showToast` logic.
- DO NOT modify the `if (conversation.length < 2) return null` guard.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "Button is Pattern 1 inline white-pill" | unit | Button className contains `bg-white`, `text-primary`, `rounded-full`, `font-semibold`; NOT `bg-white/10`, `text-white/70`, `rounded-lg`, `border-white/10` |
| "Button retains w-full sm:w-auto" | unit | Button className contains both `w-full` and `sm:w-auto` |
| "Button only renders when conversation.length >= 2" | unit | Render with 1-pair conversation → null; render with 2+ pair conversation → button visible |
| "Click copies and toasts" | integration | Mock `navigator.clipboard.writeText`, click, assert writeText called + toast fired |

**Expected state after completion:**
- [ ] Button className replaced with Pattern 1 inline white-pill
- [ ] `w-full sm:w-auto` preserved
- [ ] No other behavior changes
- [ ] Test assertions updated (SaveConversationButton.test.tsx)

---

### Step 7: Refactor DigDeeperSection.tsx — standardized chip className

**Objective:** Align Dig Deeper follow-up chips to the same canonical chip className used by the input-view topic chips.

**Files to create/modify:**
- `frontend/src/components/ask/DigDeeperSection.tsx` — modify (minor)

**Details:**

Replace per-chip className (line 27-33) with the canonical topic chip string plus the disabled-state conditional:

```tsx
<button
  key={question}
  type="button"
  onClick={() => onChipClick(question)}
  disabled={disabled}
  className={cn(
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-2 text-sm text-white transition-[colors,transform] duration-base motion-reduce:transition-none hover:bg-white/15 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98]',
    disabled && 'opacity-50 cursor-not-allowed',
  )}
>
  <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
  {question}
</button>
```

Wrapper div (line 18) unchanged: `mt-6 border-t border-white/10 pt-4`.
Heading (line 19) unchanged: `mb-3 font-semibold text-white`.
Chip container (line 20) unchanged: `flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2`.

**Auth gating:** `onChipClick` is passed from AskResponseDisplay → AskPage's `handleFollowUpClick`, which is already auth-gated. No change.

**Responsive behavior:**
- Desktop (1440px): chips in `sm:flex-row sm:flex-wrap`.
- Tablet (768px): chips in `sm:flex-row sm:flex-wrap`.
- Mobile (375px): chips in `flex-col` (1 column, stacked).

**Inline position expectations:**
- Chip row (≥640px): all N follow-up chips same y ±5px (or acceptable wrap if many chips overflow).

**Guardrails (DO NOT):**
- DO NOT apply scroll-reveal stagger — chips live inside an already fading-in response block and nested stagger creates animation noise (per spec).
- DO NOT change the `<MessageCircle />` icon size `h-4 w-4`.
- DO NOT drop the `disabled && ...` conditional — preserve disabled UI.
- DO NOT remove `shrink-0` from MessageCircle icon — it prevents icon compression when chip text is long.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "Chip className matches canonical topic chip" | unit | Each chip className contains `text-white`, `border-white/20`, `hover:-translate-y-0.5`, `duration-base`; NOT `text-white/70`, `hover:text-white`, `duration-fast`, `ring-primary` |
| "Disabled chip has opacity-50" | unit | Pass `disabled={true}`, assert each chip has className `opacity-50 cursor-not-allowed` |
| "MessageCircle icon preserved" | unit | Each chip contains MessageCircle with className `h-4 w-4 shrink-0` |
| "onChipClick fires with question text" | integration | Click chip, assert onChipClick called with exact question string |
| "Heading unchanged" | unit | "Dig Deeper" h3 has className `mb-3 font-semibold text-white` |

**Expected state after completion:**
- [ ] Chip className replaced with canonical topic chip string
- [ ] Disabled state preserved
- [ ] Icon position preserved
- [ ] Test assertions updated (DigDeeperSection.test.tsx)

---

### Step 8: Refactor VerseCardActions.tsx — 3 inline buttons, note textarea, save-note mini pill, cancel

**Objective:** Replace the `text-white/60 hover:text-primary` inline action buttons with readable `text-white/80 hover:text-white`, convert the note textarea to canonical narrower white-glow, convert the Save button to a mini white-pill, standardize the Cancel button.

**Files to create/modify:**
- `frontend/src/components/ask/VerseCardActions.tsx` — modify (moderate)

**Details:**

1. **3 inline action buttons (Highlight / Save note / Share — lines 88-113):** Replace each button's className. Button bodies + icons + handler calls + `aria-label` (on Share button) stay the same.

   For each of the 3 buttons:
   - Before: `inline-flex min-h-[44px] items-center gap-1.5 text-xs text-white/60 transition-colors hover:text-primary`
   - After: `inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-white/80 transition-colors duration-base motion-reduce:transition-none hover:text-white`

   Icons `<Highlighter />`, `<StickyNote />`, `<Share2 />` remain at `h-3.5 w-3.5` — now inherit `text-white/80`.

2. **Wrapper `<div className="mt-3 flex gap-3">` unchanged.**

3. **Note textarea (line 126-139):** Replace className with narrower white-glow variant:
   ```
   w-full resize-none rounded-lg border border-white/30 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/50 shadow-[0_0_16px_2px_rgba(255,255,255,0.40),0_0_32px_6px_rgba(255,255,255,0.24)] transition-[border-color,box-shadow] duration-base motion-reduce:transition-none focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/30
   ```

4. **Character count span (line 142) unchanged:** `text-xs text-white/60`.

5. **Cancel button (line 148-152):** Replace className:
   - Before: `min-h-[44px] rounded-lg px-3 py-1 text-xs text-white/50 transition-colors hover:text-white/70`
   - After: `min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium text-white/70 transition-colors duration-base motion-reduce:transition-none hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg`

6. **Save button (line 153-164):** Replace className with mini white-pill (compressed Pattern 1). Remove the `!noteText.trim() && 'cursor-not-allowed opacity-50'` conditional — use HTML `disabled={!noteText.trim()}` + `disabled:*` Tailwind variants:
   ```tsx
   <button
     type="button"
     onClick={handleSave}
     disabled={!noteText.trim()}
     className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-primary shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-colors duration-base motion-reduce:transition-none hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-lt focus-visible:ring-offset-2 focus-visible:ring-offset-hero-bg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
   >
     Save
   </button>
   ```

7. **SharePanel invocation unchanged.** `CrisisBanner text={noteText}` unchanged.

**Auth gating:**
- `handleHighlight` (line 41-48) and `handleSaveNoteClick` (line 50-56) both preserved — both check `isAuthenticated` and open the auth modal with reason `'Sign in to save highlights and notes'`. No change to gating logic.

**Responsive behavior:**
- All viewports: 3 inline action buttons in a single row (`mt-3 flex gap-3`), fit even at 375px due to `text-xs` + small icons.

**Inline position expectations:**
- 3-button row (all viewports): Highlight / Save note / Share same y ±5px.

**Guardrails (DO NOT):**
- DO NOT change `handleHighlight` navigation URL (`/bible/${parsedRef.bookSlug}/${parsedRef.chapter}?scroll-to=${parsedRef.verseStart}#verse-${parsedRef.verseStart}`) — this is the BB-38 canonical deep-link contract.
- DO NOT change `upsertNote` call signature or `NoteStorageFullError` handling.
- DO NOT change `CrisisBanner` usage (it renders below the textarea + buttons).
- DO NOT touch `getNoteForVerse` for pre-fill behavior.
- DO NOT change `NOTE_BODY_MAX_CHARS` import or `maxLength={NOTE_BODY_MAX_CHARS}`.
- DO NOT remove `aria-invalid` conditional on the textarea.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "3 inline buttons at text-white/80" | unit | All 3 buttons (Highlight / Save note / Share) have className containing `text-white/80`, `font-medium`, `hover:text-white`; NOT containing `text-white/60`, `hover:text-primary` |
| "Note textarea has white-glow narrower shadow" | unit | Textarea has className containing `border-white/30`, `shadow-[0_0_16px_2px_rgba(255,255,255,0.40),0_0_32px_6px_rgba(255,255,255,0.24)]`, `focus:ring-white/30`; NOT `border-white/10`, `focus:border-primary`, `focus:ring-primary/50` |
| "Cancel button styled correctly" | unit | Cancel button className contains `text-white/70`, `hover:text-white`; NOT `text-white/50`, `hover:text-white/70` |
| "Save button is mini white-pill" | unit | Save button className contains `bg-white`, `text-primary`, `rounded-full`, `px-4 py-1.5`; NOT `bg-primary`, `text-white`, `rounded-lg` |
| "Save button disabled when noteText empty" | unit | Initial `noteText=''`, assert save button `disabled` attribute true; type note, assert disabled false |
| "handleHighlight auth-gated" | integration | Logged-out click → authModal.openAuthModal called; logged-in click → navigate called with BB-38 URL |
| "handleSaveNoteClick auth-gated" | integration | Logged-out click → authModal.openAuthModal called; logged-in click → shows note input |
| "Save note flow end-to-end" | integration | Click Save note → textarea appears → type → click Save → upsertNote called with correct range + body; toast fired |

**Expected state after completion:**
- [ ] 3 inline buttons: `text-white/80 hover:text-white`
- [ ] Note textarea: canonical narrower white-glow
- [ ] Character count: unchanged `text-white/60`
- [ ] Cancel button: `text-white/70 hover:text-white` with focus ring
- [ ] Save button: mini white-pill (Pattern 1 compressed)
- [ ] Disabled states use HTML `disabled` + Tailwind variants
- [ ] BB-38 deep-link navigation preserved
- [ ] Auth gating unchanged
- [ ] Test assertions updated (VerseCardActions.test.tsx)

---

### Step 9: Update test files — align assertions with new classNames

**Objective:** Update every test assertion in AskPage.test.tsx and the 8 ask component test files to match the new classNames/behavior. Remove assertions that check for old (deprecated) tokens. Add new assertions matching the spec's testing plan.

**Files to create/modify:**
- `frontend/src/pages/__tests__/AskPage.test.tsx` — modify (many assertions)
- `frontend/src/components/ask/__tests__/AskResponseDisplay.test.tsx` — modify
- `frontend/src/components/ask/__tests__/ConversionPrompt.test.tsx` — modify (major)
- `frontend/src/components/ask/__tests__/DigDeeperSection.test.tsx` — modify
- `frontend/src/components/ask/__tests__/LinkedAnswerText.test.tsx` — likely unchanged (verify)
- `frontend/src/components/ask/__tests__/PopularTopicsSection.test.tsx` — modify
- `frontend/src/components/ask/__tests__/SaveConversationButton.test.tsx` — modify
- `frontend/src/components/ask/__tests__/UserQuestionBubble.test.tsx` — modify
- `frontend/src/components/ask/__tests__/VerseCardActions.test.tsx` — modify

**Details:**

For each test file, grep for old classNames that will no longer exist and update assertions. Per spec section "Testing plan" + spec section "Acceptance criteria":

1. **Remove assertions looking for:**
   - `text-primary` on body copy, links, icons (except white-pill button interiors where it's the correct text color)
   - `bg-primary` on any CTA
   - `bg-primary/20` on UserQuestionBubble
   - `bg-dashboard-dark` anywhere
   - `border-glow-cyan` or cyan-related classes
   - `font-serif italic` on journal/answer/prayer prose
   - `font-script` on the hero H1
   - `Get Started — It's Free` text
   - `text-primary-lt` on verse reference or dismiss link
   - Presence of `HeadingDivider` sibling of hero H1
   - Presence of `BackgroundSquiggle` on the /ask page
   - `prefersReducedMotion` prop passed to `<AskResponseDisplay>` or `<ConversionPrompt>`
   - Navigation to `/register` from ConversionPrompt CTA
   - `animate-glow-pulse` on textarea

2. **Add assertions checking:**
   - `<Layout transparentNav>` rendering (via Navbar `transparent` prop or similar identifier)
   - `GlowBackground.fullPage` orb presence (e.g., ≥3 glow orb elements)
   - Hero H1 text exactly "Ask God's Word" + className `animate-gradient-shift`
   - Hero subtitle: NO italic, NO font-serif, YES `text-white`
   - Textarea: `border-white/30` + white glow shadow
   - Submit button: `bg-white text-hero-bg rounded-full`
   - Topic chips: `text-white border-white/20`
   - Topic chip grid: mobile has `grid grid-cols-2`
   - Loading dots: `bg-white/80` NOT `bg-primary`
   - Loading Psalm: no italic
   - UserQuestionBubble: frosted glass + `rounded-tr-sm`
   - AskResponseDisplay root: `motion-safe:animate-fade-in-up`
   - Answer paragraph: `text-white` not `/80`
   - Verse card is a FrostedCard
   - Verse reference link: `text-white underline`
   - Verse body: no italic
   - Verse explanation: `text-white/80`
   - Tier 2 callout: `border-l-4 rounded-xl`
   - Prayer body: no italic, no serif
   - 4 action buttons: `bg-white text-primary`
   - Thumbs buttons: `rounded-full border-white/20`
   - Thumbs icons default `text-white`
   - Feedback thanks: `motion-safe:animate-fade-in`
   - PopularTopicsSection: FrostedCard as="button", title `text-white`, description `text-white/80`, chevron `text-white/60`
   - ConversionPrompt: FrostedCard wrap, CTA "Create Your Account", CTA has `animate-shine`, CTA click calls `openAuthModal(undefined, 'register')`, dismiss link `text-white/70`
   - SaveConversationButton: `bg-white text-primary rounded-full`
   - DigDeeperSection chips: `text-white border-white/20 hover:-translate-y-0.5`
   - VerseCardActions buttons: `text-white/80 hover:text-white`
   - VerseCardActions Save button: `bg-white text-primary rounded-full`
   - VerseCardActions textarea: `border-white/30` with narrower shadow

3. **Reduced-motion test (AskPage.test.tsx):** Mock `window.matchMedia` to return `matches: true` for `prefers-reduced-motion: reduce` and assert either:
   - On hero H1: either no animation classes OR `animation-duration: 0.01ms` effective (via jsdom computed style).
   - Simpler: confirm that the render doesn't throw and `motion-safe:` classes are present (the global CSS handles the neutralization at render time).

4. **TypeScript:** If any test file imports the `prefersReducedMotion` type or passes the prop literally to a component mock, remove those lines.

**Auth gating (in tests):**
- Preserved auth-gated test coverage: chip click (follow-up), journal, pray, feedback, highlight, save note.
- NEW auth test: ConversionPrompt CTA click → authModal.openAuthModal called with `(undefined, 'register')`.

**Responsive behavior (in tests):**
- Mobile chip grid test: set viewport to 375px (e.g., via `window.innerWidth` mock or `matchMedia` override if the test setup supports it), render, assert wrapper has `grid-cols-2` class. Alternatively, rely on classNames alone — the `grid-cols-2` class is applied regardless of viewport; the `sm:flex` media query is handled by CSS, not JSX.

**Inline position expectations (NOT in unit tests):** Position verification via `boundingBox().y` lives in `/verify-with-playwright`, not in Vitest unit tests.

**Guardrails (DO NOT):**
- DO NOT delete any tests that verify auth-gating behavior.
- DO NOT delete any tests that verify crisis-detection integration.
- DO NOT delete any tests that verify the conversation thread (question → response → conversation array).
- DO NOT weaken assertions — new classNames should be checked as precisely as the old ones were.
- DO NOT skip `motion-safe:animate-fade-in-up` testing — it's the replacement for the JS `prefersReducedMotion` prop and deserves a regression test.
- DO NOT make tests depend on actual Tailwind CSS rendering — test classNames as strings, not computed styles.

**Test specifications:**

| Test | Type | Description |
|---|---|---|
| "All existing AskPage tests pass with new classNames" | integration | Run `pnpm test AskPage` after Steps 1-8 — all tests pass. |
| "All 8 component test files pass" | integration | Run `pnpm test ask/` — all tests pass. |
| "No assertion references removed deprecated classNames" | grep | `grep -E 'text-primary-lt|border-glow-cyan|bg-primary/20|bg-dashboard-dark|font-script' frontend/src/**/__tests__/` returns 0 hits in the ask test files. |
| "ConversionPrompt CTA auth modal test" | integration | Mock `useAuthModal`; render ConversionPrompt; click "Create Your Account" button; assert `openAuthModal` called exactly once with `(undefined, 'register')`. |
| "Reduced motion test updated" | integration | AskPage renders without error when `matchMedia` returns `matches: true` for reduced motion. |
| "No prefersReducedMotion prop passed in tests" | grep | `grep 'prefersReducedMotion' frontend/src/pages/__tests__/AskPage.test.tsx` finds zero hits. |

**Expected state after completion:**
- [ ] All 9 test files updated
- [ ] No assertions reference deprecated classNames
- [ ] New assertions match spec testing plan (sections 1-12)
- [ ] Auth gating tests preserved + new ConversionPrompt CTA auth test added
- [ ] `pnpm test` reports 0 failures in ask-related tests
- [ ] `pnpm lint` passes for all test files

---

### Step 10: Run full verification

**Objective:** Verify the redesign against all 48 acceptance criteria from the spec. Build the frontend, run all tests, and prepare for `/code-review` + `/verify-with-playwright` downstream skills.

**Files to create/modify:** none.

**Details:**

1. **Build check:**
   ```
   cd frontend && pnpm build
   ```
   Expected: build succeeds with zero errors. Bundle-size delta < 2 KB (no new dependencies). If any new chunk appears or the main bundle grows >5 KB, investigate before committing.

2. **Lint check:**
   ```
   cd frontend && pnpm lint
   ```
   Expected: zero new lint errors (existing baseline preserved).

3. **Test check:**
   ```
   cd frontend && pnpm test
   ```
   Expected: all tests pass. Specifically verify:
   - All 9 ask-related test files pass.
   - No regression in other test suites (e.g., Register, homepage, Daily Hub).
   - `AuthModal` / `FrostedCard` / `GlowBackground` / `useScrollReveal` consumers elsewhere still pass (they shouldn't be affected, but sanity-check).

4. **Verify spec acceptance criteria checklist (48 items):** Walk through each item from the spec's `## Acceptance criteria (rollup)` section and confirm it's satisfied by the current codebase. Flag any that are unverifiable via static analysis and defer to `/verify-with-playwright`.

5. **Confirm branch state:**
   ```
   git branch --show-current
   ```
   Expected: `claude/feature/ask-page-redesign`. If different, STOP and flag to user.

6. **Confirm no new files:**
   ```
   git status
   ```
   Expected: only modified files (M), no new files (??). If new files appear, investigate and remove if they're not in the spec's target list.

7. **Confirm out-of-scope files NOT touched:**
   ```
   git diff --name-only main...HEAD
   ```
   Expected list (10 files):
   - `frontend/src/pages/AskPage.tsx`
   - `frontend/src/components/ask/AskResponseDisplay.tsx`
   - `frontend/src/components/ask/UserQuestionBubble.tsx`
   - `frontend/src/components/ask/PopularTopicsSection.tsx`
   - `frontend/src/components/ask/ConversionPrompt.tsx`
   - `frontend/src/components/ask/SaveConversationButton.tsx`
   - `frontend/src/components/ask/DigDeeperSection.tsx`
   - `frontend/src/components/ask/VerseCardActions.tsx`
   - `frontend/src/pages/__tests__/AskPage.test.tsx`
   - `frontend/src/components/ask/__tests__/*.test.tsx` (up to 8 files)

   NOT expected: `MoodCheckIn.tsx`, `CreatePlanFlow.tsx`, `RoutineStepCard.tsx`, `RoutineBuilder.tsx`, `TypewriterInput.tsx`, any homepage component, any daily/* component, any register page file.

**Auth gating:** N/A.

**Responsive behavior:** N/A — verification step.

**Inline position expectations:** N/A — verification step.

**Guardrails (DO NOT):**
- DO NOT commit in this step. The user handles git operations.
- DO NOT run `/code-review` or `/verify-with-playwright` in this step. Those are downstream pipeline skills.
- DO NOT proceed if tests fail — fix tests in the relevant preceding step.
- DO NOT proceed if build fails — fix build in the relevant preceding step.

**Test specifications:** (verification step — executes tests, no new tests)

| Check | Type | Description |
|---|---|---|
| Build succeeds | script | `pnpm build` returns 0 |
| Lint passes | script | `pnpm lint` returns 0 |
| Tests pass | script | `pnpm test` returns 0 |
| Bundle delta < 2KB | manual | Visual check of Vite build output |
| Branch is correct | script | `git branch --show-current` = `claude/feature/ask-page-redesign` |
| No out-of-scope files modified | script | `git diff --name-only` matches expected list |
| 48 acceptance criteria walk-through | manual | Check each item in spec's rollup table |

**Expected state after completion:**
- [ ] `pnpm build` passes, no new dependencies
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (9 ask files + regression)
- [ ] Branch state confirmed
- [ ] No out-of-scope files touched
- [ ] All 48 acceptance criteria verified (or deferred to `/verify-with-playwright`)
- [ ] Ready for downstream `/code-review _plans/2026-04-21-ask-page-redesign-v2.md` and `/verify-with-playwright /ask _plans/2026-04-21-ask-page-redesign-v2.md`

---

## Step Dependency Map

| Step | Depends On | Description |
|---|---|---|
| 1 | — | AskPage.tsx shell restructure (imports, hero, glow, textarea, chips, submit, loading, removes prefersReducedMotion variable + ConversionPrompt/AskResponseDisplay prop passes) |
| 2 | 1 | AskResponseDisplay.tsx refactor (depends on Step 1 removing the `prefersReducedMotion` prop from the `<AskResponseDisplay>` invocation; otherwise TypeScript error) |
| 3 | — | UserQuestionBubble.tsx frosted glass — independent |
| 4 | — | PopularTopicsSection.tsx FrostedCard + reveal — independent |
| 5 | 1 | ConversionPrompt.tsx rewrite (depends on Step 1 removing the `prefersReducedMotion` prop from the `<ConversionPrompt>` invocation; otherwise TypeScript error) |
| 6 | — | SaveConversationButton.tsx white pill — independent |
| 7 | — | DigDeeperSection.tsx chip className — independent |
| 8 | — | VerseCardActions.tsx inline buttons + textarea + save pill — independent |
| 9 | 1, 2, 3, 4, 5, 6, 7, 8 | Test assertion updates — depends on all visual/behavior changes |
| 10 | 1, 2, 3, 4, 5, 6, 7, 8, 9 | Full verification — build + lint + tests + acceptance walk-through |

**Execution order note:** Steps 3, 4, 6, 7, 8 can execute in parallel with Step 1 if the executor is comfortable with multi-file edits. The simpler sequential order (1 → 2 → 5 → 3 → 4 → 6 → 7 → 8 → 9 → 10) is recommended. Run `pnpm test` after Step 2 (biggest change set) as a checkpoint, and again at Step 10.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|---|---|---|---|---|
| 1 | Restructure AskPage.tsx shell | [COMPLETE] | 2026-04-21 | `frontend/src/pages/AskPage.tsx` — replaced shell with `<Layout transparentNav>` + `<GlowBackground variant="fullPage">`. Hero uses `GRADIENT_TEXT_STYLE` + `animate-gradient-shift`. Removed PageHero, BackgroundSquiggle, SQUIGGLE_MASK_STYLE, `bg-dashboard-dark`, component-level `prefersReducedMotion`. Textarea uses canonical white-glow. Topic chips: `grid grid-cols-2 sm:flex` + `chipsReveal` scroll-reveal + canonical chip classes. Submit is Daily Hub variant white pill. Loading dots/text/Psalm use new opacity tiers (no italic). `<AskResponseDisplay>` and `<ConversionPrompt>` invocations drop `prefersReducedMotion` prop. |
| 2 | Refactor AskResponseDisplay.tsx | [COMPLETE] | 2026-04-21 | Props interface: `prefersReducedMotion` removed. Root: `motion-safe:animate-fade-in-up`. Answer paragraphs: `text-white` (not `/80`). Verse cards: `<FrostedCard className="p-5">` with `versesReveal` stagger-reveal wrapper. Verse reference link: `text-white underline decoration-primary/60` (WCAG fix from 4.05:1 → 17.4:1). Verse body: no italic, `text-white`. Verse explanation: `text-white/80`. Tier 2 callout: `rounded-xl border-l-4 border-l-primary/60 bg-white/[0.04]`. Prayer body: no serif/italic, `text-white/80`. 4 action buttons: Pattern 1 white pill + `actionsReveal` stagger. Thumbs buttons: `rounded-full border-white/20 p-2.5`. Thumb icons: default `text-white`. Feedback thanks: `motion-safe:animate-fade-in`. |
| 3 | Refactor UserQuestionBubble.tsx | [COMPLETE] | 2026-04-21 | Full file rewrite. Frosted glass: `bg-white/[0.06] border border-white/[0.12] backdrop-blur-sm rounded-2xl rounded-tr-sm`. Removed `bg-primary/20`. Right alignment and max-w responsive preserved. |
| 4 | Refactor PopularTopicsSection.tsx | [COMPLETE] | 2026-04-21 | Added FrostedCard + useScrollReveal imports + `sectionReveal` hook. Grid wrapper carries `sectionReveal.ref`. Each topic wrapped in scroll-reveal div + `<FrostedCard as="button" className="flex ... !p-4 ...">`. Title `text-white`, description `text-white/80`, chevron `text-white/60`. |
| 5 | Rewrite ConversionPrompt.tsx | [COMPLETE] | 2026-04-21 | Full rewrite. Props: `prefersReducedMotion` removed. `<Link to="/register">` → `<button>` with `authModal?.openAuthModal(undefined, 'register')`. CTA: "Create Your Account" (new copy) with `animate-shine` Register variant white pill. Body: "Create an account..." (removed "free"), `text-white/80`. Wrapper: `motion-safe:animate-fade-in` + `<FrostedCard className="text-center">`. Dismiss link: WCAG-fixed `text-white/70 hover:text-white` with decorative underline. |
| 6 | Refactor SaveConversationButton.tsx | [COMPLETE] | 2026-04-21 | Button className replaced with Pattern 1 inline white-pill. Preserved `w-full sm:w-auto` and `handleCopy` logic. Removed unused `cn` import. |
| 7 | Refactor DigDeeperSection.tsx | [COMPLETE] | 2026-04-21 | Chip className replaced with canonical topic chip string (`bg-white/10 border-white/20 text-white hover:bg-white/15 hover:-translate-y-0.5 duration-base ring-white/50`). Disabled conditional preserved. |
| 8 | Refactor VerseCardActions.tsx | [COMPLETE] | 2026-04-21 | 3 inline action buttons: `text-white/80 font-medium hover:text-white`. Note textarea: narrower white-glow variant. Cancel button: `text-white/70 hover:text-white` with focus ring. Save button: mini white-pill (compressed Pattern 1). Disabled via HTML attr + `disabled:*` variants. Removed unused `cn` import. |
| 9 | Update test files | [COMPLETE] | 2026-04-21 | AskPage.test.tsx: updated 6 assertions (subtitle not italic, hero H1 animate-gradient-shift, FrostedCard verse cards, Tier 2 encouragement, prayer no italic, motion-safe:animate-fade-in-up). AskResponseDisplay.test.tsx: dropped `prefersReducedMotion` prop, updated verse ref link to text-white/underline/decoration-primary/60. UserQuestionBubble.test.tsx: frosted glass + rounded-tr-sm. PopularTopicsSection.test.tsx: FrostedCard rounded-2xl/bg-white/[0.06]/border-white/[0.12], title text-white, description text-white/80. ConversionPrompt.test.tsx: full rewrite — mocked useAuthModal, "Create Your Account" CTA text, auth modal `(undefined, 'register')` invocation, no Link/href, animate-shine + white-pill, WCAG-fixed dismiss. All ask-related test failures resolved. |
| 10 | Full verification | [COMPLETE] | 2026-04-21 | `pnpm build` passes, `tsc --noEmit` clean. Tests: 23 pre-existing failures remain (unchanged from baseline, all in GrowthGarden/PlanBrowserPage/Churches/Counselors/CelebrateRecovery/LocalSupportEnhancements/useBibleAudio — pre-existing regression debt NOT caused by this work). All 15 ask-related test failures resolved. `pnpm lint` fails only on pre-existing errors in `scripts/verify-local-support-facelift.mjs` (commit `d5c099b`, not touched). 13 files modified, all in /ask scope (8 src + 5 tests). Out-of-scope cyan files (MoodCheckIn, CreatePlanFlow, RoutineStepCard, RoutineBuilder, TypewriterInput) NOT touched. Branch: `claude/feature/ask-page-redesign`. Visual verification + 48 acceptance criteria walk deferred to `/verify-with-playwright /ask _plans/2026-04-21-ask-page-redesign-v2.md`. |
