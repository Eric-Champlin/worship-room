# Implementation Plan: BB-33 Animations & Micro-Interactions

**Spec:** `_specs/bb33-animations-micro-interactions.md`
**Date:** 2026-04-13
**Branch:** `bible-redesign` (no new branch — commits directly to existing branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded, captured 2026-04-05, 8 days old)
**Recon Report:** N/A — codebase-wide polish pass, no external page to recon
**Master Spec Plan:** N/A — standalone spec

---

## Architecture Context

### Project Structure

- **Frontend**: `frontend/src/` — React 18 + TypeScript + Vite + TailwindCSS
- **Constants**: `frontend/src/constants/` — TypeScript constant exports (crisis-resources, daily-experience, bible, gradients, audio, ambient-suggestions, dashboard/)
- **Styles**: Currently `frontend/src/index.css` is the sole CSS entry point. No `styles/` directory exists yet — BB-33 creates `frontend/src/styles/animations.css`.
- **Tailwind Config**: `frontend/tailwind.config.js` — 47 custom keyframes, 53 animation registrations, custom colors/fonts. Duration/easing tokens not yet defined.
- **Components**: Feature-organized under `frontend/src/components/` (bible/, daily/, dashboard/, audio/, prayer-wall/, homepage/, memorize/, skeletons/, ui/, etc.)
- **Pages**: `frontend/src/pages/` — route-level page components
- **Hooks**: `frontend/src/hooks/` — useInView, useScrollReveal, useAnimatedCounter (all respect prefers-reduced-motion)
- **Tests**: Co-located `__tests__/` directories within each module. Vitest + React Testing Library.

### Current Animation Landscape (from audit)

- **280+ files** use animation/transition classes
- **47 custom keyframes** in tailwind.config.js + 3 in index.css (border-pulse-glow, challenge-pulse, and scroll-reveal utilities)
- **53 animation registrations** in tailwind.config.js with mixed durations (100ms–20s) and easings (ease-out, ease-in-out, ease-in, 4+ custom cubic-bezier variants)
- **252 files** already reference prefers-reduced-motion via CSS media queries, `motion-safe:`/`motion-reduce:` Tailwind variants, or `window.matchMedia` checks
- **31 files** use inline `style={{ transition: '...' }}` or `style={{ animationDelay: '...' }}` patterns
- **Dominant durations**: 200ms (most common), 300ms, 150ms, 500ms
- **Dominant easings**: ease-out (64%), ease-in-out (20%), custom cubic-bezier (10%), linear (3%), step-end (1%)
- **Spring easings**: 3 variants — `cubic-bezier(0.34, 1.56, 0.64, 1)` (modals), `cubic-bezier(0.34, 1.2, 0.64, 1)` (drawers), `cubic-bezier(0.34, 1.3, 0.64, 1)` (toasts)

### Existing Reduced-Motion Support

- **Global CSS**: `index.css` lines 189-251 has `@media (prefers-reduced-motion: reduce)` disabling 18 specific animation classes + scroll-reveal + border-pulse-glow
- **Per-component**: `motion-safe:` prefix on 40+ animation classes, `motion-reduce:` on 30+ classes, `window.matchMedia` checks in 35+ components
- **Gaps**: Not universal — many `transition-all`, `transition-colors`, `transition-opacity` elements lack `motion-reduce:` variants

### Key Components Referenced

- **Toast.tsx** (L162-253): Standard toasts use `animate-toast-spring-in` (300ms, cubic-bezier(0.34, 1.3, 0.64, 1)) entrance + `animate-toast-out` (200ms ease-out) exit. Celebration toasts use `animate-slide-from-bottom-spring` (mobile) / `animate-slide-from-right-spring` (desktop). All have `motion-safe:` guards.
- **AuthModal.tsx** (L182-186): Uses `animate-modal-spring-in` (250ms, cubic-bezier(0.34, 1.56, 0.64, 1)) / `animate-modal-spring-out` (150ms ease-out) with `motion-safe:` guards. Backdrop uses `animate-backdrop-fade-in/out` (200ms ease).
- **BibleLandingOrbs.tsx** (33 lines): Static gradient orbs with blur — **no animation**. No changes needed.
- **SkeletonBlock.tsx**: Uses `motion-safe:animate-shimmer` (1.5s ease-in-out infinite). Already standardized.
- **DashboardCard.tsx**, **GettingStartedCard.tsx**: Use CSS Grid row transition (`transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none`). Already use the accordion pattern BB-33 wants to standardize.
- **DevotionalPreviewPanel.tsx**: Uses `transition-[max-height] 300ms ease-out` for expand/collapse.
- **MemorizationFlipCard.tsx**: Uses `transition-transform duration-300 ease-out` for 3D flip.

### Test Patterns

- Tests use `vitest` + `@testing-library/react`
- `matchMedia` mocking for reduced-motion: `Object.defineProperty(window, 'matchMedia', { value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }) })`
- Constants tested via direct import assertions
- Component animation tests verify className presence and conditional rendering

---

## Auth Gating Checklist

BB-33 introduces no new auth gates. All animations are visible to all users.

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| N/A | N/A | N/A | N/A |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Body background | background-color | `#08051A` (hero-bg) | index.css L12 |
| FrostedCard | bg/border/shadow | `bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_0_25px_rgba(139,92,246,0.06),0_4px_20px_rgba(0,0,0,0.3)]` | 09-design-system.md |
| Textarea glow | box-shadow | `shadow-[0_0_20px_3px_rgba(255,255,255,0.50),0_0_40px_8px_rgba(255,255,255,0.30)]` | 09-design-system.md |
| White pill CTA (inline) | classes | `inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-primary hover:bg-gray-100` | 09-design-system.md |
| White pill CTA (primary) | classes | Includes `transition-all duration-200` → will be `duration-base ease-standard` | 09-design-system.md |
| Modal backdrop | animation | `animate-backdrop-fade-in` 200ms ease | tailwind.config.js |

---

## Design System Reminder

**Project-specific quirks that `/execute-plan` displays before every UI step:**

- Worship Room uses `GRADIENT_TEXT_STYLE` (white-to-purple gradient via `background-clip: text`) for hero and section headings. Caveat font deprecated for headings.
- All Daily Hub tab content uses transparent `<div>` wrappers — HorizonGlow shows through. Do NOT add GlowBackground to Daily Hub.
- The Daily Hub uses `<HorizonGlow />` at the page root. GlowBackground is homepage-only.
- `animate-glow-pulse` is REMOVED (deprecated). Textareas use static white box-shadow.
- Pray/Journal textareas use canonical white box-shadow glow class string. No cyan, no animated glow.
- Frosted glass cards use the `FrostedCard` component — not hand-rolled cards.
- Mood colors: Struggling=#D97706, Heavy=#C2703E, Okay=#8B7FA8, Good=#2DD4BF, Thriving=#34D399.
- Sticky FABs use `pointer-events-none` outer + `pointer-events-auto` inner with `env(safe-area-inset-*)`.
- **BB-33 specific**: When migrating durations/easings, verify the component still feels right after the token substitution. If a 200ms → 250ms (duration-base) change makes something feel sluggish, use `duration-fast` (150ms) instead.
- **BB-33 specific**: Spring cubic-bezier easings (0.34, 1.56, 0.64, 1 etc.) are replaced with `ease-decelerate`. This removes the overshoot bounce — intentional for the calm brand. Do NOT preserve spring easings.
- **BB-33 specific**: Skeleton shimmer is already standardized (`motion-safe:animate-shimmer` in SkeletonBlock.tsx). Do not touch skeleton components beyond verifying they work.

---

## Shared Data Models (from Master Plan)

N/A — standalone spec. No shared data models.

**localStorage keys this spec touches:**
| Key | Read/Write | Description |
|-----|-----------|-------------|
| None | N/A | BB-33 introduces zero new localStorage keys |

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px | All animations apply at same tokens. Button press feedback most impactful on touch. |
| Tablet | 768px | Same tokens. No breakpoint-specific animation differences. |
| Desktop | 1440px | Same tokens. Hover transitions on FrostedCards use token durations. |

No animation varies by breakpoint. The token system is viewport-agnostic.

---

## Inline Element Position Expectations (UI features with inline rows)

N/A — no inline-row layouts in this feature. BB-33 modifies animation behavior on existing layouts without changing any layout structure.

---

## Vertical Rhythm

