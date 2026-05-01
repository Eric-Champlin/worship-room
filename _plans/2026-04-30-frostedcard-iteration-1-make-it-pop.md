# Implementation Plan: FrostedCard Iteration 1 — Make It Pop

**Spec:** `_specs/frostedcard-iteration-1-make-it-pop.md`
**Date:** 2026-04-30
**Branch:** `forums-wave-continued` (do NOT create a new branch — spec § "Branch discipline" is explicit; user manages all git ops)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — captured 2026-04-05; predates the FrostedCard pilot tokens. Authoritative for general dark-theme tokens; not authoritative for the new tier opacities being TUNED here. Spec § "Functional Requirements" is the canonical source for every value.)
**Recon Report:** `_plans/forums/frostedcard-redesign-recon.md` (loaded — pilot recon; this iteration tunes values established by the pilot. No new recon was run for this iteration; the FPU/Lovable target visuals are described prose-only in the spec.)
**Master Spec Plan:** Not applicable — standalone iteration of the pilot per spec line 3.

---

## Affected Frontend Routes

- `/bible`
- `/daily` (regression check only — must keep its HorizonGlow visible; no other change)

---

## Architecture Context

**This iteration tunes — not extends — the FrostedCard pilot system.** Six surgical visual fixes only. No new components. No new Tailwind config tokens. No new shadows. No new files. Every change is a class-string edit in an existing component or test.

**Pilot foundation already in place** (shipped in `_plans/2026-04-30-frostedcard-pilot-bible-landing.md`):

- `FrostedCard` at `frontend/src/components/homepage/FrostedCard.tsx:1-71` — three-tier `variant` prop (`'accent' | 'default' | 'subdued'`), `VARIANT_CLASSES` lookup map. Default tier currently `bg-white/[0.04] border-white/[0.08]`; accent currently `bg-violet-500/[0.04] border-violet-400/45`; subdued currently `bg-white/[0.02] border-white/[0.06]`. This iteration UPDATES these literal class strings inside the same `VARIANT_CLASSES` map. The component's API surface (props, `as`, `tabIndex`, `role`, `onKeyDown`, `className`, `onClick`, `variant`) is preserved; this iteration ADDS `eyebrow?` and `eyebrowColor?` props.
- `BackgroundCanvas` at `frontend/src/components/ui/BackgroundCanvas.tsx:1-23` — single inline `style.background` constant. Currently a 2-layer composition (radial darkening + diagonal linear gradient). This iteration replaces the constant with a 3-layer composition. The component's props (`children`, `className`) and class merging remain unchanged.
- Violet tokens (`violet-300: #C4B5FD`, `violet-400: #A78BFA`, `violet-500: #8B5CF6`) exist in `frontend/tailwind.config.js` lines 32-41. Used by accent tier (`bg-violet-500/[0.08]`, `border-violet-400/70`) and the new eyebrow block (`text-violet-300`, `bg-violet-400`).

**Existing consumers being modified:**

- `VerseOfTheDay.tsx` at `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — currently both FrostedCard usages (skeleton at line 91, loaded at line 116) hardcode `variant="default"`. Spec § Fix 4 requires:
  - The component accepts a `variant?: 'accent' | 'default'` prop, defaulting to `'accent'`.
  - The loaded card passes `variant={variant}` (the new prop) AND `eyebrow="Verse of the Day"` to its `FrostedCard`.
  - The skeleton card passes `variant="default"` AND `eyebrow="Verse of the Day"` (skeletons stay default-tier per spec).
  - The handwritten eyebrow block (`<span className="text-xs font-medium uppercase tracking-widest text-white/50">Verse of the Day</span>` at lines 117-120) is REMOVED — the FrostedCard `eyebrow` prop now owns it.
- `BibleHeroSlot.tsx` at `frontend/src/components/bible/landing/BibleHeroSlot.tsx` — currently invokes `<VerseOfTheDay />` four times (lines 52, 69, 78, 94) with no props. Spec § Fix 4 mapping:
  - Branch 1 (line 52, active plan + ResumeReadingCard + VOTD): `<VerseOfTheDay variant="default" />`.
  - Branch 2 (line 69, ResumeReadingCard + VOTD): `<VerseOfTheDay variant="default" />`.
  - Branch 3 (line 78, lapsed reader, VOTD primary): default to accent — leave bare `<VerseOfTheDay />` (no prop).
  - Branch 4 (line 94, first-time reader): default to accent — leave bare `<VerseOfTheDay />` (no prop).
- `ActivePlanBanner.tsx` at `frontend/src/components/bible/landing/ActivePlanBanner.tsx:25-28` — currently renders a handwritten eyebrow (`<p className="text-xs font-medium uppercase tracking-widest text-white/60">You&apos;re on a plan</p>`). Spec § Fix 5: pass `eyebrow="Today's reading"` to FrostedCard and REMOVE the handwritten paragraph. Since this is the accent tier, the eyebrow renders with `text-violet-300` + `bg-violet-400` automatically.
- `ResumeReadingCard.tsx` at `frontend/src/components/bible/landing/ResumeReadingCard.tsx:23-26` — same pattern. Currently `<p className="text-xs font-medium uppercase tracking-widest text-white/60">Continue reading</p>`. Spec § Fix 5: pass `eyebrow="Pick up where you left off"` to FrostedCard and REMOVE the handwritten paragraph. Accent tier → violet eyebrow automatically.

**Tests that ALREADY break and need updating** (verified by codebase inspection before writing this plan):

- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` — class-string assertions on lines 60, 65, 75, 85, 90, 111, 116, 129, 130, 132, 133. All seven default-tier and tier-specific opacity assertions become wrong values once Fix 1 lands. MUST be updated to the new values in the same step that ships Fix 1. Tests added in Fix 2 (top-edge highlight) and Fix 3 (eyebrow) append to this file.
- `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` (lines 1-32) — does NOT assert the exact background string (only asserts `relative`, `min-h-screen`, `overflow-hidden`, custom className merging). No test changes required for Fix 6.
- `frontend/src/components/bible/landing/__tests__/ActivePlanBanner.test.tsx` (lines 1-54) — no test asserts the literal string "You're on a plan". No update required when Fix 5 removes that paragraph.
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` (lines 1-85) — no test asserts the literal string "Continue reading" (the test at line 36 asserts the relative-time label "Read 3 hours ago", which stays unchanged). No update required when Fix 5 removes that paragraph.
- `frontend/src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx` (lines 1-219) — line 102-105 asserts `'Verse of the Day'` text is in the document. That text continues to render via the new `eyebrow` prop — assertion stays valid. The test renders `<VerseOfTheDay />` with no variant prop, which now defaults to `'accent'`. None of the existing tests assert class strings on the FrostedCard surface, so the variant default change does not break any existing test.
- `frontend/src/components/bible/landing/__tests__/BibleHeroSlot.test.tsx` (lines 1-217) — child components (`VerseOfTheDay`, `ResumeReadingCard`, `ActivePlanBanner`) are mocked at lines 23-41 so prop-passing is opaque to these tests. No assertions on the `variant` prop value. No update required.

**Auth gating patterns:**

- This is a pure visual-tuning iteration. NO new auth gates added; NO existing auth gates modified.
- `VerseOfTheDay.handleSave` retains its existing `useAuth + useAuthModal` gate ('Sign in to save verses'). Untouched.
- All other interactive surfaces on `/bible` retain existing behavior.
- Bible Wave Auth Posture (`02-security.md`): `/bible` remains fully unauthenticated. No new login surfaces.

**Database / shared data models / localStorage:** None. No backend changes. No new `wr_*` keys. No new `bible:*` keys.

**Cross-spec dependencies:** None. This iteration is BibleLanding-only per spec § "Out of Scope". The new `eyebrow` prop and bumped opacities cascade ONLY through `/bible` because no other consumer passes these new props yet. Other pages that use `FrostedCard` (homepage `DifferentiatorSection`, `/daily?tab=devotional` Tier 1 cards, `/ask` cards) WILL render with the new opacity values but WITHOUT eyebrows (since they don't pass `eyebrow`). This is intentional per spec § "Out of Scope" — the new opacities are the new house style; rolling eyebrows out app-wide is a future spec.

**Cascade-affected non-BibleLanding surfaces** (will pick up the new opacity values automatically; no eyebrow changes; no other behavior change):

- `/` — `DifferentiatorSection` (default tier).
- `/daily?tab=devotional` — Tier 1 reflection / question / quote cards (default tier).
- `/ask` — verse cards, `ConversionPrompt`, `PopularTopicsSection` (default tier).

These surfaces' tests already assert the OLD pilot tokens (`bg-white/[0.04]`, `border-white/[0.08]`, `bg-white/[0.07]` hover) — verified during the pilot's own test sweep. Tests are at:

- `frontend/src/components/ask/__tests__/ConversionPrompt.test.tsx`
- `frontend/src/components/ask/__tests__/PopularTopicsSection.test.tsx`
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx`
- `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx`
- `frontend/src/pages/__tests__/AskPage.test.tsx`
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` (already updated to assert the accent tier `border-violet-400/45` — must be updated again to `border-violet-400/70` per Fix 1).

These six test files appear in the working-directory `git status` output as already modified — confirmed by the user's branch state. They will need their hardcoded default-tier and accent-tier values updated to the new Iteration 1 values. Step 1 is responsible for this batch update so that Fix 1's class-string change does not break other test files.

---

## Auth Gating Checklist

This is a pure visual-tuning iteration. No new interactive elements; no auth-gate changes. The spec's auth-gating table (lines 163-170) confirms zero new gates.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| View BibleLanding hero slot | Public — both states | All steps | None (public route per Bible Wave Auth Posture) |
| Click "Save" on VOTD | Existing auth modal: "Sign in to save verses" — preserved unchanged | All steps | Preserved — `VerseOfTheDay.handleSave` `useAuth + useAuthModal` gate untouched |
| Click "Read in context" / "Share" on VOTD | Public — preserved unchanged | All steps | None |

No spec-defined auth gates are missing because the spec defines none.

---

## Design System Values (for UI steps)

All values come from the spec § "Functional Requirements" (canonical for this iteration). The `_plans/recon/design-system.md` recon does NOT cover the FrostedCard pilot or this iteration; the spec is the source of truth for every literal class string and CSS value below.

### Fix 1 — tier surface opacity table

| Tier | Property | Old (pilot) | New (Iteration 1) | Source |
|------|----------|-------------|-------------------|--------|
| default | background | `bg-white/[0.04]` | `bg-white/[0.07]` | spec line 34 |
| default | border | `border-white/[0.08]` | `border-white/[0.12]` | spec line 34 |
| default | hover background | `hover:bg-white/[0.07]` | `hover:bg-white/[0.10]` | spec line 37 |
| subdued | background | `bg-white/[0.02]` | `bg-white/[0.05]` | spec line 35 |
| subdued | border | `border-white/[0.06]` | `border-white/[0.10]` | spec line 35 |
| accent | background | `bg-violet-500/[0.04]` | `bg-violet-500/[0.08]` | spec line 36 |
| accent | border | `border-violet-400/45` | `border-violet-400/70` | spec line 36 |
| accent | hover background | `hover:bg-violet-500/[0.08]` | `hover:bg-violet-500/[0.13]` | spec line 38 |

All other accent classes (`backdrop-blur-md md:backdrop-blur-[12px]`, `rounded-3xl`, `p-6`, `shadow-frosted-accent`, `hover:shadow-frosted-accent-hover hover:-translate-y-0.5`) are unchanged. All other default classes (`backdrop-blur-sm md:backdrop-blur-md`, `rounded-3xl`, `p-6`, `shadow-frosted-base`, `hover:shadow-frosted-hover hover:-translate-y-0.5`) are unchanged. All other subdued classes (`backdrop-blur-sm md:backdrop-blur-md`, `rounded-3xl`, `p-5`, `hover:bg-white/[0.04]`) are unchanged. Note that subdued's hover bg (`hover:bg-white/[0.04]`) is NOT touched by spec Fix 1.

### Fix 2 — accent tier inner top-edge highlight

Required class fragment ON THE ACCENT TIER ONLY (appended to `VARIANT_CLASSES.accent.base`):

```
relative
before:absolute before:inset-x-0 before:top-0 before:h-px
before:bg-gradient-to-r before:from-transparent before:via-white/[0.10]
before:to-transparent before:rounded-t-3xl before:pointer-events-none
```

Source: spec lines 46-51. The `relative` class anchors the absolutely-positioned pseudo-element. Default and subdued tiers MUST NOT receive this — it's accent-only.

### Fix 3 — eyebrow JSX block (rendered above `children` when `eyebrow` prop provided)

```tsx
<div className="mb-4 flex items-center gap-2">
  <span
    className={cn(
      'h-1.5 w-1.5 rounded-full',
      eyebrowColor === 'violet' || (variant === 'accent' && !eyebrowColor)
        ? 'bg-violet-400'
        : 'bg-white/40',
    )}
  />
  <span
    className={cn(
      'text-xs font-semibold uppercase tracking-[0.15em]',
      variant === 'accent' ? 'text-violet-300' : 'text-white/50',
    )}
  >
    {eyebrow}
  </span>
