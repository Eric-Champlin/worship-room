# BB-33: Animations & Micro-Interactions

**Master Plan Reference:** N/A — standalone polish spec. Part of the Bible Redesign wave (BB-30 through BB-46), but no shared data model or master plan document.

**Branch:** `bible-redesign` (all work commits directly here)

**Depends on:** BB-30 through BB-46 (feature wave substantially complete), Tailwind CSS configuration (in place), `prefers-reduced-motion` support (partial, inconsistent)

**Hands off to:** BB-34 (Empty states & first-run), BB-35 (Accessibility audit), BB-36 (Performance), BB-37 (Code health)

---

## Overview

Worship Room's brand depends on users feeling like the app is a quiet, safe place. Animation is one of the places where "no animation" and "too much animation" are both wrong — the app currently has animations scattered inconsistently across components with hardcoded durations, mixed easings, and incomplete `prefers-reduced-motion` support. BB-33 establishes a small, opinionated set of animation primitives, applies them consistently across every animated component, adds a handful of new micro-interactions where the absence makes the app feel unresponsive, and ensures universal accessibility compliance for users with vestibular sensitivities.

## User Story

As a **logged-in user or logged-out visitor**, I want the app's transitions and interactions to feel calm and intentional so that navigating Worship Room reinforces the sense of sanctuary rather than feeling jarring or anxious.

As a **user with vestibular sensitivity**, I want all animations to respect my `prefers-reduced-motion` system setting so that the app doesn't cause discomfort.

## Requirements

### Functional Requirements

#### 1. Animation Token System

1. A new file at `frontend/src/constants/animation.ts` exports canonical animation values as TypeScript constants:
   - `ANIMATION_DURATIONS`: `instant` (0ms), `fast` (150ms), `base` (250ms), `slow` (400ms)
   - `ANIMATION_EASINGS`: `standard` (`cubic-bezier(0.4, 0, 0.2, 1)`), `decelerate` (`cubic-bezier(0, 0, 0.2, 1)`), `accelerate` (`cubic-bezier(0.4, 0, 1, 1)`), `sharp` (`cubic-bezier(0.4, 0, 0.6, 1)`)
2. `tailwind.config.js` is extended with the same tokens under `theme.extend.transitionDuration` and `theme.extend.transitionTimingFunction` so Tailwind utilities like `duration-base`, `ease-decelerate` work in className strings
3. Every component that currently uses hardcoded `duration-300`, `ease-in-out`, or custom cubic-bezier values is migrated to use these canonical tokens

#### 2. Reusable Keyframes CSS

4. A new CSS file at `frontend/src/styles/animations.css` (imported from the main entry point) defines reusable `@keyframes`:
   - `fade-in` — opacity 0 to 1, `base` duration, `decelerate` easing
   - `fade-in-up` — opacity 0 to 1 + translateY 8px to 0, `base` duration, `decelerate` easing
   - `fade-out` — opacity 1 to 0, `fast` duration, `accelerate` easing
   - `scale-in` — opacity 0 to 1 + scale 0.96 to 1, `base` duration, `decelerate` easing (modals/popovers)
   - `slide-up` — translateY 100% to 0, `base` duration, `decelerate` easing (bottom sheets/toasts)
   - `shimmer` — horizontal gradient shift over 1.5s, infinite (loading skeletons only)
5. Each keyframe has a matching Tailwind utility class (`animate-fade-in`, `animate-fade-in-up`, etc.) registered in the Tailwind config

#### 3. Universal Reduced Motion Support

6. A global `@media (prefers-reduced-motion: reduce)` rule in `animations.css` disables all animations and transitions as a safety net:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
7. The loading shimmer animation is exempted from the reduced-motion disable rule — uses 300ms duration with reduced contrast under reduced motion (fully disabling shimmer makes loading states look frozen)
8. Every animated element in the codebase has the appropriate `motion-reduce:` Tailwind variant as a per-component safeguard

#### 4. Component Audit & Token Migration

