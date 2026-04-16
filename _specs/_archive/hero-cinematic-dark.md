# Feature: Hero Section Cinematic Dark Redesign

## Overview

The landing page hero section is a visitor's first impression of Worship Room. This redesign transforms it from a warm purple gradient wash into a cinematic dark experience inspired by modern motion-design sites. The hero retains all existing content (headline, TypewriterInput, quiz link) but reframes it against a full-bleed looping background video with gradient overlays, a new "liquid glass" frosted-border design language, and dramatic gradient-filled typography. The navbar receives a visual refresh to match the dark cinematic tone on the landing page while preserving its structure and behavior on all other pages.

The goal is to create an immediate sense of calm immersion — a "dark sanctuary" feel that draws visitors in before they take any action.

---

## User Story

As a **logged-out visitor**, I want to land on a visually cinematic, immersive hero section that conveys depth, calm, and spiritual invitation so that I feel drawn into the Worship Room experience and compelled to interact with the AI input.

---

## Requirements

### 1. Liquid Glass Design Language

Introduce a reusable "liquid glass" CSS utility that creates a frosted glass effect with a gradient border. This becomes the standard glass treatment used across the hero and navbar:

- Near-transparent background with luminosity blend mode
- Subtle backdrop blur (4px baseline)
- Gradient border using a mask-composite technique (top/bottom edges brighter, middle transparent — creating a "liquid" shimmer)
- Inset box-shadow for subtle depth
- No visible solid border — the gradient pseudo-element border replaces it
- Must work on rounded elements (border-radius inherited)

This utility will be applied to the navbar pill and the TypewriterInput container.

### 2. Dark Cinematic Background

Replace the current purple linear-gradient hero background with a layered approach:

- **Base color**: A near-black with slight purple hue (approximately `#08051A`) — darker than the current `#0D0620`
- **Video layer**: A looping background video positioned behind all content, decorative only (muted, autoplay, no controls). The video plays at reduced opacity (approximately 40%) to remain atmospheric without competing with text
- **Gradient overlays**: Two gradient layers on top of the video — one fading from the dark base color at the top, one fading from the dark base color at the bottom. This creates a vignette effect that keeps the video visible primarily in the center area
- **Content layer**: All text and interactive elements sit above everything

The placeholder video is a blue wave animation from an external CDN. It will be replaced with a Worship Room-appropriate video (calm water, candlelight, nature scenery) in a future iteration.

### 3. Video Fade Behavior

The background video must loop seamlessly with subtle fade transitions:

- **Fade in**: Over the first 0.5 seconds of playback, the video fades from invisible to its max opacity
- **Fade out**: Over the last 0.5 seconds before the video ends, it fades back to invisible
- **Loop**: On the `ended` event, reset to the beginning and play again with the fade-in
- **Max opacity**: Approximately 40% — the video is atmospheric, not a focal point. This should be easily adjustable via a single constant
- **Reduced motion**: If the user has `prefers-reduced-motion` enabled, the video should not render at all. The hero falls back to the static dark base color

### 4. Headline Restyle

Transform the headline from a script (Caveat) font to a cinematic gradient text treatment:

- **Remove** the Caveat/script font — use the default sans-serif (Inter) for a cleaner, more modern feel
- **Scale up** the text size on desktop (larger than the current 72px — approximately 96px or `text-8xl`)
- **Gradient text fill**: A diagonal gradient from white to the primary light purple (`#8B5CF6`), creating a cinematic gradient text effect
- **Text content unchanged**: "How're You Feeling Today?"

### 5. Subtitle and Quiz Link Restyle

- **Subtitle**: Reduce opacity from `white/85` to approximately `white/60` for a more muted, cinematic feel. Text content unchanged.
- **Quiz link**: Reduce opacity to approximately `white/50`. Text content and scroll behavior unchanged.

### 6. TypewriterInput Liquid Glass Treatment

Apply the liquid glass design language to the TypewriterInput component:

- Replace the current glow-pulse animation border with the liquid glass frosted border effect
- The input should have a near-transparent background and feel like it's floating over the video
- The submit button and typewriter animation behavior remain unchanged
- The input must accept the liquid glass styling either through a className prop or through internal modification

### 7. Navbar Liquid Glass Update (Landing Page Only)

On the landing page (where `transparent={true}`), update the navbar pill:

