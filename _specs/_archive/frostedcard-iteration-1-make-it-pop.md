# FrostedCard Iteration 1 — Make It Pop

**Master Plan Reference:** Iteration of `_specs/frostedcard-pilot-bible-landing.md`. Pilot landed too quiet — this spec is six surgical visual fixes to bring BibleLanding to the FPU/Lovable visual energy that was the original target. No new components, no new tokens beyond what the pilot shipped.

**Branch discipline:** Stay on `forums-wave-continued`. Do not create new branches, commit, push, stash, or reset. The user manages all git operations manually.

---

## Affected Frontend Routes

- `/bible`
- `/daily` (regression check only — must keep its HorizonGlow visible; no other change)

---

## Overview

The FrostedCard pilot (`_specs/frostedcard-pilot-bible-landing.md`) shipped the variant system and `BackgroundCanvas`, but the page reads too quiet. Cards sink into the canvas instead of lifting off it, the accent tier doesn't catch enough light to read as featured, the editorial eyebrow-with-leading-dot pattern from FPU/Lovable is missing, the Verse of the Day card renders default-tier on branches where it should be the hero, and the canvas itself needs more spatial depth. This iteration applies six surgical fixes — pure tuning, no new components or tokens — to bring the page to its target visual energy.

The emotional intent is unchanged from the pilot: stillness, focus, and depth. The fixes amplify the existing system rather than rework it.

## User Story

As a **logged-out visitor or logged-in reader**, I want the Bible landing page's featured cards to lift off the canvas with the editorial polish of the FPU reference design, so that the visual hierarchy reads at a glance — accent cards feel three-dimensional and lit, defaults sit comfortably above the surface, and the canvas itself has perceivable spatial depth from a faint warm top to a darker reading-spotlight middle.

## Requirements

### Functional Requirements

#### Fix 1 — Bump tier surface opacities (cards lift, not sink)

In `frontend/src/components/homepage/FrostedCard.tsx`, raise every tier's background and border opacity so cards read as lighter than the canvas:

- **Default tier** background: `bg-white/[0.04]` → `bg-white/[0.07]`. Border: `border-white/[0.08]` → `border-white/[0.12]`.
- **Subdued tier** background: `bg-white/[0.02]` → `bg-white/[0.05]`. Border: `border-white/[0.06]` → `border-white/[0.10]`.
- **Accent tier** background: `bg-violet-500/[0.04]` → `bg-violet-500/[0.08]`. Border: `border-violet-400/45` → `border-violet-400/70`.
- **Default hover** background: `bg-white/[0.07]` → `bg-white/[0.10]`.
- **Accent hover** background: `bg-violet-500/[0.08]` → `bg-violet-500/[0.13]`.

Update `frontend/src/components/homepage/__tests__/FrostedCard.test.tsx` so all class-string assertions for tier backgrounds, borders, and hover backgrounds reflect the new values. No other test files need to change for this fix.

#### Fix 2 — Accent tier inner top-edge highlight

Add a `:before` pseudo-element to the **accent tier only** to produce a subtle bright line along the top inside edge — the visual trick that gives FPU/Lovable accent cards their lifted-and-catching-light feel. Required Tailwind class fragment on the accent base classes:

```
relative
before:absolute before:inset-x-0 before:top-0 before:h-px
before:bg-gradient-to-r before:from-transparent before:via-white/[0.10]
before:to-transparent before:rounded-t-3xl before:pointer-events-none
```

The `relative` class is required so the absolutely-positioned pseudo-element anchors to the card. The default and subdued tiers must NOT receive this highlight — the top-edge line is a deliberate accent-only treatment.

Add a test `'accent tier has top-edge highlight'` to `FrostedCard.test.tsx` asserting the `before:bg-gradient-to-r` class is present on the accent tier and absent on default and subdued.

#### Fix 3 — `eyebrow` and `eyebrowColor` props on FrostedCard

Add two optional props to `FrostedCardProps`:

- `eyebrow?: string` — uppercase letterspaced label rendered above children when provided
- `eyebrowColor?: 'violet' | 'white'` — overrides the default dot color (which is derived from `variant`)

When `eyebrow` is provided, render this block above `children`:

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

When `eyebrow` is omitted, render nothing extra — existing consumers that don't pass the prop must continue to render unchanged.

**Eyebrow color rules:**
- Accent tier (no override): violet-300 text + violet-400 dot.
- Default tier (no override): white/50 text + white/40 dot.
- `eyebrowColor="violet"` forces the violet dot regardless of variant. `eyebrowColor="white"` forces the white dot.