9. A complete audit of every animated component in the codebase is produced during recon and documented in `_plans/recon/bb33-animation-audit.md`
10. Every hardcoded animation duration, easing, and cubic-bezier across the codebase is replaced with the canonical tokens
11. Every animated element gets the appropriate `motion-reduce:` Tailwind variant

#### 5. New Micro-Interactions

12. **Button press feedback:** All interactive buttons get `active:scale-[0.98] transition-transform duration-fast` — a 2% scale-down on press that lasts 150ms. Nearly subliminal but its absence makes mobile interactions feel dead.
13. **Focus ring transitions:** Focus rings get `transition-shadow duration-fast` so they fade in smoothly when keyboard focus lands on an element (accessibility improvement — makes focus location easier to track)
14. **Route transitions:** A subtle opacity fade between routes (150ms fade-out, 150ms fade-in) implemented via React Router wrapper or equivalent. If all approaches prove too fiddly during the plan phase (> 30 minutes debugging), defer to a follow-up and ship the rest of BB-33 without it.
15. **Toast entrances:** Toast appearances use `animate-slide-up` with reduced-motion fallback. The existing `Toast.tsx` component and `useToast()` hook are updated.
16. **Modal/dialog entrances:** Modal appearances use `animate-scale-in` with backdrop fade-in. The existing `AuthModal.tsx` and any other modals are updated.
17. **Accordion/collapse transitions:** Expand-collapse elements get a height transition using CSS Grid (`grid-template-rows: 0fr` to `1fr`) — the modern CSS-only solution.

#### 6. Existing Animation Preservation & Cleanup

18. The BB-45 memorization card 3D flip stays exactly as-is but its duration and easing reference the canonical tokens
19. The BB-43 reading heatmap and progress map have zero animation (verified, not regressed)
20. All loading skeletons across the app use the standardized shimmer animation with consistent duration and opacity
21. Any existing parallax, scroll-triggered, counter tick-up, or celebration animations are removed
22. The BB-40 cinematic home page hero is verified static — any pre-existing animation removed
23. The existing `PageTransition.tsx` was already removed (documented in 09-design-system.md) — BB-33 does not re-add it; route transitions use a new lightweight approach
24. Existing `BibleLandingOrbs` are left as-is unless recon shows aggressive animation, in which case they are toned down

### Non-Functional Requirements

- **Performance:** Lighthouse performance score must not regress after BB-33 ships (measured against pre-BB-33 baseline). All animations use `transform` and `opacity` only (compositor-friendly, no layout thrashing). No animation longer than 400ms except loading shimmer.
- **Accessibility:** Universal `prefers-reduced-motion` support via global CSS safety net + per-component `motion-reduce:` variants. Focus ring transitions improve keyboard navigation tracking.
- **Bundle size:** Zero new npm packages. CSS + Tailwind only.

## Auth Gating

BB-33 is a visual polish pass with no new interactive features. No new auth gates are introduced.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View animations | All animations visible to everyone | Same | N/A |
| Button press feedback | Works for all interactive buttons | Same | N/A |
| Route transitions | Works on all route changes | Same | N/A |

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | All animations apply. Button press feedback especially important for touch interactions. Glow orb sizes in HorizonGlow/GlowBackground already scale down per existing rules. |
| Tablet (640-1024px) | Same animation tokens. No breakpoint-specific animation differences. |
| Desktop (> 1024px) | Same animation tokens. Hover states on interactive FrostedCards use token-based transition durations. |

No elements stack, hide, resize, or change animation behavior between breakpoints. The animation token system is viewport-agnostic.

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** All animations are visible. Zero persistence — no data saved.
- **Logged-in users:** All animations are visible. Zero persistence — no data saved.
- **localStorage usage:** Zero new keys. `prefers-reduced-motion` is read from the OS/browser, not stored.
- **Route type:** N/A — BB-33 modifies existing routes, does not add new ones.

## Completion & Navigation

N/A — BB-33 is a visual polish layer, not a feature with completion tracking.

## Design Notes

