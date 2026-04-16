# Feature: Daily Hub Dark Theme

## Overview

The Daily Hub (`/daily`) is one of the most-visited pages in Worship Room, but it currently uses a light/purple-gradient aesthetic that visually clashes with the dashboard and landing page, both of which use a fully dark theme. This spec converts the Daily Hub and all three tab contents (Pray, Journal, Meditate) to a unified dark theme matching the rest of the app. The page should feel like one continuous dark surface from navbar to footer — no light gray sections, no white backgrounds, no visual seams.

This is the first of 6 visual foundation specs that will make the entire app visually uniform. Completing this establishes the dark theme pattern that subsequent specs will replicate across other pages.

## User Story

As a **logged-out visitor or logged-in user**, I want the Daily Hub to have a cohesive dark theme matching the dashboard and landing page, so that navigating between pages feels like one unified, immersive experience rather than jumping between two different visual styles.

## Requirements

### 1. Page Background

- Replace the current `neutral-bg` (#F5F5F5) page background with solid dark (#0f0a1e) extending edge-to-edge from navbar to footer
- Remove any white or light gray background sections between the hero and the footer
- The entire page must feel like one continuous dark surface

### 2. Hero Section

- Replace the current purple-to-white gradient (`Inner Page Hero` pattern from design system recon: `linear-gradient(#0D0620 0%, #1E0B3E 30%, #4A1D96 55%, #F5F5F5 100%)`) with a dark gradient: `from-[#1a0533] to-[#0f0a1e]`
- The hero greeting text ("Good Morning!" / "Good Evening!") stays in Caveat script font — only the background changes
- Remove the floating purple box behind the greeting if one exists; the text sits directly on the dark gradient
- The gradient should blend seamlessly into the dark page background below

### 3. Tab Bar

- The sticky tab bar currently has a light background when scrolling — change to frosted glass: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- Inactive tab text: `text-white/60`
- Active tab text: `text-white`
- The animated primary-color underline stays unchanged
- Tab bar must remain sticky and functional at all breakpoints

### 4. Pray Tab Content

| Element | Current (Light) | New (Dark) |
|---------|----------------|------------|
| Textarea background | White with cyan glow | `bg-white/[0.06]` with same cyan glow-pulse border |
| Textarea input text | Dark text | `text-white` |
| Textarea placeholder | Gray | `text-white/40` |
| Starter chips | Light gray | `bg-white/10 border-white/15 text-white/70` |
| Generated prayer card | White card | `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl` |
| Body text | `text-text-dark` | `text-white/80` |
| Secondary text | `text-text-light` | `text-white/50` |
| KaraokeText highlight | Primary on light | `bg-primary/20` on dark |
| Action buttons (Copy, Read Aloud, Save, Share) | Light styled | `bg-white/10 text-white/70 hover:bg-white/15` |
| "Enhance with sound" pill | Frosted glass | Verify it looks correct on new dark background (already uses frosted glass) |
| Crisis banner | Red | No change needed |
| Section headings (e.g., "What's On Your Heart?") | `text-text-dark` | `text-white` |

### 5. Journal Tab Content

| Element | Current (Light) | New (Dark) |
|---------|----------------|------------|
| Textarea background | White with cyan glow | `bg-white/[0.06]` with cyan glow border |
| Textarea input text | Dark text | `text-white` |
| Textarea placeholder | Gray | `text-white/40` |
| Mode toggle (Guided/Free Write) — unselected | Light gray | `bg-white/10` |
| Mode toggle — selected | Primary | `bg-primary/20` |
| Guided prompt card | Light card | `bg-white/[0.06] border-l-2 border-primary` |
| Saved journal entry cards | White card | `bg-white/[0.06] backdrop-blur-sm border border-white/10` |
| Search/filter bar | Light | `bg-white/[0.06] border border-white/10` |
| Draft saved indicator | Gray | `text-white/50` |
| Character counter | Gray | `text-white/40` |
| Voice input mic button | Already white/10 styled | No change needed |
| Section headings | `text-text-dark` | `text-white` |
| Body/label text | Dark | `text-white/80` |
| Journal milestone toasts | Existing style | Verify they look correct on dark background |

### 6. Meditate Tab Content

| Element | Current (Light) | New (Dark) |
|---------|----------------|------------|
| Meditation cards (6) | `bg-white rounded-xl border border-gray-200 shadow-sm` | `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl` |
| Card titles | `text-text-dark` | `text-white` |
| Card descriptions | Dark gray | `text-white/60` |
| Duration text | Gray | `text-white/40` |
| Hover state | `hover:shadow-md` | `hover:bg-white/[0.10] hover:border-white/20` |
| Green completion checkmark | Green | No change needed |
| All-6-complete golden glow banner | Golden glow | Verify it works on dark background |
| Section heading | `text-text-dark` | `text-white` |

### 7. Below-Tab Content

| Element | Requirement |
|---------|-------------|
| SongPickSection | The section already uses a dark gradient (same as footer). Spotify embed container gets frosted glass card styling. Verify no visual seam with the new dark content area above it. |
| StartingPointQuiz | Already has frosted glass style — verify opacity on the fully-dark page. Bump card to `bg-white/[0.08]` if current opacity looks too transparent against the darker background. Quiz text (headings, options, results) must use white/light text on the dark background. |
| SiteFooter | Already dark — verify no visible seam between the new dark content area and the footer. |
| BackgroundSquiggle | Currently at ~30% opacity on a light background. Reduce to 10-15% for dark. The `SQUIGGLE_MASK_STYLE` fade mask should still work. |

### 8. Auth Modal

- Verify it renders correctly over the new dark background (it should since it's already dark-styled)
- No changes expected

## Acceptance Criteria

### Page Background & Hero
- [ ] Page background is solid dark (#0f0a1e) from navbar to footer with no light gray or white sections visible
- [ ] Hero gradient uses `from-[#1a0533] to-[#0f0a1e]` (not the old purple-to-white gradient)
- [ ] Hero greeting text ("Good Morning!" etc.) renders in Caveat script font in white on the dark gradient
- [ ] No floating purple box behind the greeting — text sits directly on the dark gradient
- [ ] Hero blends seamlessly into the dark page background below (no visible gradient line or color jump)

### Tab Bar
- [ ] Sticky tab bar uses frosted glass: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- [ ] Inactive tab text is `text-white/60`
- [ ] Active tab text is `text-white`
- [ ] Primary-color animated underline still appears under the active tab
- [ ] Tab bar remains sticky when scrolling at all breakpoints

### Pray Tab
- [ ] Textarea has `bg-white/[0.06]` background with cyan glow-pulse border animation
- [ ] Textarea input text is white, placeholder is `text-white/40`
- [ ] Starter chips are `bg-white/10 border-white/15 text-white/70`
- [ ] Generated prayer card uses `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Body text is `text-white/80`, secondary text is `text-white/50`
- [ ] KaraokeText highlighted words use `bg-primary/20`
- [ ] Action buttons (Copy, Read Aloud, Save, Share) are `bg-white/10 text-white/70` with `hover:bg-white/15`
- [ ] "Enhance with sound" pill looks correct on the dark background
- [ ] Crisis banner remains red and fully visible

### Journal Tab
- [ ] Textarea has `bg-white/[0.06]` background with cyan glow border, white input text, `text-white/40` placeholder
- [ ] Mode toggle: unselected is `bg-white/10`, selected is `bg-primary/20`
- [ ] Guided prompt card uses `bg-white/[0.06] border-l-2 border-primary`
- [ ] Saved journal entry cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10`
- [ ] Search/filter bar uses `bg-white/[0.06] border border-white/10`
- [ ] Draft saved indicator is `text-white/50`, character counter is `text-white/40`
- [ ] Journal milestone toasts render correctly on the dark background

### Meditate Tab
- [ ] All 6 meditation cards use `bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Card titles are `text-white`, descriptions are `text-white/60`, duration text is `text-white/40`
- [ ] Hover state is `hover:bg-white/[0.10] hover:border-white/20`
- [ ] Green completion checkmark remains green and visible
- [ ] All-6-complete golden glow banner displays correctly on the dark background

### Below-Tab Content
- [ ] SongPickSection has no visual seam with the dark content area above
- [ ] StartingPointQuiz card is legible on the dark background — text uses white/light colors, card background has enough contrast
- [ ] SiteFooter has no visible seam with the dark content area above
- [ ] BackgroundSquiggle opacity is reduced to 10-15% and subtle on dark

### Responsive
- [ ] Dark theme renders correctly at mobile (375px) — no light edges, gaps, or overflow
- [ ] Dark theme renders correctly at tablet (768px)
- [ ] Dark theme renders correctly at desktop (1440px)
- [ ] Dark background extends full-width with no light edges or gaps at any breakpoint
- [ ] All frosted glass cards are distinguishable from the background (border-white/10 provides edge definition)

### Accessibility
- [ ] Text contrast meets WCAG AA on the dark background (white/80 on #0f0a1e is approximately 11:1 ratio)
- [ ] All interactive elements remain keyboard-navigable
- [ ] Focus indicators are visible on the dark background

### General
- [ ] No changes to functionality, layout, spacing, or interactive behavior — purely visual
- [ ] All existing tests pass (update test assertions for class name changes if needed)
- [ ] Auth modal renders correctly over the dark background

## UX & Design Notes

- **Tone**: The dark theme creates a more immersive, contemplative atmosphere appropriate for prayer, journaling, and meditation
- **Colors**: Reference the Dashboard Card Pattern from `09-design-system.md`: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`. The Daily Hub dark theme uses slightly higher opacity (`bg-white/[0.06]`) for content cards to provide slightly more contrast for text-heavy content areas
- **Typography**: No font changes — only color changes. All fonts (Inter, Lora, Caveat) remain the same
- **Design system recon reference**: The current Inner Page Hero gradient and card patterns are documented in `_plans/recon/design-system.md` under "Hero Section Pattern" and "Card Pattern" sections. The new dark values replace these for this page only
- **New visual patterns**: The dark-on-dark frosted glass card pattern (`bg-white/[0.06]`) at this opacity level is a refinement of the existing dashboard card pattern (`bg-white/5`). The tab bar frosted glass pattern (`bg-white/[0.08] backdrop-blur-xl`) matches the navbar pattern. No entirely new patterns are introduced.
- **Animations**: All existing animations (glow-pulse, KaraokeText, golden glow, tab transitions) remain unchanged. Only their background context changes.

### Responsive Behavior

- **Mobile (< 640px)**: Dark background extends full-width. Tab bar remains sticky with frosted glass. Cards stack vertically in single column where applicable. All text colors use the same dark theme values. Touch targets remain 44px minimum.
- **Tablet (640px - 1024px)**: Same dark theme. Meditation cards in 2-column grid. Tab content area respects existing max-width constraints.
- **Desktop (> 1024px)**: Same dark theme. Content centered within existing max-width (`max-w-2xl` for tab content). Frosted glass effects render with full backdrop-blur support.

## AI Safety Considerations

- **Crisis detection needed?**: Yes — the Pray and Journal tabs both have text input areas with existing crisis keyword detection via `CrisisBanner`. This spec makes no changes to crisis detection behavior. The crisis banner stays red and fully visible on the dark background.
- **User input involved?**: Yes — Pray textarea, Journal textarea. No changes to input handling or validation.
- **AI-generated content?**: Yes — generated prayers display in the prayer card. No changes to content rendering. Plain text only, no HTML/Markdown rendering (unchanged).

## Auth & Persistence

- **No changes to auth gating** — all existing auth gates remain exactly as they are (documented in the Daily Experience spec)
- **No changes to persistence** — all localStorage keys and data flows remain unchanged
- **Route type**: Public (`/daily`)
- This spec is purely visual — it changes CSS classes, not component structure or data flow

### Auth Behavior Summary (unchanged, for reference)

- **Logged-out users CAN**: View the Daily Hub, browse all three tabs, type in textareas, read classic prayers, use Read Aloud, share content
- **Logged-out users CANNOT**: Generate AI prayers (auth modal: "Sign in to generate a prayer"), save prayers/journal entries (auth modal: "Sign in to save"), access meditation sub-pages (redirect to `/daily?tab=meditate`), use AI journal reflection (auth modal: "Sign in to reflect on your entry")

## Out of Scope

- **Dark theme for other pages** — this spec covers only `/daily` and its three tabs. Other pages (Music, Bible, Prayer Wall, Reading Plans, etc.) will be converted in subsequent specs (2-6 of the visual foundation series)
- **Meditation sub-pages** (`/meditate/breathing`, `/meditate/soaking`, etc.) — these are separate routes with their own visual treatment; they will be addressed in a future spec
- **Dark mode toggle** — this is a permanent dark theme conversion, not a user-togglable dark mode
- **New component creation** — this spec reuses existing components with updated Tailwind classes
- **Backend changes** — no API or backend changes
- **New animations or interactions** — all existing animations stay; no new ones are added
- **Navbar or footer changes** — the navbar is already glassmorphic and the footer is already dark; this spec only ensures no visual seams where they meet the newly-darkened content area
- **Tailwind config changes** — the required color tokens (#0f0a1e, etc.) should be achievable with Tailwind arbitrary values (`[#0f0a1e]`). If a new config token is truly needed, that's an implementation decision for `/plan`
