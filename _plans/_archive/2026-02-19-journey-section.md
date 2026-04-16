# Plan: Homepage Journey Section (Vertical Timeline)

**Branch**: `claude/feature/journey-section`
**Date**: 2026-02-19

---

## Decision Log

- **2026-02-19**: User chose **story-driven steps** over feature cards grid, hub-spoke/orbit, and visual flow/path layouts during brainstorming.
- **2026-02-19**: User chose **vertical stack** with connecting line (over alternating zigzag and horizontal row).
- **2026-02-19**: User chose **numbered circles** (no icon library) and **clickable links** to feature pages.
- **2026-02-19**: Step 4 titled **"Music"** (not "Worship") to match the navbar label and `/music` route. Consistency across the site prevents user confusion.
- **2026-02-19**: `role="list"` added explicitly to `<ol>`. Tailwind preflight applies `list-style: none`, which causes Safari VoiceOver to strip list semantics. Explicit role preserves "list, 6 items" announcement.
- **2026-02-19**: Scroll animation uses a **single `useInView` observer** on the `<ol>` container (not one per step). 1 observer for 6 steps is more performant and simpler.
- **2026-02-19**: `transitionDelay` resets to `0ms` when `inView` is `false`. Without this, navigating back to the page would show staggered delays before elements appear, which looks broken.

---

## Context

The homepage currently renders only `<Navbar transparent />` + `<HeroSection />` — nothing below the fold. A first-time visitor has no context for what the site offers beyond the AI input box.

This feature adds a **"Your Journey to Healing"** section directly below the hero that tells a connected story: how Pray, Journal, Meditate, Music, Prayer Wall, and Local Support work together as a single healing experience. The section uses a vertical timeline with numbered steps, each linking to its feature page.

The user's primary concern is **minimal spacing** between the hero and this section — the next content should feel close, starting in the white space where the hero gradient ends.

---

## Design

### Headline & Subtitle
- **h2**: "Your Journey to Healing"
- **Subtitle**: "From prayer to community, every step draws you closer to peace."

### 6 Steps (narrative arc: inward reflection -> outward connection)

| # | Title | Route | Description |
|---|-------|-------|-------------|
| 1 | Pray | `/pray` | Begin with what's on your heart. Share your feelings and receive a personalized prayer grounded in Scripture. |
| 2 | Journal | `/journal` | Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life. |
| 3 | Meditate | `/meditate` | Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in. |
| 4 | Music | `/music` | Let music carry you deeper. Curated worship playlists matched to where you are right now. |
| 5 | Prayer Wall | `/prayer-wall` | You're not alone. Share prayer requests and lift others up in a safe, supportive community. |
| 6 | Local Support | `/churches` | Find churches and Christian counselors near you. The next step in your healing may be just around the corner. |

### Layout
- Each step: numbered purple circle on the left, title (h3) + description on the right (entire row is a clickable `<Link>`)
- Vertical connecting line (`w-0.5 bg-primary/30`) between circles using `flex-1` inside each step's left column (except last)
- `max-w-2xl` container — keeps the timeline compact and readable
- Same layout on all breakpoints (circle left, content right); circle scales `w-10 h-10` -> `sm:w-12 sm:h-12`
- Hover: `bg-white shadow-sm` + title turns `text-primary` (white/60 on off-white is invisible — needs solid white + shadow for feedback)
- Sits on `#F5F5F5` background, directly below the hero gradient