</div>
```

Source: spec lines 67-85. Eyebrow color rules (spec lines 89-92):
- Accent tier (no override): `text-violet-300` + `bg-violet-400` dot.
- Default tier (no override): `text-white/50` + `bg-white/40` dot.
- `eyebrowColor="violet"` forces violet dot regardless of variant.
- `eyebrowColor="white"` forces white dot.

When `eyebrow` is omitted, the entire block is not rendered — existing consumers continue rendering unchanged.

### Fix 4 — VerseOfTheDay variant + eyebrow prop pass-through

`VerseOfTheDay.tsx`:
- Add `interface VerseOfTheDayProps { variant?: 'accent' | 'default' }` and destructure with default `variant = 'accent'`.
- Skeleton FrostedCard: `<FrostedCard as="article" variant="default" eyebrow="Verse of the Day">` (spec line 117-118).
- Loaded FrostedCard: `<FrostedCard as="article" variant={variant} eyebrow="Verse of the Day">`.
- Remove the handwritten `<span>Verse of the Day</span>` block at lines 118-120.

`BibleHeroSlot.tsx`:
- Branch 1 (line 52): `<VerseOfTheDay variant="default" />`.
- Branch 2 (line 69): `<VerseOfTheDay variant="default" />`.
- Branch 3 (line 78): `<VerseOfTheDay />` (defaults to accent).
- Branch 4 (line 94): `<VerseOfTheDay />` (defaults to accent).

### Fix 5 — eyebrows on the other accent cards

`ActivePlanBanner.tsx`:
- Pass `eyebrow="Today's reading"` to FrostedCard.
- Remove `<p className="text-xs font-medium uppercase tracking-widest text-white/60">You&apos;re on a plan</p>` at line 26-28.

`ResumeReadingCard.tsx`:
- Pass `eyebrow="Pick up where you left off"` to FrostedCard.
- Remove `<p className="text-xs font-medium uppercase tracking-widest text-white/60">Continue reading</p>` at line 24-26.

### Fix 6 — three-layer BackgroundCanvas

Replace the current `CANVAS_BACKGROUND` constant in `frontend/src/components/ui/BackgroundCanvas.tsx:9-11`:

```ts
const CANVAS_BACKGROUND = `
  radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) 0%, transparent 60%),
  radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
  linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
`
```

Source: spec lines 139-146. Layer-by-layer intent (spec lines 148-152):

1. **Top:** faint violet bloom near top (`rgba(167,139,250,0.10)` is `violet-400` at 10%) — adds warmth without HorizonGlow's intensity.
2. **Middle:** stronger radial darkening at center-right where cards live (`rgba(0,0,0,0.65)` — up from pilot's 0.55) — reading-lamp spotlight.
3. **Bottom:** three-stop diagonal gradient with lighter top-left shoulder (`#120A1F` → `#08051A` → `#0A0814`).

The component's props, class merging, and inline `style={{ background: CANVAS_BACKGROUND }}` mechanism are preserved. Only the literal CSS string changes.

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- This iteration is BibleLanding-only. Do NOT migrate other pages to use the new opacity values, eyebrow prop, or canvas composition. Other pages picking up the new opacities is a CASCADE of the FrostedCard tier change, not a deliberate per-page migration — leave them alone.
- The `before:` Tailwind classes for the accent top-edge highlight require the parent to be `relative`. The spec includes `relative` in the required class fragment — ship that exact string. Stripping `relative` will break the pseudo-element.
- The eyebrow uses `tracking-[0.15em]`, NOT `tracking-widest` (which is `0.1em` in Tailwind defaults). The spec value is intentionally tighter than `widest` for the editorial FPU/Lovable feel. Do NOT swap to `tracking-widest`.
- The eyebrow dot is `h-1.5 w-1.5` (6px × 6px). It is decorative; no `aria-hidden` is needed because the `<span>` has no text content.
- The handwritten eyebrow paragraphs being removed used `text-white/60` and `tracking-widest`. The new eyebrow uses `text-violet-300` (accent) or `text-white/50` (default) with `tracking-[0.15em]`. The contrast/spacing differences are intentional — do NOT preserve the old class strings.
- Worship Room uses `text-white` for primary text on Daily Hub and homepage; the eyebrow's `text-violet-300` and `text-white/50` are below that floor but pass WCAG AA at 12px/`font-semibold` per spec § Non-Functional Requirements line 158. Verify contrast on `bg-violet-500/[0.08]` (accent tier over canvas) and on the canvas itself (default tier).
- BackgroundCanvas is BibleLanding-only. The spec § "Out of Scope" line 213 forbids using it elsewhere in this iteration. `/daily` keeps `HorizonGlow`. Verify `/daily` still renders 5 purple/lavender blobs at 5%/15%/35%/60%/85% — that is the iteration's regression check (spec line 235).
- Per the FrostedCard tier system in `09-design-system.md`, existing consumer cards across the app default to the `default` tier when no `variant` prop is passed. They will pick up the bumped `bg-white/[0.07]` / `border-white/[0.12]` automatically. That cascade is intentional per spec § "Out of Scope" — do NOT add `variant` overrides to other consumers in this iteration.

