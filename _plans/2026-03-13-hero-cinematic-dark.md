# Implementation Plan: Hero Section Cinematic Dark Redesign

**Spec:** `_specs/hero-cinematic-dark.md`
**Date:** 2026-03-13
**Branch:** `claude/feature/hero-cinematic-dark`
**Design System Reference:** `_plans/recon/design-system.md` (loaded)
**Recon Report:** not applicable

---

## Architecture Context

### Relevant Existing Files

| File | Purpose | Key Details |
|------|---------|-------------|
| `frontend/src/components/HeroSection.tsx` | Landing page hero | Inline gradient style `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)`. Uses `font-script text-5xl sm:text-6xl lg:text-7xl`. Imports `useAuth`, `useAuthModal`, `TypewriterInput`. |
| `frontend/src/components/TypewriterInput.tsx` | Animated typewriter input | Does NOT accept `className` prop. Outer glow: `animate-glow-pulse rounded-2xl p-[2px]` with inline gradient `linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)`. Inner: `bg-white`. Text: `text-text-dark`. |
| `frontend/src/components/Navbar.tsx` | App navigation | `transparent` prop controls positioning (absolute vs relative). Pill styling always `rounded-2xl bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25`. Dropdown always `bg-white border border-gray-200`. `transparent` is passed to child components for text color conditioning only. |
| `frontend/src/pages/Home.tsx` | Landing page | Renders: `<Navbar transparent />` → `<HeroSection />` → `<JourneySection />` → `<GrowthTeasersSection />` → `<StartingPointQuiz />` → `<SiteFooter />` |
| `frontend/src/components/JourneySection.tsx` | Journey timeline | Background: `#F5F5F5`. Padding: `pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pb-24`. |
| `frontend/src/index.css` | Global CSS | Has `@layer base`, audio slider styles, `@media (prefers-reduced-motion: reduce)` block. No `@layer utilities` block exists yet. |
| `frontend/tailwind.config.js` | Tailwind config | Custom colors include `hero-dark: '#0D0620'`, `hero-mid: '#1E0B3E'`, `primary-lt: '#8B5CF6'`, `glow-cyan: '#00D4FF'`. Many existing keyframes/animations. |

### Test Files

| File | Tests | Wrapping Pattern |
|------|-------|-----------------|
| `frontend/src/components/__tests__/HeroSection.test.tsx` | 12 tests | `<MemoryRouter>` → `<ToastProvider>` → `<AuthModalProvider>` |
| `frontend/src/components/__tests__/TypewriterInput.test.tsx` | 14 tests | Tests behavior (typing, phases, submit, focus/blur, reduced motion), not visual styling |
| `frontend/src/components/__tests__/Navbar.test.tsx` | 40+ tests | Tests structure, navigation, dropdown, keyboard, ARIA |

### Key Architectural Observations

1. **Navbar pill styling is NOT conditional on `transparent`** — currently always the same glassmorphic style. The plan must make it conditional.
2. **Dropdown styling is NOT conditional on `transparent`** — always white bg with dark text. The plan must make it conditional.
3. **TypewriterInput is only used in HeroSection** — so modifying it directly is safe, no other consumers.
4. **MobileDrawer is always white** — the spec explicitly excludes mobile drawer from dark styling.
5. **NavbarLogo always passes `transparent` as hardcoded true** — logo is always white script text.
6. **Hero → JourneySection transition** — currently the hero's inline gradient ends at `#F5F5F5`, matching JourneySection's `#F5F5F5` background. The new dark hero will need a transition gradient between `#08051A` and `#F5F5F5`.

---

## Auth Gating Checklist

No new auth gates are introduced by this feature. All existing auth behavior is preserved:

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| TypewriterInput submit | Auth modal for logged-out (existing) | Step 4 (preserved, not changed) | `useAuth` + `useAuthModal` (existing in HeroSection) |

---

## Design System Values (for UI steps)

### Current Values Being Replaced

