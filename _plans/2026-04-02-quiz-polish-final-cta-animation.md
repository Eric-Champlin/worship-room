# Implementation Plan: HP-7 Quiz Polish + Final CTA + Animation Pass

**Spec:** `_specs/hp-7-quiz-polish-final-cta-animation.md`
**Date:** 2026-04-02
**Branch:** `homepage-redesign` (continue existing)
**Design System Reference:** `_plans/recon/design-system.md` (loaded — ⚠️ stale, see below)
**Recon Report:** not applicable
**Master Spec Plan:** not applicable

> ⚠️ Design system recon was captured 2026-03-06, before HP-1 through HP-6 homepage redesign. All homepage section values in the recon are outdated. Current component source files are the authoritative reference for this plan. Consider re-running `/playwright-recon --internal` to capture current homepage values.

---

## Architecture Context

### Project Structure

- Homepage components: `frontend/src/components/homepage/` — GlowBackground, SectionHeading, FrostedCard, FeatureShowcase, StatsBar, PillarSection, DifferentiatorSection, DashboardPreview
- StartingPointQuiz: `frontend/src/components/StartingPointQuiz.tsx` (standalone, not in `homepage/`)
- Quiz data: `frontend/src/components/quiz-data.ts`
- Shared constants: `frontend/src/constants/gradients.tsx` — `WHITE_PURPLE_GRADIENT`, `GRADIENT_TEXT_STYLE`
- Hooks: `frontend/src/hooks/useScrollReveal.ts`, `frontend/src/hooks/useInView.ts`
- Auth: `frontend/src/components/prayer-wall/AuthModalProvider.tsx` — `useAuthModal()`
- Homepage barrel: `frontend/src/components/homepage/index.ts`
- Scroll-reveal CSS: `frontend/src/index.css` — `.scroll-reveal` + `.is-visible` classes
- Home page: `frontend/src/pages/Home.tsx`

### Key Component Patterns