**Sources:** `_specs/frostedcard-iteration-1-make-it-pop.md` § "Functional Requirements" (canonical), `09-design-system.md` § "Round 3 Visual Patterns" + "FrostedCard Tier System", and the pilot plan's Execution Log § Step 11 deviation noting that downstream consumer test files hardcoded the old default-tier tokens — same situation here, same response (update the test files in lockstep with Fix 1).

---

## Shared Data Models (from Master Plan)

N/A — no master spec plan. No new TypeScript interfaces. No new localStorage keys. The only TypeScript surface change is `VerseOfTheDayProps` (a single new optional `variant` prop) and `FrostedCardProps` (two new optional props: `eyebrow`, `eyebrowColor`).

```typescript
// Updated in Fix 3
interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article'
  tabIndex?: number
  role?: string
  onKeyDown?: React.KeyboardEventHandler
  variant?: 'accent' | 'default' | 'subdued'
  eyebrow?: string                         // NEW (Fix 3)
  eyebrowColor?: 'violet' | 'white'        // NEW (Fix 3)
}

// Added in Fix 4 (new file-local interface)
interface VerseOfTheDayProps {
  variant?: 'accent' | 'default'
}
```

**localStorage keys this spec touches:** None.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | Cards stack vertically (existing). FrostedCard padding `p-6` accent/default and `p-5` subdued unchanged. Eyebrow renders on its own line above the card heading with `mb-4` gap. Accent top-edge highlight scales naturally with card width. |
| Tablet | 768px | Same single-column stack. Cards widen with container. Backdrop-blur escalates from `backdrop-blur-sm` to `backdrop-blur-md` for default tier per existing pilot rules. |
| Desktop | 1440px | Same single-column stack within BibleHeroSlot. Accent tier uses `md:backdrop-blur-[12px]`. Inner top-edge highlight remains a 1px line at every breakpoint. |

Source: spec § "Responsive Behavior" lines 174-178.

**Custom breakpoints:** None new. The pilot's existing `sm:` (≥640px) breakpoints on font sizes (`sm:text-xl`, `sm:text-3xl`) are preserved.

No layout changes between breakpoints — the iteration only changes opacities, adds a 1px pseudo-element, adds an eyebrow block, and changes a CSS background string.

---

## Inline Element Position Expectations

**For features where multiple elements should sit on the same row.** This iteration adds the eyebrow row (dot + label) inside FrostedCard. The dot and label MUST share the same y-coordinate at every breakpoint.

| Element Group | Elements | Expected y-alignment | Wrap Tolerance |
|---------------|----------|---------------------|----------------|
| Eyebrow row (every consumer using `eyebrow` prop) | dot `<span>` (h-1.5 w-1.5), label `<span>` (text-xs uppercase) | Same y ±2px at 375px / 768px / 1440px | NEVER wraps — this is a `flex items-center gap-2` row with a 6px dot and short label; total width well under viewport at every breakpoint |

**No other inline-row layouts are introduced or modified by this iteration.** The existing VOTD action row (`Read in context` / `Share` / `Save`) is untouched.

This table is consumed by `/verify-with-playwright` Step 6l (Inline Element Positional Verification).

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Eyebrow row (`<div>`) → next sibling (heading or verse content) | 16px (`mb-4` on the eyebrow `<div>`) | Spec line 67 (`<div className="mb-4 ...">`) |
| Top of accent FrostedCard → top-edge highlight pseudo-element | 0 (`top-0`, height 1px) | Spec lines 47-50 |
| BibleHeroSlot's `space-y-6` between stacked cards (active plan + ResumeReadingCard + VOTD; ResumeReadingCard + VOTD) | 24px | `BibleHeroSlot.tsx` line 33, 60 (existing `space-y-6` — unchanged) |
| BibleHeroSlot's `space-y-4` for lapsed-reader branch (VOTD + Last-read link) | 16px | `BibleHeroSlot.tsx` line 77 (existing — unchanged) |

`/execute-plan` checks these during visual verification (Step 4g). `/verify-with-playwright` compares these in Step 6e.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] The pilot plan `_plans/2026-04-30-frostedcard-pilot-bible-landing.md` is fully shipped (Steps 1-11 [COMPLETE]). This iteration depends on the pilot's `FrostedCard` `variant` prop, `BackgroundCanvas` component, and consumer migrations.
- [ ] Working directory is on branch `forums-wave-continued` (per spec § "Branch discipline" line 5).
- [ ] The seven test files listed under "Cascade-affected non-BibleLanding surfaces" in Architecture Context are present in the working tree (verified via `git status` — they are listed as `M` (modified) which the pilot left in mid-update state). Step 1 finishes those updates with the Iteration 1 values; do NOT roll them back to OLD values.
- [ ] `pnpm dev` runs cleanly so visual verification at the end of Step 7 can proceed.
- [ ] No deprecated patterns introduced: no Caveat headings, no `animate-glow-pulse`, no cyan textarea borders, no `font-serif italic` on prompts, no soft-shadow 8px-radius cards.
- [ ] The new accent `before:` pseudo-element classes use Tailwind's existing pseudo-element variants (`before:`) which are enabled by default in Tailwind 3.x — no `tailwind.config.js` change required.
- [ ] No new `[UNVERIFIED]` values — every literal value in this plan comes verbatim from the spec.

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Eyebrow rendering when `eyebrow` is `""` (empty string) | Treat empty string as "no eyebrow" — DO NOT render the eyebrow block | Empty string means no content; rendering an empty dot+label is visual noise. Use truthy check (`if (eyebrow)`) which catches both `undefined` and `""`. |
| Eyebrow `<span>` semantic role | Decorative span, no `aria-hidden` | The eyebrow is a labeled context cue per spec line 158 — it carries readable text and screen readers should announce it. Only the dot is decorative; the dot is a `<span>` with no text content so screen readers ignore it without `aria-hidden`. |
| Accent variant default for VerseOfTheDay | Default to `'accent'` | Spec line 116: VOTD is the standalone hero in branches 3 and 4 and earns accent. Branches 1 and 2 explicitly opt down to `'default'`. |
| Existing pilot test for the OLD accent border (`border-violet-400/45`) in `ResumeReadingCard.test.tsx:62` | Update to `border-violet-400/70` per Fix 1 | The accent tier border value changed; the test was already updated by the pilot to assert the accent tier. Iteration 1 just bumps the value. |
| Cascade affecting `/`, `/daily`, `/ask` test files | Update those tests in Step 1 alongside the FrostedCard test | Same response as the pilot's Step 11 deviation: tests asserting OLD pilot tokens become wrong values once Fix 1 lands. Update them in lockstep. |
| BackgroundCanvas test file assertion of exact background string | No change required | The test file at `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` only asserts `relative`, `min-h-screen`, `overflow-hidden`, and custom className merging. It does NOT assert the inline `style.background` string. Spec line 153 confirms: "If only asserts the presence of an inline `style.background`, no change is needed there." |
| New top-edge highlight (`before:`) on default and subdued tiers | DO NOT add | Spec line 53: "The default and subdued tiers must NOT receive this highlight — the top-edge line is a deliberate accent-only treatment." |
| Removing handwritten eyebrows from ActivePlanBanner / ResumeReadingCard | Hard remove (no transitional duplicate) | Spec line 119: "Do not leave both rendered." Same instruction applies in Fix 5 (eyebrow prop replaces handwritten paragraph). |

---

## Implementation Steps

### Step 1: Apply Fix 1 — bump tier surface opacities + update all FrostedCard test class-string assertions

**Objective:** Update `FrostedCard.tsx`'s three-tier `VARIANT_CLASSES` map with the new opacity values (default, subdued, accent base; default and accent hover); update `FrostedCard.test.tsx` accordingly; and propagate the same value updates to the seven cascade-affected consumer test files so they assert the new default-tier and accent-tier values rather than the old pilot values.

**Files to create/modify:**