Add the following tests to `FrostedCard.test.tsx`:
- `'eyebrow renders when prop provided'`
- `'eyebrow does not render when prop omitted'`
- `'accent tier eyebrow uses violet-300 text and violet-400 dot'`
- `'default tier eyebrow uses white/50 text and white/40 dot'`

#### Fix 4 — VerseOfTheDay variant prop + revised tier mapping

The pilot's tier mapping for VerseOfTheDay across the four BibleHeroSlot branches is revised. New mapping:

| Branch | Composition | VOTD tier |
|---|---|---|
| 1 — Active plan + ResumeReadingCard + VOTD | accent + accent + VOTD | **default** |
| 2 — ResumeReadingCard + VOTD | accent + VOTD | **default** |
| 3 — Lapsed reader, VOTD primary + small "last read" link | VOTD alone | **accent** |
| 4 — First-time reader, VOTD only | VOTD alone | **accent** |

Rationale: VOTD is the standalone hero in branches 3 and 4 and earns accent treatment. In branches 1 and 2 it sits below another accent card; rendering it as accent too would create two accents fighting for attention.

`VerseOfTheDay` does not know which branch it's in — `BibleHeroSlot` does — so the variant must be passed in. In `frontend/src/components/bible/landing/VerseOfTheDay.tsx`:

- Add `interface VerseOfTheDayProps { variant?: 'accent' | 'default' }`.
- Default to `'accent'` when the prop is omitted (the standalone case).
- Apply `variant={variant}` AND `eyebrow="Verse of the Day"` to BOTH `FrostedCard` usages in the file (the loaded card and the skeleton).
- The skeleton may hardcode `variant="default"` — skeletons don't need accent dramatics.
- **Remove the existing handwritten eyebrow** (the `<span>Verse of the Day</span>` block at lines ~118-120) — the FrostedCard `eyebrow` prop now owns it. Do not leave both rendered.

In `frontend/src/components/bible/landing/BibleHeroSlot.tsx`, pass `variant="default"` to `<VerseOfTheDay />` in branches 1 and 2 (the active-plan and active-reader branches). In branches 3 (lapsed reader) and 4 (first-time reader), let `VerseOfTheDay` default to `'accent'` — no prop pass needed.

#### Fix 5 — Eyebrows on the other accent cards

Both `ActivePlanBanner` and `ResumeReadingCard` already render a handwritten eyebrow paragraph (`text-xs font-medium uppercase tracking-widest text-white/60`). Replace those with the new `eyebrow` prop on `FrostedCard`:

- **ActivePlanBanner** (`frontend/src/components/bible/landing/ActivePlanBanner.tsx`): pass `eyebrow="Today's reading"` to its `FrostedCard`. Remove the existing `<p className="text-xs font-medium uppercase tracking-widest text-white/60">You&apos;re on a plan</p>` block.
- **ResumeReadingCard** (`frontend/src/components/bible/landing/ResumeReadingCard.tsx`): pass `eyebrow="Pick up where you left off"` to its `FrostedCard`. Remove the existing `<p className="text-xs font-medium uppercase tracking-widest text-white/60">Continue reading</p>` block.

Both are accent-tier cards, so the eyebrow will render with violet-300 text and the violet-400 dot.

If either component's existing tests assert the exact text "You're on a plan" or "Continue reading", update those assertions to match the new eyebrow strings.

#### Fix 6 — Three-layer BackgroundCanvas

In `frontend/src/components/ui/BackgroundCanvas.tsx`, replace the current two-layer background with a three-layer composition that adds a faint violet bloom on top, strengthens the radial darkening, and gives the linear gradient a slightly lighter top-left shoulder:

```ts
style={{
  background: `
    radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) 0%, transparent 60%),
    radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%),
    linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)
  `,
}}
```

Layer-by-layer intent:
1. **Top:** faint violet bloom near the top of the page — gives warmth and atmosphere without HorizonGlow's intensity.
2. **Middle:** stronger radial darkening at center-right where cards live — creates a reading-lamp spotlight effect.
3. **Bottom:** three-stop diagonal gradient with a slightly lighter top-left shoulder.

If `BackgroundCanvas.test.tsx` asserts the exact background string, update the assertion to match the new value. If it only asserts the presence of an inline `style.background`, no change is needed there.

### Non-Functional Requirements

