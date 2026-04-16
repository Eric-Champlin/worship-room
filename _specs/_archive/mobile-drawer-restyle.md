# Feature: Mobile Drawer Restyle

## Overview

Restyle the mobile navigation drawer from its current glassmorphic purple design to a clean white background. The current drawer uses a blurred purple gradient that can feel heavy and reduce legibility on some devices. A white drawer with dark text provides better readability, stronger contrast ratios, and a cleaner feel while keeping the brand identity through selective use of Primary violet on the "Get Started" button and hover/active states.

This is a visual-only change. All navigation functionality, routing, accessibility features, and drawer behavior remain unchanged.

## User Story

As a **logged-out visitor** on mobile, I want the navigation drawer to be clean and easy to read so that I can quickly find and navigate to the feature I need.

## Requirements

- Replace the drawer's purple glassmorphic/blurred background with solid white (#FFFFFF)
- Remove all `backdrop-filter`, blur, and gradient effects from the drawer panel
- Change all nav link text to dark color (Text Dark #2C3E50)
- Keep section headings (DAILY, MUSIC, LOCAL SUPPORT) as muted gray (Text Light #7F8C8D), uppercase, letter-spaced
- Add hover/active state to links: subtle light violet background tint (#8B5CF6 at ~12% opacity) and/or a 2px Primary violet (#6D28D9) underline
- Prayer Wall standalone link: same dark text and hover/active treatment as grouped links
- Log In button: dark text, styled consistently with nav links
- Get Started button: keep Primary violet (#6D28D9) background with white text — the only purple element in the drawer
- Dividers between sections: light gray (#E5E7EB)
- Close button (X icon): dark color (Text Dark #2C3E50 or black) for contrast against white
- Worship Room logo: keep Caveat font, change color to Primary violet (#6D28D9) or Text Dark (#2C3E50) — whichever provides better visual contrast against white
- Backdrop overlay behind the drawer remains dark/semi-transparent (unchanged)

## Acceptance Criteria

- [ ] Drawer background is solid white with no blur, gradient, or glassmorphic effects
- [ ] All link text is dark and legible against white background
- [ ] Section headings are muted gray, uppercase, letter-spaced
- [ ] Links show a visible hover/active state (violet tint and/or underline)
- [ ] "Get Started" is the only purple-background element in the drawer
- [ ] "Log In" uses dark text, not white
- [ ] Dividers are light gray (#E5E7EB)
- [ ] Close button icon is dark (visible against white)
- [ ] Logo text is dark or violet (visible against white)
- [ ] All existing links, routes, and section groupings remain unchanged
- [ ] ARIA attributes, focus management, and Escape key handling are preserved
- [ ] Drawer looks correct on mobile viewports (< 640px) and tablet (640-1024px)
- [ ] No console errors or warnings introduced by the change
- [ ] Tests pass (update any assertions that reference specific drawer colors/styles)

## UX & Design Notes

- **Tone**: Clean, calm, easy to scan — a white drawer feels lighter and more approachable than the immersive purple
- **Colors**:
  - Background: White (#FFFFFF)
  - Link text: Text Dark (#2C3E50)
  - Section headings: Text Light (#7F8C8D)
  - Hover/active: Light violet tint (#8B5CF620) + optional 2px underline (#6D28D9)
  - Dividers: #E5E7EB
  - Get Started button: Primary (#6D28D9) bg, white text
  - Close button / logo: Text Dark (#2C3E50) or Primary (#6D28D9)
- **Typography**: Inter for nav links and headings, Caveat for the logo (unchanged)
- **Responsive**: Drawer only appears below the desktop breakpoint (< 1024px). Desktop navbar is unaffected.
- **Animations**: Keep existing slide-in animation. No new animations needed.

## AI Safety Considerations

- **Crisis detection needed?**: No
- **User input involved?**: No
- **AI-generated content?**: No

This is a purely visual/styling change to a navigation component. No user input or AI content is involved.

## Auth & Persistence

- **Logged-out (demo mode)**: Drawer is visible and functional for all users, no data persistence involved
- **Logged-in**: Same drawer behavior (future: user avatar dropdown replaces Log In / Get Started)
- **Route type**: N/A — this is a global navigation component, not a route

## Out of Scope

- Desktop navbar styling changes
- Adding new links or changing the navigation structure
- Mobile bottom tab bar or alternative mobile navigation patterns
- Dark mode variant of the drawer (post-MVP feature)
- Post-login avatar dropdown styling (will be addressed when auth is implemented)
