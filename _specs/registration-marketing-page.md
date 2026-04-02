# Feature: Registration Marketing Page

**Master Plan Reference:** N/A — standalone feature

---

## Overview

The `/register` route currently renders a dead-end `ComingSoon` stub with no path forward. Meanwhile, the navbar "Get Started" button opens the auth modal directly, skipping any opportunity to communicate why someone should create an account. This spec replaces the stub with a full cinematic marketing/conversion page that showcases Worship Room's features, builds emotional resonance, and flows into account creation. The "Get Started" navbar button will route here instead of opening the auth modal, creating a proper conversion funnel that communicates the app's value before asking for commitment.

This serves the mission of emotional healing and spiritual support by ensuring visitors understand that Worship Room is a safe, free, private sanctuary — not another paywall-gated productivity app.

---

## User Story

As a **logged-out visitor**, I want to see a compelling overview of everything Worship Room offers so that I understand the value of creating an account and feel excited to join.

---

## Requirements

### Functional Requirements

1. **Navbar "Get Started" button navigates to `/register`** instead of opening the auth modal directly. Both desktop navbar and mobile drawer versions must link to `/register`.
2. **"Log In" button is unchanged** — it continues to open the auth modal to the Login view.
3. **`/register` route renders a new `RegisterPage`** component instead of the `ComingSoon` stub.
4. **Page has 5 sections:** Hero, Feature Showcase (4 cards), Stats, Differentiator Checklist, Final CTA.
5. **Both "Create Your Free Account" CTA buttons** (hero and final) open the auth modal to the Register view via `useAuthModal()`. The modal appears as an overlay — the user stays on `/register`.
6. **"Log in" link in hero section** opens the auth modal to the Login view.
7. **SEO metadata** via the existing `<SEO>` component with title, description, and canonical path. Page is indexable (no `noIndex`).
8. **Scroll-triggered animations** on each section using the existing `useInView()` hook. Feature cards and stats stagger in with delays. All animations respect `prefers-reduced-motion`.

### Non-Functional Requirements

- **Performance:** Text + CSS only — no images, videos, or heavy assets. Page should load instantly.
- **Accessibility:** Proper heading hierarchy (single `h1` in hero, `h2` for each section), descriptive button labels, all touch targets >= 44px, keyboard navigable.

---

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View page | Full page visible, all sections | Same (page is useful as a feature overview even if logged in) | — |
| Click "Create Your Free Account" | Auth modal opens to Register view | Auth modal opens to Register view (same behavior — real auth is Phase 3) | Standard register form |
| Click "Log in" link | Auth modal opens to Login view | Auth modal opens to Login view | Standard login form |
| Close auth modal | Returns to `/register`, scroll position preserved | Same | — |

**Note:** This page is fully public. No content is gated behind authentication. The auth modal is triggered only by explicit CTA clicks.

---

## Page Structure

### Section 1: Hero

- **Heading:** "Your sanctuary is ready." — large, bold, with the white-to-purple gradient text treatment (matching the landing page hero headline style: white to `primary-lt` diagonal gradient fill)
- **Subheading:** "A free, peaceful space for prayer, healing, and growing closer to God — at your own pace."
- **CTA button:** "Create Your Free Account" — primary style, large, rounded-full, centered
- **Secondary text:** "Already have an account? Log in" — muted text with "Log in" as a clickable link that opens the auth modal to Login view
- **Background:** Dark gradient matching the dashboard/inner page dark aesthetic (`hero-dark` to `hero-mid`). Not the cinematic video hero — this is a simpler, text-focused hero.
- **Feel:** Spacious, warm, inviting — like a deep breath

### Section 2: Feature Showcase (4 cards)

Emotionally compelling feature highlights presented as experiences, not tools:

| Card | Icon | Title | Description |
|------|------|-------|-------------|
| AI Prayer | pray emoji | Prayers written for your heart | Tell us how you're feeling, and we'll generate a personalized prayer with ambient sound. No two prayers are ever the same. |
| Growth Garden | seedling emoji | Watch your faith grow | Your personal garden blooms as you pray, journal, and meditate. Every day you show up, it grows. |
| Community | purple heart emoji | You're not alone | Share prayer requests, lift others up, and walk through challenges together with a caring community. |
| Everything | book emoji | Bible, Devotionals, Journal, Meditation, Music, Reading Plans, Challenges, Insights | All in one peaceful place. All free. |