- `frontend/src/components/homepage/FrostedCard.tsx` — modify `VARIANT_CLASSES` (lines 21-34). Eight class-string updates, one to each of the four lines listed in the Design System Values § Fix 1 table.
- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` — update class-string assertions on lines 60 (`border-white/[0.08]` → `border-white/[0.12]`), 65 (`bg-white/[0.04]` → `bg-white/[0.07]`), 75 (`hover:bg-white/[0.07]` → `hover:bg-white/[0.10]`), 85 (`bg-violet-500/[0.04]` → `bg-violet-500/[0.08]`), 90 (`border-violet-400/45` → `border-violet-400/70`), 111 (`bg-white/[0.02]` → `bg-white/[0.05]`), 116 (`border-white/[0.06]` → `border-white/[0.10]`), 129/130/132/133 (the `'variant defaults to default when prop omitted'` test — same default-tier values: `bg-white/[0.04]` → `bg-white/[0.07]` and `border-white/[0.08]` → `border-white/[0.12]`).
- `frontend/src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — line 62 update from `border-violet-400/45` → `border-violet-400/70`.
- `frontend/src/components/ask/__tests__/ConversionPrompt.test.tsx` — update any hardcoded default-tier values to the new Iteration 1 values. Look for `bg-white/[0.04]`, `border-white/[0.08]`, `hover:bg-white/[0.07]`, and replace with `bg-white/[0.07]`, `border-white/[0.12]`, `hover:bg-white/[0.10]` respectively.
- `frontend/src/components/ask/__tests__/PopularTopicsSection.test.tsx` — same update sweep.
- `frontend/src/pages/__tests__/AskPage.test.tsx` — same update sweep.
- `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx` — same update sweep.
- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` — covered above (separate bullet for clarity).
- `frontend/src/components/daily/__tests__/DevotionalTabContent.test.tsx` — same update sweep.

**Details:**

In `FrostedCard.tsx`, change the literal strings exactly as listed in the Design System Values § Fix 1 table. Do NOT touch any other class in the same string (backdrop-blur, rounded-3xl, p-6, shadow-frosted-base/accent, hover:shadow-frosted-*, hover:-translate-y-0.5). Do NOT touch the subdued hover (`hover:bg-white/[0.04]`) — spec leaves it alone.

In `FrostedCard.test.tsx`, update each assertion's `toContain(...)` argument to the new value. The test names ("default tier has bg-white/[0.04] base background", etc.) are stale after the value change — UPDATE the test names in lockstep so future readers aren't misled. New names should mirror the new values (e.g., "default tier has bg-white/[0.07] base background").

For the six cascade-affected test files (`ConversionPrompt`, `PopularTopicsSection`, `AskPage`, `DifferentiatorSection`, `DevotionalTabContent`, `ResumeReadingCard`): perform a `grep` for the OLD literal strings within each file, and replace each occurrence with the corresponding NEW literal string. The pilot's Step 11 deviation note describes this exact same update pattern; this is its iteration twin. Verify each file still passes `pnpm test <file>` after the update.

**Auth gating (if applicable):** None — pure visual.

**Responsive behavior:**
- Desktop (1440px): Cards visibly lift off canvas (default `bg-white/[0.07]` is brighter than the canvas's deepest stop at `#08051A` → readily perceivable).
- Tablet (768px): Same brightness relationship; backdrop-blur-md preserves glass feel.
- Mobile (375px): Same relationship; cards stack with full width.

**Inline position expectations:** N/A — this step does not introduce inline-row layouts.

**Guardrails (DO NOT):**

- Do NOT add the `before:` pseudo-element classes here — that's Fix 2 / Step 2.
- Do NOT add `eyebrow` or `eyebrowColor` props here — that's Fix 3 / Step 3.
- Do NOT add a separate `[legacy]` or `[old]` variant — the value change is forward-only.
- Do NOT touch the subdued hover (`hover:bg-white/[0.04]`).
- Do NOT swap any of the unchanged classes in `VARIANT_CLASSES` (backdrop-blur, padding, radii, shadows).
- Do NOT update consumer source files that don't have hardcoded test assertions of these values — only update the test files. Consumer source files (e.g., `DifferentiatorSection.tsx` itself) inherit the new values automatically.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing default-tier tests in `FrostedCard.test.tsx` (3 tests on lines 58-71) | unit | Updated to new values; pass after change |
| Existing accent-tier tests (3 tests on lines 83-96) | unit | Background and border updated |
| Existing subdued-tier tests (3 tests on lines 109-122) | unit | Background and border updated |
| Existing default-hover test (line 73-76) | unit | Updated to `hover:bg-white/[0.10]` |
| Existing variant-defaults-to-default test (line 124-135) | unit | Updated to new default-tier values |
| `ResumeReadingCard.test.tsx` accent-border test (line 59-62) | unit | Updated to `border-violet-400/70` |
| `ConversionPrompt.test.tsx` / `PopularTopicsSection.test.tsx` / `AskPage.test.tsx` / `DifferentiatorSection.test.tsx` / `DevotionalTabContent.test.tsx` cascade test sweep | unit | All pre-existing pilot-token assertions updated to the Iteration 1 values |

**Expected state after completion:**

- [ ] `pnpm test src/components/homepage/__tests__/FrostedCard.test.tsx` — 22 prior tests + (4 added in Step 3 + 1 added in Step 2 = 5 added later steps) — all pass on existing 22 with new values.
- [ ] `pnpm test` for the seven cascade files — all pass.
- [ ] `pnpm tsc --noEmit` — clean.

---

### Step 2: Apply Fix 2 — accent tier inner top-edge highlight (`:before` pseudo-element)

**Objective:** Add the FPU/Lovable-style 1px bright top-edge highlight to the accent tier ONLY by appending the spec's required Tailwind `before:*` class fragment to `VARIANT_CLASSES.accent.base`. Add a new test asserting the highlight is present on accent and absent on default and subdued.

**Files to create/modify:**

- `frontend/src/components/homepage/FrostedCard.tsx` — append `relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent before:rounded-t-3xl before:pointer-events-none` to the END of `VARIANT_CLASSES.accent.base`. Do NOT add to `default.base` or `subdued.base`.
- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` — append a new test `'accent tier has top-edge highlight'`.

**Details:**

The `relative` token in the fragment is critical: the absolutely-positioned pseudo-element's containing block must be the FrostedCard itself. Without `relative`, `before:absolute` would attach to whichever ancestor is positioned, producing wrong placement. The spec lines 46-51 list `relative` as the first class for this exact reason.

The fragment uses `before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent` — an intentionally faint catch-of-light. The spec § "Design Notes" line 200 calls out: "The accent top-edge highlight uses `via-white/[0.10]` — intentionally faint. This is the visual trick that makes accent cards feel three-dimensional; cranking the opacity higher would read as a stripe rather than a catch-of-light."

The new test asserts class-string presence:

```ts
it('accent tier has top-edge highlight (:before pseudo-element)', () => {
  const { container } = render(<FrostedCard variant="accent">Content</FrostedCard>)
  const cls = (container.firstElementChild as HTMLElement).className
  expect(cls).toContain('before:bg-gradient-to-r')
  expect(cls).toContain('before:from-transparent')
  expect(cls).toContain('before:via-white/[0.10]')
  expect(cls).toContain('before:to-transparent')
  expect(cls).toContain('before:rounded-t-3xl')
  expect(cls).toContain('relative')
})

it('default tier does NOT have top-edge highlight', () => {
  const { container } = render(<FrostedCard variant="default">Content</FrostedCard>)
  const cls = (container.firstElementChild as HTMLElement).className
  expect(cls).not.toContain('before:bg-gradient-to-r')
})