- **Performance:** No new layout effects, no JS animation. All changes are CSS opacities, a static pseudo-element, an inline gradient, and a small JSX block. Bundle size impact is negligible.
- **Accessibility:** The eyebrow block is decorative-supplemental — a labeled context cue, not the heading. Keep `<h3>` for the card title. The colored dot is decorative and uses `aria-hidden` is unnecessary because it's a `<span>` with no text content; screen readers ignore it. Eyebrow text contrast: `text-violet-300` on `bg-violet-500/[0.08]` over the canvas passes WCAG AA at 12px+ (text-xs is 12px, font-semibold improves perceived contrast). `text-white/50` on the default tier over the canvas passes WCAG AA per the canonical opacity table in `09-design-system.md`.
- **Reduced motion:** No new animations introduced. The global reduced-motion safety net continues to handle hover transitions on FrostedCard. No additional handling needed.

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---|---|---|---|
| View BibleLanding hero slot | Renders the appropriate branch (1/2/3/4) | Renders the appropriate branch (1/2/3/4) | N/A — no auth required to view |
| Click "Save" on VOTD | Triggers existing auth modal (unchanged from pilot) | Toggles bookmark | "Sign in to save verses" (existing string, unchanged) |
| Click "Read in context" on VOTD | Navigates to `/bible/<book>/<chapter>` (no auth required) | Navigates | N/A |
| Click "Share" on VOTD | Opens VotdShareModal (no auth required) | Opens modal | N/A |

This iteration introduces **no new auth gates**. Bible landing remains fully unauthenticated per the canonical Bible-wave auth posture in `02-security.md`.

## Responsive Behavior

| Breakpoint | Layout |
|---|---|
| Mobile (< 640px) | Cards stack vertically (existing layout, unchanged). FrostedCard padding remains `p-6` for accent/default and `p-5` for subdued. Eyebrow renders on its own line above the card heading with `mb-4` gap. The accent top-edge highlight scales naturally with the card width. |
| Tablet (640–1024px) | Same single-column stack. Cards widen with the container. Backdrop-blur escalates from `backdrop-blur-sm` to `backdrop-blur-md` for the default tier per the existing pilot rules. |
| Desktop (> 1024px) | Same single-column stack within the BibleLanding hero slot. Accent tier uses `md:backdrop-blur-[12px]`. Inner top-edge highlight remains a 1px line — no thickness change at any breakpoint. |

No layout changes between breakpoints — the iteration only changes opacities, adds a 1px pseudo-element, adds an eyebrow block, and changes a CSS background string.

## AI Safety Considerations

N/A — This iteration is pure visual tuning. No AI-generated content, no free-text user input, no crisis-detection-relevant surfaces.

## Auth & Persistence

- **Logged-out users:** No state changes vs. pilot. BibleLanding renders the correct branch from `useLastRead()` and `useActivePlan()` localStorage reads.
- **Logged-in users:** Same as above.
- **localStorage usage:** No new keys. Existing keys read by the affected components (`wr_bible_last_read`, `bible:plans`, `bible:bookmarks`) are unchanged.

## Completion & Navigation

N/A — BibleLanding is not a Daily Hub tab and has no completion-tracking signal. The "Read in context" link on VOTD already exists and continues to navigate to `/bible/<book>/<chapter>` unchanged.

## Design Notes

- All changes layer on top of the FrostedCard tier system, BackgroundCanvas, and `gradient` Button variant shipped by the pilot. The pilot's tokens (`violet-*` ramp, `frosted-*` shadows, `gradient-button*` shadows) are unchanged — this iteration adds NO new tokens.
- The eyebrow + leading-dot pattern is the editorial element from the FPU/Lovable reference that was missing in the pilot. The dot color follows the variant: violet for accent, white for default.
- The accent top-edge highlight uses `via-white/[0.10]` — intentionally faint. This is the visual trick that makes accent cards feel three-dimensional; cranking the opacity higher would read as a stripe rather than a catch-of-light.
- The three-layer BackgroundCanvas composition is calibrated: violet bloom at 10% opacity (warmth without competing with HorizonGlow on `/daily`), middle radial darkening at 65% (up from 55% in the pilot), and the linear gradient picks up a `#120A1F` top-left shoulder so the canvas isn't perfectly flat.
- The pilot's `BackgroundCanvas` is BibleLanding-only. `/daily`'s `HorizonGlow` is unaffected — confirm via regression check.
- VerseOfTheDay's existing skeleton already uses `variant="default"` (the new prop default in the spec); the loaded card now adopts `variant={variant}` from the new prop. The skeleton stays default-tier whether the loaded card would be accent or default — skeletons don't need to be dramatic.
- This iteration is BibleLanding-only. Do NOT migrate other pages to use the new opacity values, eyebrow prop, or canvas composition in this spec.

## Out of Scope

