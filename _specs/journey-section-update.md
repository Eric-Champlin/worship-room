# Feature: Journey Section Update

## Overview

The "Your Journey to Healing" section on the landing page currently presents 6 steps guiding visitors through the app's features. This update expands the journey to 8 steps, adding two new stages — **Listen** and **Reflect** — that represent important parts of the healing experience.

Listen (step 4) introduces audio content: scripture readings, prayers, and calming content for rest and renewal. Reflect (step 6) encourages users to look back on their journey and discover patterns in their spiritual growth through mood insights. Together, these additions tell a more complete story: start with God (Pray) → process internally (Journal, Meditate) → receive God's Word through audio (Listen) and music (Music) → see your growth (Reflect) → connect with others (Prayer Wall) → get real-world help (Local Support).

## User Story

As a **logged-out visitor**, I want to see a clear, inspiring overview of all 8 healing pathways so that I understand the full scope of what Worship Room offers and feel drawn to explore.

## Requirements

- Expand the journey timeline from 6 steps to 8 steps
- Insert "Listen" as step 4 (between Meditate and Music)
- Insert "Reflect" as step 6 (between Music and Prayer Wall)
- Renumber all existing steps accordingly
- Final step order:

| # | Title | Description | Route |
|---|-------|-------------|-------|
| 1 | Pray | Begin with what's on your heart. Share your feelings and receive a personalized prayer grounded in Scripture. | `/scripture` |
| 2 | Journal | Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life. | `/journal` |
| 3 | Meditate | Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in. | `/meditate` |
| 4 | Listen | Hear God's Word spoken over you. Audio scripture, prayers, and calming content for rest and renewal. | `/listen` |
| 5 | Music | Let music carry you deeper. Curated worship playlists matched to where you are right now. | `/music` |
| 6 | Reflect | See how far you've come. Track your journey and discover patterns in your spiritual growth. | `/insights` |
| 7 | Prayer Wall | You're not alone. Share prayer requests and lift others up in a safe, supportive community. | `/prayer-wall` |
| 8 | Local Support | Find churches and Christian counselors near you. The next step in your healing may be just around the corner. | `/churches` |

- Each step title must be a clickable link to its route
- Maintain the existing scroll-triggered stagger animation (steps fade in sequentially on scroll)
- Maintain the vertical timeline layout with numbered purple circles and connecting line
- Maintain the SVG squiggle texture decoration
- Update all existing tests to reflect the new 8-step structure
- Add test coverage for the two new steps (correct title, description, route, numbered circle)

## Acceptance Criteria

- [ ] Landing page shows 8 journey steps in the correct order
- [ ] Each step displays its numbered circle, title (h3), and description
- [ ] Each step links to the correct route
- [ ] "Listen" appears as step 4 and links to `/listen`
- [ ] "Reflect" appears as step 6 and links to `/insights`
- [ ] Scroll-triggered stagger animation works with all 8 steps (stagger timing adjusts for 8 items)
- [ ] Vertical connecting line spans all 8 steps
- [ ] SVG squiggle decoration renders correctly with the taller section
- [ ] All existing tests updated and passing
- [ ] New tests added for Listen and Reflect steps
- [ ] Responsive layout works at mobile (< 640px), tablet (640-1024px), and desktop (> 1024px)
- [ ] Keyboard navigation: all 8 step links are focusable via Tab
- [ ] Screen reader: ordered list announces "list, 8 items"

## UX & Design Notes

- **Tone**: The journey tells a progressive story — inward reflection to outward connection. Listen and Reflect extend this arc naturally.
- **Colors**: Numbered circles use Primary `#6D28D9` with white text. Connecting line uses `bg-primary/30`. Background is Neutral `#F5F5F5`.
- **Typography**: Step titles in Inter Semi-bold (h3). Descriptions in Inter Regular. Section heading "Your Journey to Healing" in Inter Bold (h2).
- **Responsive**: Same vertical layout on all breakpoints. Circles scale `w-10 h-10` to `sm:w-12 sm:h-12`. Content area adjusts naturally with text wrap.
- **Animations**: Scroll-triggered stagger with `useInView` hook on the container. Each step fades in with `transitionDelay: ${index * 150}ms`. The stagger interval may need slight reduction (e.g., 120ms instead of 150ms) to keep the total animation time reasonable for 8 steps.
- **Hover**: `bg-white shadow-sm` + title turns `text-primary` on hover (existing behavior, unchanged).

## AI Safety Considerations

- **Crisis detection needed?**: No — this section contains no user input and no AI-generated content. It is a static navigational component.
- **User input involved?**: No
- **AI-generated content?**: No

Note: While this component itself has no safety concerns, some of the linked routes (e.g., `/scripture`, `/prayer-wall`) do involve AI and user input. Those safety requirements are handled by the destination pages, not by this navigational component.

## Auth & Persistence

- **Logged-out (demo mode)**: Fully visible with no restrictions. All 8 step links are navigable. Zero data persistence — this is a purely presentational section.
- **Logged-in**: Same behavior. No data is written or read.
- **Route type**: Public (renders on the `/` landing page)

## Out of Scope

- Building the actual `/listen` or `/insights` pages (those are separate features; links may point to placeholder or "coming soon" pages)
- Changes to the Navbar (separate spec: navbar-restructure)
- Audio playback functionality
- Mood tracking or insights display
- Any backend changes
- Any data persistence