it('subdued tier does NOT have top-edge highlight', () => {
  const { container } = render(<FrostedCard variant="subdued">Content</FrostedCard>)
  const cls = (container.firstElementChild as HTMLElement).className
  expect(cls).not.toContain('before:bg-gradient-to-r')
})
```

The spec § Fix 2 (line 55) requires only one test (`'accent tier has top-edge highlight'`); the two negative-assertion tests are added defensively to guard the spec's "default and subdued tiers must NOT receive this highlight" requirement.

**Auth gating (if applicable):** None — pure visual.

**Responsive behavior:**
- Desktop (1440px): 1px height pseudo-element, full card width.
- Tablet (768px): Same — 1px height stays at 1px regardless of viewport.
- Mobile (375px): Same — 1px line scales naturally with card width via `inset-x-0`.

**Inline position expectations:** N/A — pseudo-element is not an inline-row layout participant.

**Guardrails (DO NOT):**

- Do NOT add `relative` to default or subdued base classes — only accent gets the `before:` highlight.
- Do NOT add the `before:` classes to default or subdued — they are accent-only per spec line 53.
- Do NOT change the `via-white/[0.10]` opacity — the spec line 200 explicitly calls out that higher values read as a stripe, not a catch-of-light.
- Do NOT change `before:rounded-t-3xl` — it must match the card's `rounded-3xl` to clip the top-edge correctly at the top corners.
- Do NOT use a `::before` literal or styled-components syntax — the spec requires Tailwind `before:*` arbitrary variants. They render as a CSS pseudo-element automatically.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `'accent tier has top-edge highlight (:before pseudo-element)'` | unit | Asserts presence of all six required `before:*` classes + `relative` |
| `'default tier does NOT have top-edge highlight'` | unit | Asserts absence of `before:bg-gradient-to-r` |
| `'subdued tier does NOT have top-edge highlight'` | unit | Asserts absence of `before:bg-gradient-to-r` |

**Expected state after completion:**

- [ ] `pnpm test src/components/homepage/__tests__/FrostedCard.test.tsx` — 25 tests pass (22 from Step 1 + 3 new).
- [ ] `pnpm tsc --noEmit` — clean.
- [ ] Visual sanity: render `<FrostedCard variant="accent">Card</FrostedCard>` in `pnpm dev` and confirm the 1px gradient line is visible at the top inside edge.

---

### Step 3: Apply Fix 3 — `eyebrow` and `eyebrowColor` props on FrostedCard

**Objective:** Extend `FrostedCardProps` with two optional props (`eyebrow?: string`, `eyebrowColor?: 'violet' | 'white'`). When `eyebrow` is truthy, render the spec's required eyebrow JSX block (dot + label) above `children`. When omitted/empty, render nothing extra. Add four tests covering the eyebrow behavior matrix.

**Files to create/modify:**

- `frontend/src/components/homepage/FrostedCard.tsx` — extend the `FrostedCardProps` interface, destructure the new props with defaults, render the eyebrow JSX block conditionally above `{children}`. Reference `cn` from `@/lib/utils` (already imported at line 1).
- `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` — append four tests.

**Details:**

Update `FrostedCardProps`:

```typescript
interface FrostedCardProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  as?: 'div' | 'button' | 'article'
  tabIndex?: number
  role?: string
  onKeyDown?: React.KeyboardEventHandler
  variant?: FrostedCardVariant
  eyebrow?: string
  eyebrowColor?: 'violet' | 'white'
}
```

Update the function signature destructure:

```typescript
export function FrostedCard({
  children,
  onClick,
  className,
  as: Component = 'div',
  tabIndex,
  role,
  onKeyDown,
  variant = 'default',
  eyebrow,
  eyebrowColor,
}: FrostedCardProps) {
```

Inside the returned JSX, render the eyebrow block conditionally above `children`:

```tsx
return (
  <Component
    onClick={onClick}
    tabIndex={tabIndex}
    role={role}
    onKeyDown={onKeyDown}
    className={cn(
      variantClasses.base,
      'transition-all motion-reduce:transition-none duration-base ease-decelerate',
      isInteractive && [
        'cursor-pointer',
        variantClasses.hover,
        'motion-reduce:hover:translate-y-0',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
      ],
      className,
    )}
  >
    {eyebrow ? (
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            eyebrowColor === 'violet' || (variant === 'accent' && !eyebrowColor)
              ? 'bg-violet-400'
              : 'bg-white/40',
          )}
        />
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-[0.15em]',
            variant === 'accent' ? 'text-violet-300' : 'text-white/50',
          )}
        >
          {eyebrow}
        </span>
      </div>
    ) : null}
    {children}
  </Component>
)
```

Eyebrow color logic table (from spec lines 89-92):

| `variant` | `eyebrowColor` | Dot bg | Label color |
|-----------|---------------|--------|-------------|
| `'accent'` | undefined | `bg-violet-400` | `text-violet-300` |
| `'default'` | undefined | `bg-white/40` | `text-white/50` |
| `'subdued'` | undefined | `bg-white/40` | `text-white/50` |
| any | `'violet'` | `bg-violet-400` | (label still derived from variant) |
| any | `'white'` | `bg-white/40` | (label still derived from variant) |

NOTE: per the spec, only the DOT color is overridden by `eyebrowColor`; the label color is always derived from `variant` (accent → violet-300, otherwise white/50). The spec JSX block (lines 67-85) makes this explicit by using `variant === 'accent' ? 'text-violet-300' : 'text-white/50'` for the label.

**Tests appended to `FrostedCard.test.tsx`:**

```ts
describe('eyebrow', () => {
  it('eyebrow renders when prop provided', () => {
    render(<FrostedCard eyebrow="Today's reading">Body</FrostedCard>)
    expect(screen.getByText("Today's reading")).toBeInTheDocument()
  })

  it('eyebrow does not render when prop omitted', () => {
    const { container } = render(<FrostedCard>Body</FrostedCard>)
    // No element with eyebrow's tracking-[0.15em] should exist
    expect(container.querySelector('[class*="tracking-[0.15em]"]')).toBeNull()
  })

  it('accent tier eyebrow uses violet-300 text and violet-400 dot', () => {
    const { container } = render(
      <FrostedCard variant="accent" eyebrow="Featured">Body</FrostedCard>,
    )
    const label = screen.getByText('Featured')
    expect(label.className).toContain('text-violet-300')
    // The dot is the preceding sibling span
    const dot = label.previousElementSibling as HTMLElement
    expect(dot?.className).toContain('bg-violet-400')
  })

  it('default tier eyebrow uses white/50 text and white/40 dot', () => {
    const { container } = render(
      <FrostedCard variant="default" eyebrow="Note">Body</FrostedCard>,
    )
    const label = screen.getByText('Note')
    expect(label.className).toContain('text-white/50')
    const dot = label.previousElementSibling as HTMLElement
    expect(dot?.className).toContain('bg-white/40')
  })
})
```

**Auth gating (if applicable):** None.

**Responsive behavior:**
- Desktop (1440px): Eyebrow row sits above `children` with `mb-4` (16px) gap. Tracking `0.15em` keeps the label compact.
- Tablet (768px): Same.
- Mobile (375px): Same — `text-xs` (12px) with `font-semibold` ensures readability at the smallest viewport.

**Inline position expectations:**

- Eyebrow dot and label MUST share the same y-coordinate at every breakpoint (within ±2px tolerance). They sit inside `flex items-center gap-2`, so flex's cross-axis center alignment guarantees this. Document expectation here so `/verify-with-playwright` can confirm via `boundingBox().y` comparison.

**Guardrails (DO NOT):**

- Do NOT render an empty eyebrow block when `eyebrow` is `undefined` or `""`. Use truthy check (`{eyebrow ? ... : null}`).
- Do NOT add `aria-hidden` to the dot or label — the eyebrow is a labeled context cue per spec line 158, not purely decorative.
- Do NOT use `tracking-widest` (which is `0.1em` in Tailwind defaults). The spec requires `tracking-[0.15em]` for the editorial FPU/Lovable feel.
- Do NOT swap `font-semibold` for `font-bold` — `font-semibold` is the spec's choice and improves perceived contrast at 12px per spec line 158.
- Do NOT break the existing `children` rendering — eyebrow renders ABOVE `children`, both inside the same Component wrapper.
- Do NOT change the dot's size from `h-1.5 w-1.5` (6px square = circle via `rounded-full`).

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `'eyebrow renders when prop provided'` | unit | Spec line 95 |
| `'eyebrow does not render when prop omitted'` | unit | Spec line 96 |
| `'accent tier eyebrow uses violet-300 text and violet-400 dot'` | unit | Spec line 97 |
| `'default tier eyebrow uses white/50 text and white/40 dot'` | unit | Spec line 98 |

**Expected state after completion:**

- [ ] `pnpm test src/components/homepage/__tests__/FrostedCard.test.tsx` — 29 tests pass (25 from Step 2 + 4 new).
- [ ] `pnpm tsc --noEmit` — clean. New props are optional and don't break any existing FrostedCard call site.
- [ ] All existing FrostedCard consumers continue rendering unchanged because they don't pass `eyebrow` (verified by visual sanity check at `pnpm dev` on `/`, `/daily`, `/ask`, `/bible`).

---

### Step 4: Apply Fix 4 — VerseOfTheDay variant prop + revised tier mapping in BibleHeroSlot

**Objective:** Add a `variant?: 'accent' | 'default'` prop to `VerseOfTheDay`, defaulting to `'accent'`. Pass `variant={variant}` AND `eyebrow="Verse of the Day"` to the loaded FrostedCard; pass `variant="default"` AND `eyebrow="Verse of the Day"` to the skeleton FrostedCard. Remove the existing handwritten `<span>Verse of the Day</span>`. In `BibleHeroSlot`, pass `variant="default"` to the two branches where VOTD sits below another accent card; let it default to `'accent'` in the two branches where VOTD is the standalone hero.

**Files to create/modify:**

- `frontend/src/components/bible/landing/VerseOfTheDay.tsx` — add `VerseOfTheDayProps` interface, destructure `variant = 'accent'`, update both FrostedCard call sites, remove handwritten eyebrow span.
- `frontend/src/components/bible/landing/BibleHeroSlot.tsx` — pass `variant="default"` in branches 1 and 2; leave branches 3 and 4 unchanged (they continue to invoke `<VerseOfTheDay />` with no props, which now defaults to accent).

**Details:**

In `VerseOfTheDay.tsx`:

1. Add the interface above the function declaration:
   ```typescript
   interface VerseOfTheDayProps {
     variant?: 'accent' | 'default'
   }
   ```
2. Update the function signature:
   ```typescript
   export function VerseOfTheDay({ variant = 'accent' }: VerseOfTheDayProps = {}) {
   ```
   The `= {}` default is needed because the component is sometimes invoked with no props (`<VerseOfTheDay />`).
3. Update the skeleton FrostedCard at line 91:
   ```tsx
   <FrostedCard as="article" variant="default" eyebrow="Verse of the Day">
   ```
4. Update the loaded FrostedCard at line 116:
   ```tsx
   <FrostedCard as="article" variant={variant} eyebrow="Verse of the Day">
   ```
5. REMOVE the handwritten eyebrow block at lines 117-120:
   ```tsx
   {/* DELETE — replaced by FrostedCard eyebrow prop */}
   <span className="text-xs font-medium uppercase tracking-widest text-white/50">
     Verse of the Day
   </span>
   ```

The verse text `<blockquote>` at lines 122-125 currently has `mt-4`, which produced spacing between the handwritten eyebrow and the verse. With the eyebrow now inside FrostedCard (rendered with its own `mb-4`), the `mt-4` on `<blockquote>` produces a 32px combined gap (16px from `mb-4` on the eyebrow + 16px from `mt-4` on the blockquote). This matches the desired vertical rhythm (eyebrow → ~32px → verse), per inspection of the FPU/Lovable references described prose-only in the spec. KEEP `mt-4` on the blockquote.

In `BibleHeroSlot.tsx`:

- Line 52 (Branch 1, active plan + VOTD): `<VerseOfTheDay variant="default" />`.
- Line 69 (Branch 2, ResumeReadingCard + VOTD): `<VerseOfTheDay variant="default" />`.
- Line 78 (Branch 3, lapsed reader): leave as `<VerseOfTheDay />` — defaults to accent.
- Line 94 (Branch 4, first-time reader): leave as `<VerseOfTheDay />` — defaults to accent.

**Auth gating (if applicable):** None — `VerseOfTheDay.handleSave` retains its existing `useAuth + useAuthModal` gate. The `variant` prop is purely visual.

**Responsive behavior:**
- Desktop (1440px): VOTD card renders as accent (with violet border, top-edge highlight, violet eyebrow) when standalone in branches 3-4, or default (white surface, white eyebrow) when below another accent card in branches 1-2.
- Tablet (768px): Same — variant choice cascades.
- Mobile (375px): Same. Stack ordering preserved by BibleHeroSlot's existing `space-y-6` and `space-y-4` containers.

**Inline position expectations:** N/A for this step.

**Guardrails (DO NOT):**

- Do NOT remove `mt-4` from the verse `<blockquote>` — it provides the verse-spacing rhythm now that the eyebrow is inside FrostedCard.
- Do NOT change the verse font class (`font-serif text-lg sm:text-xl text-white leading-relaxed`) — out of scope per spec line 209.
- Do NOT add a `variant` prop type wider than `'accent' | 'default'` — VerseOfTheDay never appears in subdued contexts on `/bible`.
- Do NOT pass `eyebrow` to the loaded card via a different string — must be exact `"Verse of the Day"` per spec line 117.
- Do NOT skip the skeleton's `eyebrow` prop — both card states must render the eyebrow consistently to avoid layout shift on data load.
- Do NOT add `variant="accent"` explicitly in branches 3 and 4 — the spec line 121 says "let `VerseOfTheDay` default to `'accent'` — no prop pass needed". This signals intentional reliance on the default.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing VOTD tests (17 cases in `VerseOfTheDay.test.tsx`) | unit | All pass without modification — none assert FrostedCard surface tokens or eyebrow placement |
| Existing BibleHeroSlot tests (8 cases) | unit | All pass without modification — child components are mocked at lines 23-41 so prop-passing is opaque to assertions |
| `'Verse of the Day' label` (existing test, line 102-105 in `VerseOfTheDay.test.tsx`) | unit | Continues to pass — text is now rendered via the eyebrow prop instead of the handwritten span |

No new tests required for Step 4 — the existing test coverage already exercises the relevant surface area, and the eyebrow rendering logic itself is covered by the four tests in Step 3.

**Expected state after completion:**

- [ ] `pnpm test src/components/bible/landing/__tests__/VerseOfTheDay.test.tsx` — 17 tests pass.
- [ ] `pnpm test src/components/bible/landing/__tests__/BibleHeroSlot.test.tsx` — 8 tests pass.
- [ ] `pnpm tsc --noEmit` — clean. The new optional `variant` prop on `VerseOfTheDay` doesn't break any existing call site (BibleHeroSlot calls remain valid; the test mock at line 23 also remains valid).
- [ ] Visual sanity at `/bible` in `pnpm dev`: VOTD card renders with violet border in branches 3 and 4 (lapsed and first-time readers, the typical logged-out state), and with white border in branches 1 and 2 (active plan + active reader, where VOTD sits below another accent card).

---

### Step 5: Apply Fix 5 — eyebrows on ActivePlanBanner and ResumeReadingCard

**Objective:** Replace the handwritten eyebrow paragraphs in both accent-tier consumer cards with FrostedCard's new `eyebrow` prop.

**Files to create/modify:**

- `frontend/src/components/bible/landing/ActivePlanBanner.tsx` — pass `eyebrow="Today's reading"` to the FrostedCard at line 25; remove the `<p>` element at lines 26-28.
- `frontend/src/components/bible/landing/ResumeReadingCard.tsx` — pass `eyebrow="Pick up where you left off"` to the FrostedCard at line 23; remove the `<p>` element at lines 24-26.

**Details:**

In `ActivePlanBanner.tsx`, replace lines 25-28:

```tsx
// BEFORE
<FrostedCard as="article" variant="accent">
  <p className="text-xs font-medium uppercase tracking-widest text-white/60">
    You&apos;re on a plan
  </p>

  <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{planTitle}</h3>

// AFTER
<FrostedCard as="article" variant="accent" eyebrow="Today's reading">
  <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{planTitle}</h3>
```

The `<h3>` keeps `mt-2` for now. The eyebrow inside FrostedCard renders with `mb-4`. Combined gap is 16px (`mb-4`) + 8px (`mt-2`) = 24px between eyebrow and heading. The previous gap was the `mt-2` on `<h3>` referenced from a non-margined `<p>` (~8px). The 24px gap is intentionally larger — Iteration 1's editorial polish (per spec § Design Notes) needs more breathing room than the pilot's compressed layout.

In `ResumeReadingCard.tsx`, replace lines 23-26:

```tsx
// BEFORE
<FrostedCard as="article" variant="accent">
  <p className="text-xs font-medium uppercase tracking-widest text-white/60">
    Continue reading
  </p>
  <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">

// AFTER
<FrostedCard as="article" variant="accent" eyebrow="Pick up where you left off">
  <h3 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
```

Same `mb-4` (eyebrow) + `mt-2` (h3) = 24px combined gap.

The eyebrow text strings ("Today's reading" and "Pick up where you left off") come directly from spec lines 127-128. Both are accent-tier, so they render with `text-violet-300` + `bg-violet-400` automatically per Fix 3.

**Auth gating (if applicable):** None.

**Responsive behavior:**
- Desktop (1440px): Eyebrow renders above heading; both cards retain accent visual treatment.
- Tablet (768px): Same.
- Mobile (375px): Same — `text-xs` eyebrow remains readable.

**Inline position expectations:**

- Eyebrow dot and label inside ActivePlanBanner share y-coordinate (±2px) at every breakpoint.
- Eyebrow dot and label inside ResumeReadingCard share y-coordinate (±2px) at every breakpoint.

**Guardrails (DO NOT):**

- Do NOT preserve the OLD handwritten paragraph alongside the new eyebrow prop — spec § Design Notes implicitly requires removal (mirrors Fix 4's "Do not leave both rendered" instruction at spec line 119).
- Do NOT change the eyebrow text strings — must be exactly `"Today's reading"` and `"Pick up where you left off"` per spec lines 127-128.
- Do NOT pass `eyebrowColor` overrides — accent tier's automatic violet-300/violet-400 colors are correct.
- Do NOT remove `mt-2` from the `<h3>` — it provides the heading-spacing rhythm.
- Do NOT touch any other line in either component.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing ActivePlanBanner tests (5 cases) | unit | All pass — no test asserts the literal string "You're on a plan" (verified by grep) |
| Existing ResumeReadingCard tests (10 cases, including the `border-violet-400/70` assertion already updated in Step 1) | unit | All pass — no test asserts the literal string "Continue reading" (the existing test at line 36 asserts "Read 3 hours ago" which is the relative-time label, not the eyebrow) |

No new tests required for Step 5 — the eyebrow rendering logic itself is covered by Step 3's tests, and the consumers' integration is covered by the existing tests' continued passes.

**Expected state after completion:**

- [ ] `pnpm test src/components/bible/landing/__tests__/ActivePlanBanner.test.tsx` — 5 tests pass.
- [ ] `pnpm test src/components/bible/landing/__tests__/ResumeReadingCard.test.tsx` — 10 tests pass.
- [ ] `pnpm tsc --noEmit` — clean.
- [ ] Visual sanity at `/bible` in `pnpm dev`: both accent cards now show the editorial dot+label eyebrow at the top.

---

### Step 6: Apply Fix 6 — three-layer BackgroundCanvas composition

**Objective:** Replace the `CANVAS_BACKGROUND` constant in `BackgroundCanvas.tsx` with the spec's three-layer composition (faint top violet bloom + middle radial darkening + diagonal linear gradient with three stops).

**Files to create/modify:**

- `frontend/src/components/ui/BackgroundCanvas.tsx` — replace lines 9-11 (`CANVAS_BACKGROUND` constant) with the new three-layer string.

**Details:**

Replace the constant exactly:

```ts
// BEFORE (pilot — 2 layers)
const CANVAS_BACKGROUND =
  'radial-gradient(ellipse 60% 50% at 60% 50%, rgba(0,0,0,0.55) 0%, transparent 70%), ' +
  'linear-gradient(135deg, #0F0A1A 0%, #0A0814 100%)'

// AFTER (Iteration 1 — 3 layers)
const CANVAS_BACKGROUND = `
  radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) 0%, transparent 60%),
  radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
  linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
`
```

Layer-by-layer purpose (spec lines 148-152):

1. **Top violet bloom** (`radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) 0%, transparent 60%)`) — `rgba(167,139,250,0.10)` is the `violet-400` token (`#A78BFA`) at 10% alpha. Positioned at 50% horizontal / 20% vertical — near the top center. Adds warmth without HorizonGlow's intensity.
2. **Middle radial darkening** (`radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%)`) — wider ellipse than the pilot (70% × 55% vs 60% × 50%), and darker (0.65 alpha vs 0.55). Positioned at 60% horizontal / 50% vertical — center-right where the FrostedCard column sits. Reading-lamp spotlight.
3. **Bottom three-stop diagonal gradient** (`linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)`) — starts at `#120A1F` (slightly lighter top-left shoulder), passes through `#08051A` at midpoint (matches `bg-hero-bg`), ends at `#0A0814` (slightly darker bottom-right). Three stops give the canvas perceivable spatial depth, breaking the pilot's perfectly flat 2-stop gradient.