- Replace the current manual glassmorphism (bg-white/[0.08], backdrop-blur, border) with the liquid glass utility
- Add a subtle full-width gradient divider line below the navbar pill (horizontal line from transparent through white/20 back to transparent)

**Scoping**: These visual changes apply ONLY when the navbar is in transparent/landing-page mode. On all other pages, the navbar retains its current appearance.

### 8. Dropdown Menu Dark Treatment (Landing Page Only)

On the landing page, the "Local Support" dropdown menu should use dark styling to match the cinematic hero:

- Dark near-black background with backdrop blur instead of the current white background
- Light text (white/80) with subtle hover states instead of dark text with light hover
- Subtle border (white/10) instead of gray-200

**Scoping**: This dark dropdown styling applies ONLY when the navbar is in transparent/landing-page mode. On all other pages, the dropdown retains its current light styling.

### 9. Hero-to-Content Transition

The hero's bottom gradient overlay must create a smooth visual transition into whatever section follows it (JourneySection). Options:

- The bottom gradient fades from transparent to the dark base color, and the next section begins with a gradient from that dark color to the existing neutral background (#F5F5F5)
- OR the hero's bottom gradient fades directly toward the neutral background

The implementation should inspect what renders below the hero and choose the smoothest approach. A small transitional gradient div between sections may be needed.

---

## Acceptance Criteria

### Visual — Hero Background
- [ ] Hero section background is the near-black color (#08051A or similar) instead of the previous purple gradient
- [ ] A `<video>` element is present in the hero, positioned behind all content, with `autoPlay`, `muted`, `playsInline` attributes
- [ ] Video has `aria-hidden="true"` (decorative only)
- [ ] Two gradient overlay divs are visible — one at the top (fading from dark), one at the bottom (fading from dark)
- [ ] Video opacity never exceeds approximately 40% (atmospheric, not dominant)
- [ ] With `prefers-reduced-motion` enabled, the video element is hidden/not rendered

### Visual — Headline
- [ ] Headline text reads "How're You Feeling Today?" — unchanged
- [ ] Headline does NOT use Caveat/script font — uses Inter (sans-serif)
- [ ] Headline displays a diagonal gradient fill (white to purple #8B5CF6)
- [ ] Headline is larger on desktop than the previous version (approximately `text-8xl` / 96px)

### Visual — Liquid Glass
- [ ] TypewriterInput container displays the liquid glass frosted border effect (gradient border, near-transparent background)
- [ ] TypewriterInput does NOT have the old glow-pulse animation when on the hero
- [ ] Navbar pill on the landing page displays the liquid glass effect (gradient border)
- [ ] A subtle horizontal gradient divider line is visible below the navbar pill on the landing page

### Visual — Dropdown (Landing Page)
- [ ] "Local Support" dropdown on the landing page uses dark styling (dark background, light text, white/10 border)
- [ ] "Local Support" dropdown on OTHER pages (Daily Hub, Prayer Wall, etc.) retains its current light styling (white background, dark text)

### Visual — Subtitle & Quiz Link
- [ ] Subtitle text opacity is reduced (approximately white/60, more muted than before)
- [ ] Quiz link text opacity is reduced (approximately white/50)

### Visual — Transition
- [ ] Smooth gradient transition from the dark hero section into the JourneySection below (no hard color boundary)

### Visual — Responsive
- [ ] At 375px (mobile): headline scales down appropriately, TypewriterInput is full-width with padding, video covers the section, navbar hamburger works
- [ ] At 768px (tablet): layout adapts gracefully between mobile and desktop sizes
- [ ] At 1280px (desktop): headline is large and dramatic, TypewriterInput has comfortable max-width, video fills the section

### Functional — Preserved Behavior
- [ ] TypewriterInput typewriter animation still cycles through all three placeholder sentences
- [ ] TypewriterInput still submits and navigates to `/daily?tab=pray&q=...`
- [ ] Quiz link still scrolls to `#quiz` section
- [ ] Navbar links all work (Daily Hub, Prayer Wall, Music, Local Support dropdown)
- [ ] Mobile hamburger menu opens and closes correctly
- [ ] Dropdown menu opens/closes with hover, click, and keyboard (Escape)
- [ ] Auth modal still triggers appropriately (if applicable)

### Accessibility
- [ ] Video element has `aria-hidden="true"`
- [ ] `prefers-reduced-motion` disables the video entirely
- [ ] Text contrast meets WCAG AA against the dark background (headline gradient text, subtitle, quiz link)
- [ ] All existing keyboard navigation still works (tab order, focus indicators, Escape key for dropdown)
- [ ] Screen reader experience is unchanged (heading structure, landmarks, ARIA labels)

### Tests
- [ ] Existing HeroSection tests still pass (if any)
- [ ] Existing TypewriterInput tests still pass
- [ ] Existing Navbar tests still pass
- [ ] No new test failures introduced

---

## UX & Design Notes

- **Tone**: Dark, immersive, reverent — the near-black background creates a "sanctuary" feel, the subtle video adds life without distraction
- **Video philosophy**: The video is purely atmospheric. It should feel like ambient light or gentle movement in a dark room — not a focal point. The 40% max opacity ensures text always dominates
- **Typography shift**: Moving from Caveat (handwritten script) to Inter (clean sans-serif) creates a more modern, cinematic feel. The gradient text fill replaces the script personality with visual drama
- **Glass design language**: The liquid glass utility creates a consistent frosted-glass treatment that can be reused across the site. It replaces ad-hoc glassmorphism implementations
- **Gradient text**: White-to-purple at ~223 degrees. This creates a reading direction that flows from bright (start) to purple (end), drawing the eye naturally
- **Responsive headline sizing**: `text-5xl` (mobile) / `text-6xl` (sm) / `text-8xl` (lg). The large desktop size creates dramatic impact. If `text-8xl` overflows on smaller desktop viewports, fall back to `text-7xl`
- **Section transition**: The dark-to-light transition between hero and JourneySection is critical. A hard color boundary would break the immersive feel. The gradient must be seamless.

### Design System References

- **Current hero pattern**: See `_plans/recon/design-system.md` → "Hero Section Pattern" for exact current values being replaced
- **Navbar pill**: See `_plans/recon/design-system.md` → component values for the current glassmorphic implementation
- **Color palette**: `hero-dark` (#0D0620), `hero-mid` (#1E0B3E), `primary-lt` (#8B5CF6) from existing palette. New color: `hero-bg` (#08051A) — darker than current `hero-dark`
- **New visual patterns**: The liquid glass utility and gradient text headline are **new patterns** not captured in the current design system recon. Values should be marked `[UNVERIFIED]` during planning until visually confirmed.

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the TypewriterInput on the hero routes to the scripture/pray flow, which has crisis detection. The hero input itself does not call AI directly; crisis detection happens downstream at `/daily?tab=pray`. No changes to crisis detection behavior.
- **User input involved?**: Yes — free-text input via TypewriterInput. Same safety checks apply as current implementation (backend crisis classifier + keyword fallback when Phase 3 AI wiring is active).
- **AI-generated content?**: No — all content in the hero is static (headline, subtitle) or user-written (input text).

---

## Auth & Persistence

- **Logged-out (demo mode)**: Fully accessible. Hero input text is held in React state only — zero persistence. If user submits, they are routed to `/daily?tab=pray` with the text pre-filled. No cookies, no anonymous IDs.
- **Logged-in**: Same behavior. No persistence changes in the hero itself.
- **Route type**: Public (`/` — home page)

### Auth Gating for Interactive Elements

| Element | Logged-Out Behavior | Logged-In Behavior |
|---------|--------------------|--------------------|
| TypewriterInput (type text) | Can type freely | Can type freely |
| TypewriterInput (submit) | Navigates to `/daily?tab=pray&q=...` (existing behavior) | Same |
| Quiz link | Scrolls to `#quiz` | Same |
| Navbar links | All work, no gating | Same |
| Dropdown menu | Opens/closes, links work | Same |

No new auth gates are introduced by this feature. All hero interactions work identically for logged-out and logged-in users.

---

## Out of Scope

- Replacing the placeholder video with a Worship Room-appropriate video (future iteration)
- Logo marquee or social proof section
- Installing new font packages (geist-sans, General Sans)
- shadcn/ui integration or button component variants
- Changes to any page other than the landing page hero and navbar
- Dark mode toggle (the hero is always dark; the rest of the site remains as-is)
- Video animation beyond fade-in/fade-out looping (no playback controls, no scrubbing)
- Changes to the mobile drawer visual structure (only the desktop dropdown gets dark styling)
- Changes to auth flow, AuthModal, or any feature pages
- New route creation or backend changes
- Sections below the hero (JourneySection, GrowthTeasers, Quiz, Footer) — only the transition gradient into JourneySection is in scope
