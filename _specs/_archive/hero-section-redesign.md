# Feature: Hero Section Redesign

## Overview

The landing page hero section is the first thing a visitor sees — it must immediately convey warmth, spiritual invitation, and the promise of AI-powered emotional support. This feature redesigns the top of the home page (`/`) to feature a full-bleed deep purple-to-white gradient background that bleeds behind the navigation bar, a compelling headline and subtitle, and an animated AI input box that demonstrates what users can ask. The goal is to invite visitors into the Worship Room experience before they have taken any action.

---

## User Story

As a **logged-out visitor**, I want to land on a visually stunning home page that immediately communicates what Worship Room offers so that I feel drawn in, emotionally safe, and motivated to try the app.

---

## Requirements

### Layout & Positioning
- The hero section must span the **full viewport width** with **no horizontal padding gaps**
- The hero background (gradient) must extend **behind the navigation bar** — i.e., the navbar overlays the hero, not the other way around. This requires the hero to start at `top: 0` of the viewport, with the navbar rendered on top via `position: fixed` or a transparent-overlay approach on the home page
- The navbar, when rendered over the hero on the home page, should adapt visually so it does not look out of place against a dark purple background (see Design Notes)
- The hero section must be **tall enough** to contain all content comfortably — approximately 85–100vh minimum on desktop

### Gradient Background
- **Color direction**: Dark deep purple (`#1A0B2E` or similar rich dark purple) at the **top and edges**, transitioning to a soft off-white or very pale lavender toward the **lower-center** of the section — mimicking the radial/vignette style seen in the reference image but using purple instead of blue
- **No images, no people** — purely CSS gradient
- Gradient should feel rich and premium, not flat. Consider a radial gradient centered slightly above-center to create a "light source" effect

### Headline
- Text: **"How're you feeling today?"**
- Style: Large, bold, white — same weight and presence as seen in the reference image
- Font: Inter Bold (consistent with design system heading font)
- Size: `3rem` desktop / `2rem` mobile (per design system hero sizing)
- Centered horizontally

### Subtitle
- Text: **"Get AI-powered guidance built on Biblical principles."**
- Style: Softer white (slightly lower opacity, e.g., `rgba(255,255,255,0.85)`) — smaller than the headline
- Font: Inter Regular
- Centered horizontally, positioned directly below the headline with comfortable spacing

### Animated AI Input Box
- Positioned below the subtitle, centered, with a max-width of ~640px on desktop (full-width with padding on mobile)
- **Visual style**: White or very light background for the input field itself, with a glowing AI-style border — recommend a **cyan-to-violet gradient glow** (`#00D4FF` → `#8B5CF6`) using a CSS `box-shadow` or pseudo-element technique. The glow should animate subtly (pulsing or shifting) to convey "AI is listening"
- The input must be **functionally real**: users can click and type their own message. When a user focuses/clicks the input, the placeholder animation stops and clears, enabling free text entry
- **Animated placeholder** (shown only when the input is empty and unfocused): cycles through three demo sentences using a typewriter effect:
  1. `I'm going through a difficult season. What do you recommend I pray about?`
  2. `I want to journal but I don't know where to start. Can you help me?`
  3. `My life is crazy and I can't relax. How can I meditate to calm down?`
- **Typewriter animation behavior** (per sentence):
  1. Characters type in one by one at a natural speed (~50–80ms per character)
  2. Pause at end of sentence (~1.5–2 seconds)
  3. Characters delete one by one at a faster speed (~30ms per character)
  4. Short pause before next sentence begins (~500ms)
  5. Cycle repeats indefinitely
- A **submit arrow button** (right-side of the input, consistent with reference image) allows submitting the text — for MVP this navigates to `/scripture` with the input pre-populated (or triggers the mood/scripture flow)
- The input box must have a proper accessible `<label>` (visually hidden is acceptable if the animated placeholder is descriptively labeled via `aria-label`)

---

## Acceptance Criteria