The component's structure (`<div className={cn('relative min-h-screen overflow-hidden', className)} style={{ background: CANVAS_BACKGROUND }}>`) is unchanged. Only the constant's value is replaced.

The CSS engine renders multiple `background:` values left-to-right as top-to-bottom layers (the FIRST listed value is the TOP-most layer). The required ordering above is: violet bloom (top) → black radial darkening (middle) → diagonal linear (bottom base).

**Auth gating (if applicable):** None.

**Responsive behavior:**
- Desktop (1440px): All three layers visible. Radial gradients scale via `ellipse 50%/70% × 35%/55%` percentages — they sit within the viewport regardless of screen width.
- Tablet (768px): Same — percentages remain visually correct.
- Mobile (375px): Same — radial gradients scale to viewport. Spec § "Acceptance Criteria" line 236 manual-eyeball check requires "BackgroundCanvas radial-fade visible at 375px" (carryover from the pilot).

**Inline position expectations:** N/A.

**Guardrails (DO NOT):**

- Do NOT change layer ordering — spec § Design Notes line 199 implies top-down: violet bloom → middle darkening → linear base. Reordering breaks the layered composition.
- Do NOT change the violet-bloom RGB (`167,139,250`) — this is the `violet-400` token (`#A78BFA`) at 10% alpha. Spec line 201 calibrates this opacity to 10% so the bloom doesn't compete with `/daily`'s HorizonGlow when the user navigates back.
- Do NOT change the middle radial's 0.65 alpha — spec line 201 says "middle radial darkening at 65% (up from 55% in the pilot)". Stronger darkening is intentional.
- Do NOT remove the three-stop diagonal — the spec line 201 calls out the `#120A1F` top-left shoulder so the canvas isn't perfectly flat.
- Do NOT update `frontend/src/components/ui/__tests__/BackgroundCanvas.test.tsx` — spec line 153 says "If only asserts the presence of an inline `style.background`, no change is needed there." Verified during recon: the test at lines 1-32 asserts `relative` / `min-h-screen` / `overflow-hidden` / custom className, but does NOT assert the exact background string.
- Do NOT use `BackgroundCanvas` on any other page in this iteration — the pilot left it BibleLanding-only and the spec § "Out of Scope" line 213 forbids cross-page rollout.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing BackgroundCanvas tests (3 cases) | unit | All pass — no assertion on the exact background string |

