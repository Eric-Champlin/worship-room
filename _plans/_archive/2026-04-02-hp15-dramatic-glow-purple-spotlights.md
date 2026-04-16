# Implementation Plan: HP-15 — Dramatic GitHub-Quality Glow — Purple Spotlights

**Spec:** `_specs/hp15-dramatic-glow-purple-spotlights.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue on existing branch — do NOT create a new branch)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ captured 2026-03-06, before homepage redesign series; stale for homepage values; current source files are authoritative)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/`
- Target files:
  - `frontend/src/components/homepage/GlowBackground.tsx` (83 lines) — config-driven variant system with `GLOW_CONFIG`, `GlowOrbs` sub-component, `ORB_BASE` class string
  - `frontend/src/components/homepage/StatsBar.tsx` (79 lines) — uses `<GlowBackground variant="center">`
  - `frontend/src/components/homepage/DashboardPreview.tsx` (~232 lines) — uses `<GlowBackground variant="center">`
  - `frontend/src/components/homepage/DifferentiatorSection.tsx` (57 lines) — uses `<GlowBackground variant="split">`
  - `frontend/src/components/homepage/FinalCTA.tsx` (69 lines) — uses `<GlowBackground variant="center">` + inline extra glow orb at 0.18 opacity
  - `frontend/src/components/StartingPointQuiz.tsx` (~220 lines) — uses `<GlowBackground variant="right">` + inline result glow orb at 0.12 opacity
  - `frontend/src/components/JourneySection.tsx` (~180 lines) — does NOT use GlowBackground; has 2 inline glow orbs at 0.15/0.12 opacity
- Test files:
  - `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` (156 lines, 15 tests)
  - `frontend/src/components/homepage/__tests__/StatsBar.test.tsx`
  - `frontend/src/components/homepage/__tests__/DashboardPreview.test.tsx`
  - `frontend/src/components/homepage/__tests__/DifferentiatorSection.test.tsx`
  - `frontend/src/components/homepage/__tests__/FinalCTA.test.tsx`
  - `frontend/src/components/__tests__/StartingPointQuiz.test.tsx`
  - `frontend/src/components/__tests__/JourneySection.test.tsx`

### Current GlowBackground Architecture

`GlowBackground.tsx` has a `GLOW_CONFIG` object with variants (`center`, `left`, `right`, `split`). Each variant defines an array of orb configs with `opacity`, `color`, `size`, `position`. The `GlowOrbs` sub-component renders orbs using a **single-stop** radial gradient: `radial-gradient(circle, rgba(..., opacity) 0%, transparent 70%)`.

`ORB_BASE` class string: `absolute rounded-full pointer-events-none will-change-transform blur-[60px] md:blur-[80px] animate-glow-float motion-reduce:animate-none`

Content is wrapped in `<div className="relative z-10">` to sit above orbs.

### Current Glow Opacities (what changes)

| Section | Current Center Opacity | Target Center Opacity | Notes |
|---------|----------------------|----------------------|-------|
| JourneySection upper | 0.15 | 0.25 | Inline orb |
| JourneySection lower | 0.12 | 0.20 | Inline orb |
| StatsBar | 0.15 (via center variant) | 0.30 | Elliptical shape needed |
| DashboardPreview | 0.15 (via center variant) | 0.40 + 0.25 secondary | Multi-orb, three-stop gradient |
| DifferentiatorSection left | 0.14 (via split variant) | 0.35 | Different positions |
| DifferentiatorSection right | 0.08 (via split variant) | 0.25 | Different positions |
| StartingPointQuiz | 0.12 (via right variant) | 0.35 | Centered, larger |
| FinalCTA | 0.18 (inline) + 0.15 (via center variant) | 0.50 | Three-stop gradient, strongest on page |

### Key Design Decision