- [ ] Hero gradient background extends from the very top of the viewport and visually sits behind the navigation bar
- [ ] Headline reads "How're you feeling today?" — large, bold, white, centered
- [ ] Subtitle reads "Get AI-powered guidance built on Biblical principles." — centered, white, softer weight
- [ ] No images, photos, or illustrations appear in the hero section
- [ ] Animated input box cycles through all three placeholder sentences using typewriter effect (type → pause → delete → next)
- [ ] Animation stops and placeholder clears when user focuses the input
- [ ] Input box has an AI-glow border effect (cyan-violet gradient glow) that is visible on all viewport sizes
- [ ] Submit button (arrow icon) is present and keyboard accessible
- [ ] Hero section is fully responsive: mobile (< 640px), tablet (640–1024px), desktop (> 1024px)
- [ ] All interactive elements meet WCAG AA contrast requirements
- [ ] Input has an accessible label (visually hidden or `aria-label`)
- [ ] No page layout shift when animation cycles between sentences

---

## UX & Design Notes

- **Tone**: Inviting, spiritual, peaceful — the dark purple conveys reverence and depth, the white glow suggests hope and light
- **Gradient direction**: Radial, centered slightly above the midpoint — dark purple at corners/edges, brightening toward the center to give a "spotlight from above" effect
- **Navbar behavior on home page**: Keep the navbar's existing white pill-card appearance unchanged. The hero section uses a negative top margin (or equivalent) to slide up behind the navbar, so the white pill visually floats over the dark purple gradient. No changes to the Navbar component's visual style are needed for this feature.
- **AI glow border**: The glow effect should use a `box-shadow` with a spread and a color sampled from the cyan-violet spectrum. Subtle CSS animation (keyframe `opacity` or `box-shadow blur-radius` pulse) gives it life without being distracting
- **Typography**: Inter Bold for headline, Inter Regular for subtitle (matches design system)
- **Responsive layout**: On mobile, headline shrinks to `2rem`, input is full-width with horizontal padding, and subtitle wraps gracefully
- **Animation performance**: Use CSS animations (not JavaScript setInterval for the glow). Use `requestAnimationFrame`-based logic only for the typewriter text loop. Respect `prefers-reduced-motion` — if the user has reduced motion enabled, show the first placeholder sentence statically with no animation
- **Colors**: Deep purple `#1A0B2E` to pale lavender/white. Avoid the app's standard Primary Blue for this section — this is a purple-only zone for the hero

---

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the input box, when submitted, routes to the scripture/mood flow which has crisis detection built into the backend. The hero input itself does not call AI directly; it feeds into the existing `/scripture` flow where crisis detection is already required per `.claude/rules/01-ai-safety.md`
- **User input involved?**: Yes — free-text input. The same safety checks that apply to the scripture page text input apply here (backend crisis classifier, keyword fallback)
- **AI-generated content?**: No — this hero section does not display AI-generated content directly. Content is static (headline, subtitle) or user-written (input text)

---

## Auth & Persistence

- **Logged-out (demo mode)**: Fully accessible. Input text is held in React state only — zero persistence. If user submits, they are routed to `/scripture` with the text pre-filled in that page's state. No cookies, no anonymous IDs
- **Logged-in**: Same behavior. Persistence of the resulting mood/scripture selection happens downstream on the `/scripture` page, not in the hero
- **Route type**: Public (`/` — home page)

---

## Out of Scope

- No images, photos, or illustrations of people (explicitly excluded per user request)
- No Spotify integration or music in the hero section
- No user authentication prompts within the hero itself (a subtle CTA may appear below the fold, but not in the hero)
- No mood buttons (Terrible / Bad / Neutral / Good / Excellent) in the hero — those belong on `/scripture`
- No real-time AI call from the hero input — submission routes to the existing `/scripture` flow
- Multi-language support (English only, per MVP non-goals)
- OAuth / social login buttons
- Any content sections below the hero (feature cards, "how it works", footer) — those are separate features