**GlowBackground** (`GlowBackground.tsx`): Wraps content in `relative overflow-hidden bg-hero-bg` (#08051A). Renders decorative glow orbs based on variant (`center|left|right|split|none`). Children wrapped in `relative z-10`. Orb: `radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)`, responsive sizing (300/400/600px), `animate-glow-float`.

**SectionHeading** (`SectionHeading.tsx`): Renders `<h2>` with `GRADIENT_TEXT_STYLE` (white-to-purple gradient text, `text-3xl sm:text-4xl lg:text-5xl font-bold`) + optional tagline (`text-base sm:text-lg text-white/60 mt-3 max-w-2xl`). Accepts `heading`, `tagline`, `align`, `className`. Does NOT currently accept `id` — needs addition.

**FrostedCard** (`FrostedCard.tsx`): `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6 transition-all duration-200 ease-out`. Optional interactive hover states when `onClick` provided.

**useScrollReveal** (`useScrollReveal.ts`): Returns `{ ref, isVisible }`. Options: `threshold=0.1`, `rootMargin='-50px'`, `triggerOnce=true`. Returns `isVisible: true` immediately when `prefers-reduced-motion: reduce`. Exports `staggerDelay(index, baseDelay=100, initialDelay=0)` returning `{ transitionDelay: '...' }`.

**scroll-reveal CSS** (`index.css`): `.scroll-reveal { opacity: 0; transform: translateY(12px); transition: opacity 600ms ease-out, transform 600ms ease-out; }` → `.scroll-reveal.is-visible { opacity: 1; transform: translateY(0); }`. Reduced motion override: immediate visibility, no transition.

### Current Homepage Layout (Home.tsx)

```
<HeroSection />
{/* === Homepage Redesign Sections === */}
<FeatureShowcase />        GlowBackground variant="split"    py-16 sm:py-20 lg:py-24  ← non-standard
<StatsBar />               GlowBackground variant="center"   py-14 sm:py-20 ✓
<PillarSection />          GlowBackground per-pillar          py-20 sm:py-28 ✓
<DifferentiatorSection />  GlowBackground variant="split"    py-20 sm:py-28 ✓
<DashboardPreview />       GlowBackground variant="center"   py-20 sm:py-28 ✓
{/* HP-7: Quiz Polish + FinalCTA */}
{/* === End Homepage Redesign === */}
<StartingPointQuiz />      bg-hero-bg (inline), BackgroundSquiggle  pb-20 pt-16 sm:pb-24 sm:pt-20  ← non-standard
```

### Current StartingPointQuiz State

- Uses internal `BackgroundSquiggle` function (lines 10-72) — NOT the shared `BackgroundSquiggle.tsx`
- Uses `useInView` hook (not `useScrollReveal`) with inline opacity/transform transition
- Custom heading with Caveat "Start?" accent word (not `SectionHeading`)
- `variant` prop (`'dark'|'light'`, default `'dark'`) — light variant is not used on the homepage
- Outer quiz card: `border-white/15 bg-white/[0.08] backdrop-blur-sm rounded-2xl` (dark variant)
- Progress bar: `h-1.5 bg-white/10` track, `WHITE_PURPLE_GRADIENT` fill, inline width transition
- Option buttons: `border-white/15 bg-white/[0.08]` default, `border-primary bg-primary/20` selected
- Result CTA: gradient background (`WHITE_PURPLE_GRADIENT`)

### BackgroundSquiggle Consumers

- **StartingPointQuiz**: Uses its own internal BackgroundSquiggle function (not the shared component). Deleted in this plan.
- **Shared `BackgroundSquiggle.tsx`**: Used by Daily Hub tabs (PrayTabContent, JournalTabContent, MeditateTabContent). **Stays unchanged.**

### Test Patterns

- **Quiz tests** (`components/__tests__/StartingPointQuiz.test.tsx`): MemoryRouter wrapping. `userEvent.setup()` for interaction. `vi.useFakeTimers()` for auto-advance. `selectAndAdvance()` and `answerAllQuestions()` helpers. Semantic queries. 434 lines.
- **Homepage section tests** (`components/homepage/__tests__/`): Mock `useScrollReveal` returning `{ ref: { current: null }, isVisible: true }`. Assert `.scroll-reveal` classes, stagger delays, `bg-hero-bg` class.
- **Home tests** (`pages/__tests__/Home.test.tsx`): MemoryRouter + ToastProvider + AuthModalProvider wrapping. Mock `useAuth`. Assert section presence.
- **DashboardPreview tests**: MemoryRouter + ToastProvider + AuthModalProvider. Mock `useAuthModal`.

### Auth Pattern

`useAuthModal()` from `AuthModalProvider` returns `{ openAuthModal(subtitle?, initialView?) }` or `undefined`. Pattern: `const authModal = useAuthModal()` → `authModal?.openAuthModal(undefined, 'register')`.

---

## Auth Gating Checklist

| Action | Spec Requirement | Planned In Step | Auth Check Method |
|--------|-----------------|-----------------|-------------------|
| Quiz option selection | No auth needed | N/A | N/A |
| Quiz result CTA navigation | No auth needed | N/A | N/A |
| Final CTA "Get Started" button | Opens auth modal (logged-out only) | Step 4 | `useAuthModal().openAuthModal(undefined, 'register')` |

---

## Design System Values (for UI steps)

| Component | Property | Value | Source |
|-----------|----------|-------|--------|
| GlowBackground | background | `bg-hero-bg` (#08051A) | `GlowBackground.tsx:57` |
| GlowBackground orb | gradient | `radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)` | `GlowBackground.tsx:9` |
| SectionHeading | heading font | `text-3xl sm:text-4xl lg:text-5xl font-bold` + `GRADIENT_TEXT_STYLE` | `SectionHeading.tsx:22-23` |
| SectionHeading | tagline | `text-base sm:text-lg text-white/60 mt-3 max-w-2xl` | `SectionHeading.tsx:29-32` |
| FrostedCard | base classes | `bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-6` | `FrostedCard.tsx` |
| WHITE_PURPLE_GRADIENT | value | `linear-gradient(223deg, #FFFFFF 0%, #8B5CF6 100%)` | `constants/gradients.tsx` |
| GRADIENT_TEXT_STYLE | properties | `{ color: 'white', backgroundImage: WHITE_PURPLE_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }` | `constants/gradients.tsx` |
| Frosted button (default) | classes | `bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/70 text-left min-h-[44px]` | Spec |
| Frosted button (hover) | classes | `bg-white/[0.08] border-white/[0.12]` | Spec |
| Frosted button (selected) | classes | `bg-purple-500/20 border-purple-500/30 text-white` | Spec |
| Progress track | classes | `bg-white/[0.06] h-1 rounded-full` | Spec |
| Progress fill | classes | `bg-gradient-to-r from-purple-500 to-white/80` + `transition-all duration-300 ease-out` | Spec |
| Result glow | classes | `w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px]` | Spec `[UNVERIFIED]` |
| Result CTA | classes | `bg-white text-hero-bg font-semibold px-6 py-3 rounded-full` | Spec |
| Final CTA heading | font + gradient | `text-3xl sm:text-4xl lg:text-5xl font-bold` + `GRADIENT_TEXT_STYLE` | Spec |
| Final CTA subtext | classes | `text-white/55 text-base sm:text-lg mt-4 max-w-xl mx-auto leading-relaxed` | Spec |
| Final CTA button | classes | `bg-white text-hero-bg font-semibold px-8 py-3.5 rounded-full text-base sm:text-lg hover:bg-white/90 transition-colors duration-200 mt-8` | Spec |
| Final CTA trust | classes | `text-white/30 text-xs mt-4 tracking-wide` | Spec |
| Standard section padding | classes | `py-20 sm:py-28` | Spec |
| StatsBar padding | classes | `py-14 sm:py-20` (compact) | Spec |

---

## Design System Reminder

**Project-specific quirks for `/execute-plan` to display before every UI step:**

- `WHITE_PURPLE_GRADIENT` is `linear-gradient(223deg, ...)` — NOT 135deg
- GlowBackground uses `bg-hero-bg` (#08051A), NOT `bg-hero-dark` (#0D0620) — different colors
- All scroll-reveal sections use `scroll-reveal` + `is-visible` CSS classes (defined in `index.css`), NOT inline opacity/transform styles
- `useScrollReveal` returns `{ ref, isVisible }` (object destructuring); `useInView` returns `[ref, inView]` (array destructuring) — different API
- `staggerDelay(index, baseDelay, initialDelay)` returns `{ transitionDelay: '...' }` as CSSProperties — apply via `style` prop
- FrostedCard uses `bg-white/[0.05]` (bracket notation for 5%) — be precise with opacity values
- SectionHeading does NOT currently accept an `id` prop — Step 1 adds it
- jsdom doesn't resolve `aria-labelledby` accessible names — use `container.querySelector()` or `getByText()` as fallback in tests
- `prefers-reduced-motion`: useScrollReveal returns `isVisible: true` immediately; CSS class has `@media (prefers-reduced-motion: reduce)` override
- Worship Room uses Caveat (`font-script`) for decorative accents, but SectionHeading uses Inter with `GRADIENT_TEXT_STYLE` — do NOT add Caveat to SectionHeading
- GlowBackground children are wrapped in `relative z-10` — extra glow divs inside children need to be `absolute` with content at higher z-index

---

## Shared Data Models (from Master Plan)

N/A — no master plan for this spec.

**localStorage keys this spec touches:** None. Quiz is 100% React state. FinalCTA triggers auth modal only. No localStorage reads or writes.

---

## Responsive Structure

| Breakpoint | Width | Key Layout Changes |
|-----------|-------|--------------------|
| Mobile | 375px (< 640px) | Quiz options stack full-width. Result card full-width. FinalCTA heading `text-3xl`. Progress bar full-width. All sections single-column. |
| Tablet | 768px (640-1024px) | Quiz options natural width within `max-w-5xl`. Result card with standard glow. FinalCTA heading `text-4xl`. `px-6` side padding. |
| Desktop | 1440px (> 1024px) | Quiz comfortable spacing within `max-w-5xl`. FinalCTA heading `text-5xl`. Full glow effects. |

---

## Vertical Rhythm

| From → To | Expected Gap | Source |
|-----------|-------------|--------|
| DashboardPreview → StartingPointQuiz | `py-20 sm:py-28` each section (seamless `bg-hero-bg`) | Spec + codebase |
| StartingPointQuiz → FinalCTA | `py-20 sm:py-28` each section (seamless `bg-hero-bg`) | Spec |
| FinalCTA → SiteFooter | FinalCTA `py-20 sm:py-28`, footer has own padding | Spec + codebase |
| FeatureShowcase → StatsBar | FeatureShowcase `py-20 sm:py-28` (post-fix), StatsBar `py-14 sm:py-20` | Spec (post-fix) |

---

## Assumptions & Pre-Execution Checklist

- [ ] `homepage-redesign` branch is checked out and up to date
- [ ] HP-1 through HP-6 are committed and stable
- [ ] StartingPointQuiz `variant="light"` is not used anywhere on the homepage — changes focus on dark variant only
- [ ] The shared `BackgroundSquiggle.tsx` is NOT modified (Daily Hub tabs still use it)
- [ ] SectionHeading can accept a new optional `id` prop (non-breaking addition)
- [ ] All auth-gated actions from the spec are accounted for (only FinalCTA "Get Started" button)
- [ ] Design system values are from codebase inspection (recon is stale for homepage)
- [ ] All [UNVERIFIED] values are flagged with verification methods
- [ ] Prior HP specs (1-6) are committed on the branch

---

## Edge Cases & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quiz `variant="light"` handling | Leave light variant code paths as-is | Spec says "only the visual wrapper is updated" and all spec changes target dark-themed aesthetics. Light variant is not used on the homepage. |
| GlowBackground variant for quiz | Use `right` instead of `center` | Avoids 3 adjacent `center` variants (DashboardPreview=center, Quiz=???, FinalCTA=center). Spec says "adjust to `left` or `right`" |
| Quiz outer card wrapper (dark) | Remove card wrapper; buttons float on GlowBackground | Frosted glass button styling (`bg-white/[0.05]`) is designed for direct dark backgrounds, not layered inside another frosted card. Result gets FrostedCard. |
| Quiz outer card wrapper (light) | Keep existing card wrapper | Light variant not part of this spec's changes |
| Result card glow div | New pattern — `[UNVERIFIED]` values from spec | No existing equivalent in codebase. Verify visually. |
| SectionHeading `id` prop | Add optional `id` prop to `<h2>` | Needed for quiz `aria-labelledby="quiz-heading"`. Non-breaking addition. |
| Internal BackgroundSquiggle | Delete from StartingPointQuiz; keep shared `BackgroundSquiggle.tsx` | Internal version is quiz-specific; shared version used by Daily Hub tabs |
| FinalCTA visibility | Renders for all visitors on homepage | Homepage only shows for logged-out visitors (logged-in see Dashboard), so auth check is implicit |
| FeatureShowcase padding | Change from `py-16 sm:py-20 lg:py-24` to `py-20 sm:py-28` | Spec Part 3 requirement 4: standard sections use `py-20 sm:py-28` |
| Progress bar position (dark) | Between SectionHeading and question content, within `max-w-[600px]` | Card wrapper removed; progress bar stays near quiz content |
| Quiz stagger timing | Heading 0ms, quiz content 200ms | Matches spec: "heading: 0ms, primary content: 150-200ms" |

---

## Implementation Steps

### Step 1: Add `id` Prop to SectionHeading

**Objective:** Enable SectionHeading to accept an optional `id` prop for the `<h2>` element, needed by the quiz section's `aria-labelledby`.

**Files to create/modify:**
- `frontend/src/components/homepage/SectionHeading.tsx` — add optional `id` prop

**Details:**

Add `id?: string` to `SectionHeadingProps` interface. Pass to `<h2>`:

```tsx
interface SectionHeadingProps {
  heading: string
  tagline?: string
  align?: 'center' | 'left'
  className?: string
  id?: string  // ← add
}

// In the render:
<h2
  id={id}  // ← add
  className="text-3xl sm:text-4xl lg:text-5xl font-bold"
  style={GRADIENT_TEXT_STYLE}
>
```

Non-breaking change — existing consumers don't pass `id` and continue working.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT change any existing styling or behavior of SectionHeading
- DO NOT add any other props beyond `id`
- DO NOT modify any existing SectionHeading consumers

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders h2 with id when provided | unit | Pass `id="test-heading"`, verify `<h2 id="test-heading">` exists |
| renders h2 without id when omitted | unit | Omit `id`, verify no `id` attribute on `<h2>` |

**Expected state after completion:**
- [ ] SectionHeading accepts optional `id` prop and passes it to `<h2>`
- [ ] Existing SectionHeading consumers unchanged
- [ ] New tests pass

---

### Step 2: Quiz Visual Polish — Background, Heading, Container & Scroll Reveal

**Objective:** Replace internal BackgroundSquiggle with GlowBackground, replace custom heading with SectionHeading, standardize container width, and migrate from `useInView` to `useScrollReveal`.

**Files to create/modify:**
- `frontend/src/components/StartingPointQuiz.tsx` — major visual refactor of section wrapper and heading

**Details:**

1. **Delete internal BackgroundSquiggle function** (lines 10-72). Delete entirely — 63 lines of SVG markup.

2. **Update imports:**
   - Remove: `import { useInView } from '@/hooks/useInView'`
   - Add: `import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'`
   - Add: `import { GlowBackground } from '@/components/homepage/GlowBackground'`
   - Add: `import { SectionHeading } from '@/components/homepage/SectionHeading'`

3. **Replace `useInView` with `useScrollReveal`:**
   ```tsx
   // Before:
   const [sectionRef, inView] = useInView<HTMLDivElement>({ threshold: 0.1, rootMargin: '0px 0px -50px 0px' })

   // After:
   const { ref: sectionRef, isVisible } = useScrollReveal()
   ```

4. **Restructure section wrapper (dark variant):**

   Replace the current outer structure (lines 144-273):
   ```tsx
   <section id="quiz" aria-labelledby="quiz-heading">
     {isDark ? (
       <GlowBackground variant="right" className="py-20 sm:py-28">
         <div ref={sectionRef} className="relative mx-auto max-w-5xl px-4 sm:px-6">
           <SectionHeading
             id="quiz-heading"
             heading="Not Sure Where to Start?"
             tagline="Take a 30-second quiz and we'll point you in the right direction."
             align="center"
             className={cn('scroll-reveal mb-10 sm:mb-12', isVisible && 'is-visible')}
           />
           <div
             className={cn('scroll-reveal', isVisible && 'is-visible')}
             style={staggerDelay(1, 200)}
           >
             {/* progress bar + quiz content — moved from Step 3 */}
           </div>
         </div>
       </GlowBackground>
     ) : (
       <div className="bg-white px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20">
         <div ref={sectionRef} className="relative mx-auto max-w-5xl">
           {/* Light variant: keep existing custom heading and all light-variant markup unchanged */}
         </div>
       </div>
     )}
   </section>
   ```

5. **Remove inline transition styles.** The old code uses:
   ```tsx
   className={cn('... transition-all duration-700 ease-out', inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}
   ```
   Replace with scroll-reveal CSS classes. The `sectionRef` div does NOT get scroll-reveal itself — it's the observation target. Children get scroll-reveal classes.

6. **Remove BackgroundSquiggle JSX and its mask container** (lines 150-165 in current file).

**Auth gating:** N/A — quiz requires no auth.

**Responsive behavior:**
- Desktop (1440px): `max-w-5xl` container with `px-6` padding inside GlowBackground
- Tablet (768px): Same container, `px-6` padding via `sm:px-6`
- Mobile (375px): Full-width with `px-4` padding

**Guardrails (DO NOT):**
- DO NOT modify quiz logic, data, scoring, or routing
- DO NOT delete the shared `BackgroundSquiggle.tsx` (used by Daily Hub tabs)
- DO NOT remove the `variant` prop or any light variant code path
- DO NOT use inline opacity/transform styles for scroll reveal — use the `scroll-reveal` CSS class
- DO NOT modify `useInView` hook itself — other components still use it
- DO NOT remove the `id="quiz"` attribute on the `<section>` (scroll target for hero quiz teaser link)

**Test specifications:**
Tests updated in Step 6.

**Expected state after completion:**
- [ ] Quiz dark variant wrapped in `GlowBackground variant="right"`
- [ ] Internal BackgroundSquiggle function deleted (63 lines removed)
- [ ] SectionHeading renders heading with `id="quiz-heading"`
- [ ] `useScrollReveal` used instead of `useInView`
- [ ] Container standardized to `max-w-5xl mx-auto px-4 sm:px-6`
- [ ] Stagger: heading 0ms, content 200ms
- [ ] Light variant wrapper and heading unchanged
- [ ] Build passes

---

### Step 3: Quiz Visual Polish — Buttons, Progress Bar & Result Card

**Objective:** Upgrade quiz option buttons to frosted glass treatment, upgrade progress bar, wrap result card in FrostedCard with glow, and upgrade result CTA button style.

**Files to create/modify:**
- `frontend/src/components/StartingPointQuiz.tsx` — styling updates to quiz card, QuestionCard, and ResultCard sub-components

**Details:**

1. **Add import:** `import { FrostedCard } from '@/components/homepage/FrostedCard'`

2. **Remove outer quiz card wrapper for dark variant.** The current card wrapper (lines ~211-270):
   ```tsx
   // Before (dark variant):
   <div className="relative mx-auto max-w-[600px] overflow-hidden rounded-2xl border shadow-lg border-white/15 bg-white/[0.08] backdrop-blur-sm">

   // After (dark variant):
   <div className="relative mx-auto max-w-[600px]">
   ```
   Keep light variant card styling (`border-gray-200 bg-white shadow-md`) unchanged.

3. **Update progress bar (dark variant).** Move progress bar before the content area (it was at the top of the now-removed card). Update styling:
   ```tsx
   // Track:
   // Before: h-1.5 bg-white/10
   // After:  h-1 bg-white/[0.06] rounded-full

   // Fill:
   // Before: inline style background: WHITE_PURPLE_GRADIENT
   // After:  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-white/80 transition-all duration-300 ease-out"
   //         style={{ width: `${(currentQuestion + 1) * 20}%` }}
   ```
   Keep `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` unchanged.

4. **Update QuestionCard option buttons (dark variant only):**
   ```tsx
   // Before (dark, unselected):
   'border-white/15 bg-white/[0.08] hover:border-white/20 hover:bg-white/15'

   // After (dark, unselected):
   'bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-3 text-white/70 text-left transition-all duration-150 min-h-[44px]'
   // Hover: 'hover:bg-white/[0.08] hover:border-white/[0.12]'

   // Before (dark, selected):
   'border-primary bg-primary/20'

   // After (dark, selected):
   'bg-purple-500/20 border-purple-500/30 text-white'
   ```
   Keep existing `focus-visible` ring styles. Keep light variant classes unchanged.

5. **Wrap result in FrostedCard with glow (dark variant).** In the content area where `ResultCard` renders:
   ```tsx
   {showResult && destination ? (
     <div className="relative">
       {isDark && (
         <div
           aria-hidden="true"
           className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px]"
         />
       )}
       <div key={currentQuestion} className={slideDirection === 'left' ? 'motion-safe:animate-slide-from-right' : 'motion-safe:animate-slide-from-left'}>
         {isDark ? (
           <FrostedCard>
             <ResultCard destination={destination} onRetake={handleRetake} onExploreAll={handleExploreAll} isDark={isDark} />
           </FrostedCard>
         ) : (
           <ResultCard destination={destination} onRetake={handleRetake} onExploreAll={handleExploreAll} isDark={isDark} />
         )}
       </div>
     </div>
   ) : (
     <div key={currentQuestion} className={slideDirection === 'left' ? 'motion-safe:animate-slide-from-right' : 'motion-safe:animate-slide-from-left'}>
       <QuestionCard ... />
     </div>
   )}
   ```

6. **Upgrade result CTA button (dark variant).** In `ResultCard`:
   ```tsx
   // Before (dark):
   className="rounded-full px-8 py-3 text-base font-semibold text-hero-bg"
   style={{ background: WHITE_PURPLE_GRADIENT }}

   // After (dark):
   className="rounded-full bg-white px-6 py-3 text-base font-semibold text-hero-bg hover:bg-white/90 transition-colors duration-200"
   // Remove inline style={{ background: WHITE_PURPLE_GRADIENT }}
   ```
   Keep light variant CTA (`bg-primary text-white`) unchanged. Remove `WHITE_PURPLE_GRADIENT` import only if no other dark-variant code references it (retake button still uses it → keep import).

**Auth gating:** N/A

**Responsive behavior:**
- Desktop (1440px): Result card `max-w-[600px]` with full glow (300px)
- Tablet (768px): Same layout, standard glow
- Mobile (375px): Result card full-width within `max-w-5xl` container

**Guardrails (DO NOT):**
- DO NOT change quiz logic, scoring, or routing
- DO NOT modify KaraokeTextReveal behavior inside ResultCard
- DO NOT remove light variant styling
- DO NOT remove `WHITE_PURPLE_GRADIENT` import (still used by retake button in dark mode)
- DO NOT change the result card text content (heading, description, verse, reference)

**[UNVERIFIED] values:**
- Result card glow: `w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px]`
  → To verify: Run `/verify-with-playwright` and check visual appearance against other glow patterns
  → If wrong: Adjust opacity (0.05-0.15) and blur (60px-100px) to match visual intent

**Test specifications:**
Tests updated in Step 6.

**Expected state after completion:**
- [ ] Quiz option buttons use frosted glass treatment (dark variant)
- [ ] Progress bar: thinner track (`h-1`), gradient fill (Tailwind classes, not inline)
- [ ] Result card wrapped in FrostedCard with purple glow behind (dark variant)
- [ ] Result CTA is solid white button (not gradient)
- [ ] Light variant styling unchanged
- [ ] Build passes

---

### Step 4: Create FinalCTA Component

**Objective:** Create the closing call-to-action section with gradient heading, subtext, auth modal button, trust line, and staggered scroll reveal.

**Files to create/modify:**
- `frontend/src/components/homepage/FinalCTA.tsx` — new file

**Details:**

Full component implementation:

```tsx
import { cn } from '@/lib/utils'
import { GlowBackground } from './GlowBackground'
import { useScrollReveal, staggerDelay } from '@/hooks/useScrollReveal'
import { useAuthModal } from '@/components/prayer-wall/AuthModalProvider'
import { GRADIENT_TEXT_STYLE } from '@/constants/gradients'

export function FinalCTA() {
  const { ref, isVisible } = useScrollReveal()
  const authModal = useAuthModal()

  return (
    <GlowBackground variant="center" className="py-20 sm:py-28">
      {/* Extra glow orb for slightly more intensity than standard sections */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.10) 0%, transparent 70%)',
        }}
      />

      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <h2
          className={cn(
            'scroll-reveal text-3xl font-bold sm:text-4xl lg:text-5xl',
            isVisible && 'is-visible'
          )}
          style={{ ...GRADIENT_TEXT_STYLE, ...staggerDelay(0) }}
        >
          Your Healing Starts Here
        </h2>

        <p
          className={cn(
            'scroll-reveal mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg',
            isVisible && 'is-visible'
          )}
          style={staggerDelay(1, 150)}
        >
          No credit card. No commitment. Just a quiet room where God meets you
          where you are.
        </p>

        <div
          className={cn('scroll-reveal', isVisible && 'is-visible')}
          style={staggerDelay(2, 150)}
        >
          <button
            type="button"
            onClick={() => authModal?.openAuthModal(undefined, 'register')}
            className="mt-8 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-hero-bg transition-colors duration-200 hover:bg-white/90 sm:text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Get Started &mdash; It&apos;s Free
          </button>
          <p className="mt-4 text-xs tracking-wide text-white/30">
            Join thousands finding peace, one prayer at a time.
          </p>
        </div>
      </div>
    </GlowBackground>
  )
}
```

Key decisions:
- **Extra glow div**: Absolute positioned within GlowBackground, opacity 0.10 (vs standard 0.06). Above the standard glow orbs (within children wrapper), below the text content (`relative z-10`).
- **Stagger timing**: Heading 0ms, subtext 150ms, button+trust 300ms (per spec).
- **Auth modal**: `openAuthModal(undefined, 'register')` — same pattern as DashboardPreview.
- **`&mdash;` entity**: Renders as em-dash in "Get Started — It's Free".

**Auth gating:**
- CTA button triggers `authModal?.openAuthModal(undefined, 'register')`
- Homepage only renders for logged-out visitors — FinalCTA visibility is implicit

**Responsive behavior:**
- Desktop (1440px): `text-5xl` heading, `text-lg` subtext, generous `py-28` padding
- Tablet (768px): `text-4xl` heading, `text-lg` subtext, `py-28` padding, `px-6`
- Mobile (375px): `text-3xl` heading, `text-base` subtext, `py-20` padding, `px-4`

**Guardrails (DO NOT):**
- DO NOT add a card wrapper — content floats directly on GlowBackground per spec
- DO NOT use `<Link>` or navigate on button click — auth modal handles the flow
- DO NOT add localStorage reads/writes
- DO NOT use AI-generated content — all text is hardcoded per spec

**Test specifications:**
Tests created in Step 7.

**Expected state after completion:**
- [ ] `FinalCTA.tsx` created in `components/homepage/`
- [ ] Component renders heading, subtext, CTA button, trust line
- [ ] Staggered scroll reveal: 0ms / 150ms / 300ms
- [ ] Auth modal triggered on button click
- [ ] Build passes (after export added in Step 5)

---

### Step 5: Home.tsx Integration & Animation Consistency Pass

**Objective:** Add FinalCTA to homepage, remove HP placeholder comments, fix FeatureShowcase vertical padding for consistency across all sections.

**Files to create/modify:**
- `frontend/src/components/homepage/index.ts` — add FinalCTA export
- `frontend/src/pages/Home.tsx` — add FinalCTA, remove comments
- `frontend/src/components/homepage/FeatureShowcase.tsx` — fix vertical padding

**Details:**

1. **Add FinalCTA export** to `components/homepage/index.ts`:
   ```tsx
   export { FinalCTA } from './FinalCTA'
   ```

2. **Update Home.tsx imports:**
   ```tsx
   import { FeatureShowcase, StatsBar, PillarSection, DifferentiatorSection, DashboardPreview, FinalCTA } from '@/components/homepage'
   ```

3. **Update Home.tsx `<main>` content** — remove all HP placeholder comments, add FinalCTA:
   ```tsx
   <main id="main-content">
     <HeroSection />
     <FeatureShowcase />
     <StatsBar />
     <PillarSection />
     <DifferentiatorSection />
     <DashboardPreview />
     <StartingPointQuiz />
     <FinalCTA />
   </main>
   ```
   Lines to remove:
   - `{/* === Homepage Redesign Sections === */}` (line 58)
   - `{/* HP-7: Quiz Polish + FinalCTA */}` (line 64)
   - `{/* === End Homepage Redesign === */}` (line 65)

4. **Fix FeatureShowcase vertical padding.** In `FeatureShowcase.tsx` line 19:
   ```tsx
   // Before:
   className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"

   // After:
   className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto"
   ```

5. **Verify GlowBackground variant adjacency** (no changes needed — just verify):
   - FeatureShowcase: `split`
   - StatsBar: `center`
   - PillarSection: varies per pillar
   - DifferentiatorSection: `split`
   - DashboardPreview: `center`
   - StartingPointQuiz: `right` (changed in Step 2)
   - FinalCTA: `center`

   No 3+ adjacent same variants. ✓

**Auth gating:** N/A for integration changes.

**Responsive behavior:**
- Desktop (1440px): All sections stack with consistent `py-20 sm:py-28` spacing (StatsBar compact)
- Tablet (768px): Same
- Mobile (375px): Same with `py-20` base padding

**Guardrails (DO NOT):**
- DO NOT change section order beyond adding FinalCTA before SiteFooter
- DO NOT modify HeroSection or SiteFooter
- DO NOT move SiteFooter inside `<main>` (it's correctly outside)
- DO NOT change any section's GlowBackground variant except quiz (already changed in Step 2)
- DO NOT modify FeatureShowcase content or behavior — only its padding

**Test specifications:**
Tests updated in Step 8.

**Expected state after completion:**
- [ ] FinalCTA renders between StartingPointQuiz and SiteFooter
- [ ] All HP-* placeholder comments removed from Home.tsx
- [ ] FinalCTA exported from homepage barrel
- [ ] FeatureShowcase uses `py-20 sm:py-28` (consistent with other standard sections)
- [ ] Section order finalized: Hero → FeatureShowcase → StatsBar → PillarSection → DifferentiatorSection → DashboardPreview → StartingPointQuiz → FinalCTA → (outside main) SiteFooter
- [ ] Build passes

---

### Step 6: Update StartingPointQuiz Tests

**Objective:** Update existing quiz tests to reflect the new visual treatment (GlowBackground, SectionHeading, frosted buttons, FrostedCard result, useScrollReveal) while preserving all quiz logic tests.

**Files to create/modify:**
- `frontend/src/components/__tests__/StartingPointQuiz.test.tsx` — update assertions

**Details:**

1. **Add `useScrollReveal` mock** (module-level). If `useInView` mock exists, replace it:
   ```tsx
   vi.mock('@/hooks/useScrollReveal', () => ({
     useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
     staggerDelay: (i: number, base = 100, initial = 0) => ({
       transitionDelay: `${initial + i * base}ms`,
     }),
   }))
   ```
   Remove any `vi.mock('@/hooks/useInView', ...)` if present.

2. **Update structure/semantics tests:**
   - Verify `bg-hero-bg` class present (GlowBackground) via `container.querySelector('.bg-hero-bg')`
   - Verify heading text "Not Sure Where to Start?" via `screen.getByRole('heading', { level: 2, name: /not sure where to start/i })`
   - Verify heading has `id="quiz-heading"` via `container.querySelector('#quiz-heading')`
   - Verify tagline "Take a 30-second quiz..." via `screen.getByText(/take a 30-second quiz/i)`
   - Verify `aria-labelledby="quiz-heading"` on section via `container.querySelector('section[aria-labelledby="quiz-heading"]')`

3. **Update button styling assertions** (if explicit class checks exist):
   - Verify unselected buttons include `bg-white/[0.05]` (not `bg-white/[0.08]`)
   - Verify selected button includes `bg-purple-500/20` (not `bg-primary/20`)

4. **Update progress bar assertions:**
   - Verify track uses `h-1` class (not `h-1.5`)
   - Verify fill uses gradient classes (`from-purple-500`)

5. **Update result card assertions:**
   - Verify FrostedCard wrapper: look for `backdrop-blur-sm` class on result wrapper
   - Verify glow div: `container.querySelector('.blur-\\[80px\\]')` or by `aria-hidden="true"` within result area
   - Verify CTA link has `bg-white` class (not gradient background)

6. **Remove any BackgroundSquiggle assertions.** If tests check for SVG squiggle paths or BackgroundSquiggle-related elements, remove those assertions.

7. **Preserve ALL quiz logic tests unchanged:**
   - Option selection and auto-advance
   - Back navigation
   - Progress bar value updates
   - Result scoring accuracy
   - Retake quiz reset
   - Explore all scroll behavior
   - KaraokeTextReveal integration
   - Reduced motion handling
   - Keyboard accessibility

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove any quiz logic tests — only update visual/structural assertions
- DO NOT change `selectAndAdvance` or `answerAllQuestions` helper functions unless they reference deleted elements
- DO NOT add assertions that test BackgroundSquiggle (deleted)
- DO NOT use `getByRole` with `aria-labelledby` accessible name resolution (jsdom limitation) — use `container.querySelector` or `getByText`

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders GlowBackground wrapper | unit | Check `bg-hero-bg` class in container |
| renders SectionHeading with correct text | unit | Heading text + `id="quiz-heading"` |
| renders tagline | unit | "Take a 30-second quiz..." text present |
| option buttons have frosted glass styling | unit | Check `bg-white/[0.05]` on unselected buttons |
| selected option has purple highlight | unit | After click, check `bg-purple-500/20` |
| progress bar uses thin track | unit | Check `h-1` class (not `h-1.5`) |
| result card wrapped in FrostedCard | unit | Check `backdrop-blur-sm` on result wrapper |
| result card has glow div | unit | Check `blur-[80px]` element present after answering all questions |
| result CTA is solid white button | unit | Check `bg-white` class on CTA link |
| scroll-reveal classes applied | unit | Check `.scroll-reveal` classes in container |

**Expected state after completion:**
- [ ] All updated quiz visual tests pass
- [ ] All preserved quiz logic tests still pass
- [ ] No test references BackgroundSquiggle or useInView
- [ ] Test file uses `useScrollReveal` mock

---

### Step 7: Create FinalCTA Tests

**Objective:** Add comprehensive tests for the FinalCTA component covering rendering, auth modal integration, scroll reveal, and accessibility.

**Files to create/modify:**
- `frontend/src/components/homepage/__tests__/FinalCTA.test.tsx` — new test file

**Details:**

**Provider wrapping pattern** (matches DashboardPreview test):
```tsx
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock useScrollReveal
vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, isVisible: true }),
  staggerDelay: (i: number, base = 100, initial = 0) => ({
    transitionDelay: `${initial + i * base}ms`,
  }),
}))

// Mock useAuthModal
const mockOpenAuthModal = vi.fn()
vi.mock('@/components/prayer-wall/AuthModalProvider', () => ({
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}))
```

Render helper:
```tsx
function renderFinalCTA() {
  return render(
    <MemoryRouter>
      <FinalCTA />
    </MemoryRouter>
  )
}
```

Reset `mockOpenAuthModal` in `beforeEach`.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT test GlowBackground internals (covered by its own tests)
- DO NOT test GRADIENT_TEXT_STYLE application (that's SectionHeading's concern)
- DO NOT add snapshot tests

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders heading "Your Healing Starts Here" | unit | `getByRole('heading', { level: 2, name: /your healing starts here/i })` |
| renders subtext | unit | `getByText(/no credit card/i)` |
| renders CTA button | unit | `getByRole('button', { name: /get started/i })` |
| renders trust line | unit | `getByText(/join thousands/i)` |
| CTA button opens auth modal | unit | Click button, verify `mockOpenAuthModal` called with `(undefined, 'register')` |
| wrapped in GlowBackground | unit | Check `bg-hero-bg` class in container |
| has extra glow orb | unit | Check for element with `aria-hidden="true"` and radial-gradient style |
| stagger delays applied | unit | Check `.scroll-reveal` elements have incrementing `transitionDelay` values (0ms, 150ms, 300ms) |
| all scroll-reveal elements visible | unit | Check `.is-visible` class applied (mock returns `isVisible: true`) |
| CTA button has type="button" | unit | Verify button is accessible and has correct type |

**Expected state after completion:**
- [ ] FinalCTA test file created at `components/homepage/__tests__/FinalCTA.test.tsx`
- [ ] 10 tests covering structure, behavior, auth, scroll reveal, accessibility
- [ ] All tests pass

---

### Step 8: Update Home Tests & Final Build Verification

**Objective:** Update Home.test.tsx for FinalCTA presence, run full test suite and build to verify everything is clean.

**Files to create/modify:**
- `frontend/src/pages/__tests__/Home.test.tsx` — add FinalCTA assertions

**Details:**

1. **Add FinalCTA render assertions:**
   ```tsx
   it('renders FinalCTA section', () => {
     // ... render Home with existing provider wrapping ...
     expect(screen.getByText(/your healing starts here/i)).toBeInTheDocument()
     expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument()
   })
   ```

2. **Verify section order** (if Home test has an order check):
   FinalCTA content should appear in DOM after quiz content and before footer content.

3. **Verify no HP placeholder comments** (optional — test that removed comments don't appear as rendered text, which they wouldn't since they're JSX comments).

4. **Run full test suite:** `pnpm test` — all tests must pass (existing ~4862 + new tests from Steps 6-7).

5. **Run build:** `pnpm build` — 0 errors, 0 warnings.

**Auth gating:** N/A

**Responsive behavior:** N/A: no UI impact

**Guardrails (DO NOT):**
- DO NOT remove any existing Home.test.tsx assertions
- DO NOT run build with `--force` or skip flags
- DO NOT skip running the full test suite

**Test specifications:**
| Test | Type | Description |
|------|------|-------------|
| renders FinalCTA heading | integration | "Your Healing Starts Here" present in Home render |
| renders FinalCTA button | integration | "Get Started" button present in Home render |

**Expected state after completion:**
- [ ] Home tests updated and passing
- [ ] Full test suite passes (all ~4862+ existing tests + ~22 new tests)
- [ ] Build passes with 0 errors, 0 warnings
- [ ] Ready for visual verification (`/verify-with-playwright /`) and commit

---

## Step Dependency Map

| Step | Depends On | Description |
|------|------------|-------------|
| 1 | — | Add `id` prop to SectionHeading |
| 2 | 1 | Quiz background, heading, container & scroll reveal |
| 3 | 2 | Quiz buttons, progress bar & result card |
| 4 | — | Create FinalCTA component (independent of quiz work) |
| 5 | 2, 3, 4 | Home.tsx integration & animation consistency pass |
| 6 | 2, 3 | Update StartingPointQuiz tests |
| 7 | 4 | Create FinalCTA tests |
| 8 | 5, 6, 7 | Update Home tests & final build verification |

**Parallelizable:** Steps 4 and 7 can proceed in parallel with Steps 2-3 and 6 (they don't share files). Steps 6 and 7 can proceed in parallel.

---

## Execution Log

| Step | Title | Status | Completion Date | Notes / Actual Files |
|------|-------|--------|-----------------|----------------------|
| 1 | Add `id` prop to SectionHeading | [COMPLETE] | 2026-04-02 | Added `id?: string` to SectionHeadingProps, passed to `<h2>`. 2 new tests added. |
| 2 | Quiz background, heading, container & scroll reveal | [COMPLETE] | 2026-04-02 | Deleted BackgroundSquiggle (63 lines), replaced with GlowBackground variant="right". SectionHeading with id="quiz-heading". useScrollReveal replaces useInView. Ref cast needed for type compat. Light variant preserved with inline heading. quizContent extracted as shared JSX variable. |
| 3 | Quiz buttons, progress bar & result card | [COMPLETE] | 2026-04-02 | Dark card wrapper removed. Progress bar: h-1 bg-white/[0.06] track, Tailwind gradient fill. Buttons: frosted glass bg-white/[0.05], selected bg-purple-500/20. Result: FrostedCard + glow div. CTA: solid white bg-white. Light variant unchanged. |
| 4 | Create FinalCTA component | [COMPLETE] | 2026-04-02 | Created FinalCTA.tsx with GlowBackground variant="center", GRADIENT_TEXT_STYLE heading, auth modal button, trust line, stagger 0/150/300ms. Extra glow orb at 0.10 opacity. |
| 5 | Home.tsx integration & animation pass | [COMPLETE] | 2026-04-02 | Added FinalCTA export to barrel, imported in Home.tsx. Removed 3 HP placeholder comments. FeatureShowcase py-16 sm:py-20 lg:py-24 → py-20 sm:py-28. |
| 6 | Update StartingPointQuiz tests | [COMPLETE] | 2026-04-02 | Added useScrollReveal mock. 18 new visual polish tests (GlowBackground, SectionHeading id, frosted buttons, purple selected, thin progress bar, gradient fill, FrostedCard result, glow div, solid white CTA, scroll-reveal classes). All 45 tests pass. All logic tests preserved. |
| 7 | Create FinalCTA tests | [COMPLETE] | 2026-04-02 | 10 tests: heading, subtext, CTA button, trust line, auth modal call, GlowBackground, glow orb, stagger delays (0/150/300ms), is-visible classes, type="button". All pass. |
| 8 | Update Home tests & build verification | [COMPLETE] | 2026-04-02 | 2 new Home tests (FinalCTA heading + button). Used /get started.*free/i to disambiguate from navbar button. Full suite: 5491 pass / 0 fail. TypeScript: 0 errors. Build: workbox-window error is pre-existing (confirmed identical on clean HP-6 commit). |