The spec offers 3 implementation approaches. **Option B (inline glow orbs per section) is the cleanest approach** because:
- Every section now needs custom multi-stop gradients, custom sizes, and custom positions that don't fit a shared variant system
- The GlowBackground component's `GLOW_CONFIG` was designed for single-stop gradients at low opacities — the spec's two-stop and three-stop gradients with section-specific elliptical sizing make the config object unwieldy
- Keeping GlowBackground as the section wrapper (for `bg-hero-bg`, `overflow-hidden`, z-index layering) while inlining custom orbs gives the best of both worlds

**Approach:** Keep `GlowBackground` as the section wrapper but pass `variant="none"` to suppress default orbs, then inline section-specific glow orbs inside each section component. For JourneySection (which doesn't use GlowBackground), update the inline orbs directly.

### Test Patterns

Tests use Vitest + React Testing Library. Test files in `__tests__/` directories. GlowBackground tests check:
- Orb count via `data-testid="glow-orb"`
- Opacity values via `orb.style.background` containing specific `rgba(...)` values
- CSS classes via `className.toContain()`
- Structure (z-10 wrapper, bg-hero-bg, overflow-hidden)

---

## Auth Gating Checklist

N/A — This is a purely decorative visual enhancement. No interactive elements, no user actions, no auth gating needed.

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| Primary glow color | RGB | `139, 92, 246` | GlowBackground.tsx line 12 |
| Secondary glow color (lighter violet) | RGB | `168, 130, 255` | GlowBackground.tsx line 43 |
| Background color | hex | `#08051A` (hero-bg) | tailwind.config.js |
| Orb blur (mobile) | blur | `blur-[60px]` | GlowBackground.tsx ORB_BASE |
| Orb blur (desktop) | blur | `blur-[80px]` | GlowBackground.tsx ORB_BASE |
| Float animation | class | `animate-glow-float` | tailwind.config.js (20s ease-in-out) |
| Reduced motion | class | `motion-reduce:animate-none` | GlowBackground.tsx ORB_BASE |

---

## Design System Reminder

- **Glow color**: Primary `rgba(139, 92, 246, ...)`, secondary/lighter `rgba(168, 130, 255, ...)`
- **Background**: All homepage sections use `bg-hero-bg` (`#08051A`) — glow opacities are calibrated for this dark background
- **Animation**: `animate-glow-float` (20s ease-in-out, ±10px vertical). Includes `translateX(-50%)` in keyframes
- **Accessibility**: All orbs need `aria-hidden="true"`, `pointer-events-none`, `motion-reduce:animate-none`
- **Performance**: `will-change-transform` on all orbs for compositing layer promotion
- **Z-layering**: Orbs at implicit z-0 via position:absolute, content at `relative z-10`
- **GlowBackground pattern**: `relative overflow-hidden bg-hero-bg` wrapper → orbs → `relative z-10` content wrapper
- **Mobile scaling**: Spec says 40% dimension reduction below `md` breakpoint, 25% blur reduction. Use responsive Tailwind classes.
- **No `animate-glow-float` on JourneySection inline orbs**: Current JourneySection orbs lack the float animation — the spec doesn't add it, so preserve that (they're stationary background orbs)

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 768px (below `md`) | Glow orb dimensions reduced by ~40%, blur reduced from 60px→45px. Opacity unchanged. |
| Tablet | 768px+ (`md`) | Full-size glow orbs (same as desktop) |
| Desktop | 1024px+ (`lg`) | Full-size glow orbs as specified in spec |

Mobile orb size formula: desktop size × 0.6. Example: 900px → 540px, 700px → 420px, 600px → 360px, 500px → 300px, 400px → 240px.
Mobile blur: 60px → 45px, 70px → 52px (round to nearest Tailwind-friendly value: 45px).

---

## Vertical Rhythm