- **The "Your Study Bible" headline typography** — will revisit in a separate iteration after these six fixes land.
- **Padding inside cards** — `p-6` accent/default and `p-5` subdued remain unchanged. Will revisit if needed.
- **Card corner radius** — `rounded-3xl` is correct, leave alone.
- **Gradient button size on ResumeReadingCard** — pre-existing inconsistency vs. ActivePlanBanner's larger CTA. Separate spec.
- **HorizonGlow on `/daily`** — must remain visible there; no change. This is a regression check, not a redesign target.
- **Migrating any other page beyond BibleLanding** — eyebrow prop and bumped opacities apply only to FrostedCard's API; rolling them out app-wide is a follow-up.
- **New tokens** — no Tailwind config changes. All values use existing tokens or arbitrary Tailwind opacity syntax (`bg-white/[0.07]`).

## Acceptance Criteria

- [ ] FrostedCard default tier renders with `bg-white/[0.07]` background and `border-white/[0.12]` border (verified via test class-string assertion).
- [ ] FrostedCard subdued tier renders with `bg-white/[0.05]` background and `border-white/[0.10]` border.
- [ ] FrostedCard accent tier renders with `bg-violet-500/[0.08]` background and `border-violet-400/70` border.
- [ ] FrostedCard default hover renders with `hover:bg-white/[0.10]`; accent hover renders with `hover:bg-violet-500/[0.13]`.
- [ ] FrostedCard accent tier renders a `:before` pseudo-element with `before:bg-gradient-to-r before:from-transparent before:via-white/[0.10] before:to-transparent` and `before:rounded-t-3xl` (verified via class-string assertion). Default and subdued tiers do NOT render this pseudo-element.
- [ ] FrostedCard accepts `eyebrow?: string` and `eyebrowColor?: 'violet' | 'white'` props. When `eyebrow` is provided, an eyebrow block (dot + label) renders above `children`. When omitted, no eyebrow block renders.
- [ ] Accent tier eyebrow uses `text-violet-300` for the label and `bg-violet-400` for the dot (with no `eyebrowColor` override).
- [ ] Default tier eyebrow uses `text-white/50` for the label and `bg-white/40` for the dot (with no `eyebrowColor` override).
- [ ] VerseOfTheDay accepts `variant?: 'accent' | 'default'`, defaulting to `'accent'`. Both the loaded card and the skeleton pass the prop through to their `FrostedCard` (skeleton may hardcode `'default'`).
- [ ] VerseOfTheDay's existing handwritten eyebrow span (`<span className="text-xs font-medium uppercase tracking-widest text-white/50">Verse of the Day</span>`) is removed; the FrostedCard `eyebrow="Verse of the Day"` prop replaces it.
- [ ] BibleHeroSlot passes `variant="default"` to `<VerseOfTheDay />` in branches 1 (active plan) and 2 (active reader).
- [ ] BibleHeroSlot passes no variant prop (or explicit `variant="accent"`) to `<VerseOfTheDay />` in branches 3 (lapsed reader) and 4 (first-time reader).
- [ ] ActivePlanBanner passes `eyebrow="Today's reading"` to its `FrostedCard` and removes the existing handwritten "You're on a plan" paragraph.
- [ ] ResumeReadingCard passes `eyebrow="Pick up where you left off"` to its `FrostedCard` and removes the existing handwritten "Continue reading" paragraph.
- [ ] BackgroundCanvas inline `style.background` matches the three-layer composition: top violet bloom `radial-gradient(ellipse 50% 35% at 50% 20%, rgba(167,139,250,0.10) 0%, transparent 60%)`, middle darkening `radial-gradient(ellipse 70% 55% at 60% 50%, rgba(0,0,0,0.65) 0%, transparent 70%)`, base `linear-gradient(135deg, #120A1F 0%, #08051A 50%, #0A0814 100%)`.
- [ ] `pnpm typecheck` passes (no `any`, no unused imports, no signature drift).
- [ ] `pnpm test` passes — all updated tests reflect the new values; new tests cover eyebrow rendering (4 cases), top-edge highlight (1 case), and updated tier values.
- [ ] **Regression — `/daily` still renders HorizonGlow.** Open `/daily` and visually confirm the atmospheric glow layer is still present. The five purple/lavender blobs at vertical positions 5%/15%/35%/60%/85% should be visible.
- [ ] **Manual eyeball — `/bible`:** VOTD is visibly purple-bordered when it's the only card (branches 3 and 4). Cards visibly lift off the canvas — the surface is darker than the cards, not the other way around. Eyebrows have visible colored dots leading their uppercase labels. The canvas has perceivable spatial depth: a faint warm tint at the top, dark spotlight in the middle, and slightly lighter top-left shoulder.