- **Animation brand:** Calm, intentional, settling. Entrance animations are short and subtle. Interactive feedback is immediate and small. Nothing should feel like it's performing.
- **Duration ceiling:** 400ms maximum for any non-loading animation. Most interactions use `fast` (150ms). Entrances use `base` (250ms).
- **Easing choices:** `decelerate` for entrances (things coming in), `accelerate` for exits (things going out), `standard` for most transitions, `sharp` for hover states and quick feedback. These match Material Design's standard curves.
- **Existing components referenced:**
  - `FrostedCard` (09-design-system.md) — hover transitions use token-based durations
  - `Toast.tsx` / `useToast()` — entrance animation updated to `animate-slide-up`
  - `AuthModal.tsx` — entrance animation updated to `animate-scale-in`
  - `DevotionalPreviewPanel.tsx` — existing 300ms max-height animation migrated to tokens
  - `AudioDrawer.tsx` — existing `animate-drawer-slide-in` / `animate-bottom-sheet-slide-in` migrated to tokens
  - `DailyAmbientPillFAB.tsx` — existing `transition-opacity duration-200` migrated to tokens
  - All 13 skeleton components — shimmer animation standardized
  - `BibleLandingOrbs` — verified and left as-is (unless aggressive)
- **Design system recon:** `_plans/recon/design-system.md` exists and should be referenced during planning for exact CSS values
- **Existing animation registrations in tailwind.config.js** (from 09-design-system.md): `animate-cursor-blink`, `animate-dropdown-in`, `animate-slide-from-right`, `animate-slide-from-left`, `animate-golden-glow`, `animate-breathe-expand`, `animate-breathe-contract`, `animate-fade-in` (currently 500ms — should be migrated to `base` = 250ms), `animate-confetti-fall`, `animate-drawer-slide-in`, `animate-bottom-sheet-slide-in`. These are migrated to use canonical tokens where appropriate.
- **New patterns:** The animation token system (`constants/animation.ts` + `styles/animations.css`) is a new architectural pattern not yet captured in the design system. The plan phase should document it for future use.

## What BB-33 Explicitly Does NOT Do