N/A — No changes to section spacing. All sections retain their existing padding (`py-20 sm:py-28` etc.).

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] All 6 target sections identified with current glow implementations
- [x] GlowBackground component architecture understood (variant system + z-index layering)
- [x] Two-stop and three-stop radial gradient patterns defined in spec
- [x] Mobile scaling rules clear (40% dimension reduction, 25% blur reduction below `md`)
- [x] No auth gating needed (purely decorative)
- [x] No [UNVERIFIED] values — all values come from the spec's section-by-section tables

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Keep GlowBackground or inline all orbs? | Keep GlowBackground as wrapper with `variant="none"`, inline orbs | Preserves `bg-hero-bg`, `overflow-hidden`, z-10 pattern while allowing per-section custom orbs |
| JourneySection: add `animate-glow-float`? | No — keep inline orbs stationary | Current JourneySection orbs don't animate; spec doesn't mention adding animation |
| JourneySection: add `will-change-transform`? | Yes | Spec says all orbs should have it for mobile performance |
| GlowBackground `GLOW_CONFIG` cleanup? | Leave existing config — not used by homepage but might be used elsewhere | Out of scope; avoid breaking potential consumers |
| GlowBackground test updates? | Update opacity tests for `center`/`split` variants | These tests assert specific opacity values that won't change (GlowBackground config untouched) |
| Mobile blur value: 52px or 45px? | Use `blur-[45px]` uniformly | 25% reduction of 60px = 45px. For 70px blur, 52.5px rounds to 53px but use 45px for consistency per spec's "blur reduced by 25%" rule applied to the base 60px |
| Orb size classes: explicit px or `scale(0.6)`? | Explicit Tailwind width/height classes per breakpoint | More readable, avoids transform stacking with `animate-glow-float`'s translateY |

---

## Implementation Steps

### Step 1: Update JourneySection Inline Glow Orbs

**Objective:** Replace JourneySection's 2 inline glow orbs with spec values: two-stop radial gradients, higher opacities, responsive sizing, accessibility attributes.

**Files to modify:**
- `frontend/src/components/JourneySection.tsx` — update inline glow orbs (lines 88-98)

**Details:**

Replace the existing glow orbs container (lines 88-98) with:

```tsx
{/* Glow orbs */}
<div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
  {/* Upper orb — behind steps 1-3 */}
  <div
    className="absolute left-1/2 -translate-x-1/2 top-[15%] w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[45px] md:blur-[70px] will-change-transform"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.10) 40%, transparent 70%)',
    }}
  />
  {/* Lower orb — behind steps 5-7 */}
  <div
    className="absolute left-1/2 -translate-x-1/2 bottom-[15%] w-[240px] h-[240px] md:w-[400px] md:h-[400px] rounded-full blur-[45px] md:blur-[70px] will-change-transform"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.20) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)',
    }}
  />
</div>
```

Changes from current:
- Upper orb: opacity 0.15 → 0.25 center + 0.10 at 40% (two-stop). Size 500×500 → 500×500 (unchanged desktop). Position: `left-[20%] top-[20%]` → `left-1/2 -translate-x-1/2 top-[15%]` (center-column aligned per spec). Mobile: 300×300 (60% of 500). Blur: 80px → 70px desktop, new 45px mobile.
- Lower orb: opacity 0.12 → 0.20 center + 0.08 at 40% (two-stop). Size 400×400 → 400×400 (unchanged desktop). Position: `bottom-[20%] right-[15%]` → `left-1/2 -translate-x-1/2 bottom-[15%]` (center-column aligned per spec). Mobile: 240×240 (60% of 400). Blur: 80px → 70px desktop, new 45px mobile.
- Both: add `will-change-transform` for mobile performance.

**Responsive behavior:**
- Desktop (md+): 500×500 upper, 400×400 lower, blur-[70px]
- Mobile (< md): 300×300 upper, 240×240 lower, blur-[45px]

