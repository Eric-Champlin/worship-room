# Feature: Navbar Restructure V3

## Overview

The navigation bar is the primary wayfinding tool for Worship Room — the first thing users see and interact with on every page. This restructure reorganizes the navbar from individual top-level links (Pray, Journal, Meditate, Music, Prayer Wall) into a content-type-based grouping that better communicates the breadth of Worship Room's offering and keeps the nav clean at all screen sizes. The new layout uses 3 dropdown menus + 1 standalone link + auth buttons, following the content-type rule: reading/doing under "Daily", listening under "Music", community under "Prayer Wall" (standalone), and real-world help under "Local Support".

## User Story

As a **logged-out visitor**, I want to **see a well-organized navbar that groups related features into clear categories** so that **I can quickly find what I need — whether that's daily spiritual activities, worship music, community prayer, or local support — without feeling overwhelmed by too many top-level links**.

## Requirements

### Desktop Navbar Layout

- **Logo**: "Worship Room" in Caveat cursive font, links to `/`
- **Daily dropdown**: Clickable "Daily" label navigates to `/daily`. Chevron arrow expands dropdown on hover/click showing:
  - Pray → `/scripture`
  - Journal → `/journal`
  - Meditate → `/meditate`
  - Verse & Song → `/daily`
- **Music dropdown**: Clickable "Music" label navigates to `/music`. Chevron arrow expands dropdown on hover/click showing:
  - Worship Playlists → `/music/playlists`
  - Ambient Sounds → `/music/ambient`
  - Sleep & Rest → `/music/sleep`
- **Prayer Wall**: Standalone top-level link → `/prayer-wall` (no dropdown)
- **Local Support dropdown**: Clickable "Local Support" label navigates to `/churches`. Chevron arrow expands dropdown on hover/click showing:
  - Churches → `/churches`
  - Counselors → `/counselors`
- **Auth buttons**: "Log In" (text link → `/login`) and "Get Started" (pill button → `/register`) on the right

### Mobile Drawer Layout

- Hamburger icon toggles a slide-in drawer
- Sections with uppercase headings: DAILY, MUSIC, LOCAL SUPPORT
- DAILY section: Pray, Journal, Meditate, Verse & Song (with divider below)
- MUSIC section: Worship Playlists, Ambient Sounds, Sleep & Rest (with divider below)
- Prayer Wall as standalone link (with divider below)
- LOCAL SUPPORT section: Churches, Counselors (with divider below)
- Log In and Get Started buttons at the bottom

### Dropdown Behavior

- All 3 dropdowns follow the same interaction pattern: split-trigger with clickable label + separate chevron button
- Dropdown panels open on hover (desktop) or click (mobile/keyboard)
- Panels close on: mouse leave, Escape key, click outside, or navigating to a link
- Active route highlighting: current page link shows active state (text color + underline)
- Dropdown items show purple text + animated underline on hover

### Styling Preservation

- Glassmorphic pill container on the navbar
- Transparent mode when overlaying the hero section gradient
- Violet glow shadow on dropdown panels (`shadow-[0_4px_24px_-4px_rgba(109,40,217,0.25)]`)
- Rounded dropdown panels (`rounded-xl`) with `ring-1 ring-primary/10` border
- `animate-dropdown-in` fade-in animation on dropdown open (150ms ease-out)
- Word-only animated underlines on dropdown items (underline under the text, not the full container)
- Caveat font logo, Inter font for nav links

### Accessibility

- All dropdowns have proper ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-label`)
- Escape key closes open dropdowns and returns focus to the trigger
- Focus management: focus trapped within open dropdown, Tab cycles through items
- All interactive elements are keyboard accessible
- Minimum 44px tap targets on mobile
- Focus-visible ring indicators on all interactive elements
- Screen reader announcements for dropdown state changes

## Acceptance Criteria

- [ ] Desktop navbar shows: Logo | Daily ▾ | Music ▾ | Prayer Wall | Local Support ▾ | Log In | Get Started
- [ ] "Daily" label click navigates to `/daily`; chevron expands dropdown with 4 items
- [ ] "Music" label click navigates to `/music`; chevron expands dropdown with 3 items
- [ ] "Prayer Wall" click navigates to `/prayer-wall`
- [ ] "Local Support" label click navigates to `/churches`; chevron expands dropdown with 2 items
- [ ] Mobile drawer shows all sections with correct headings and links
- [ ] All dropdown routes navigate to the correct pages
- [ ] Dropdown panels have violet glow styling, rounded corners, and fade-in animation
- [ ] Active route is visually highlighted in both desktop and mobile views
- [ ] Escape key, click-outside, and mouse-leave all close dropdown panels
- [ ] All elements are keyboard navigable with visible focus indicators
- [ ] Existing tests updated to match new link structure; all tests pass
- [ ] Navbar remains transparent/glassmorphic on the landing page hero

## UX & Design Notes

- **Tone**: Clean, organized, inviting — the navbar should make Worship Room feel like a well-curated space, not a cluttered list
- **Colors**: Primary violet `#6D28D9` for active states and hover effects, `#2C3E50` for default text, white for dropdown panel backgrounds
- **Typography**: Inter sans-serif for all nav text, Caveat cursive for the logo
- **Responsive**: Mobile-first — hamburger drawer below 1024px (lg breakpoint), full desktop nav above
- **Animations**: 150ms fade-in + translateY on dropdown panels; 300ms ease-out underline scale on hover items
- **Dropdown panels**: Solid white background, violet glow shadow, thin primary-tinted border ring

## AI Safety Considerations

- **Crisis detection needed?**: No — this feature is pure navigation UI with no user input or AI output
- **User input involved?**: No
- **AI-generated content?**: No
- **Note**: Navigation links route to pages that may involve AI features (scripture matching, prayer generation), but the navbar itself has no AI interaction. Safety checks are handled by destination pages.

## Auth & Persistence

- **Logged-out (demo mode)**: Full navbar visible with all navigation links. "Log In" and "Get Started" auth buttons shown. No data persistence — navbar state (open/closed dropdowns) is React state only.
- **Logged-in**: Same navigation links. Auth buttons replaced with user avatar dropdown (future feature, not in this spec).
- **Route type**: Public — navbar renders on all pages

## Out of Scope

- Post-login user avatar dropdown (future auth feature)
- Creating the actual destination pages for new routes (`/music/playlists`, `/music/ambient`, `/music/sleep`) — only placeholder routes needed
- Multi-language support (English only for MVP)
- Mobile app navigation
- Animated hamburger-to-X icon transition (keep existing icon swap)
- Mega-menu or multi-column dropdown layouts