- No parallax effects (vestibular discomfort, off-brand)
- No scroll-triggered animations (contradicts Worship Room's calm)
- No hero section animations (home page hero is static)
- No counter tick-up effects (data, not a game score)
- No celebration animations beyond what exists (no confetti, burst, fireworks additions)
- No custom cubic-bezier curves beyond the four canonical easings
- No animation on BB-43 heatmap or progress map (spec was explicit)
- No Framer Motion or other animation libraries (CSS + Tailwind only)
- No animated backgrounds or shimmering gradients
- No page turn animations in the Bible reader
- No icon animations on load
- No state-change animations on bookmark/favorite icons (instant toggle)
- No changes to BB-45 flip card mechanism beyond token references
- No new npm packages
- No new auth gates, no new localStorage keys
- No changes to BibleLandingOrbs unless recon shows aggressive animation

## Out of Scope

- Light mode animation variants (deferred to Phase 4)
- Backend animation-related config or preferences API
- View Transitions API (browser support still shaky in Safari — may revisit in Phase 4)
- Animation preferences UI in Settings page (OS-level `prefers-reduced-motion` is sufficient)
- Framer Motion or any animation library integration
- Per-user animation speed preferences
- Any changes to the BB-43 ReadingHeatmap or BibleProgressMap (zero animation by spec)

## Acceptance Criteria

### Token System
- [ ] `frontend/src/constants/animation.ts` exports `ANIMATION_DURATIONS` (instant/fast/base/slow) and `ANIMATION_EASINGS` (standard/decelerate/accelerate/sharp) as TypeScript `const` objects
- [ ] `tailwind.config.js` `theme.extend.transitionDuration` includes `instant: '0ms'`, `fast: '150ms'`, `base: '250ms'`, `slow: '400ms'`
- [ ] `tailwind.config.js` `theme.extend.transitionTimingFunction` includes `standard`, `decelerate`, `accelerate`, `sharp` with matching cubic-bezier values

### Keyframes CSS
- [ ] `frontend/src/styles/animations.css` defines `@keyframes` for: `fade-in`, `fade-in-up`, `fade-out`, `scale-in`, `slide-up`, `shimmer`
- [ ] Each keyframe has a matching Tailwind utility class registered via the config
- [ ] `animations.css` is imported from the main entry point (`index.css` or equivalent)

### Reduced Motion
- [ ] Global `@media (prefers-reduced-motion: reduce)` rule in `animations.css` sets `animation-duration: 0ms`, `transition-duration: 0ms`, `scroll-behavior: auto` on `*, *::before, *::after`
- [ ] Loading shimmer animation uses 300ms duration with reduced contrast under `prefers-reduced-motion: reduce` (exempted from the global disable)
- [ ] Every animated element in the codebase has a `motion-reduce:` Tailwind variant

### Component Audit
- [ ] `_plans/recon/bb33-animation-audit.md` documents every animated element in the codebase with before/after state
- [ ] Every hardcoded `duration-*`, `ease-*`, and custom cubic-bezier is replaced with canonical tokens
- [ ] No animation in the codebase uses a duration longer than 400ms except loading shimmer (1.5s)

### Micro-Interactions
- [ ] All interactive buttons across the app have `active:scale-[0.98] transition-transform duration-fast`
- [ ] Focus rings use `transition-shadow duration-fast` for smooth appearance on keyboard focus
- [ ] Route transitions use a subtle opacity fade (150ms out, 150ms in) between pages — OR this is explicitly deferred with documentation if all approaches proved too fiddly
- [ ] Toast appearances use `animate-slide-up` with reduced-motion fallback
- [ ] Modal/dialog appearances use `animate-scale-in` with backdrop fade-in
- [ ] Accordion/collapse elements use CSS Grid row transition (`grid-template-rows: 0fr` to `1fr`)

### Preservation & Cleanup
- [ ] BB-45 memorization card flip uses canonical tokens for duration/easing but mechanism is unchanged
- [ ] BB-43 ReadingHeatmap has zero animation (verified, not regressed)
- [ ] BB-43 BibleProgressMap has zero animation (verified, not regressed)
- [ ] All loading skeletons use the standardized shimmer animation
- [ ] BB-40 home page hero is static (verified, any animation removed)
- [ ] No parallax, scroll-triggered, or counter tick-up animations exist in the codebase

### Tests
- [ ] All BB-30 through BB-46 tests continue to pass unchanged
- [ ] At least 15 unit tests verify animation token constants are exported correctly and match Tailwind config values
- [ ] At least 10 component tests verify animations respect `prefers-reduced-motion` (using `matchMedia` mock)
- [ ] An integration test verifies route transition fade between pages (or verifies the deferral if approach was too fiddly)
- [ ] An integration test verifies toast appearance uses slide-up and respects reduced motion

### Quality Gates
- [ ] No TypeScript errors, no new lint warnings
- [ ] Zero new auth gates, zero new localStorage keys, zero new npm packages
- [ ] Lighthouse performance score does not regress (measured against pre-BB-33 baseline)
- [ ] A Playwright visual audit confirms no animation appears when `prefers-reduced-motion: reduce` is set

## Notes for Plan Phase

- **The audit is the longest step.** Step 1 should be a grep pass for `transition-`, `animate-`, `@keyframes`, `duration-`, `ease-` across the entire codebase. Enumerate every animated element before replacing any values.
- **Route transitions are the riskiest addition.** The previous `PageTransition.tsx` was removed because it caused route flicker/white flash. The plan phase should pick one approach (React Router wrapper with opacity transition, layout key swap, or View Transitions API) and prototype it. If any approach takes > 30 minutes of debugging, defer route transitions to a follow-up and ship the rest.
- **Button press feedback is the highest-impact micro-interaction.** If only one new interaction ships, it should be this one.
- **Don't add animations to heatmap or progress map.** BB-43's spec was explicit.
- **Shimmer is the only long-running animation allowed.** Everything else is under 400ms.
- **Lighthouse comparison at the end is not optional.** Capture the baseline before execution starts.
- **Pre-existing failing tests are NOT touched.** Same posture as every spec in the wave.
- **Stay on `bible-redesign` branch.** No new branch, no merge.