**Layout:** 2x2 grid on desktop/tablet, single column stacked on mobile.
**Card style:** Frosted glass — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` (matches the existing Dashboard Card Pattern). Icon centered above title. Subtle hover: `hover:bg-white/[0.07] transition-colors`.

### Section 3: Stats

**Heading:** "The numbers behind the room"

| Stat | Label |
|------|-------|
| 66 books | of the Bible |
| 50 devotionals | for every season |
| 24 ambient sounds | to find your peace |
| 10 reading plans | to guide your journey |
| 5 seasonal challenges | to grow together |
| Completely free | always |

**Layout:** 3x2 grid on desktop (3 columns, 2 rows), 2x3 grid on mobile (2 columns, 3 rows).
**Style:** Each stat has a large bold number/text (`text-white text-2xl font-bold`) + description below (`text-white/60 text-sm`). Minimal — let the numbers speak.

### Section 4: Differentiator Checklist

**Heading:** "Why Worship Room is different"

Four items with purple check icons:
1. Completely free — no paywall, no trial, no surprise charges
2. No ads — ever. Your prayer time is sacred.
3. No data harvesting — your prayers stay between you and God.
4. Grace-based — we never guilt you for missing a day.

**Style:** Simple vertical list, left-aligned within centered max-width container. Check icon in `text-primary`, item text in `text-white/80`.

### Section 5: Final CTA

- **Heading:** "Ready to step inside?"
- **CTA button:** "Create Your Free Account" — same style as hero CTA
- **Subtext:** "No credit card. No trial period. Just peace."

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Single column throughout. Hero text centered, CTA button full-width. Feature cards stacked single column. Stats in 2-column grid. Checklist left-aligned. Final CTA full-width button. |
| Tablet (640-1024px) | Feature cards in 2x2 grid. Stats in 3-column grid. Hero and final CTA centered with auto-width buttons. |
| Desktop (> 1024px) | Full layout — 2x2 feature cards, 3x2 stats grid (or 6-column row on wide screens). Generous section spacing (`py-16 sm:py-24`). Max content width constrained. |

- All touch targets >= 44px
- No horizontal scrolling at any breakpoint
- CTA buttons: `w-full sm:w-auto` (full-width on mobile, auto on tablet+)

---

## Animation

- Each section fades in with a slight upward Y-translate (200ms duration) when it enters the viewport, using the existing `useInView()` hook
- Feature cards stagger in with 100ms delay between each card
- Stats stagger in with 50ms delay between each stat
- All animations respect `prefers-reduced-motion` — content shows immediately without animation if motion is reduced

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The page is purely informational/marketing content.

---

## Auth & Persistence

- **Logged-out users:** Full page access, no data persistence, no interaction tracking
- **Logged-in users:** Same page content (useful as a feature overview). CTA buttons still open auth modal (harmless in simulated auth state)
- **Route type:** Public
- **localStorage usage:** None

---

## Completion & Navigation

N/A — standalone page, not part of Daily Hub.

---

## Design Notes

- **Background:** Dark theme throughout — `bg-hero-dark` or dashboard gradient (`from-hero-dark to-hero-mid`). No light sections. Continues the cinematic dark aesthetic.
- **Hero gradient text:** Use the white-to-purple gradient text fill pattern seen in the landing page hero headline. The gradient goes from white to `primary-lt` (`#8B5CF6`).
- **Frosted glass cards:** Match the Dashboard Card Pattern from the design system: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`.
- **CTA buttons:** Use the "Primary CTA (rounded)" pattern from the design system recon: `bg-primary text-white font-medium py-3 px-8 rounded-full`. Scale up for hero prominence: `text-lg px-8 py-4`.
- **Section spacing:** Each section uses `py-16 sm:py-24` for generous breathing room between sections.
- **Layout wrapper:** Page uses the existing `Layout` component (Navbar + content + SiteFooter). Navbar is NOT transparent (this is not the landing page).
- **Text opacity:** Follow WCAG AA standards from the design system — primary text `text-white/70` minimum, headings can be `text-white`, secondary/muted text `text-white/60`.
- **Emoji rendering:** Feature card icons use emoji characters — these render natively across all platforms without asset loading.
- **New visual patterns:** The stats grid and differentiator checklist are **new patterns** not captured in the existing design system recon. Values should be marked `[UNVERIFIED]` during planning until verified visually.

---

## Navbar Changes

The "Get Started" button in both desktop navbar and mobile drawer changes from an `onClick` handler (opening the auth modal) to a `<Link to="/register">` (navigating to the register page). The visual styling of the button remains identical — only the behavior changes.

The "Log In" button is completely unchanged.

---

## Out of Scope

- Real authentication (Phase 3)
- `/login` route update (stays as `ComingSoon` stub)
- Email capture or waitlist functionality
- Video content or animated feature demos
- Testimonial carousel (no real testimonials yet)
- A/B testing different page layouts or copy
- Analytics event tracking for conversion funnel
- Social login buttons (OAuth providers)
- Pricing page or plan comparison (the app is free)
- Image assets or screenshots of the app (text + emoji only for fast loading)

---

## Acceptance Criteria

### Navbar Integration
- [ ] "Get Started" button in desktop navbar navigates to `/register` (not auth modal)
- [ ] "Get Started" button in mobile drawer navigates to `/register` (not auth modal)
- [ ] "Get Started" button visual styling is unchanged (same colors, padding, border-radius)
- [ ] "Log In" button still opens the auth modal directly (unchanged behavior)

### Page Content
- [ ] Hero section renders with gradient-filled heading ("Your sanctuary is ready."), subheading, and CTA button
- [ ] 4 feature showcase cards render in frosted glass style with emoji icons, titles, and descriptions
- [ ] Stats section renders with 6 stat items showing real content numbers (66, 50, 24, 10, 5, "Completely free")
- [ ] "Why Worship Room is different" section renders with 4 checkmark items in purple
- [ ] Final CTA section renders with heading, button, and reassurance text

### CTA Behavior
- [ ] "Create Your Free Account" button in hero opens auth modal to Register view
- [ ] "Create Your Free Account" button in final CTA opens auth modal to Register view
- [ ] Auth modal appears as overlay on top of the register page (no navigation)
- [ ] User stays on `/register` after closing the auth modal (scroll position preserved)
- [ ] "Log in" link in hero opens auth modal to Login view

### Design
- [ ] Dark theme throughout — no light-background sections anywhere on the page
- [ ] Hero heading uses gradient text fill (white to purple, matching landing page hero style)
- [ ] Feature cards use frosted glass pattern (`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`)
- [ ] Feature cards have hover effect (`hover:bg-white/[0.07]`)
- [ ] CTA buttons use primary rounded style (`bg-primary text-white rounded-full`)
- [ ] Section spacing is generous (`py-16 sm:py-24` or equivalent)
- [ ] Check icons in differentiator section use `text-primary` color

### Animation
- [ ] Each section fades in with upward Y-translate when scrolled into view
- [ ] Feature cards stagger in with ~100ms delay between each
- [ ] Stats stagger in with ~50ms delay between each
- [ ] All animations disabled when `prefers-reduced-motion` is active (content visible immediately)

### SEO
- [ ] `<SEO>` component renders with title "Get Started — Worship Room"
- [ ] `<SEO>` component renders with description about creating a free account
- [ ] `<SEO>` component renders with `canonicalPath="/register"`
- [ ] Page is NOT marked `noIndex` — it is indexable

### Responsive
- [ ] Mobile (375px): single column layout, full-width CTA buttons, no horizontal scroll
- [ ] Mobile (375px): feature cards stacked single column
- [ ] Mobile (375px): stats in 2-column grid
- [ ] Tablet (768px): feature cards in 2x2 grid
- [ ] Desktop (1440px): full layout with 2x2 cards, 3x2 stats, spacious sections
- [ ] All interactive elements have touch targets >= 44px

### Navigation & Layout
- [ ] Navbar appears on the page (not transparent — standard non-landing-page navbar)
- [ ] Seasonal banner appears if an active liturgical season is detected
- [ ] SiteFooter renders at the bottom
- [ ] All navbar links work from this page

### General
- [ ] The `ComingSoon` component is no longer rendered for `/register`
- [ ] `/login` route behavior is unchanged (still renders `ComingSoon`)
- [ ] Page loads fast — no heavy assets (text + CSS + emoji only)
- [ ] Auth modal functionality works correctly when triggered from this page
- [ ] Heading hierarchy is correct: single `h1` in hero, `h2` for each section heading

### Test Coverage
- [ ] Unit test: `/register` renders RegisterPage (not ComingSoon)
- [ ] Unit test: "Get Started" navbar button renders as link to `/register`
- [ ] Unit test: "Log In" button triggers auth modal
- [ ] Unit test: "Create Your Free Account" triggers auth modal in Register mode
- [ ] Unit test: "Log in" link in hero triggers auth modal in Login mode
- [ ] Unit test: SEO component renders with correct meta tags
- [ ] Unit test: All 4 feature cards render with expected content
- [ ] Unit test: All 6 stats render with expected content
- [ ] Unit test: All 4 differentiator items render
- [ ] Accessibility: heading hierarchy verified (h1 > h2 structure)
- [ ] Accessibility: all buttons have accessible labels