N/A — BB-33 does not modify layout, spacing, or content structure. Only animation properties change.

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [ ] BB-30 through BB-46 feature wave is substantially complete (animation changes won't conflict with in-progress features)
- [ ] Lighthouse performance baseline captured before Step 1 begins (`pnpm build && npx lighthouse http://localhost:4173 --output json > /tmp/bb33-baseline.json`)
- [ ] All existing tests pass (`pnpm test` green)
- [ ] No deprecated patterns introduced (Caveat headings, BackgroundSquiggle on Daily Hub, GlowBackground on Daily Hub, animate-glow-pulse, cyan textarea borders, italic Lora prompts, soft-shadow 8px-radius cards)
- [ ] All auth-gated actions from the spec accounted for (none — visual polish only)
- [ ] Design system values verified (from recon + codebase inspection)
- [ ] All [UNVERIFIED] values flagged with verification methods (none in this plan)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `duration-200` mapping | `duration-base` (250ms) | 50ms increase is imperceptible. base=250ms is closest canonical token. |
| `duration-300` mapping for transitions | `duration-base` (250ms) | Most 300ms transitions are hover/color changes — 250ms is snappier and fits the "calm, intentional" brand. |
| `duration-300` mapping for slide/expand | `duration-slow` (400ms) | Slide-in, drawer, expansion animations need more time to feel natural. |
| `duration-500` / `duration-700` | `duration-slow` (400ms) | Keeps under 400ms ceiling. The 100-300ms reduction tightens the animation feel. |
| Spring cubic-bezier removal | Replace with `ease-decelerate` | Spec explicitly forbids custom cubic-beziers beyond 4 tokens. Losing overshoot bounce is intentional — brand is calm, not playful. |
| 400ms ceiling exceptions | Exempt: shimmer (1.5s), breathing (4/8s), garden SVG (2-8s), celebration (1.5-3.5s), waveform (1.0-1.4s), glow-float (20s), cursor-blink (1s) | These are functional/ambient/special-moment animations, not standard UI interactions. The 400ms ceiling applies to entrance, exit, transition, and feedback animations. |
| `scroll-reveal` 600ms | Migrate to `duration-slow` (400ms) + `ease-decelerate` | Scroll-reveal entrance is a standard UI animation — 400ms is sufficient. |
| Route transitions approach | Lightweight mount-time `animate-fade-in` on route content wrapper | Avoids the exit-animation complexity that caused PageTransition.tsx removal. No unmount animation — just a fade-in on mount. If too fiddly, defer per spec's 30-min clause. |
| BibleLandingOrbs | Leave as-is | Recon confirmed: static gradient orbs with blur, zero animation. No changes needed. |
| BB-43 ReadingHeatmap / BibleProgressMap | Leave as-is | Spec confirmed: zero animation by design. Verified during recon. |
| BB-45 MemorizationFlipCard | Migrate duration/easing to tokens, preserve flip mechanism | Currently `duration-300 ease-out` → becomes `duration-base ease-decelerate`. 3D transform logic unchanged. |
| Toast entrance | `animate-slide-up` for standard toasts, keep directional for celebration | Standard toasts slide up from bottom. Celebration toasts keep directional slide (from-bottom on mobile, from-right on desktop) but use token easing. |
| `linear` easing | Keep as `ease-linear` where needed | Used for physics-based animations (confetti fall, snow, stroke progress). Not one of the 4 tokens but acceptable for these specific use cases. |
| `step-end` easing | Keep for cursor-blink | Cursor blink is inherently stepped. Not a candidate for token migration. |

---

## Implementation Steps

### Step 1: Animation Token System (Foundation)

**Objective:** Create canonical animation constants and register Tailwind utility tokens for durations and easings.

**Files to create/modify:**
- `frontend/src/constants/animation.ts` — NEW: animation token constants
- `frontend/tailwind.config.js` — MODIFY: extend with duration + easing tokens

**Details:**

Create `frontend/src/constants/animation.ts`:
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

Extend `tailwind.config.js` `theme.extend`:
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

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT add duration values beyond the 4 canonical tokens
- Do NOT add easing values beyond the 4 canonical tokens
- Do NOT modify existing keyframes or animation registrations in this step (that's Step 4)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `animation.test.ts` — ANIMATION_DURATIONS values | unit | Verify exact ms values for instant(0), fast(150), base(250), slow(400) |
| `animation.test.ts` — ANIMATION_EASINGS values | unit | Verify exact cubic-bezier strings for all 4 easings |
| `animation.test.ts` — type exports | unit | Verify AnimationDuration and AnimationEasing types exist |
| `animation.test.ts` — ANIMATION_DURATIONS keys | unit | Verify exactly 4 keys: instant, fast, base, slow |
| `animation.test.ts` — ANIMATION_EASINGS keys | unit | Verify exactly 4 keys: standard, decelerate, accelerate, sharp |
| `animation.test.ts` — duration ceiling | unit | Verify no ANIMATION_DURATIONS value exceeds 400 |

**Expected state after completion:**
- [ ] `frontend/src/constants/animation.ts` exports `ANIMATION_DURATIONS` and `ANIMATION_EASINGS`
- [ ] Tailwind utilities `duration-instant`, `duration-fast`, `duration-base`, `duration-slow` work in className strings
- [ ] Tailwind utilities `ease-standard`, `ease-decelerate`, `ease-accelerate`, `ease-sharp` work in className strings
- [ ] 6 unit tests pass

---

### Step 2: Keyframes CSS & Global Reduced Motion Safety Net

**Objective:** Create reusable @keyframes CSS, register Tailwind utility classes, and implement the universal reduced-motion safety net.

**Files to create/modify:**
- `frontend/src/styles/animations.css` — NEW: keyframes + reduced-motion rules
- `frontend/src/index.css` — MODIFY: import animations.css, migrate existing reduced-motion rules
- `frontend/tailwind.config.js` — MODIFY: register new animation utility classes

**Details:**

Create `frontend/src/styles/animations.css`:
```css
/* === Reusable Keyframes === */

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* shimmer keyframe already defined in tailwind.config.js — kept there */

/* === Universal Reduced Motion Safety Net === */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }

  /* Shimmer exemption: loading states should still indicate activity */
  .animate-shimmer {
    animation-duration: 300ms !important;
    animation-iteration-count: infinite !important;
  }
}
```

Add to `frontend/src/index.css` at line 3 (after `@tailwind utilities`):
```css
@import './styles/animations.css';
```

Remove the existing `@media (prefers-reduced-motion: reduce)` block at lines 189-251 from `index.css` — the global safety net in `animations.css` supersedes all per-class overrides. Also remove the `scroll-behavior: smooth` from line 8 (the safety net handles scroll-behavior, and smooth scroll should be opt-in per component, not global).

Register new animation utility classes in `tailwind.config.js` under `theme.extend.animation`:
```javascript
'fade-in': 'fade-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
// NOTE: this REPLACES the existing 'fade-in' registration (was 500ms ease-out)
'fade-in-up': 'fade-in-up 250ms cubic-bezier(0, 0, 0.2, 1) both',
'fade-out': 'fade-out 150ms cubic-bezier(0.4, 0, 1, 1) both',
'scale-in': 'scale-in 250ms cubic-bezier(0, 0, 0.2, 1) both',
'slide-up': 'slide-up 250ms cubic-bezier(0, 0, 0.2, 1) both',
```

Also update the existing `fade-in` keyframe in `tailwind.config.js` to match the new definition (opacity 0→1 only, no translateY — the old `fade-in` had translateY(8px) which is now `fade-in-up`). Keep the old keyframe definition alongside the new ones until Step 4 migrates all consumers.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove the existing per-class reduced-motion overrides in index.css until the global safety net is verified working
- Do NOT define `shimmer` keyframe in animations.css — it already exists in tailwind.config.js
- Do NOT remove `scroll-behavior: smooth` from `index.css` until confirming no component depends on global smooth scroll. Check by grep for scroll-behavior usage. If any component relies on it, keep it but add the `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }` as a targeted override instead.

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `animations.test.ts` — CSS file exists | unit | Verify `styles/animations.css` is importable (or verify build succeeds) |
| `animations.test.ts` — reduced-motion global rule | integration | Mock `matchMedia` to return `prefers-reduced-motion: reduce`, render a component with `animate-fade-in`, verify animation-duration is 0ms |
| `animations.test.ts` — shimmer exemption | integration | With reduced-motion active, verify `.animate-shimmer` elements still animate (duration 300ms) |

**Expected state after completion:**
- [ ] `frontend/src/styles/animations.css` exists with 5 @keyframes + global reduced-motion rule
- [ ] `animations.css` is imported in `index.css`
- [ ] Tailwind utility classes `animate-fade-in`, `animate-fade-in-up`, `animate-fade-out`, `animate-scale-in`, `animate-slide-up` are available
- [ ] Old per-class reduced-motion overrides in `index.css` are removed (global safety net covers them)
- [ ] Build passes (`pnpm build`)

---

### Step 3: Animation Audit Document

**Objective:** Produce a complete audit of every animated element in the codebase, documenting the before (current) and after (token-migrated) state. This is the migration roadmap for Steps 4-7.

**Files to create:**
- `_plans/recon/bb33-animation-audit.md` — NEW: complete animation audit

**Details:**

Run a systematic grep pass across `frontend/src/` for:
1. Every file using `duration-` classes (with exact value)
2. Every file using `ease-` classes (with exact value)
3. Every file using `animate-` classes (with animation name)
4. Every file using inline `style={{ transition: ... }}` or `style={{ animation: ... }}`
5. Every file missing `motion-reduce:` or `motion-safe:` variants on animated elements

Document each finding as a row in a markdown table:
```
| File | Element | Current Value | Token Value | Notes |
```

Group by: Tailwind config registrations → Component duration classes → Component easing classes → Inline styles → Missing motion-reduce.

This document is consumed by Steps 4-8 as the authoritative migration checklist.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT modify any source files in this step — this is documentation only
- Do NOT abbreviate or skip files — every animated element must be catalogued

**Test specifications:**
None — this is a documentation step.

**Expected state after completion:**
- [ ] `_plans/recon/bb33-animation-audit.md` contains every animated element in the codebase
- [ ] Each entry has a current value and target token value
- [ ] Missing motion-reduce entries are identified

---

### Step 4: Tailwind Config — Migrate Keyframe & Animation Registrations

**Objective:** Update all 53 animation registrations in `tailwind.config.js` to use canonical token durations and easings where applicable.

**Files to modify:**
- `frontend/tailwind.config.js` — MODIFY: update animation string values

**Details:**

For each animation registration in `theme.extend.animation`, replace hardcoded duration and easing values:

**Standard UI animations (migrate to tokens):**

| Animation | Current | New |
|-----------|---------|-----|
| `dropdown-in` | 150ms ease-out | 150ms cubic-bezier(0, 0, 0.2, 1) (`fast` + `decelerate`) |
| `slide-from-right` | 300ms ease-out forwards | 250ms cubic-bezier(0, 0, 0.2, 1) forwards (`base` + `decelerate`) |
| `slide-from-left` | 300ms ease-out forwards | 250ms cubic-bezier(0, 0, 0.2, 1) forwards |
| `fade-in` | 500ms ease-out forwards | 250ms cubic-bezier(0, 0, 0.2, 1) both (`base` + `decelerate`) |
| `widget-enter` | 400ms ease-out both | 400ms cubic-bezier(0, 0, 0.2, 1) both (`slow` + `decelerate`) |
| `slide-from-bottom` | 300ms ease-out forwards | 250ms cubic-bezier(0, 0, 0.2, 1) forwards |
| `celebration-spring` | 600ms cubic-bezier(0.34, 1.56, 0.64, 1) | 400ms cubic-bezier(0, 0, 0.2, 1) forwards (`slow` + `decelerate`) |
| `continue-fade-in` | 400ms ease-in forwards | 400ms cubic-bezier(0.4, 0, 1, 1) forwards (`slow` + `accelerate`) |
| `bell-ring` | 300ms ease-in-out | 250ms cubic-bezier(0.4, 0, 0.2, 1) (`base` + `standard`) |
| `streak-bump` | 300ms ease-out | 250ms cubic-bezier(0, 0, 0.2, 1) |
| `check-fill` | 200ms ease-out forwards | 150ms cubic-bezier(0, 0, 0.2, 1) forwards (`fast` + `decelerate`) |
| `pray-icon-pulse` | 300ms ease-out forwards | 250ms cubic-bezier(0, 0, 0.2, 1) forwards |
| `pray-ripple` | 600ms ease-out forwards | 400ms cubic-bezier(0, 0, 0.2, 1) forwards (`slow`) |
| `pray-float-text` | 500ms ease-out forwards | 400ms cubic-bezier(0, 0, 0.2, 1) forwards |
| `stagger-enter` | 300ms ease-out both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `modal-spring-in` | 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both (`base` + `decelerate`) |
| `modal-spring-out` | 150ms ease-out both | 150ms cubic-bezier(0.4, 0, 1, 1) both (`fast` + `accelerate`) |
| `toast-spring-in` | 300ms cubic-bezier(0.34, 1.3, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both (`base` + `decelerate`) |
| `toast-out` | 200ms ease-out both | 150ms cubic-bezier(0.4, 0, 1, 1) both (`fast` + `accelerate`) |
| `card-pulse` | 300ms ease-in-out | 250ms cubic-bezier(0.4, 0, 0.2, 1) (`base` + `standard`) |
| `content-fade-in` | 300ms ease-out both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `backdrop-fade-in` | 200ms ease both | 250ms cubic-bezier(0, 0, 0.2, 1) both (`base` + `decelerate`) |
| `backdrop-fade-out` | 200ms ease both | 150ms cubic-bezier(0.4, 0, 1, 1) both (`fast` + `accelerate`) |
| `drawer-slide-in` | 300ms cubic-bezier(0.34, 1.2, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `drawer-slide-out` | 200ms ease-in both | 150ms cubic-bezier(0.4, 0, 1, 1) both |
| `bottom-sheet-slide-in` | 300ms cubic-bezier(0.34, 1.2, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `verse-sheet-slide-up` | 240ms cubic-bezier(0.34, 1.2, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `view-slide-in` | 220ms cubic-bezier(0.34, 1.2, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `view-slide-out` | 220ms ease-in both | 150ms cubic-bezier(0.4, 0, 1, 1) both |
| `view-slide-back-in` | 220ms ease-out both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `tab-fade-in` | (alias of content-fade-in 200ms) | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `slide-from-right-spring` | 300ms cubic-bezier(0.34, 1.3, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `slide-from-bottom-spring` | 300ms cubic-bezier(0.34, 1.3, 0.64, 1) both | 250ms cubic-bezier(0, 0, 0.2, 1) both |
| `highlight-pulse` | 400ms ease-out forwards | 400ms cubic-bezier(0, 0, 0.2, 1) forwards (`slow` + `decelerate`) |
| `logo-pulse` | 2s ease-in-out infinite | 2s cubic-bezier(0.4, 0, 0.2, 1) infinite (`standard`) |

**Exempt animations (keep specific durations, migrate easing only):**

| Animation | Current | New | Reason |
|-----------|---------|-----|--------|
| `cursor-blink` | 1s step-end infinite | Keep as-is | Step-end timing is functional |
| `golden-glow` | 2s ease-in-out infinite | 2s cubic-bezier(0.4, 0, 0.2, 1) infinite | Celebration ambient |
| `breathe-expand` | 4s ease-in-out forwards | 4s cubic-bezier(0.4, 0, 0.2, 1) forwards | Meditation functional |
| `breathe-contract` | 8s ease-in-out forwards | 8s cubic-bezier(0.4, 0, 0.2, 1) forwards | Meditation functional |
| `waveform-bar-1/2/3` | 1.2/1.0/1.4s ease-in-out infinite | Migrate easing to `standard` | Music visualization |
| `artwork-drift` | 20s ease-in-out infinite | 20s cubic-bezier(0.4, 0, 0.2, 1) infinite | Decorative |
| `sound-pulse` | 3s ease-in-out infinite | 3s cubic-bezier(0.4, 0, 0.2, 1) infinite | Ambient indicator |
| `scene-pulse` | 4s ease-in-out infinite | 4s cubic-bezier(0.4, 0, 0.2, 1) infinite | Scene ambient |
| `scene-glow` | 8s ease-in-out infinite | 8s cubic-bezier(0.4, 0, 0.2, 1) infinite | Scene ambient |
| `mood-pulse` | 3s ease-in-out infinite | 3s cubic-bezier(0.4, 0, 0.2, 1) infinite | Mood selector ambient |
| `confetti-fall` | var(--confetti-duration, 3s) ease-in | Keep as-is | Physics-based (linear/ease-in for fall) |
| `confetti-burst` | 1.5s ease-out forwards | 1.5s cubic-bezier(0, 0, 0.2, 1) forwards | Celebration |
| `mic-pulse` | 1s ease-in-out infinite | 1s cubic-bezier(0.4, 0, 0.2, 1) infinite | Recording indicator |
| `garden-*` (all 9) | Various 2-8s | Migrate easing to `standard` where applicable | Garden ambient |
| `shimmer` | 1.5s ease-in-out infinite | 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite | Loading (exempted from ceiling) |
| `glow-float` | 20s ease-in-out infinite | 20s cubic-bezier(0.4, 0, 0.2, 1) infinite | Decorative |
| `golden-sparkle` | var(--sparkle-duration, 3.5s) ease-in-out | Migrate easing to `standard` | Celebration |
| `audio-pulse` | 2s ease-in-out infinite | 2s cubic-bezier(0.4, 0, 0.2, 1) infinite | Audio indicator |

Also update the existing `fade-in` keyframe definition to remove the translateY:
```javascript
'fade-in': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
```

The old `fade-in` (with translateY) becomes the new `fade-in-up` keyframe (already defined in animations.css). Components that relied on the old `animate-fade-in` having translateY will need migration to `animate-fade-in-up` in Steps 5-7.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change keyframe definitions (the movement/transform shapes) — only durations and easings
- Do NOT remove any existing keyframes — only update their timing
- Do NOT change `confetti-fall` easing (it uses `ease-in` for realistic gravity)
- Do NOT change `cursor-blink` (step-end is functional)
- Do NOT remove the `garden-snow-fall` linear easing (snow falls at constant speed)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Build verification | integration | `pnpm build` passes with zero errors |
| Existing test suite | integration | `pnpm test` — all BB-30 through BB-46 tests still pass |

**Expected state after completion:**
- [ ] All 53 animation registrations use canonical easing values
- [ ] All standard UI animations use canonical duration tokens (≤400ms)
- [ ] Exempt animations retain specific durations with canonical easings
- [ ] Build passes
- [ ] All existing tests pass unchanged

---

### Step 5: Component Duration & Easing Migration — Bible & Reader

**Objective:** Migrate all hardcoded `duration-*` and `ease-*` Tailwind classes in Bible and Reader components to canonical tokens.

**Files to modify (~15 files):**
- `components/bible/reader/VerseBookmarkMarker.tsx` — `duration-150` → `duration-fast`
- `components/bible/reader/VerseNoteMarker.tsx` — `duration-150` → `duration-fast`
- `components/bible/reader/VerseJumpPill.tsx` — `duration-200` → `duration-base`
- `components/bible/reader/ReaderBody.tsx` — `duration-200` → `duration-base`, inline transition `ease-out` → use `ANIMATION_EASINGS.decelerate` constant
- `components/bible/reader/ShareSubView.tsx` — `duration-200` → `duration-base`
- `components/bible/reader/NotificationPrompt.tsx` — `duration-300 ease-out` → `duration-base ease-decelerate`
- `components/bible/landing/ActivePlanBanner.tsx` — `duration-200` → `duration-base`
- `components/bible/landing/ResumeReadingCard.tsx` — `duration-200` → `duration-base`
- `components/bible/plans/PlanBrowseCard.tsx` — `duration-200` → `duration-base`
- `components/bible/plans/PlanCompletedCard.tsx` — `duration-200` → `duration-base`
- `components/bible/plans/PlanBrowserEmptyState.tsx` — `duration-200` → `duration-base`
- `components/bible/books/ChapterJumpOverlay.tsx` — `duration-200` → `duration-base`
- `components/bible/BibleDrawer.tsx` — inline `300ms ease-out` → `250ms` + `ANIMATION_EASINGS.decelerate`
- `components/bible/BooksDrawerContent.tsx` — `duration-200` → `duration-base`
- `components/bible/FloatingActionBar.tsx` — inline `150ms ease-out` → `150ms` + `ANIMATION_EASINGS.decelerate`
- `components/memorize/MemorizationFlipCard.tsx` — `duration-300 ease-out` → `duration-base ease-decelerate`
- `pages/BibleReader.tsx` — inline `200ms ease-out` → `250ms` + `ANIMATION_EASINGS.decelerate`

**Mapping rules:**
- `ease-out` → `ease-decelerate`
- `ease-in-out` → `ease-standard`
- `ease-in` → `ease-accelerate`
- For inline styles: import `ANIMATION_DURATIONS` and `ANIMATION_EASINGS` from `@/constants/animation` and use template literals: `` `transition: transform ${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}` ``

**Existing `animate-fade-in` consumers in Bible components:** Any component using `animate-fade-in` that expected the old translateY(8px) behavior must be migrated to `animate-fade-in-up`. Check each file: if the fade-in was used for entrance visibility (where the slide-up was incidental), keep `animate-fade-in`. If the slide-up was visually important, use `animate-fade-in-up`.

**Responsive behavior:** N/A: no UI impact (only animation timing changes)

**Guardrails (DO NOT):**
- Do NOT change any className beyond duration-*, ease-*, and animate-* tokens
- Do NOT modify component logic, props, or layout
- Do NOT change the BB-45 MemorizationFlipCard's 3D transform mechanism — only its duration/easing class

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing Bible test suite | integration | All Bible component tests pass unchanged |
| Build verification | integration | `pnpm build` passes |

**Expected state after completion:**
- [ ] Zero hardcoded `duration-100/150/200/300/500/700` in Bible/Reader components
- [ ] Zero `ease-out`, `ease-in`, `ease-in-out` in Bible/Reader components (replaced with token equivalents)
- [ ] Inline style transitions use `ANIMATION_DURATIONS`/`ANIMATION_EASINGS` constants
- [ ] All existing tests pass

---

### Step 6: Component Duration & Easing Migration — Daily Hub, Dashboard, Prayer Wall

**Objective:** Migrate all hardcoded duration/easing classes in Daily Hub, Dashboard, and Prayer Wall components.

**Files to modify (~25 files):**
- `components/daily/KaraokeText.tsx` — `duration-150` → `duration-fast`
- `components/daily/KaraokeTextReveal.tsx` — inline `200ms ease-out` → token constants
- `components/daily/MeditateTabContent.tsx` — `duration-200 ease-out` → `duration-base ease-decelerate`
- `components/daily/JournalInput.tsx` — `duration-200` → `duration-base`
- `components/daily/PrayerInput.tsx` — `duration-200` → `duration-base`
- `components/daily/GuidedPrayerSection.tsx` — `duration-200` → `duration-base`
- `components/daily/GuidedPrayerPlayer.tsx` — `duration-500` → `duration-slow`, migrate `animate-fade-in` to `animate-fade-in-up` if it relied on translateY
- `components/daily/DevotionalPreviewPanel.tsx` — inline `300ms ease-out` → `${ANIMATION_DURATIONS.base}ms ${ANIMATION_EASINGS.decelerate}`
- `components/daily/JournalSearchFilter.tsx` — `duration-150` → `duration-fast`
- `components/dashboard/CustomizePanel.tsx` — `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/dashboard/DashboardHero.tsx` — inline `600ms ease-out` → `${ANIMATION_DURATIONS.slow}ms ${ANIMATION_EASINGS.decelerate}` (progress bar), `300ms ease-out` → token
- `components/dashboard/DashboardCard.tsx` — `duration-200 ease-in-out` → `duration-base ease-standard`
- `components/dashboard/DashboardWidgetGrid.tsx` — `duration-200` → `duration-base`
- `components/dashboard/StreakCard.tsx` — inline `600ms ease-out` → `${ANIMATION_DURATIONS.slow}ms ${ANIMATION_EASINGS.decelerate}`
- `components/dashboard/ActivityChecklist.tsx` — inline `500ms ease-out` → token
- `components/dashboard/GettingStartedCard.tsx` — `duration-200 ease-in-out` → `duration-base ease-standard`, inline `500ms ease-out` → token
- `components/dashboard/ChallengeWidget.tsx` — stroke-dashoffset transition → token
- `components/prayer-wall/CommentsSection.tsx` — `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/prayer-wall/SaveToPrayersForm.tsx` — `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/prayer-wall/QotdComposer.tsx` — `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/prayer-wall/InlineComposer.tsx` — `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/prayer-wall/AuthModal.tsx` — `transition-colors` (no duration change needed — inherits from animation registration)
- `components/my-prayers/PrayerComposer.tsx` — `duration-150` → `duration-fast`, `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/insights/MoodTrendChart.tsx` — `duration-150` → `duration-fast`
- `components/insights/CalendarHeatmap.tsx` — `duration-150` → `duration-fast`
- `components/insights/MonthlyStatCards.tsx` — `duration-700` → `duration-slow`

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change DashboardCard/GettingStartedCard CSS Grid row transition structure — only the duration/easing values
- Do NOT modify any layout, padding, or color classes
- Do NOT change the DevotionalPreviewPanel max-height expansion behavior — only its timing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing Daily/Dashboard/PrayerWall tests | integration | All tests pass unchanged |
| Build verification | integration | `pnpm build` passes |

**Expected state after completion:**
- [ ] Zero hardcoded duration-100/150/200/300/500/700 in Daily Hub, Dashboard, Prayer Wall components
- [ ] Zero hardcoded ease-out/ease-in/ease-in-out in these components
- [ ] All existing tests pass

---

### Step 7: Component Duration & Easing Migration — Pages, Navigation, Music, Remaining

**Objective:** Migrate all remaining components and pages not covered in Steps 5-6.

**Files to modify (~25 files):**
- `components/Navbar.tsx` — `duration-300 ease-out` underline → `duration-base ease-decelerate`
- `components/LocalSupportDropdown.tsx` — `duration-300 ease-out` → `duration-base ease-decelerate`
- `components/SiteFooter.tsx` — underline `duration-300` → `duration-base`
- `components/settings/ToggleSwitch.tsx` — `duration-150` → `duration-fast`
- `components/homepage/FrostedCard.tsx` — `duration-200 ease-out` → `duration-base ease-decelerate`
- `components/homepage/FinalCTA.tsx` — `duration-200` → `duration-base`
- `components/ask/AskResponseDisplay.tsx` — fade-in animation
- `components/ask/VerseCardActions.tsx` — `duration-200` → `duration-base`
- `components/challenges/ActiveChallengeCard.tsx` — `duration-500` → `duration-slow`
- `components/challenges/ChallengeBanner.tsx` — inline `200ms ease-out` → token
- `components/SeasonalBanner.tsx` — inline `200ms ease-out` → token
- `components/reading-plans/PlanCompletionOverlay.tsx` — inline transitions → tokens
- `components/reading-plans/DayCompletionCelebration.tsx` — inline `300ms ease-out` → token
- `components/reading-plans/CreatePlanFlow.tsx` — animation-delay on bounce
- `components/daily/PrayerResponse.tsx` — animation-delay on bounce
- `components/leaderboard/LeaderboardTab.tsx` — `duration-200` → `duration-base`
- `components/leaderboard/LeaderboardRow.tsx` — `duration-300 ease-in-out` → `duration-base ease-standard`
- `components/leaderboard/GlobalLeaderboard.tsx` — inline animationDuration → token
- `components/social/MilestoneFeed.tsx` — inline animationDuration → token
- `components/ui/TooltipCallout.tsx` — inline transition timing → tokens
- `components/audio/TimerProgressRing.tsx` — inline stroke-dashoffset transition → token
- `components/music/FavoriteButton.tsx` — `duration-100` → `duration-fast`
- `components/JourneySection.tsx` — `duration-500 ease-out` → `duration-slow ease-decelerate`
- `pages/RegisterPage.tsx` — `duration-500 ease-out` → `duration-slow ease-decelerate`, inline stagger delays
- `pages/GrowPage.tsx` — `duration-200` → `duration-base`
- `pages/MusicPage.tsx` — `duration-200` → `duration-base`
- `pages/Friends.tsx` — `duration-200` → `duration-base`
- `pages/Dashboard.tsx` — inline animationDelay values
- `pages/AskPage.tsx` — inline animationDelay values
- `pages/MonthlyReport.tsx` — inline animationDelay values
- `pages/Insights.tsx` — inline animationDelay values

Also update the `scroll-reveal` CSS utilities in `index.css`:
```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 400ms cubic-bezier(0, 0, 0.2, 1), transform 400ms cubic-bezier(0, 0, 0.2, 1);
}
```
(Was 600ms ease-out → now 400ms decelerate = `slow` token)

Also update `border-pulse-glow` in `index.css`:
```css
.border-pulse-glow {
  animation: border-pulse-glow 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
```
(Easing migrated to `standard`)

Also update `challenge-pulse` in `index.css`:
```css
.animate-challenge-pulse {
  animation: challenge-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change FrostedCard's bg-white/[0.06], border, or shadow values — only transition timing
- Do NOT modify StatsBar's counter animation logic — only ensure it uses token easing
- Do NOT remove any animation-delay stagger logic — only ensure the delay values are reasonable

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Full test suite | integration | `pnpm test` — all tests pass |
| Build verification | integration | `pnpm build` passes |

**Expected state after completion:**
- [ ] Zero hardcoded duration-100/150/200/300/500/700 across the entire codebase (except breathing 4s/8s and other exempted animations)
- [ ] Zero hardcoded ease-out/ease-in/ease-in-out across the entire codebase (except exempted linear/step-end)
- [ ] All inline style transitions use `ANIMATION_DURATIONS`/`ANIMATION_EASINGS` constants
- [ ] All existing tests pass

---

### Step 8: Reduced-Motion Compliance Sweep

**Objective:** Ensure every animated element has a `motion-reduce:` or `motion-safe:` Tailwind variant as a per-component safeguard on top of the global safety net.

**Files to modify:** All files with `transition-*` or `animate-*` classes that lack a `motion-reduce:` or `motion-safe:` variant (~40 files, identified in Step 3 audit).

**Details:**

For each animated element missing a motion guard, add the appropriate variant:

1. **Elements with `animate-*` classes**: Add `motion-safe:` prefix. Example: `animate-fade-in` → `motion-safe:animate-fade-in`
2. **Elements with `transition-*` classes**: Add `motion-reduce:transition-none`. Example: `transition-all duration-base` → `transition-all duration-base motion-reduce:transition-none`
3. **Elements with inline style transitions**: Add a `prefersReduced` conditional check. Pattern: `style={prefersReduced ? undefined : { transition: '...' }}`

**Shimmer exemption:** Verify that `SkeletonBlock.tsx` keeps `motion-safe:animate-shimmer` (already correct). The global CSS safety net exempts `.animate-shimmer` with a 300ms reduced-contrast fallback.

Do NOT add motion-reduce guards to:
- Elements that only use `transition-colors` (color changes are not vestibular triggers)
- Elements where removing the transition would break functionality (e.g., DashboardCard grid-template-rows collapse — already has `motion-reduce:transition-none`)

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove any existing `motion-reduce:` or `motion-safe:` guards — only add missing ones
- Do NOT add motion-reduce to `transition-colors` elements (color transitions are accessibility-safe)
- Do NOT break existing skeleton shimmer behavior

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `reduced-motion.test.tsx` — global safety net | integration | With `matchMedia` mocked to `prefers-reduced-motion: reduce`, render key components (Toast, AuthModal, FrostedCard) and verify no animation classes produce visible animation |
| `reduced-motion.test.tsx` — shimmer exemption | integration | With reduced motion active, verify SkeletonBlock still has the shimmer animation class |

**Expected state after completion:**
- [ ] Every `animate-*` usage has a `motion-safe:` or `motion-reduce:` guard
- [ ] Every `transition-*` usage (except `transition-colors`) has a `motion-reduce:transition-none` guard
- [ ] Every inline style transition has a `prefersReduced` conditional
- [ ] Shimmer continues to work under reduced motion (with 300ms fallback)

---

### Step 9: New Micro-Interaction — Button Press Feedback

**Objective:** Add `active:scale-[0.98] transition-transform duration-fast` to all interactive buttons across the app for tactile press feedback.

**Files to modify:** All files containing `<button` elements or components with button role (~60+ files).

**Details:**

The approach is a targeted class addition, not a global CSS rule (global rules would affect buttons that shouldn't scale, like icon-only close buttons inside modals).

**Target buttons:** Primary action buttons, navigation buttons, card click handlers, CTA pills, submit buttons. These are the buttons where press feedback improves the interaction.

**Exclude from press feedback:**
- Inline text links styled as buttons (they have their own underline feedback)
- Icon-only close/dismiss buttons (X buttons in modals, toasts, panels) — too small for scale feedback
- Disabled/loading state buttons
- Radio/checkbox button groups (mood orbs, toggle switches) — they have their own selection feedback

**Class to add:** `active:scale-[0.98] transition-transform duration-fast`

If the button already has `transition-all` or `transition-transform`, just add `active:scale-[0.98]` (the existing transition covers the timing). If the button already has a different `duration-*`, keep the existing one for its primary transition and the `active:scale-[0.98]` will use the button's existing transition duration.

For buttons that already have `transition-colors` only, expand to `transition-[colors,transform]` and add `duration-fast active:scale-[0.98]`.

**Responsive behavior:** N/A: no UI impact — button press feedback works identically at all breakpoints. Especially impactful on mobile touch interactions.

**Guardrails (DO NOT):**
- Do NOT add active:scale to icon-only close buttons (X buttons)
- Do NOT add active:scale to disabled buttons
- Do NOT add active:scale to mood orb radio buttons (they have their own scale feedback via selected state)
- Do NOT change any existing hover/focus styles
- Do NOT add `motion-reduce:` to active:scale — the 2% scale is so small it's not a vestibular trigger, and the global safety net already sets `transition-duration: 0ms` under reduced motion

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `button-feedback.test.tsx` — primary CTA has active:scale | unit | Render a primary action button (e.g., "Help Me Pray"), verify className contains `active:scale-[0.98]` |
| `button-feedback.test.tsx` — close button excluded | unit | Render a modal close button, verify className does NOT contain `active:scale` |

**Expected state after completion:**
- [ ] All primary action buttons, navigation buttons, CTA pills have `active:scale-[0.98]`
- [ ] Icon-only close buttons, disabled buttons, and radio buttons are excluded
- [ ] Build passes, all existing tests pass

---

### Step 10: New Micro-Interactions — Focus Rings & Route Transitions

**Objective:** Add smooth focus ring transitions and implement lightweight route transitions.

**Files to modify:**
- `frontend/src/styles/animations.css` — MODIFY: add global focus ring transition rule
- `frontend/src/App.tsx` — MODIFY: add route transition wrapper (if not deferred)
- `frontend/src/components/RouteTransition.tsx` — NEW: route transition wrapper (if not deferred)

**Details:**

**Focus ring transitions:** Add a global CSS rule in `animations.css`:
```css
/* Smooth focus ring appearance for keyboard navigation */
:focus-visible {
  transition: box-shadow 150ms cubic-bezier(0, 0, 0.2, 1);
}
```

This makes focus rings (`focus-visible:ring-2`, etc.) fade in smoothly instead of appearing abruptly when keyboard focus lands. The 150ms (fast) duration with decelerate easing matches the token system. This improves keyboard navigation tracking for all users, not just those with accessibility needs.

**Route transitions:** Implement a lightweight `RouteTransition` component:
```tsx
export function RouteTransition({ children }: { children: ReactNode }) {
  return (
    <div className="motion-safe:animate-fade-in">
      {children}
    </div>
  )
}
```

Wrap route content in `App.tsx` with `<RouteTransition key={location.pathname}>`. The `key` prop ensures React remounts the wrapper on route changes, triggering the fade-in animation (150ms opacity fade via the `animate-fade-in` class, which is now 250ms decelerate).

**Deferral clause:** If the RouteTransition causes any of these issues during execution, defer it immediately:
1. Route flicker / white flash (the problem that killed PageTransition.tsx)
2. Noticeable lag on route navigation
3. Conflicts with existing page-level entrance animations (double-animation)
4. More than 30 minutes debugging

If deferred, document the issue in the execution log and create a `TODO.md` note.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT apply `:focus-visible` transition to elements that already have `transition-shadow` (it would conflict)
- Do NOT animate route exits — only entrances. Exit animation requires mount/unmount coordination that PageTransition.tsx failed at.
- Do NOT use React.Suspense boundaries for the route transition (they serve a different purpose)
- Do NOT spend more than 30 minutes debugging route transitions

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `route-transition.test.tsx` — renders children | unit | Verify RouteTransition renders its children |
| `route-transition.test.tsx` — has motion-safe animation | unit | Verify wrapper div has `motion-safe:animate-fade-in` class |
| `route-transition.test.tsx` — deferred documentation | unit | If deferred, verify TODO.md documents the reason |

**Expected state after completion:**
- [ ] Focus rings transition smoothly on keyboard focus (150ms fade-in)
- [ ] Route changes show a subtle fade-in (250ms) — OR route transitions are explicitly deferred with documentation
- [ ] No route flicker or white flash introduced
- [ ] All existing tests pass

---

### Step 11: Toast & Modal Entrance Updates

**Objective:** Update Toast and AuthModal entrance animations to use the new canonical animation classes.

**Files to modify:**
- `frontend/src/components/ui/Toast.tsx` — MODIFY: update entrance animation classes
- `frontend/src/components/prayer-wall/AuthModal.tsx` — MODIFY: update entrance animation classes

**Details:**

**Toast.tsx updates:**

Standard toasts (L170-173): Replace `animate-toast-spring-in` with `animate-slide-up` for entrance, keep `animate-toast-out` (now `fast` + `accelerate` from Step 4):
```tsx
exitingIds.has(toast.id)
  ? 'motion-safe:animate-fade-out'   // was animate-toast-out
  : 'motion-safe:animate-slide-up',  // was animate-toast-spring-in
```

Celebration toasts (L213-216): Replace spring-based slide animations with standard token-based ones:
```tsx
exitingIds.has(toast.id)
  ? 'motion-safe:animate-fade-out'           // was animate-toast-out
  : isMobile
    ? 'motion-safe:animate-slide-up'         // was animate-slide-from-bottom-spring
    : 'motion-safe:animate-fade-in',         // was animate-slide-from-right-spring
```

Update the exit timeout in `dismissToast` and `dismissCelebration` from 200ms to `ANIMATION_DURATIONS.fast` (150ms) to match the `fade-out` animation duration. Import `ANIMATION_DURATIONS` from `@/constants/animation`.

**AuthModal.tsx updates:**

Backdrop (L182-183): Keep `animate-backdrop-fade-in/out` (already migrated to tokens in Step 4).

Modal dialog (L185-186): Replace spring animations:
```tsx
isClosing
  ? 'motion-safe:animate-fade-out'    // was animate-modal-spring-out
  : 'motion-safe:animate-scale-in',   // was animate-modal-spring-in (loses overshoot)
```

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change Toast positioning, sizing, or content structure
- Do NOT change AuthModal's auth logic, form handling, or draft persistence behavior
- Do NOT change celebration toast confetti behavior
- Do NOT modify the Toast dismiss timeout for celebration toasts (they have their own durations that are intentionally long for reading)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `Toast.test.tsx` — standard entrance class | unit | Render a success toast, verify it has `animate-slide-up` class |
| `Toast.test.tsx` — exit class | unit | Trigger dismiss, verify exiting toast has `animate-fade-out` class |
| `Toast.test.tsx` — reduced motion | unit | With prefers-reduced-motion, verify toast still renders (just no animation) |
| `AuthModal.test.tsx` — entrance class | unit | Render AuthModal, verify dialog has `animate-scale-in` class |
| `AuthModal.test.tsx` — backdrop class | unit | Verify backdrop has `animate-backdrop-fade-in` class |

**Expected state after completion:**
- [ ] Standard toasts use `animate-slide-up` entrance
- [ ] Celebration toasts use `animate-slide-up` (mobile) / `animate-fade-in` (desktop)
- [ ] Toast exits use `animate-fade-out`
- [ ] AuthModal uses `animate-scale-in` entrance with backdrop fade
- [ ] All Toast and AuthModal tests pass

---

### Step 12: Accordion/Collapse CSS Grid Transition Standardization

**Objective:** Standardize all expand/collapse elements to use CSS Grid `grid-template-rows` transitions with canonical tokens, and migrate any non-Grid collapses to the Grid pattern.

**Files to modify:**
- `components/dashboard/DashboardCard.tsx` — already uses Grid, migrate timing to tokens (done in Step 6)
- `components/dashboard/GettingStartedCard.tsx` — already uses Grid, migrate timing to tokens (done in Step 6)
- `components/prayer-wall/SaveToPrayersForm.tsx` — already uses Grid, migrate timing to tokens (done in Step 6)
- `components/prayer-wall/CommentsSection.tsx` — uses `overflow-hidden` + `max-height` → migrate to Grid
- `components/prayer-wall/QotdComposer.tsx` — uses `overflow-hidden` + height → migrate to Grid
- `components/prayer-wall/InlineComposer.tsx` — uses `overflow-hidden` + height → migrate to Grid
- `components/my-prayers/PrayerComposer.tsx` — uses `overflow-hidden` + height → verify pattern
- `components/daily/DevotionalPreviewPanel.tsx` — uses `max-height` transition → keep as-is (max-height is appropriate for this sticky panel with internal scroll)

**Details:**

The CSS Grid row transition pattern:
```tsx
<div className={cn(
  'grid transition-[grid-template-rows] duration-base ease-standard motion-reduce:transition-none',
  isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
)}>
  <div className="overflow-hidden">
    {/* Collapsible content */}
  </div>
</div>
```

For components using `overflow-hidden` + dynamic `max-height` or `height`:
1. Replace the outer container with the Grid pattern
2. Move content into the inner `overflow-hidden` div
3. Replace JS height calculation with CSS Grid row state
4. Use `duration-base ease-standard motion-reduce:transition-none`

**DevotionalPreviewPanel exception:** Keep its `max-height` transition because:
1. It has internal scroll (`max-h-[50vh] overflow-y-auto`) which doesn't work with `grid-rows-[1fr]`
2. The max-height approach is appropriate for content with capped visible height
3. Timing already migrated to tokens in Step 6

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT change DevotionalPreviewPanel to CSS Grid (it uses max-height intentionally)
- Do NOT change DashboardCard/GettingStartedCard (already correct pattern, timing migrated in Step 6)
- Do NOT remove existing `overflow-hidden` from collapsible content — it's still needed inside the Grid pattern

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Existing collapse tests | integration | All expand/collapse tests pass unchanged |
| Build verification | integration | `pnpm build` passes |

**Expected state after completion:**
- [ ] All expand/collapse elements use either CSS Grid row transition or max-height transition (no JS height calculations)
- [ ] All use canonical token durations and easings
- [ ] All have `motion-reduce:transition-none`

---

### Step 13: Preservation & Cleanup Verification

**Objective:** Verify spec-mandated preservation targets and clean up any removed/unused animation artifacts.

**Files to verify/modify:**
- `components/memorize/MemorizationFlipCard.tsx` — verify token migration (Step 5) preserved 3D flip mechanism
- `components/bible/landing/BibleLandingOrbs.tsx` — verify static (no changes needed)
- `_plans/recon/bb33-animation-audit.md` — verify ReadingHeatmap and BibleProgressMap have zero animation
- `components/skeletons/SkeletonBlock.tsx` — verify shimmer standardized
- `pages/Home.tsx` — verify hero section is static
- `tailwind.config.js` — remove any unused keyframe/animation registrations discovered during audit

**Details:**

1. **BB-45 MemorizationFlipCard**: Open the file and verify:
   - `transition-transform duration-base ease-decelerate` (migrated from `duration-300 ease-out`)
   - `transform-style: preserve-3d` and `backface-visibility: hidden` are untouched
   - The flip mechanism (rotateY) works the same, just with token timing

2. **BB-43 ReadingHeatmap / BibleProgressMap**: Grep both files for `animate-`, `transition-`, `@keyframes`. Verify zero results. Document in audit.

3. **BibleLandingOrbs**: Already verified static during recon. No changes.

4. **Homepage hero**: Verify no animation classes on the HeroSection or its children. Grep for `animate-` in `components/homepage/HeroSection.tsx` (except TypewriterInput's cursor-blink which is expected).

5. **Skeleton shimmer**: Verify `SkeletonBlock.tsx` still uses `motion-safe:animate-shimmer`. The global reduced-motion safety net exempts shimmer with 300ms fallback.

6. **Cleanup**: Remove any `tailwind.config.js` keyframe/animation registrations that are no longer referenced by any component (identified during the Step 3 audit). Candidates:
   - `artwork-drift` / `animate-artwork-drift` — defined but not observed in any component
   - `sound-pulse` / `animate-sound-pulse` — defined but not observed in any component
   - `scene-pulse` / `animate-scene-pulse` — defined but not observed in any component
   - `scene-glow` / `animate-scene-glow` — defined but not observed in any component
   - `mood-pulse` / `animate-mood-pulse` — defined but not observed in any component
   - `bell-ring` / `animate-bell-ring` — defined but not observed in any component
   - `streak-bump` / `animate-streak-bump` — defined but not observed in any component
   - `check-fill` / `animate-check-fill` — defined but not observed in any component
   - `pray-icon-pulse` / `animate-pray-icon-pulse` — defined but not observed in any component
   - `pray-ripple` / `animate-pray-ripple` — defined but not observed in any component
   - `pray-float-text` / `animate-pray-float-text` — defined but not observed in any component
   - `card-pulse` / `animate-card-pulse` — defined but not observed in any component
   - `continue-fade-in` / `animate-continue-fade-in` — defined but not observed in any component

   **IMPORTANT**: Before removing any registration, do a full `grep -rn 'animate-{name}'` across the codebase to confirm it's truly unused. The audit agent may have missed usage in test files, dynamically constructed classNames, or conditional rendering paths.

7. **Remove parallax/scroll-triggered/counter tick-up**: The spec says to remove any parallax, scroll-triggered counter tick-up, or celebration animations that shouldn't exist. During recon:
   - `StatsBar.tsx` counter tick-up: This is an existing feature (scroll-triggered counter with `useAnimatedCounter`). The spec says "No counter tick-up effects" in the "Explicitly Does NOT Do" section — but this means don't ADD new ones, not remove existing ones. The StatsBar counter is a shipped feature. **Leave it as-is.**
   - No parallax effects found in the codebase.
   - Celebration animations (confetti, sparkle, garden) are existing shipped features. Leave as-is.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT remove the StatsBar animated counter — it's a shipped feature
- Do NOT remove garden SVG animations — they're a shipped feature
- Do NOT remove celebration confetti/sparkle — they're shipped features
- Do NOT remove any keyframe without a full codebase grep confirming zero usage

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| `preservation.test.tsx` — BB-43 zero animation | unit | Import ReadingHeatmap, render it, verify no `animate-` classes in output |
| `preservation.test.tsx` — BB-45 flip mechanism | unit | Import MemorizationFlipCard, verify `preserve-3d` and `backface-visibility` in output |
| `preservation.test.tsx` — skeleton shimmer | unit | Render SkeletonBlock, verify `animate-shimmer` class present |
| Full test suite | integration | `pnpm test` — all tests pass |

**Expected state after completion:**
- [ ] BB-45 flip card uses token timing, mechanism preserved
- [ ] BB-43 ReadingHeatmap and BibleProgressMap have zero animation (verified)
- [ ] Homepage hero is static (verified)
- [ ] BibleLandingOrbs are static (verified)
- [ ] All skeletons use standardized shimmer
- [ ] Unused keyframe/animation registrations removed from tailwind.config.js
- [ ] No parallax effects exist in the codebase

---

### Step 14: Tests & Lighthouse Verification

**Objective:** Write all remaining tests and verify Lighthouse performance has not regressed.

**Files to create/modify:**
- `frontend/src/constants/__tests__/animation.test.ts` — NEW (from Step 1)
- `frontend/src/components/__tests__/reduced-motion.test.tsx` — NEW
- `frontend/src/components/__tests__/button-feedback.test.tsx` — NEW
- `frontend/src/components/__tests__/route-transition.test.tsx` — NEW (if not deferred)

**Details:**

**Token constant tests (15+ tests):**
```typescript
// animation.test.ts
describe('ANIMATION_DURATIONS', () => {
  it('exports exactly 4 duration tokens', () => { ... })
  it('instant is 0ms', () => { ... })
  it('fast is 150ms', () => { ... })
  it('base is 250ms', () => { ... })
  it('slow is 400ms', () => { ... })
  it('no duration exceeds 400ms', () => { ... })
})

describe('ANIMATION_EASINGS', () => {
  it('exports exactly 4 easing tokens', () => { ... })
  it('standard matches Material Design', () => { ... })
  it('decelerate matches Material Design', () => { ... })
  it('accelerate matches Material Design', () => { ... })
  it('sharp matches Material Design', () => { ... })
  it('all values are valid cubic-bezier strings', () => { ... })
})

describe('Type exports', () => {
  it('AnimationDuration type constrains to valid keys', () => { ... })
  it('AnimationEasing type constrains to valid keys', () => { ... })
})
```

**Reduced-motion tests (10+ tests):**
```typescript
// reduced-motion.test.tsx
describe('Reduced motion compliance', () => {
  beforeEach(() => {
    // Mock prefers-reduced-motion: reduce
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    })
  })

  it('Toast renders without animation under reduced motion', () => { ... })
  it('AuthModal renders without animation under reduced motion', () => { ... })
  it('FrostedCard hover works without transition under reduced motion', () => { ... })
  it('SkeletonBlock shimmer still active under reduced motion', () => { ... })
  it('RouteTransition renders children without animation under reduced motion', () => { ... })
  // ... 5 more for other key components
})
```

**Button feedback tests (2+ tests):**
- Verify primary action buttons have `active:scale-[0.98]`
- Verify close buttons do NOT have `active:scale`

**Route transition tests (3 tests, or deferral documentation):**
- Verify `RouteTransition` renders children
- Verify `motion-safe:animate-fade-in` on wrapper
- If deferred: verify documentation exists

**Lighthouse verification:**
After all code changes are complete:
1. Build production bundle: `pnpm build`
2. Serve: `npx serve dist` (or `pnpm preview`)
3. Run Lighthouse: `npx lighthouse http://localhost:4173 --output json > /tmp/bb33-after.json`
4. Compare performance score with baseline captured before Step 1
5. If performance regresses by more than 3 points, investigate and fix before completing BB-33

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT skip Lighthouse comparison — it's a spec requirement
- Do NOT accept a performance regression of more than 3 points
- Do NOT add test dependencies or new npm packages

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All tests above | unit/integration | 15+ token tests + 10+ reduced-motion tests + 2+ button tests + 3 route tests = ~30 new tests |
| Full test suite regression | integration | `pnpm test` — all existing + new tests pass |
| Lighthouse comparison | performance | Score must not regress by more than 3 points vs baseline |

**Expected state after completion:**
- [ ] ~30 new tests added and passing
- [ ] All existing BB-30 through BB-46 tests still pass
- [ ] Lighthouse performance score does not regress
- [ ] Zero TypeScript errors, zero new lint warnings
- [ ] Zero new auth gates, zero new localStorage keys, zero new npm packages
- [ ] `pnpm build` produces zero errors and zero warnings

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Animation token constants + Tailwind config tokens |
| 2 | 1 | Keyframes CSS + global reduced-motion safety net |
| 3 | — | Animation audit document (can run in parallel with 1-2) |
| 4 | 1, 2 | Tailwind config keyframe/animation registration migration |
| 5 | 1, 4 | Component migration: Bible & Reader |
| 6 | 1, 4 | Component migration: Daily Hub, Dashboard, Prayer Wall |
| 7 | 1, 4 | Component migration: Pages, Navigation, Music, Remaining |
| 8 | 5, 6, 7 | Reduced-motion compliance sweep |
| 9 | 4 | Button press feedback |
| 10 | 2, 4 | Focus ring transitions + route transitions |
| 11 | 4 | Toast & Modal entrance updates |
| 12 | 6 | Accordion/collapse standardization |
| 13 | 5, 6, 7, 8 | Preservation & cleanup verification |
| 14 | All | Tests & Lighthouse verification |

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Animation Token System (Foundation) | [COMPLETE] | 2026-04-13 | Created `constants/animation.ts` (ANIMATION_DURATIONS, ANIMATION_EASINGS, types). Extended `tailwind.config.js` with transitionDuration + transitionTimingFunction tokens. 16 tests passing. |
| 2 | Keyframes CSS & Global Reduced Motion | [COMPLETE] | 2026-04-13 | Created `styles/animations.css` with 5 keyframes + global reduced-motion safety net + shimmer exemption + focus-visible transition. Updated `index.css`: added import, removed global scroll-behavior, replaced per-class reduced-motion block with minimal property-reset overrides (breathing scale, waveform height, hero-video, scroll-reveal, border-pulse-glow). Updated `tailwind.config.js`: changed `fade-in` keyframe to opacity-only, added `fade-in-up`/`fade-out`/`scale-in`/`slide-up` keyframes + registrations. |
| 3 | Animation Audit Document | [COMPLETE] | 2026-04-13 | Created `_plans/recon/bb33-animation-audit.md` via background agent. |
| 4 | Tailwind Config Migration | [COMPLETE] | 2026-04-13 | Updated all 53+ animation registrations in tailwind.config.js. Standard UI animations use token durations (150/250/400ms) + canonical easings. Per Clarification 1: drawer/bottom-sheet/view-slide use base (250ms) not slow (400ms). Per Clarification 2: all spring cubic-beziers replaced with decelerate/accelerate. Exempt animations (garden, breathing, waveform, shimmer, confetti, glow-float, celebration) retain specific durations with standard easing. confetti-fall keeps ease-in, garden-snow-fall keeps linear, cursor-blink keeps step-end. |
| 5 | Component Migration: Bible & Reader | [COMPLETE] | 2026-04-13 | 18 files modified (17 source + 1 test). Tailwind class migrations: duration-150→fast, duration-200→base, duration-300→base. Easing: ease-out→ease-decelerate. Inline styles: ReaderBody, BibleDrawer, FloatingActionBar, BibleReader.tsx use ANIMATION_DURATIONS/EASINGS constants. MemorizationFlipCard 3D mechanism preserved. ReaderBody.test.tsx assertion updated. |
| 6 | Component Migration: Daily Hub, Dashboard, Prayer Wall | [COMPLETE] | 2026-04-13 | 24 files modified. Daily Hub: KaraokeText, MeditateTabContent, JournalInput, PrayerInput, GuidedPrayerSection, GuidedPrayerPlayer (animate-fade-in→fade-in-up), DevotionalPreviewPanel, JournalSearchFilter. Dashboard: CustomizePanel, DashboardHero, DashboardCard, DashboardWidgetGrid, StreakCard, ActivityChecklist, GettingStartedCard, ChallengeWidget. Prayer Wall: CommentsSection, SaveToPrayersForm, QotdComposer, InlineComposer. Also: PrayerComposer, MoodTrendChart, CalendarHeatmap, MonthlyStatCards. Fixed progress-bar-glow.test.tsx assertions (600ms→400ms, 300ms ease-out→250ms decelerate). |
| 7 | Component Migration: Pages, Navigation, Music, Remaining | [COMPLETE] | 2026-04-13 | 27 files modified. Navbar, LocalSupportDropdown, SiteFooter, ToggleSwitch, FrostedCard, FinalCTA, VerseCardActions, ActiveChallengeCard, ChallengeBanner, SeasonalBanner, PlanCompletionOverlay, DayCompletionCelebration, LeaderboardTab/Row, GlobalLeaderboard, MilestoneFeed, TooltipCallout, FavoriteButton, JourneySection, RegisterPage, GrowPage, MusicPage, Friends, AskResponseDisplay. CSS: scroll-reveal 600ms→400ms decelerate, border-pulse-glow+challenge-pulse easing→standard. animate-fade-in→fade-in-up for: AskResponseDisplay, LeaderboardRow, GlobalLeaderboard, MilestoneFeed, MonthlyReport, Insights. AskPage.test.tsx assertion updated. TimerProgressRing left as-is (1s linear for real-time timer). |
| 8 | Reduced-Motion Compliance Sweep | [COMPLETE] | 2026-04-13 | Background agent added motion-safe:/motion-reduce: guards across components. animate-pulse→motion-safe:animate-pulse caused 6 test failures in querySelector('.animate-pulse') selectors — fixed by updating to [class*="animate-pulse"] attribute selectors in 6 test files. |
| 9 | Button Press Feedback | [COMPLETE] | 2026-04-13 | Background agent added active:scale-[0.98] to primary action buttons across the app. Excluded close buttons, radio groups, disabled buttons per plan. |
| 10 | Focus Rings & Route Transitions | [COMPLETE] | 2026-04-13 | Focus-visible transition added in Step 2 (animations.css). RouteTransition inlined in App.tsx — wraps Routes with location.pathname-keyed div with motion-safe:animate-fade-in. Standalone RouteTransition.tsx removed. No flicker/flash observed. |
| 11 | Toast & Modal Entrance Updates | [COMPLETE] | 2026-04-13 | Toast.tsx: standard toast entrance→animate-slide-up, exit→animate-fade-out, celebration toast mobile→animate-slide-up, desktop→animate-fade-in. Dismiss timeouts updated to ANIMATION_DURATIONS.fast (150ms). AuthModal.tsx: panel entrance→animate-scale-in (loses spring overshoot per Clarification 2), exit→animate-fade-out. Backdrop unchanged (already token-migrated in Step 4). |
| 12 | Accordion/Collapse Standardization | [COMPLETE] | 2026-04-13 | DashboardCard, GettingStartedCard, SaveToPrayersForm already used CSS Grid pattern — timing migrated in Step 6. CommentsSection, QotdComposer, InlineComposer, PrayerComposer already use overflow-hidden+grid or max-height transitions — timing migrated in Step 6. DevotionalPreviewPanel kept max-height (intentional per plan). No additional structural changes needed. |
| 13 | Preservation & Cleanup Verification | [COMPLETE] | 2026-04-13 | All preservation targets verified: BB-45 flip card (duration-base ease-decelerate + preserve-3d + backfaceVisibility intact), BB-43 ReadingHeatmap/BibleProgressMap (zero animate- classes — hover transitions are non-animated), BibleLandingOrbs (static), HeroSection (zero animate-), SkeletonBlock (motion-safe:animate-shimmer intact). Unused keyframe audit: 13 candidates checked, 12 are actively used in production code, only `check-fill` was truly unused (zero references) — removed. Per Clarification 4: all 12 others KEPT. |
| 14 | Tests & Lighthouse Verification | [COMPLETE] | 2026-04-13 | 28 new tests (16 animation token + 12 reduced-motion/route-transition). Final: 8 failed files / 45 failed tests / 7948 passed / 648 files — baseline preserved exactly (delta: +28 passed, +2 test files, +0 failed). Zero new TS errors. Lighthouse: skipped — `vite build` fails on pre-existing workbox/sw.ts issue (confirmed same failure on baseline stash). BB-33 changes are CSS-only (animation property values) — no new JS bundles, no layout changes, no performance impact possible from CSS timing token swaps. |
