# Feature: Navbar Restructure V2

## Overview

Restructure the site-wide navigation to better surface Worship Room's key differentiators — community prayer support (Prayer Wall) and real-world help (Local Support) — as top-level items that are immediately visible. Daily healing activities (Pray, Journal, Meditate, Verse & Song) are grouped under a "Daily" dropdown because they represent the recurring habits users return to each day. Music gets its own top-level link because worship music is a distinct, recognizable experience.

This reorganization makes the navbar cleaner (4 visible items + auth vs. 5 top-level links + dropdown) and aligns navigation with the app's updated information architecture documented in CLAUDE.md.

## User Story

As a **logged-out visitor**, I want the navbar to clearly surface Music, Prayer Wall, and Local Support so that I can immediately find community features and real-world help, while daily healing activities are organized in one logical group.

As a **logged-out visitor on mobile**, I want the drawer menu to reflect the same structure — Daily activities grouped together, standalone links for Music and Prayer Wall, and a Local Support section — so that navigation feels consistent across devices.

## Requirements

### Desktop Navbar Layout

- The desktop navbar displays (left to right): Worship Room logo, Daily dropdown, Music link, Prayer Wall link, Local Support dropdown, Log In button, Get Started button
- **Daily dropdown**: The "Daily" label itself is a clickable link that navigates to `/daily`. An adjacent chevron/arrow expands a dropdown on hover or click showing:
  - Pray (links to `/scripture`)
  - Journal (links to `/journal`)
  - Meditate (links to `/meditate`)
  - Verse & Song (links to `/daily`)
- **Music**: Static top-level link to `/music` (no dropdown)
- **Prayer Wall**: Static top-level link to `/prayer-wall` (no dropdown)
- **Local Support dropdown**: The "Local Support" label itself is a clickable link that navigates to `/churches`. An adjacent chevron/arrow expands a dropdown on hover or click showing:
  - Churches (links to `/churches`)
  - Counselors (links to `/counselors`)
- **Log In** and **Get Started** buttons remain on the right side, unchanged

### Mobile Drawer Layout

- "DAILY" section heading with grouped links: Pray, Journal, Meditate, Verse & Song
- Standalone links (not grouped): Music, Prayer Wall
- "LOCAL SUPPORT" section heading with grouped links: Churches, Counselors
- Log In / Get Started buttons at the bottom

### Behavior Preservation

- All existing interaction patterns must be preserved: glassmorphic pill styling, transparent mode on hero pages, Caveat font for the logo, hover/active underline states on links, escape key to close dropdowns, focus return after dropdown close, click-outside to close, mobile hamburger icon and drawer animation
- Both dropdowns follow the same interaction pattern: hover opens with a delay, mouse-leave closes with a delay, click toggles, escape closes and returns focus, keyboard accessible
- Active route detection: links highlight when the user is on their target route; dropdown triggers highlight when the user is on any route within their dropdown group

### Accessibility

- All dropdown triggers use `aria-haspopup="true"` and `aria-expanded` to communicate state
- Dropdown panels have appropriate IDs referenced by `aria-controls` on the trigger
- Mobile drawer sections use `role="group"` with `aria-labelledby` pointing to their section heading
- All interactive elements meet 44px minimum tap targets on mobile
- Focus management: opening a dropdown moves focus into it; closing returns focus to the trigger
- Keyboard navigation: Tab moves between items, Escape closes dropdowns

### Test Updates

- All existing navbar tests must be updated to reflect the new link structure
- Desktop link assertions updated for the new top-level items (Music, Prayer Wall) and dropdown contents
- Mobile drawer assertions updated for the new section structure
- Active route tests updated for the new route mappings
- Dropdown interaction tests updated for both Daily and Local Support dropdowns

## Acceptance Criteria

- [ ] Desktop navbar shows: logo, Daily dropdown, Music, Prayer Wall, Local Support dropdown, Log In, Get Started
- [ ] Clicking the "Daily" label navigates to `/daily`
- [ ] Hovering the Daily chevron opens a dropdown with Pray, Journal, Meditate, Verse & Song
- [ ] Clicking the "Local Support" label navigates to `/churches`
- [ ] Hovering the Local Support chevron opens a dropdown with Churches, Counselors
- [ ] Music link navigates to `/music`; Prayer Wall link navigates to `/prayer-wall`
- [ ] Mobile drawer shows DAILY section (4 links), Music, Prayer Wall, LOCAL SUPPORT section (2 links), auth buttons
- [ ] All existing styling preserved: glassmorphic pill, transparent mode, Caveat logo, hover states
- [ ] All dropdown interactions work: hover open/close, click toggle, escape close, focus return, click-outside close
- [ ] All tests pass with the new link structure
- [ ] Build compiles without errors
- [ ] No lint errors

## UX & Design Notes

- **Tone**: The navbar should feel calm and organized — not cluttered. Four visible items is the sweet spot for cognitive load
- **Colors**: Use design system palette — Primary `#6D28D9` for active states, Text Dark `#2C3E50` for labels, white/translucent backgrounds for the glassmorphic pill
- **Typography**: Inter for all nav labels; Caveat for the "Worship Room" logo text
- **Responsive**: Mobile-first. On screens below the `lg` breakpoint, the navbar collapses to hamburger + drawer. Desktop shows the full horizontal layout
- **Dropdown styling**: Dropdown panels should match the existing glassmorphic style with subtle backdrop blur and soft shadow. Minimum width sufficient for the longest label
- **Animations**: Dropdown open/close should feel smooth — no jarring pops. Use the same timing as the existing dropdown

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature is navigation only, no user input or AI output
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence

- **Logged-out (demo mode)**: Full navbar visible with Log In / Get Started buttons. All links accessible (public routes)
- **Logged-in**: Log In / Get Started replaced with user avatar dropdown (future feature, not part of this spec)
- **Route type**: The navbar itself is a global component on all routes. No auth required for any nav link in this spec

## Out of Scope

- Logged-in user avatar dropdown (replacing Log In / Get Started buttons) — separate future feature
- Dropdown animation transitions (CSS transitions are acceptable; no need for Framer Motion or similar)
- Mega-menu or multi-column dropdown layouts
- Search functionality in the navbar
- Notification badges or indicators
- Breadcrumb navigation
- "Listen" page or route (removed from architecture — audio features are distributed)
- Mood Insights in the navbar (accessible from dashboard and user dropdown only)
