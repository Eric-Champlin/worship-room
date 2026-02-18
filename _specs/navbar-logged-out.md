# Feature: Logged-Out Navigation Bar

## Overview
The navigation bar is the primary wayfinding element for visitors who have not yet created an account. It should immediately communicate the warmth and purpose of Worship Room — a safe place for spiritual support and emotional healing — while making it effortless to explore the app's features. A clear "Get Started" call-to-action invites visitors to join the community without pressure.

## User Story
As a **logged-out visitor**, I want to navigate to any part of the Worship Room app from a persistent top bar so that I can explore features freely and find the help I need without being required to log in first.

## Requirements
- The navbar must be **sticky** — it remains fixed to the top of the viewport as the user scrolls
- Display a **custom Worship Room logo** on the left (text-based or icon+text, creative but readable)
- Display **navigation links** in the center/middle area:
  - **Top-level (flat)**: Pray (`/pray`), Music (`/music`), Journal (`/journal`), Daily (`/daily`), Meditate (`/meditate`)
  - **Connect ▾ dropdown**: Prayer Wall (`/prayer-wall`), Churches (`/churches`), Counselors (`/counselors`)
  - The "Connect" dropdown groups community and locator features — destinations a user reaches when seeking people or help, not content
- Display **auth actions** on the right:
  - "Log In" text link → `/login`
  - "Get Started" solid CTA button → `/register`
- On **mobile (< 640px)**: navigation links collapse into a **hamburger menu**; tapping opens a full-width or slide-in drawer containing all nav links plus the auth actions
- On **tablet (640–1024px)**: hamburger menu (5 flat links + dropdown still too crowded at this width)
- On **desktop (> 1024px)**: full horizontal navbar — 5 flat links + Connect ▾ dropdown + auth actions
- Active/current route should be visually indicated (e.g., underline or color change on the active link)
- The navbar should have a subtle shadow or border to separate it from page content

## Acceptance Criteria
- [ ] Navbar is visible and sticky on all three breakpoints (mobile, tablet, desktop)
- [ ] 5 top-level nav links (Pray, Music, Journal, Daily, Meditate) render and navigate to correct routes
- [ ] "Connect ▾" dropdown trigger renders on desktop
- [ ] Hovering over the Connect trigger (desktop only) opens the dropdown
- [ ] Clicking the Connect trigger also opens/closes the dropdown (keyboard + touch fallback)
- [ ] Moving the mouse from the trigger into the dropdown panel keeps the dropdown open
- [ ] Moving the mouse out of the dropdown wrapper closes the dropdown (with a short delay)
- [ ] All 3 dropdown links (Prayer Wall, Churches, Counselors) navigate to correct routes
- [ ] Dropdown closes on: outside click, Escape key, selecting a link, focus leaving the dropdown
- [ ] "Log In" link navigates to `/login`
- [ ] "Get Started" button navigates to `/register`
- [ ] On mobile, a hamburger icon replaces the nav links; tapping it opens a menu with all links
- [ ] The mobile menu can be closed (via X button, overlay tap, or Escape key)
- [ ] Logo is displayed on the left on all breakpoints
- [ ] Active route link is visually distinguished from inactive links
- [ ] Navbar meets accessibility requirements: keyboard navigable, focus-visible styles, ARIA labels on hamburger button, mobile menu, and Connect dropdown
- [ ] Connect dropdown trigger has `aria-haspopup="menu"` and `aria-expanded` reflecting open state
- [ ] No logged-in-only UI elements are shown (no user avatar, no account settings)

## UX & Design Notes
- **Tone**: Peaceful, welcoming, spiritually grounded — not corporate or clinical
- **Logo**: Creative text treatment for "Worship Room" — consider a small cross or dove icon paired with a serif or semi-serif wordmark. Should feel warm, not religious-institutional. Keep it simple enough to render well at small sizes.
- **Colors**: Use design system palette
  - Background: White `#FFFFFF` or warm off-white `#F5F5F5`
  - Nav links: Text Dark `#2C3E50` with hover state using Primary Blue `#4A90E2`
  - "Get Started" button: Primary Blue `#4A90E2` background, white text — matches the Merchlink-style reference image
  - "Log In": plain text link, no button styling
  - Active link indicator: Primary Blue `#4A90E2` underline or color
- **Typography**: Inter for all navbar text (body font per design system)
  - Nav links: Medium weight (500)
  - "Get Started" button: Medium or Semi-bold
- **Shadow**: Subtle drop shadow below navbar to lift it off page content
- **Hamburger icon**: Standard three-line icon; transforms to X when open
- **Mobile drawer**: Slide down from top or full-width overlay; links stacked vertically with generous tap targets (min 44px height)
- **Reference**: Inspired by the Merchlink navbar — logo left, links center, auth actions right, solid CTA button. Adapted to Worship Room's warmer color palette and spiritual context.
- **Responsive breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px – 1024px
  - Desktop: > 1024px

## AI Safety Considerations
- **Crisis detection needed?**: No — the navbar contains no user input and no AI output
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence
- **Logged-out (demo mode)**: Fully functional; zero data persistence. No cookies, no anonymous IDs, no tracking. The navbar simply provides navigation links and CTAs.
- **Logged-in**: This spec covers the logged-out state only. When a logged-in navbar is built, it will replace the "Log In / Get Started" actions with a user avatar or account menu.
- **Route type**: Public — rendered on all public routes

## Decision Log
- **2026-02-17**: Reduced top-level nav links from 8 flat to 5 flat + "Connect ▾" dropdown. Rationale: 8 links creates decision fatigue on desktop; Prayer Wall, Churches, and Counselors share the "people/community/help" intent and group naturally. Meditate kept top-level as a core content mode.
- **2026-02-17**: "Connect ▾" dropdown opens on hover (desktop) with click as fallback for keyboard and touch users. Hover implemented via shared wrapper `div` with `onMouseEnter`/`onMouseLeave` to prevent premature close when moving mouse from trigger to panel. Panel uses natural HTML semantics (`<ul>/<li>`) — no `role="menu"` to avoid signing up for full menu keyboard contract.

## Out of Scope
- Logged-in navbar state (user avatar, account dropdown, logout) — separate feature
- Search bar in the navbar
- Notification badges or icons
- OAuth / social login buttons
- Multi-language support
- Any analytics or behavior tracking tied to navbar clicks