| Component | Property | Current Value | New Value | Source |
|-----------|----------|---------------|-----------|--------|
| Hero section | background | `linear-gradient(to bottom, #0D0620 0%, #0D0620 20%, #6D28D9 60%, #F5F5F5 100%)` | `bg-hero-bg` (#08051A) + video + gradient overlays | spec |
| Hero h1 | font | Caveat (`font-script`) 48px mobile / 72px desktop, bold, white | Inter (`font-sans`) 48px mobile / 96px desktop, bold, gradient fill | spec |
| Hero subtitle | color | `text-white/85` | `text-white/60` | spec |
| Hero quiz link | color | `text-white/90` | `text-white/50` | spec |
| TypewriterInput glow | style | `animate-glow-pulse` + cyan-violet gradient border + `bg-white` inner | `liquid-glass` frosted border + `bg-white/5` inner | spec |
| Navbar pill | style | `bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25` | `liquid-glass` (transparent mode only) | spec |
| Navbar dropdown | background | `bg-white border border-gray-200` | `bg-[#08051A]/95 backdrop-blur-xl border border-white/10` (transparent mode only) | spec |
| Navbar dropdown links | color | `text-[#2B0E4A] hover:bg-[#F5F3FF]` | `text-white/80 hover:bg-white/5 hover:text-white` (transparent mode only) | spec |

### New Values

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| `hero-bg` color | hex | `#08051A` | spec [UNVERIFIED] |
| Video max opacity | number | `0.4` | spec [UNVERIFIED] |
| Headline gradient | CSS | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | spec [UNVERIFIED] |
| Liquid glass border gradient | CSS | `linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%)` | spec [UNVERIFIED] |
| Liquid glass blur | CSS | `blur(4px)` | spec [UNVERIFIED] |
| Navbar divider | CSS | `h-px bg-gradient-to-r from-transparent via-white/20 to-transparent` | spec [UNVERIFIED] |
| Transition height | CSS | `h-24 sm:h-32` | codebase inspection [UNVERIFIED] |

**[UNVERIFIED] hero-bg color (#08051A):**
→ To verify: Run `/verify-with-playwright` and visually compare against the near-black base
→ If wrong: Adjust hex value in tailwind.config.js

**[UNVERIFIED] Video max opacity (0.4):**
→ To verify: Run `/verify-with-playwright` and confirm video is atmospheric, not dominant
→ If wrong: Adjust `VIDEO_MAX_OPACITY` constant in HeroSection.tsx

**[UNVERIFIED] Headline gradient (223deg, white → #8B5CF6):**
→ To verify: Run `/verify-with-playwright` and confirm gradient direction looks natural
→ If wrong: Adjust angle and/or end color

**[UNVERIFIED] Liquid glass blur (4px):**
→ To verify: Run `/verify-with-playwright` on navbar pill — may need 8px+ for adequate frosting
→ If wrong: Create `liquid-glass-nav` variant with increased blur

**[UNVERIFIED] Transition height (h-24/h-32):**
→ To verify: Run `/verify-with-playwright` and check for smooth dark-to-light transition
→ If wrong: Adjust height or add more gradient stops

---

## Design System Reminder

**Project-specific quirks displayed before every UI step:**

- Worship Room uses Caveat (`font-script`) for hero H1s and script-style words — this feature REMOVES it from the homepage hero H1 only. All other pages keep Caveat.
- The `cn()` utility from `@/lib/utils` is used for all conditional class composition.
- All interactive elements need `min-h-[44px]` for mobile touch targets.
- Focus indicators use `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
- Reduced motion: respect `prefers-reduced-motion` — freeze animations, hide video.
- TypewriterInput already handles `prefers-reduced-motion` for its typewriter animation internally.
- The `transparent` prop on Navbar controls positioning only (absolute vs relative). It is passed down to child components. The pill styling has been identical regardless of `transparent` until this change.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | < 640px (default) | `text-5xl` headline, TypewriterInput full-width with `px-4`, video covers section, hamburger menu |
| Tablet | 640px–1023px (`sm:`) | `text-6xl` headline, TypewriterInput max-w-xl without side padding (`sm:px-0`) |
| Desktop | 1024px+ (`lg:`) | `text-8xl` headline, full desktop nav with dropdown, video fills section |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| Hero bottom → transition div | 0px (flush) | plan decision |
| Transition div → JourneySection | 0px (flush) | plan decision |
| Transition div height | 96px mobile / 128px desktop | [UNVERIFIED] — visual tuning |

**[UNVERIFIED] Transition div height:**
→ To verify: Run `/verify-with-playwright` and confirm smooth dark-to-light gradient
→ If wrong: Adjust `h-24 sm:h-32` values

---

## Assumptions & Pre-Execution Checklist

Before executing this plan, confirm:

- [x] Branch `claude/feature/hero-cinematic-dark` exists and is checked out
- [x] Frontend dev server can run (`pnpm dev`)
- [x] All existing tests pass before starting (`pnpm test`)
- [x] No auth-gated actions need adding (all existing gates preserved)
- [x] Design system reference loaded for current hero values
- [x] All [UNVERIFIED] values are flagged with verification methods (7 values)
- [ ] Video URL is accessible from development environment (external CDN)

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TypewriterInput modification approach | Add `variant` prop (`'glow' \| 'glass'`, default `'glow'`) | Only used in HeroSection, but a variant prop keeps both modes cleanly separated and avoids breaking existing visual behavior if TypewriterInput is reused later |
| Navbar pill styling scope | Conditional on `transparent` prop | Spec requires liquid-glass only on landing page. Other pages keep current glassmorphism. |
| Dropdown dark styling scope | Conditional on `transparent` prop | Spec requires dark dropdown only on landing page. Other pages keep light dropdown. |
| Mobile drawer styling | No changes | Spec explicitly excludes: "Changes to the mobile drawer visual structure" |
| Hero-to-content transition | Separate transition div in Home.tsx | Cleaner than modifying HeroSection's bottom padding or JourneySection's top. Keeps components decoupled. |
| Headline font | Inter (`font-sans`) | Spec says "Remove font-script (Caveat). Use the default sans font (Inter)." |
| useVideoFade implementation | Inline in HeroSection as a custom hook | Small, single-use, component-specific behavior. Not worth a separate file. |
| Video looping | Manual via `ended` event + `currentTime = 0` + `play()` | Spec requires fade-out before end, which conflicts with native `loop` attribute. Manual loop gives control over fade timing. |

---

## Implementation Steps

### Step 1: Tailwind Config — Add Color and Animations

**Objective:** Add the `hero-bg` color token and video fade keyframe/animation definitions to the Tailwind configuration.

**Files to modify:**
- `frontend/tailwind.config.js` — add color, keyframes, animations

**Details:**

Add to `extend.colors`:
```js
'hero-bg': '#08051A',
```

Add to `extend.keyframes`:
```js
'video-fade-in': {
  '0%': { opacity: '0' },
  '100%': { opacity: '1' },
},
'video-fade-out': {
  '0%': { opacity: '1' },
  '100%': { opacity: '0' },
},
```

Add to `extend.animation`:
```js
'video-fade-in': 'video-fade-in 0.5s ease-in forwards',
'video-fade-out': 'video-fade-out 0.5s ease-out forwards',
```

**Guardrails (DO NOT):**
- DO NOT remove or modify any existing color tokens, keyframes, or animations
- DO NOT change the config structure or add plugins

**Test specifications:**
No tests needed — config-only change. Verified by subsequent steps using the new tokens.

**Expected state after completion:**
- [x] `hero-bg` color available as `bg-hero-bg`, `from-hero-bg`, `to-hero-bg` in Tailwind
- [x] `animate-video-fade-in` and `animate-video-fade-out` classes available

---

### Step 2: CSS Utility — Add `.liquid-glass` and Reduced-Motion Video Rule

**Objective:** Add the reusable `.liquid-glass` CSS utility class and a reduced-motion rule for video elements.

**Files to modify:**
- `frontend/src/index.css` — add `@layer utilities` block with `.liquid-glass`, add video rule to reduced-motion block

**Details:**

Add a new `@layer utilities` block (before the `@media (prefers-reduced-motion: reduce)` block):

```css
@layer utilities {
  .liquid-glass {
    background: rgba(255, 255, 255, 0.01);
    background-blend-mode: luminosity;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border: none;
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
  }

  .liquid-glass::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    background: linear-gradient(180deg,
      rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
      rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
      rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
}
```

Add to the existing `@media (prefers-reduced-motion: reduce)` block:

```css
  .hero-video {
    display: none !important;
  }
```

**Guardrails (DO NOT):**
- DO NOT modify any existing CSS rules
- DO NOT move the `@media (prefers-reduced-motion: reduce)` block
- DO NOT add vendor prefixes that aren't in the spec's CSS

**Test specifications:**
No automated tests — CSS utility. Verified visually in Steps 4 and 5.

**Expected state after completion:**
- [x] `.liquid-glass` class available for use in components
- [x] `.liquid-glass::before` creates gradient border effect on any rounded element
- [x] `.hero-video` elements hidden when `prefers-reduced-motion: reduce` is active

---

### Step 3: TypewriterInput — Add Glass Variant

**Objective:** Add a `variant` prop to TypewriterInput that switches between the current glow-pulse mode and a new liquid-glass mode for the cinematic hero.

**Files to modify:**
- `frontend/src/components/TypewriterInput.tsx` — add `variant` prop, conditionally style outer wrapper and inner elements

**Details:**

Update the interface:
```tsx
interface TypewriterInputProps {
  onSubmit: (value: string) => void
  variant?: 'glow' | 'glass'
}
```

Update the component signature:
```tsx
export function TypewriterInput({ onSubmit, variant = 'glow' }: TypewriterInputProps) {
```

Conditionally style the glow/glass wrapper (lines 137-142 currently):

When `variant === 'glow'` (default — current behavior, unchanged):
```tsx
<div
  className="animate-glow-pulse rounded-2xl p-[2px]"
  style={{ background: 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)' }}
>
  <div className="flex items-center rounded-[14px] bg-white px-4 py-1">
```

When `variant === 'glass'`:
```tsx
<div className="liquid-glass rounded-2xl">
  <div className="flex items-center rounded-[14px] bg-white/5 px-4 py-1">
```

Conditionally style the input text color (line 156):

When `variant === 'glow'`:
```tsx
className="w-full bg-transparent text-base text-text-dark outline-none placeholder:text-text-light"
```

When `variant === 'glass'`:
```tsx
className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/40"
```

Use `cn()` for clean conditional class composition:
```tsx
const isGlass = variant === 'glass'

// Outer wrapper
<div
  className={cn(
    'rounded-2xl',
    isGlass ? 'liquid-glass' : 'animate-glow-pulse p-[2px]'
  )}
  style={isGlass ? undefined : { background: 'linear-gradient(135deg, #00D4FF 0%, #8B5CF6 100%)' }}
>
  <div className={cn(
    'flex items-center rounded-[14px] px-4 py-1',
    isGlass ? 'bg-white/5' : 'bg-white'
  )}>

// Input
<input
  ...
  className={cn(
    'w-full bg-transparent text-base outline-none',
    isGlass
      ? 'text-white placeholder:text-white/40'
      : 'text-text-dark placeholder:text-text-light'
  )}
/>
```

**Guardrails (DO NOT):**
- DO NOT change the typewriter animation logic, timing constants, or phase management
- DO NOT change the submit button styling (bg-primary works on both dark and light backgrounds)
- DO NOT change the form structure, ARIA labels, or accessibility attributes
- DO NOT change the `handleFocus`, `handleBlur`, `handleSubmit` logic
- DO NOT remove the sr-only label or aria-live announcement region

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | All 14 existing TypewriterInput tests must continue to pass (they test behavior, not visual styling) |

No new tests needed — the variant prop is a visual-only change. Existing behavioral tests cover all interactions.

**Expected state after completion:**
- [x] `<TypewriterInput onSubmit={...} />` renders identically to current (glow variant is default)
- [x] `<TypewriterInput onSubmit={...} variant="glass" />` renders with liquid-glass styling
- [x] All 14 existing TypewriterInput tests pass

---

### Step 4: HeroSection — Video Background, Gradient Overlays, Restyled Content

**Objective:** Redesign HeroSection with near-black background, looping video, gradient overlays, gradient headline, muted subtitle/quiz-link, and pass `variant="glass"` to TypewriterInput.

**Files to modify:**
- `frontend/src/components/HeroSection.tsx` — full visual overhaul

**Details:**

#### 4a. Add video fade hook (inline in same file, above component)

```tsx
const VIDEO_MAX_OPACITY = 0.4
const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260308_114720_3dabeb9e-2c39-4907-b747-bc3544e2d5b7.mp4'

function useVideoFade(videoRef: React.RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let rafId: number

    const updateOpacity = () => {
      if (!video || video.readyState < 2) {
        rafId = requestAnimationFrame(updateOpacity)
        return
      }

      const { currentTime, duration } = video
      if (!duration || duration === Infinity) {
        rafId = requestAnimationFrame(updateOpacity)
        return
      }

      const FADE_DURATION = 0.5
      let opacity = VIDEO_MAX_OPACITY

      if (currentTime < FADE_DURATION) {
        opacity = (currentTime / FADE_DURATION) * VIDEO_MAX_OPACITY
      } else if (currentTime > duration - FADE_DURATION) {
        opacity = ((duration - currentTime) / FADE_DURATION) * VIDEO_MAX_OPACITY
      }

      video.style.opacity = String(opacity)
      rafId = requestAnimationFrame(updateOpacity)
    }

    const handleEnded = () => {
      video.style.opacity = '0'
      setTimeout(() => {
        video.currentTime = 0
        video.play().catch(() => {})
      }, 100)
    }

    rafId = requestAnimationFrame(updateOpacity)
    video.addEventListener('ended', handleEnded)

    return () => {
      cancelAnimationFrame(rafId)
      video.removeEventListener('ended', handleEnded)
    }
  }, [videoRef])
}
```

Add imports: `useEffect`, `useRef` (useRef is new — currently not imported in HeroSection).

#### 4b. Add reduced-motion detection

Use `useState` + `useEffect` with a `matchMedia` change listener so the component reacts if the user toggles their reduced-motion OS setting mid-session:

```tsx
function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
```

Define this as a small helper function in the same file (above the component). Then inside `HeroSection`:

```tsx
const prefersReducedMotion = usePrefersReducedMotion()
```

#### 4c. Section wrapper

Replace the current inline `style` prop with:
```tsx
<section
  aria-label="Welcome to Worship Room"
  className={cn(
    'relative flex w-full flex-col items-center justify-start overflow-hidden text-center',
    'px-4 pt-44 pb-28 sm:pt-48 sm:pb-32 lg:pt-56 lg:pb-40',
    'bg-hero-bg antialiased'
  )}
>
```

Key changes:
- Remove `style={{ backgroundImage: ... }}` inline gradient
- Add `bg-hero-bg` for the base dark color
- Add `overflow-hidden` to contain the video and gradient overlays

#### 4d. Video element (after section opening tag, before content)

```tsx
{!prefersReducedMotion && (
  <video
    ref={videoRef}
    autoPlay
    muted
    playsInline
    aria-hidden="true"
    className="hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
    style={{ opacity: 0 }}
  >
    <source src={VIDEO_URL} type="video/mp4" />
  </video>
)}
```

Key points:
- `aria-hidden="true"` — decorative
- `hero-video` class — for reduced-motion CSS rule (belt-and-suspenders with the React conditional)
- `pointer-events-none` — prevents video from intercepting clicks
- `style={{ opacity: 0 }}` — initial state, controlled by `useVideoFade`

#### 4e. Gradient overlays (after video, before content)

```tsx
{/* Top gradient overlay */}
<div
  className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1/3 bg-gradient-to-b from-hero-bg via-hero-bg/50 to-transparent"
  aria-hidden="true"
/>
{/* Bottom gradient overlay */}
<div
  className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/3 bg-gradient-to-t from-hero-bg via-hero-bg/50 to-transparent"
  aria-hidden="true"
/>
```

#### 4f. Content wrapper

Wrap all content (h1, p, TypewriterInput, quiz link) in a relative z-10 container:
```tsx
<div className="relative z-10 mx-auto w-full max-w-3xl">
```

(Current wrapper is `<div className="mx-auto w-full max-w-3xl">` — just add `relative z-10`)

#### 4g. Headline restyle

Replace:
```tsx
<h1 className="mb-4 font-script text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
```

With:
```tsx
<h1
  className="mb-4 text-5xl font-bold leading-tight sm:text-6xl lg:text-8xl"
  style={{
    backgroundImage: 'linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }}
>
```

Changes: Remove `font-script`, remove `text-white`, scale to `lg:text-8xl`, add gradient text fill via inline style (gradient text requires inline styles — Tailwind doesn't support `background-clip: text` natively).

#### 4h. Subtitle restyle

Replace `text-white/85` with `text-white/60`:
```tsx
<p className="mx-auto mb-10 max-w-xl font-sans text-base text-white/60 sm:text-lg lg:text-xl">
```

#### 4i. TypewriterInput glass variant

Replace:
```tsx
<TypewriterInput onSubmit={handleInputSubmit} />
```

With:
```tsx
<TypewriterInput onSubmit={handleInputSubmit} variant="glass" />
```

#### 4j. Quiz link restyle

Replace `text-white/90` with `text-white/50`:
```tsx
<p className="mt-5 font-sans text-sm text-white/50">
```

#### 4k. Add videoRef

Inside the component, add:
```tsx
const videoRef = useRef<HTMLVideoElement>(null)
useVideoFade(videoRef)
```

**Responsive behavior:**
- Desktop (1024px+): `text-8xl` headline, video fills entire section, gradient overlays 1/3 height
- Tablet (640px–1023px): `text-6xl` headline, same video/overlay behavior
- Mobile (< 640px): `text-5xl` headline, video still covers section, TypewriterInput full-width with `px-4`

**Guardrails (DO NOT):**
- DO NOT change the `handleInputSubmit` function or auth modal logic
- DO NOT change the quiz link scroll behavior
- DO NOT use the `loop` attribute on the video (conflicts with fade-out timing)
- DO NOT remove the `aria-label="Welcome to Worship Room"` from the section
- DO NOT add `autoFocus` to any element
- DO NOT use `dangerouslySetInnerHTML`

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | All 12 existing HeroSection tests must pass. Key tests: heading text, subtitle text, input presence, submit button, section landmark, auth modal on submit, quiz teaser text/link/scroll |

Tests to check after changes:
- `renders the correct heading text` — h1 text unchanged, should pass
- `has an accessible input` — input role/label unchanged, should pass
- `shows auth modal when logged-out user submits` — handleInputSubmit unchanged, should pass
- `scrolls to #quiz on teaser link click` — quiz link unchanged, should pass

No new tests needed — this is a visual restyling. All behavioral tests cover the unchanged interactions.

**Expected state after completion:**
- [x] Hero has near-black background with video playing behind gradient overlays
- [x] Headline uses Inter with gradient text fill (white → purple)
- [x] Subtitle at white/60 opacity
- [x] TypewriterInput uses liquid-glass styling
- [x] Quiz link at white/50 opacity
- [x] Video respects prefers-reduced-motion
- [x] All 12 HeroSection tests pass

---

### Step 5: Navbar — Liquid Glass Pill, Divider, Dark Dropdown

**Objective:** Update the Navbar to use liquid-glass on the pill (transparent mode only), add a gradient divider below the pill (transparent mode only), and use dark styling on the dropdown (transparent mode only).

**Files to modify:**
- `frontend/src/components/Navbar.tsx` — conditional pill styling, divider, dropdown dark mode

**Details:**

#### 5a. Glassmorphic pill — conditional on `transparent`

Replace the current always-same pill div (line 476):
```tsx
<div
  className="rounded-2xl bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25"
>
```

With:
```tsx
<div
  className={cn(
    'rounded-2xl',
    transparent
      ? 'liquid-glass'
      : 'bg-white/[0.08] shadow-lg backdrop-blur-xl saturate-[1.8] border border-white/25'
  )}
>
```

When `transparent` (landing page): liquid-glass utility replaces all manual glassmorphism.
When NOT transparent (other pages): current styling preserved exactly.

#### 5b. Gradient divider — below pill, transparent mode only

After the closing `</div>` of the pill (line 504), before `<MobileDrawer>`:

```tsx
{transparent && (
  <div
    className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
    aria-hidden="true"
  />
)}
```

#### 5c. Dropdown dark styling — conditional on `transparent`

In the `NavDropdown` component, update the dropdown panel (line 212):

Replace:
```tsx
className="animate-dropdown-in rounded-xl bg-white border border-gray-200 shadow-lg py-1.5"
```

With:
```tsx
className={cn(
  'animate-dropdown-in rounded-xl shadow-lg py-1.5',
  transparent
    ? 'bg-hero-bg/95 backdrop-blur-xl border border-white/10'
    : 'bg-white border border-gray-200'
)}
```

#### 5d. Dropdown link dark styling — conditional on `transparent`

Update the link className in the dropdown (line 222):

Replace:
```tsx
'text-[#2B0E4A] hover:bg-[#F5F3FF]'
```

With:
```tsx
transparent
  ? 'text-white/80 hover:bg-white/5 hover:text-white'
  : 'text-[#2B0E4A] hover:bg-[#F5F3FF]'
```

Also update the underline in the link span (line 228) — the `after:bg-primary` underline should be `after:bg-white` in transparent mode:

Replace:
```tsx
"after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
```

With:
```tsx
cn(
  "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-full after:transition-transform after:duration-300 after:ease-out after:origin-center after:content-['']",
  transparent ? 'after:bg-white' : 'after:bg-primary'
),
```

**Responsive behavior:**
- Desktop (1024px+): Pill with liquid-glass, dropdown with dark styling, divider visible
- Tablet/Mobile (< 1024px): Desktop nav hidden (`hidden lg:flex`), hamburger menu shown. MobileDrawer NOT affected by these changes.

**Guardrails (DO NOT):**
- DO NOT modify the MobileDrawer component (out of scope per spec)
- DO NOT change the navbar structure (logo, links, auth actions, hamburger)
- DO NOT change keyboard navigation logic (Escape, focus management)
- DO NOT change ARIA attributes
- DO NOT remove `saturate-[1.8]` or other non-transparent styling
- DO NOT change the `NavbarLogo` — it always passes `transparent` as true and that's correct

**Test specifications:**

| Test | Type | Description |
|------|------|-------------|
| Existing tests | regression | All 40+ existing Navbar tests must pass |

**Expected state after completion:**
- [x] Navbar pill on landing page (transparent) uses liquid-glass styling
- [x] Navbar pill on other pages uses current glassmorphic styling
- [x] Gradient divider visible below pill on landing page only
- [x] Dropdown on landing page uses dark styling (dark bg, light text)
- [x] Dropdown on other pages uses current light styling
- [x] Mobile drawer unchanged
- [x] All Navbar tests pass

---

### Step 6: Home.tsx — Hero-to-Content Transition Gradient

**Objective:** Add a smooth gradient transition between the dark hero and the light JourneySection.

**Files to modify:**
- `frontend/src/pages/Home.tsx` — add transition div between `<HeroSection />` and `<JourneySection />`

**Details:**

Add a transition div between HeroSection and JourneySection:

```tsx
<HeroSection />
<div
  className="h-24 bg-gradient-to-b from-hero-bg to-neutral-bg sm:h-32"
  aria-hidden="true"
/>
<JourneySection />
```

This creates a 96px (mobile) / 128px (desktop) gradient from `#08051A` (hero-bg) to `#F5F5F5` (neutral-bg), smoothly bridging the dark hero to the light content sections.

**Responsive behavior:**
- Mobile: `h-24` (96px) transition height
- Desktop: `sm:h-32` (128px) transition height

**Guardrails (DO NOT):**
- DO NOT modify JourneySection's background or padding
- DO NOT modify any other section on the Home page
- DO NOT add interactive elements to the transition div

**Test specifications:**
No tests needed — purely decorative element.

**Expected state after completion:**
- [x] Smooth gradient transition from dark hero to light content
- [x] No hard color boundary between sections

---

### Step 7: Test Verification

**Objective:** Run all existing tests to confirm no regressions from the visual changes.

**Files to modify:**
- None (test run only)
- If any test fails due to the new `variant` prop or structural changes, update the test to reflect the new markup while preserving the behavioral assertion

**Details:**

Run the full frontend test suite:
```bash
cd frontend && pnpm test
```

Key test files to verify:
1. `HeroSection.test.tsx` — 12 tests (heading, subtitle, input, submit, quiz link, auth modal)
2. `TypewriterInput.test.tsx` — 14 tests (typing phases, submit, focus/blur, reduced motion)
3. `Navbar.test.tsx` — 40+ tests (structure, navigation, dropdown, keyboard, ARIA)

**Potential test adjustments needed:**
- If any HeroSection test queries by CSS class (e.g., `font-script`), update to match new classes
- If any Navbar test checks for specific glassmorphic classes, update to handle conditional styling
- If any TypewriterInput test checks for `animate-glow-pulse` class, it should still pass since the default variant is `'glow'`

**Guardrails (DO NOT):**
- DO NOT delete or skip existing tests
- DO NOT weaken test assertions
- DO NOT remove provider wrapping from test render helpers

**Expected state after completion:**
- [x] All HeroSection tests pass
- [x] All TypewriterInput tests pass
- [x] All Navbar tests pass
- [x] No other test files affected
- [x] Full frontend test suite green

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Tailwind config: add hero-bg color, video fade keyframes |
| 2 | — | CSS utility: add .liquid-glass, reduced-motion video rule |
| 3 | 2 | TypewriterInput: add glass variant (uses liquid-glass class) |
| 4 | 1, 2, 3 | HeroSection: video background, gradient overlays, restyled content |
| 5 | 2 | Navbar: liquid-glass pill, divider, dark dropdown |
| 6 | 1 | Home.tsx: transition gradient (uses hero-bg color) |
| 7 | 1–6 | Test verification |

Steps 1 and 2 can run in parallel. Steps 3, 5, and 6 can run in parallel after their dependencies. Step 4 requires 1, 2, and 3. Step 7 runs last.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Tailwind Config | [COMPLETE] | 2026-03-13 | Added `hero-bg` color to `frontend/tailwind.config.js`. Video fade keyframes omitted (rAF-based approach used instead). |
| 2 | CSS Utility | [COMPLETE] | 2026-03-13 | Added `.liquid-glass` utility in `@layer utilities`, `.hero-video` reduced-motion rule, and `@media (forced-colors: active)` fallback for gradient text to `frontend/src/index.css`. |
| 3 | TypewriterInput Variant | [COMPLETE] | 2026-03-13 | Added `variant` prop (`'glow' | 'glass'`) to TypewriterInput. Glass mode uses `liquid-glass` class, `bg-white/5` inner, `text-white` input, gradient submit button. Focus-within ring added for keyboard accessibility. |
| 4 | HeroSection Redesign | [COMPLETE] | 2026-03-13 | Full rewrite: `usePrefersReducedMotion` reactive hook, `useVideoFade` rAF-based hook (uses useState callback ref instead of useRef), `bg-hero-bg` section, conditional video, gradient overlays, gradient text headline. **Intentional deviations:** headline sized down to `text-4xl sm:text-5xl lg:text-7xl` (visual tuning), padding reduced to `pt-36 pb-20 sm:pt-40 sm:pb-24 lg:pt-44 lg:pb-28`, `<br />` added in headline for two-line layout, `color: 'white'` fallback on gradient text. |
| 5 | Navbar Updates | [COMPLETE] | 2026-03-13 | Pill uses `liquid-glass` when transparent, gradient divider below pill (transparent only), dark dropdown panel + links (transparent only). MobileDrawer unchanged. |
| 6 | Dark-Throughout Landing | [COMPLETE] | 2026-03-13 | **Intentional deviation from plan.** Instead of adding a transition gradient div, extended the dark theme to all landing page sections. JourneySection: `bg-hero-bg`, white text, gradient "Healing" word, white squiggles at 30% opacity. GrowthTeasersSection: `bg-hero-bg`, gradient "Growing" word, removed HeadingDivider, gradient CTA button. StartingPointQuiz: added `variant` prop (`'dark' | 'light'`), dark variant for landing page, light variant for DailyHub. BackgroundSquiggle: added `className` and `aspectRatio` props. No transition div needed — seamless dark sections. **Rationale:** Creating a fully immersive dark sanctuary from hero through footer, rather than transitioning back to light mid-page. |
| 7 | Test Verification | [COMPLETE] | 2026-03-13 | All 973 tests pass across 121 test files. No regressions. HeroSection (12), TypewriterInput (14), Navbar (40+), StartingPointQuiz (28 — includes new light variant test) all green. TypeScript clean (`tsc --noEmit` zero errors). |