### Spacing: Hero-to-Journey Transition
The hero already has `pb-20 sm:pb-24 lg:pb-32` bottom padding, and its gradient ends at `#F5F5F5`. To keep the journey section feeling close:
- **Top padding on JourneySection: `pt-8 sm:pt-12`** (minimal — the hero's bottom padding already provides the gap)
- **Bottom padding: `pb-16 sm:pb-20 lg:pb-24`** (normal, since content follows below eventually)
- This keeps the combined visual gap tight without sections colliding

### Scroll Animation
- Single `useInView` hook on the `<ol>` container (1 IntersectionObserver total)
- Returns `[ref, inView]` tuple (ref to attach, boolean for visibility)
- Options: `{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }` — triggers slightly before section fully enters viewport for a natural feel
- Steps stagger in with `transition-delay: ${index * 150}ms` when `inView` is true
- **Critical**: `transitionDelay` must be `'0ms'` when `inView` is false (prevents staggered delays on remount)
- Respects `prefers-reduced-motion` — sets `inView = true` immediately, skipping animation

---

## Heading Hierarchy (Full Page)

| Level | Text | Component |
|-------|------|-----------|
| h1 | "How're You Feeling Today?" | HeroSection |
| h2 | "Your Journey to Healing" | JourneySection |
| h3 | "Pray" | JourneySection step |
| h3 | "Journal" | JourneySection step |
| h3 | "Meditate" | JourneySection step |
| h3 | "Music" | JourneySection step |
| h3 | "Prayer Wall" | JourneySection step |
| h3 | "Local Support" | JourneySection step |

No skipped heading levels. Correct hierarchy throughout.

---

## Accessibility

| Concern | Implementation |
|---------|---------------|
| **Landmark** | `<section aria-labelledby="journey-heading">` — screen readers announce "Your Journey to Healing, region" |
| **Ordered list** | `<ol role="list">` with `<li>` — explicit `role` preserves Safari VoiceOver semantics despite Tailwind's `list-style: none` |
| **Decorative circles** | `aria-hidden="true"` on `<span>` number badges — `<ol>` already provides ordering |
| **Link targets** | Entire step row is a `<Link>` — click target well exceeds 44x44px on all breakpoints |
| **Focus indicators** | `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2` on all links |
| **Keyboard nav** | All 6 steps reachable via Tab; Enter/Space activates link |
| **Reduced motion** | `useInView` detects `prefers-reduced-motion: reduce` and sets `inView = true` immediately (no animation) |
| **Color contrast** | `text-dark` (#2C3E50) on `neutral-bg` (#F5F5F5): ~8.5:1 — passes AAA |
| **Color contrast** | `text-light` (#7F8C8D) on `neutral-bg` (#F5F5F5): ~3.8:1 — passes AA for body text (16px) |
| **Color contrast** | White on `bg-primary` (#6D28D9) circle badges: ~8.6:1 — passes AAA |

---

## Files

| Action | File | What |
|--------|------|------|
| **Create** | `frontend/src/hooks/useInView.ts` | Custom IntersectionObserver hook returning `[ref, inView]` |
| **Create** | `frontend/src/components/JourneySection.tsx` | Vertical timeline component |
| **Create** | `frontend/src/components/__tests__/JourneySection.test.tsx` | 14 tests across 5 categories |
| **Modify** | `frontend/src/test/setup.ts` | Add `IntersectionObserver` mock (fires synchronously with `isIntersecting: true`) |
| **Modify** | `frontend/src/components/index.ts` | Add `JourneySection` export |
| **Modify** | `frontend/src/pages/Home.tsx` | Render `<JourneySection />` after `<HeroSection />` |

**No changes to**: `tailwind.config.js`, `package.json`, `index.css`

---

## Implementation Order

1. `frontend/src/hooks/useInView.ts` — standalone, no dependencies
2. `frontend/src/test/setup.ts` — add IntersectionObserver mock (all new tests depend on this)
3. `frontend/src/components/JourneySection.tsx` — depends on `useInView`
4. `frontend/src/components/__tests__/JourneySection.test.tsx` — verify tests pass
5. `frontend/src/components/index.ts` — add barrel export
6. `frontend/src/pages/Home.tsx` — wire it up
7. Visual check with Playwright (desktop + mobile)

---

## Test Plan

**File**: `frontend/src/components/__tests__/JourneySection.test.tsx`
Requires `MemoryRouter` (component uses `<Link>`).

### Structure & Semantics (4 tests)
1. Renders as a named section landmark (`region` with name "Your Journey to Healing")
2. Renders an h2 heading
3. Renders the subtitle text ("...every step draws you closer to peace")
4. Renders an ordered list with 6 items (`<ol role="list">` with 6 `<li>`)

### Step Content (3 tests)
5. Renders all 6 step title headings (h3): Pray, Journal, Meditate, Music, Prayer Wall, Local Support
6. Renders numbered circles 1-6 in the DOM
7. Renders a description snippet for each step

### Navigation Links (2 tests)
8. Each step links to its correct route (`/pray`, `/journal`, `/meditate`, `/music`, `/prayer-wall`, `/churches`)
9. All 6 links are keyboard-focusable (no `tabindex="-1"`)

### Accessibility (3 tests)
10. Numbered circles have `aria-hidden="true"`
11. Links have `focus-visible:ring-2` classes
12. `<ol>` has explicit `role="list"`

### Animation State (2 tests)
13. Steps have `opacity-100 translate-y-0` when IntersectionObserver triggers (mock fires immediately)
14. Steps have staggered `transitionDelay` values (0ms, 150ms, 300ms, ...)

---

## Potential Pitfalls

**1. Safari VoiceOver strips `<ol>` list semantics**
Tailwind preflight applies `list-style: none` to all lists. Safari VoiceOver removes list semantics when `list-style: none` is active. Fix: add `role="list"` explicitly to the `<ol>`.

**2. `transitionDelay` must reset when `inView` is false**
```
style={{ transitionDelay: inView ? `${index * 150}ms` : '0ms' }}
```
Without the `'0ms'` fallback, navigating away and back causes elements to stagger-delay before appearing (even though they should show instantly on remount).

**3. Hover state must be visible on `#F5F5F5` background**
`bg-white/60` (white at 60% opacity) on near-white is imperceptible. Use `bg-white shadow-sm` for real visual feedback.

**4. Connecting line alignment depends on content height**
The vertical line uses `flex-1` to stretch between circles. If step descriptions vary significantly in length, line lengths vary too. This is intentional — it creates an organic feel. The `pb-8` on content (except last) ensures a minimum gap.

**5. IntersectionObserver mock must fire synchronously for tests**
The mock calls the callback during `observe()` with `isIntersecting: true`. This means `render()` in RTL (wrapped in `act()`) flushes the entire chain: mount -> effect -> observe -> callback -> setInView(true) -> re-render. No `waitFor` needed in tests.

**6. `<Fragment key>` not `<>` if mapping with connectors**
If the component interleaves steps with connector elements in a map, React requires `key` on the wrapping fragment. `<>` shorthand does not accept `key` — must use `<Fragment key={...}>` from `react`. (Only applies if connectors are separate elements; current design puts the line inside each `<li>`, so this may not apply.)

---

## Verification

### Dev Server (`pnpm dev` at `http://localhost:5173`)
- [ ] Section appears below hero on white background with minimal gap
- [ ] Hero gradient fades seamlessly into the journey section
- [ ] All 6 steps visible with numbered purple circles and connecting line
- [ ] Connecting line is visible between circles (not too faint)
- [ ] Each step links to its correct route
- [ ] Hover: white background + shadow appears, title turns purple

### Scroll Animation
- [ ] Steps fade in with visible stagger cascade on scroll
- [ ] No layout shift (CLS) during animation
- [ ] Navigating away and back: steps appear immediately (no re-stagger)

### Responsive
- [ ] 375px (mobile): readable timeline, circles 40px, content wraps naturally
- [ ] 768px (tablet): circles scale to 48px, comfortable spacing
- [ ] 1280px (desktop): centered at `max-w-2xl`, balanced whitespace

### Accessibility
- [ ] Tab through all 6 step links — focus ring visible on each
- [ ] Screen reader: announces "Your Journey to Healing, region" landmark
- [ ] Screen reader: announces "list, 6 items" on the `<ol>`
- [ ] Screen reader: does NOT announce circle numbers (aria-hidden)
- [ ] `prefers-reduced-motion: reduce` — all steps visible immediately, no animation

### Tests & Build
- [ ] `pnpm test` — all 14 new tests pass
- [ ] `pnpm test` — existing HeroSection, TypewriterInput, Navbar tests still pass
- [ ] `pnpm lint` — zero ESLint errors
- [ ] `pnpm build` — TypeScript compiles with zero errors
