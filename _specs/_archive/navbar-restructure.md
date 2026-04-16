# Feature: Navbar Restructure

## Overview

The navigation bar is the primary wayfinding tool for every visitor. As Worship Room expands from 6 features to 8, the navbar needs to evolve to keep the most important healing actions — Pray, Journal, Meditate, and Listen — immediately accessible, while grouping discovery and community features under an "Explore" dropdown. This restructure ensures that someone in emotional distress can reach the core solo healing activities in one click, while music, community, insights, and local support remain easily discoverable.

## User Story

As a **logged-out visitor**, I want the navigation to surface the core healing activities (Pray, Journal, Meditate, Listen) as top-level links so that I can quickly find comfort without navigating through menus, while still being able to discover community features, music, insights, and local support through an organized dropdown.

## Requirements

### Desktop Navbar

- **4 top-level navigation links** (in this order): Pray (`/scripture`), Journal (`/journal`), Meditate (`/meditate`), Listen (`/listen`)
- **1 "Explore" dropdown button** that reveals two groups:
  - **Explore group**: Music (`/music`), Prayer Wall (`/prayer-wall`), Reflect (`/insights`), Daily Verse & Song (`/daily`)
  - **Local Support group**: Churches (`/churches`), Counselors (`/counselors`)
  - A visual divider and "LOCAL SUPPORT" section heading separates the two groups
- **Auth actions** on the right: Log In (`/login`), Get Started (`/register`)

### Mobile Drawer

- **Top section**: Pray, Journal, Meditate, Listen (as full-width links)
- **"EXPLORE" section heading** followed by: Music, Prayer Wall, Reflect, Daily Verse & Song
- **"LOCAL SUPPORT" section heading** followed by: Churches, Counselors
- **Bottom section**: Log In, Get Started
- Section headings should be visually distinct (smaller, uppercase, muted color) and not clickable

### Preserved Behaviors

- Glassmorphic pill styling (backdrop blur, translucent background)
- Transparent mode when rendered on the hero section
- Caveat font for the "Worship Room" logo text
- Hover and active state styles on all links
- Current route highlighting (active link indicator)
- ARIA attributes on the dropdown (aria-expanded, aria-haspopup)
- Escape key closes the dropdown and mobile drawer
- Focus management: focus returns to trigger button when dropdown/drawer closes
- Click-outside closes the dropdown
- Mobile hamburger menu toggle with animated icon
- Smooth open/close transitions on dropdown and drawer

### Accessibility (per `.claude/rules/04-frontend-standards.md`)

- All interactive elements keyboard accessible
- Focus indicators visible (focus-visible:ring-2 or equivalent)
- Dropdown uses appropriate ARIA roles (menu/menuitem or disclosure pattern)
- Section headings in mobile drawer are presentational (not focusable, not announced as links)
- Minimum 44x44px tap targets on mobile
- Color contrast meets WCAG AA

## Acceptance Criteria

- [ ] Desktop: 4 top-level links visible (Pray, Journal, Meditate, Listen)
- [ ] Desktop: "Explore" dropdown opens with 2 groups (4 Explore links + 2 Local Support links)
- [ ] Desktop: "LOCAL SUPPORT" heading and visual divider visible in dropdown
- [ ] Mobile: drawer shows all links organized under section headings
- [ ] Mobile: section headings ("EXPLORE", "LOCAL SUPPORT") are not clickable
- [ ] All links navigate to the correct routes
- [ ] Transparent mode works correctly on the hero section
- [ ] Escape key closes dropdown and drawer
- [ ] Focus returns to trigger button on close
- [ ] Click outside closes the dropdown
- [ ] All existing accessibility behaviors preserved
- [ ] All tests updated and passing

## UX & Design Notes

- **Tone**: Clean, calm navigation that doesn't overwhelm — healing features front and center
- **Colors**: Glassmorphic pill uses `bg-white/70 backdrop-blur-md` (normal mode) or `bg-white/10` (transparent mode on hero). Dropdown background `bg-white` with `shadow-lg`. Section headings in `text-text-light` (#7F8C8D), uppercase, small text.
- **Typography**: Logo in Caveat cursive. Nav links in Inter Medium (500). Section headings in Inter Semi-bold (600), smaller size, uppercase, letter-spaced.
- **Responsive**: Desktop shows full navbar with dropdown. Below the `lg` breakpoint (1024px), collapse to hamburger + drawer.
- **Animations**: Dropdown fades in/out. Drawer slides in from right (existing behavior).
- **Dropdown width**: Wide enough to comfortably fit the longest link label ("Daily Verse & Song") without truncation. Consider `min-w-[220px]` or similar.

## AI Safety Considerations

- **Crisis detection needed?**: No — the navbar is a purely navigational component with no user input and no AI-generated content.
- **User input involved?**: No
- **AI-generated content?**: No

Note: The navbar links to pages that may involve AI and user input (e.g., `/scripture`, `/prayer-wall`), but safety for those features is handled by the destination pages, not the navbar.

## Auth & Persistence

- **Logged-out (demo mode)**: Full navbar visible. All links navigable. "Log In" and "Get Started" buttons shown. Zero data persistence.
- **Logged-in**: Same navigation links. Auth buttons replaced with user avatar dropdown (future feature — not part of this spec).
- **Route type**: The navbar itself renders on all pages (public, protected, admin). It does not gate access to any routes.

## Out of Scope

- Post-login user avatar dropdown (future feature per CLAUDE.md)
- Search functionality in the navbar
- Notification badges or indicators
- Building the actual `/listen`, `/insights`, or `/daily` pages (separate specs)
- Any backend changes
- Any data persistence