**Guardrails (DO NOT):**
- Do NOT touch the BackgroundSquiggle or StepCircle elements
- Do NOT modify the section padding or max-width
- Do NOT add `animate-glow-float` to these orbs (they were stationary before and spec doesn't add animation)

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Upper orb has 0.25 center opacity | unit | Check `style.background` contains `rgba(139, 92, 246, 0.25)` |
| Lower orb has 0.20 center opacity | unit | Check `style.background` contains `rgba(139, 92, 246, 0.20)` |
| Both orbs have two-stop gradient (40% mid-stop) | unit | Check `style.background` contains `40%` |
| Both orbs have will-change-transform | unit | Check className contains `will-change-transform` |
| Orb count is 2 | unit | Query by aria-hidden divs inside the glow container |

**Expected state after completion:**
- [ ] JourneySection has 2 clearly visible glow orbs with two-stop gradients
- [ ] Orbs are center-column aligned (left-1/2 with translate)
- [ ] Mobile sizes are 60% of desktop
- [ ] Tests pass

---

### Step 2: Update StatsBar Glow (Elliptical Orb)

**Objective:** Replace StatsBar's center glow variant with a custom elliptical glow orb (wider than tall) at 0.30 center opacity.

**Files to modify:**
- `frontend/src/components/homepage/StatsBar.tsx` — change `variant="center"` to `variant="none"` and add inline elliptical orb

**Details:**

Change `<GlowBackground variant="center">` to `<GlowBackground variant="none">`.

Add an inline elliptical glow orb inside the GlowBackground, before the `<section>`:

```tsx
<GlowBackground variant="none">
  {/* Elliptical glow — behind stat numbers */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[180px] md:w-[700px] md:h-[300px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.30) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
    }}
  />
  <section ...>
```

Note: The elliptical shape comes from the w/h ratio (700×300 = 2.33:1 aspect ratio). The `rounded-full` on a rectangular element creates an ellipse. `blur-[60px]` per spec.

Mobile: 420×180 (60% of 700×300). Blur: 45px (75% of 60px).

**Responsive behavior:**
- Desktop (md+): 700×300px, blur-[60px]
- Mobile (< md): 420×180px, blur-[45px]

**Guardrails (DO NOT):**
- Do NOT modify the stat items, grid, or section borders
- Do NOT change the GlowBackground import or wrapper structure
- Do NOT remove the `variant` prop — use `"none"` to suppress default orbs

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| StatsBar has elliptical glow orb | unit | Check for `aria-hidden="true"` div with 0.30 opacity |
| Glow has two-stop gradient | unit | Check `style.background` contains `0.12` at 40% |
| Glow has elliptical dimensions | unit | Check className contains `md:w-[700px]` and `md:h-[300px]` |

**Expected state after completion:**
- [ ] StatsBar has a horizontal elliptical glow visible behind stat numbers
- [ ] Glow uses two-stop gradient at 0.30 center opacity
- [ ] Tests pass

---

### Step 3: Update DashboardPreview Glow (Dramatic Primary + Secondary)

**Objective:** Replace DashboardPreview's center glow with the most dramatic treatment: primary orb (0.40, three-stop) + secondary offset orb (0.25, lighter violet).

**Files to modify:**
- `frontend/src/components/homepage/DashboardPreview.tsx` — change `variant="center"` to `variant="none"` and add 2 inline orbs

**Details:**

Change `<GlowBackground variant="center">` to `<GlowBackground variant="none">`.

Add two inline glow orbs inside the GlowBackground, before the `<section>`:

```tsx
<GlowBackground variant="none">
  {/* Primary glow — dramatic three-stop gradient */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[40%] -translate-y-1/2 w-[540px] h-[360px] md:w-[900px] md:h-[600px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.40) 0%, rgba(139, 92, 246, 0.15) 35%, rgba(139, 92, 246, 0.05) 55%, transparent 70%)',
    }}
  />
  {/* Secondary offset glow — lighter violet */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute right-[5%] top-[30%] -translate-y-1/2 w-[240px] h-[240px] md:w-[400px] md:h-[400px] rounded-full blur-[48px] md:blur-[80px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(168, 130, 255, 0.25) 0%, transparent 70%)',
    }}
  />
  <section ...>
```

Primary orb: 900×600 desktop (540×360 mobile = 60%), three-stop gradient (0.40 → 0.15 at 35% → 0.05 at 55% → transparent 70%), centered at top 40%, blur 60px.
Secondary orb: 400×400 desktop (240×240 mobile), lighter violet color, 0.25 opacity, offset right 5%, top 30%, blur 80px desktop / 48px mobile (60% of 80).

**Responsive behavior:**
- Desktop (md+): Primary 900×600, Secondary 400×400
- Mobile (< md): Primary 540×360, Secondary 240×240

**Guardrails (DO NOT):**
- Do NOT modify the card grid, preview sub-components, or LockOverlay
- Do NOT change the section's max-width, padding, or heading
- Do NOT add any non-glow visual changes

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DashboardPreview has primary glow at 0.40 | unit | Check `style.background` contains `rgba(139, 92, 246, 0.40)` |
| DashboardPreview has secondary glow at 0.25 | unit | Check `style.background` contains `rgba(168, 130, 255, 0.25)` |
| Primary glow uses three-stop gradient | unit | Check `style.background` contains `35%` and `55%` |
| DashboardPreview has 2 glow orbs | unit | Count aria-hidden divs with glow gradients |

**Expected state after completion:**
- [ ] DashboardPreview has dramatic primary glow (0.40 center) with three-stop falloff
- [ ] Secondary lighter violet glow visible offset to the right
- [ ] This is the most visually striking glow after FinalCTA
- [ ] Tests pass

---

### Step 4: Update DifferentiatorSection Glow (Split Left/Right)

**Objective:** Replace DifferentiatorSection's split variant with custom inline left/right orbs at higher opacities and repositioned per spec.

**Files to modify:**
- `frontend/src/components/homepage/DifferentiatorSection.tsx` — change `variant="split"` to `variant="none"` and add 2 inline orbs

**Details:**

Change `<GlowBackground variant="split">` to `<GlowBackground variant="none">`.

Add two inline glow orbs inside the GlowBackground, before the `<section>`:

```tsx
<GlowBackground variant="none">
  {/* Left glow — behind left cards */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute left-[15%] top-[35%] -translate-x-1/2 -translate-y-1/2 w-[360px] h-[300px] md:w-[600px] md:h-[500px] rounded-full blur-[45px] md:blur-[70px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
    }}
  />
  {/* Right glow — lighter violet accent */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute right-[15%] top-[45%] translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] rounded-full blur-[45px] md:blur-[70px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(168, 130, 255, 0.25) 0%, rgba(168, 130, 255, 0.08) 40%, transparent 70%)',
    }}
  />
  <section ...>
```

Left orb: 600×500 desktop (360×300 mobile), primary color at 0.35, positioned left 15% top 35%, blur 70px.
Right orb: 500×500 desktop (300×300 mobile), lighter violet at 0.25, positioned right 15% top 45%, blur 70px.

**Responsive behavior:**
- Desktop (md+): Left 600×500, Right 500×500, blur-[70px]
- Mobile (< md): Left 360×300, Right 300×300, blur-[45px]

**Guardrails (DO NOT):**
- Do NOT modify the card grid, FrostedCard components, or SectionHeading
- Do NOT change the icon containers or text content
- Do NOT alter the grid layout or spacing

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| DifferentiatorSection has left glow at 0.35 | unit | Check `style.background` contains `rgba(139, 92, 246, 0.35)` |
| DifferentiatorSection has right glow at 0.25 | unit | Check `style.background` contains `rgba(168, 130, 255, 0.25)` |
| Both glows have two-stop gradients | unit | Check both backgrounds contain `40%` mid-stop |
| DifferentiatorSection has 2 glow orbs | unit | Count aria-hidden glow divs |

**Expected state after completion:**
- [ ] Two distinct glow pools visible — left purple, right lighter violet
- [ ] Left glow is brighter (0.35) than right (0.25)
- [ ] Tests pass

---

### Step 5: Update StartingPointQuiz Glow (Centered Focus)

**Objective:** Replace StartingPointQuiz's right variant with a centered focused glow at 0.35 behind the frosted glass quiz container.

**Files to modify:**
- `frontend/src/components/StartingPointQuiz.tsx` — change `variant="right"` to `variant="none"` and add centered inline orb

**Details:**

Change `<GlowBackground variant="right" className="py-20 sm:py-28">` to `<GlowBackground variant="none" className="py-20 sm:py-28">`.

Add a centered glow orb inside the GlowBackground, before the content `<div>`:

```tsx
<GlowBackground variant="none" className="py-20 sm:py-28">
  {/* Focused glow — behind frosted glass quiz container */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-[420px] h-[300px] md:w-[700px] md:h-[500px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.35) 0%, rgba(139, 92, 246, 0.12) 40%, transparent 70%)',
    }}
  />
  <div ref={sectionRef ...}>
```

Size: 700×500 desktop (420×300 mobile), centered at top 45%, 0.35 center opacity with 0.12 at 40%, blur 60px.

Also update the existing **result card glow orb** (lines 119-122) from `0.12` to `0.20` to be visible alongside the now-brighter section glow:

```tsx
style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.20) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)' }}
```

**Responsive behavior:**
- Desktop (md+): 700×500, blur-[60px]
- Mobile (< md): 420×300, blur-[45px]

**Guardrails (DO NOT):**
- Do NOT modify quiz questions, result logic, or KaraokeTextReveal
- Do NOT change the frosted glass container styling
- Do NOT touch the light-mode (`!isDark`) branch of the component

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| Quiz section has centered glow at 0.35 | unit | Check `style.background` contains `rgba(139, 92, 246, 0.35)` |
| Quiz glow is centered (left-1/2) | unit | Check className contains `left-1/2` |
| Result card glow updated to 0.20 | unit | Show result, check result glow opacity |

**Expected state after completion:**
- [ ] Visible purple glow behind/through the frosted glass quiz container
- [ ] Glow is centered (not right-positioned as before)
- [ ] Result card glow also upgraded
- [ ] Tests pass

---

### Step 6: Update FinalCTA Glow (Strongest on Page)

**Objective:** Replace FinalCTA's combined glow (center variant + inline 0.18 orb) with a single dramatic three-stop gradient at 0.50 center opacity — the emotional climax of the page.

**Files to modify:**
- `frontend/src/components/homepage/FinalCTA.tsx` — change `variant="center"` to `variant="none"`, replace inline orb with spec values

**Details:**

Change `<GlowBackground variant="center" className="py-20 sm:py-28">` to `<GlowBackground variant="none" className="py-20 sm:py-28">`.

Replace the existing inline glow orb (lines 14-21) with the spec's strongest glow:

```tsx
<GlowBackground variant="none" className="py-20 sm:py-28">
  {/* Strongest glow on entire page — emotional climax */}
  <div
    aria-hidden="true"
    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[360px] md:w-[800px] md:h-[600px] rounded-full blur-[45px] md:blur-[60px] will-change-transform animate-glow-float motion-reduce:animate-none"
    style={{
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.50) 0%, rgba(139, 92, 246, 0.20) 35%, rgba(139, 92, 246, 0.05) 55%, transparent 70%)',
    }}
  />
  <div ref={ref ...} className="relative z-10 ...">
```

Single orb: 800×600 desktop (480×360 mobile), three-stop gradient (0.50 → 0.20 at 35% → 0.05 at 55% → transparent 70%), centered, blur 60px. This replaces both the old center variant orb (0.15) and the old inline orb (0.18).

**Responsive behavior:**
- Desktop (md+): 800×600, blur-[60px]
- Mobile (< md): 480×360, blur-[45px]

**Guardrails (DO NOT):**
- Do NOT modify the heading, subtitle, or CTA button
- Do NOT change the button's existing glow shadow or hover behavior
- Do NOT alter the scroll reveal animation

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| FinalCTA glow has 0.50 center opacity | unit | Check `style.background` contains `rgba(139, 92, 246, 0.50)` |
| FinalCTA glow uses three-stop gradient | unit | Check background contains `35%` and `55%` stops |
| FinalCTA has single glow orb (not 2) | unit | Count glow orbs — should be 1 (was 2: center variant + inline) |
| Glow is the brightest on the page | unit | 0.50 > all other section opacities |

**Expected state after completion:**
- [ ] FinalCTA has the BRIGHTEST glow on the entire page (0.50 center)
- [ ] Three-stop gradient creates dramatic falloff
- [ ] Only 1 glow orb (previous had 2: variant + inline)
- [ ] Tests pass

---

### Step 7: Update GlowBackground Tests

**Objective:** Update GlowBackground tests to account for the fact that homepage sections now use `variant="none"`. The existing variant tests still pass because GlowBackground's internal config is unchanged — the variants are just no longer used by homepage sections.

**Files to modify:**
- `frontend/src/components/homepage/__tests__/GlowBackground.test.tsx` — no changes needed

**Details:**

The existing 15 GlowBackground tests remain valid because:
- `GLOW_CONFIG` and variant logic are unchanged in `GlowBackground.tsx`
- Tests verify the component's internal behavior, not how consumers use it
- All variant tests (`center`, `split`, `left`, `right`, `none`) still test correct behavior

No modifications needed to this file.

**Actual work in this step:** Run the full test suite to verify nothing is broken.

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- Do NOT modify GlowBackground.tsx's internal GLOW_CONFIG or variants
- Do NOT delete any existing tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| All 15 existing GlowBackground tests pass | regression | Run existing test suite |

**Expected state after completion:**
- [ ] All 15 GlowBackground tests pass unchanged
- [ ] All section-specific tests from Steps 1-6 pass
- [ ] Full test suite passes (5488+ tests)
- [ ] Build passes with 0 errors

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | JourneySection inline glow orbs |
| 2 | — | StatsBar elliptical glow |
| 3 | — | DashboardPreview dramatic glow |
| 4 | — | DifferentiatorSection split glows |
| 5 | — | StartingPointQuiz centered glow |
| 6 | — | FinalCTA strongest glow |
| 7 | 1-6 | Full test suite verification |

Steps 1-6 are independent and can be executed in any order. Step 7 is the final verification gate.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | JourneySection glow orbs | [COMPLETE] | 2026-04-02 | Updated inline orbs in JourneySection.tsx with two-stop gradients (0.25/0.20), responsive sizes, will-change-transform. Updated 4 tests in JourneySection.test.tsx. 20 tests pass. |
| 2 | StatsBar elliptical glow | [COMPLETE] | 2026-04-02 | Changed variant="center" to "none", added elliptical glow orb (700×300, 0.30 center, two-stop). Added 3 tests. 11 tests pass. |
| 3 | DashboardPreview dramatic glow | [COMPLETE] | 2026-04-02 | Changed variant="center" to "none", added primary (0.40, three-stop, 900×600) + secondary (0.25 lighter violet, 400×400). Added 3 tests. 46 tests pass. |
| 4 | DifferentiatorSection split glows | [COMPLETE] | 2026-04-02 | Changed variant="split" to "none", added left (0.35, 600×500) + right (0.25 lighter violet, 500×500). Added 3 tests. 26 tests pass. |
| 5 | StartingPointQuiz centered glow | [COMPLETE] | 2026-04-02 | Changed variant="right" to "none", added centered glow (0.35, 700×500). Updated result card glow 0.12→0.20 with two-stop. Updated 1 test, added 1. 50 tests pass. |
| 6 | FinalCTA strongest glow | [COMPLETE] | 2026-04-02 | Changed variant="center" to "none", replaced dual orbs with single three-stop (0.50, 800×600). Updated 1 test, added 1. 17 tests pass. |
| 7 | Test suite verification | [COMPLETE] | 2026-04-02 | 15 GlowBackground tests pass unchanged. Full suite: 5495 pass, 7 fail (pre-existing: ChunkLoadError, timeout). TypeScript compiles with 0 errors. Build clean. |