No new tests required for Step 6 — visual verification is the meaningful check, performed via `pnpm dev` + manual eyeball at `/bible` (per spec line 236) and `/verify-with-playwright`.

**Expected state after completion:**

- [ ] `pnpm test src/components/ui/__tests__/BackgroundCanvas.test.tsx` — 3 tests pass.
- [ ] `pnpm tsc --noEmit` — clean.
- [ ] Visual sanity at `/bible` in `pnpm dev`: faint warm violet glow visible near the top of the page; cards in the middle sit on a darker background than the page edges; bottom-right corner is slightly darker than top-left.
- [ ] `/daily` regression eyeball: HorizonGlow still renders 5 purple/lavender blobs at 5%/15%/35%/60%/85% (per spec line 235). Confirms BackgroundCanvas has not leaked outside `/bible`.

---

### Step 7: End-to-end verification

**Objective:** Run the full validation pipeline (typecheck → unit tests → manual eyeball at both routes) and confirm the iteration ships with zero regressions and the target visual energy.

**Files to create/modify:** None — verification only.

**Details:**

1. **Typecheck:** `pnpm tsc --noEmit` from `frontend/`. MUST be clean. Watches for: signature drift on `FrostedCardProps`, `VerseOfTheDayProps`, missed required-prop additions in BibleHeroSlot's child renders.
2. **Unit tests (full suite):** `pnpm test` from `frontend/`. The pre-iteration documented baseline is 9,364 pass / 2 fail across 2 files (per the pilot plan's Execution Log § Step 11 final note — same 2 fails are pre-existing). MUST be 9,371+ pass / 2 fail (an increase of at least 7 = the new tests added in Steps 2 (3) and 3 (4)). Any NEW failing file or fail count > 2 is a regression.
3. **Manual eyeball — `/bible` (spec line 236):**
   - Branch 4 (no last-read, no plan — typical first visit): VOTD renders as accent (violet border, top-edge 1px catch-of-light, violet "VERSE OF THE DAY" eyebrow with violet dot).
   - Branch 3 (lapsed reader — set `wr_bible_last_read` to a 90+ day-old timestamp via DevTools): VOTD renders as accent above the small "Last read" link.
   - Branch 2 (active reader — set `wr_bible_last_read` to a recent timestamp): ResumeReadingCard renders as accent with "Pick up where you left off" eyebrow + violet dot; VOTD renders as default (white border, white eyebrow with white dot) BELOW it.
   - Branch 1 (active plan + active reader — additionally seed `bible:plans`): ActivePlanBanner renders as accent with "Today's reading" eyebrow + violet dot; ResumeReadingCard accent below; VOTD default below them.
   - Confirm cards visibly LIFT off the canvas (default tier `bg-white/[0.07]` is brighter than the canvas's deepest stop).
   - Confirm canvas spatial depth: faint warm violet at top, darker spotlight in middle, slightly lighter top-left corner shoulder vs bottom-right.
4. **Manual eyeball — `/daily` regression (spec line 235):**
   - Open `/daily?tab=devotional` (the default).
   - Confirm 5 HorizonGlow purple/lavender blobs are visible at vertical positions ~5%, ~15%, ~35%, ~60%, ~85%.
   - This proves BackgroundCanvas (BibleLanding-only) hasn't leaked into `/daily`'s HorizonGlow architecture.
5. **Manual eyeball — cascade-affected surfaces** (FrostedCard default-tier opacity bump cascades to these):
   - `/` (DifferentiatorSection cards) — cards visibly slightly brighter than before.
   - `/daily?tab=devotional` (Tier 1 reflection / question / quote cards) — same cascade.
   - `/ask` (verse cards, ConversionPrompt, PopularTopicsSection) — same cascade.
   - These are NOT regressions; they're the intentional cascade of the new house style per spec § "Out of Scope".

**Auth gating (if applicable):** None — verification step only.

**Responsive behavior:**
- Verify all four BibleLanding branches at 375px / 768px / 1440px in DevTools responsive mode.
- Confirm eyebrow rows do not wrap at any breakpoint.
- Confirm BackgroundCanvas radial-fade visible at 375px.

**Inline position expectations:** Confirm at 1440px and 768px that the eyebrow dot and label share y-coordinate (±2px) inside ActivePlanBanner, ResumeReadingCard, and VerseOfTheDay (both branches 1-2 default-tier rendering and branches 3-4 accent-tier rendering).

**Guardrails (DO NOT):**

- Do NOT commit. The user manages all git operations per spec line 5.
- Do NOT push or stash anything.
- Do NOT run `pnpm lint --fix` automatically — if lint surfaces an issue, raise it with the user first.

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| `pnpm tsc --noEmit` | meta | Whole-project typecheck must pass |
| `pnpm test` (full suite) | meta | Full unit-test suite must pass with no new regressions; expected 9,371+ pass / 2 fail |
| Manual eyeball at `/bible` (4 branches) | manual | Spec § Acceptance Criteria line 236 |
| Manual eyeball regression at `/daily` | manual | Spec § Acceptance Criteria line 235 |

**Expected state after completion:**

- [ ] `pnpm tsc --noEmit` clean.
- [ ] `pnpm test` shows zero new failures vs. documented baseline (2 pre-existing fails only).
- [ ] All four BibleLanding branches render the correct tier mapping per Fix 4.
- [ ] Eyebrows render with correct dot+label colors on accent (violet) and default (white) tiers.
- [ ] Accent tier 1px top-edge highlight visible.
- [ ] Three-layer BackgroundCanvas visibly composed: top violet bloom, middle reading-lamp spotlight, diagonal lighter top-left shoulder.
- [ ] `/daily` HorizonGlow regression: still present.
- [ ] User informed that the iteration is ready for `/code-review` and `/verify-with-playwright`.

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Bump tier surface opacities + update FrostedCard tests + cascade-test sweep |
| 2 | 1 | Accent top-edge highlight (must layer on the Step 1 accent base classes) |
| 3 | 1 | Eyebrow + eyebrowColor props (independent of Step 2 visually but tests live in same file as Step 2) |
| 4 | 3 | VerseOfTheDay variant + eyebrow pass-through (consumes Step 3's new prop) |
| 5 | 3 | ActivePlanBanner + ResumeReadingCard eyebrow migration (consumes Step 3's new prop) |
| 6 | — | Three-layer BackgroundCanvas (independent of FrostedCard work) |
| 7 | 1, 2, 3, 4, 5, 6 | End-to-end verification |

Steps 1, 6 can run concurrently if needed. Steps 4 and 5 can run concurrently after Step 3.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Bump tier surface opacities + update test class-string assertions | [COMPLETE] | 2026-04-30 | Updated `FrostedCard.tsx` `VARIANT_CLASSES` (8 class-string updates per Design System Values § Fix 1 table). Updated `FrostedCard.test.tsx` (8 assertion updates + test name updates), `ConversionPrompt.test.tsx`, `PopularTopicsSection.test.tsx`, `AskPage.test.tsx` (FrostedCard verse cards only — Tier 2 callout's hand-coded `bg-white/[0.04]` left untouched), `DevotionalTabContent.test.tsx` (quote section + reflection FrostedCard — Tier 2 hand-coded callout left untouched), `ResumeReadingCard.test.tsx`. **Deviation:** `DifferentiatorSection.test.tsx` was listed in the plan but its asserted classes (`border-white/[0.06]`, `bg-white/[0.08]`) belong to hand-coded icon containers (`.rounded-xl`), not FrostedCard surface (`.rounded-3xl`). Verified against `DifferentiatorSection.tsx:52`. No FrostedCard-tier assertions exist in this test file → no update required. Test suite: 9364 pass / 2 fail (pre-existing baseline preserved). `tsc --noEmit` clean. |
| 2 | Accent tier inner top-edge highlight (`:before` pseudo-element) | [COMPLETE] | 2026-04-30 | Appended `relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent before:rounded-t-3xl before:pointer-events-none` to `VARIANT_CLASSES.accent.base`. Added 3 tests in `FrostedCard.test.tsx` (accent has highlight; default and subdued do not). Test suite: 9368 pass / 1 fail (no new regressions; +3 tests from Step 2). `tsc --noEmit` clean. |
| 3 | `eyebrow` and `eyebrowColor` props on FrostedCard | [COMPLETE] | 2026-04-30 | Extended `FrostedCardProps` with `eyebrow?: string` and `eyebrowColor?: 'violet' \| 'white'`. Rendered conditional eyebrow JSX block (dot + label, `mb-4 flex items-center gap-2`, `tracking-[0.15em]`) above `{children}` when `eyebrow` is truthy. Added 4 tests under a `describe('eyebrow')` block. Test suite: 9372 pass / 1 fail. `tsc --noEmit` clean. |
| 4 | VerseOfTheDay variant prop + revised tier mapping in BibleHeroSlot | [COMPLETE] | 2026-04-30 | Added `VerseOfTheDayProps` interface with `variant?: 'accent' \| 'default'` defaulting to `'accent'`. Skeleton FrostedCard: `variant="default" eyebrow="Verse of the Day"`. Loaded FrostedCard: `variant={variant} eyebrow="Verse of the Day"`. Removed handwritten `<span>Verse of the Day</span>` block. `BibleHeroSlot.tsx`: branches 1 and 2 now pass `variant="default"`; branches 3 and 4 leave bare `<VerseOfTheDay />` (defaults to accent). 17 VerseOfTheDay tests + 8 BibleHeroSlot tests all pass. `tsc --noEmit` clean. |
| 5 | Eyebrows on ActivePlanBanner and ResumeReadingCard | [COMPLETE] | 2026-04-30 | `ActivePlanBanner.tsx`: passed `eyebrow="Today's reading"` to FrostedCard, removed handwritten "You're on a plan" `<p>`. `ResumeReadingCard.tsx`: passed `eyebrow="Pick up where you left off"`, removed handwritten "Continue reading" `<p>`. **Deviation:** `BibleLanding.test.tsx` lines 107 + 120 referenced the removed "Continue reading" string (the plan's recon only audited `ResumeReadingCard.test.tsx` itself, missed the page-level integration test). Updated both occurrences to `'Pick up where you left off'` per the same lockstep value-substitution pattern Step 1 used for the cascade test files. Test suite: 9372 pass / 1 fail (useFaithPoints pre-existing flake). `tsc --noEmit` clean. |
| 6 | Three-layer BackgroundCanvas composition | [COMPLETE] | 2026-04-30 | Replaced `CANVAS_BACKGROUND` constant with the spec's three-layer string: faint top violet bloom (`rgba(167,139,250,0.10)`), middle radial darkening (`rgba(0,0,0,0.65)` — bumped from pilot's 0.55), and three-stop diagonal gradient (`#120A1F` → `#08051A` → `#0A0814`). Component props/structure unchanged. 3 BackgroundCanvas tests pass (no string-equality assertions). `tsc --noEmit` clean. |
| 7 | End-to-end verification | [COMPLETE] | 2026-04-30 | `pnpm tsc --noEmit` clean. `pnpm test` (full suite): **9372 pass / 1 fail** (725 files). Baseline was 9364 pass / 2 fail; net delta is +8 pass / -1 fail (matches the +7 expected new tests from Steps 2 (3) and 3 (4) plus a previously-flaky test that passed this run). The 1 remaining failure (`useFaithPoints — returns default values when not authenticated`) is pre-existing tech debt (orphan-test pattern documented in CLAUDE.md baseline). **No new regressions.** **Manual visual eyeball not performed** — Claude Code session lacks a connected browser/Playwright MCP. The visual-verification gate (4 BibleLanding branches at 375/768/1440 + `/daily` HorizonGlow regression + cascade-affected surfaces at `/`, `/daily?tab=devotional`, `/ask`) belongs to the user's next step via `/verify-with-playwright`. |
