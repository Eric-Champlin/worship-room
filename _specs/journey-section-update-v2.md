# Feature: Journey Section Update V2

## Overview

The "Journey to Healing" section on the landing page guides visitors through Worship Room's six-step path to emotional and spiritual healing. This update refreshes the step descriptions to better communicate the purpose and emotional tone of each stage, and makes each step title a clickable link so visitors can jump directly into any part of the journey. The goal is to lower the barrier to entry — a visitor reading about journaling can tap "Journal" and start immediately, rather than hunting for the right page in the navbar.

## User Story

As a **logged-out visitor**, I want each step in the Journey to Healing timeline to have a clear, inviting description and a clickable title so that I can understand what each step offers and immediately try the one that resonates with me.

## Requirements

### Step Content Updates

- The section retains exactly 6 steps in the following order, with updated descriptions:
  1. **Pray** — "Begin with what's on your heart. Share your feelings and receive a personalized prayer grounded in Scripture."
  2. **Journal** — "Put your thoughts into words. Guided prompts help you reflect on what God is doing in your life."
  3. **Meditate** — "Quiet your mind with guided meditations rooted in Biblical truth. Let peace settle in."
  4. **Music** — "Let music carry you deeper. Curated worship playlists matched to where you are right now."
  5. **Prayer Wall** — "You're not alone. Share prayer requests and lift others up in a safe, supportive community."
  6. **Local Support** — "Find churches and Christian counselors near you. The next step in your healing may be just around the corner."

### Clickable Step Titles

- Each step title is a client-side link (not a full page reload) that navigates to its corresponding route:
  - Pray → `/scripture`
  - Journal → `/journal`
  - Meditate → `/meditate`
  - Music → `/music`
  - Prayer Wall → `/prayer-wall`
  - Local Support → `/churches`
- Links should have visible hover/focus states consistent with the design system
- Links must be keyboard accessible with visible focus indicators

### Preserved Behavior

- The vertical timeline layout with numbered purple circles remains unchanged
- Scroll-triggered stagger animation (each step animates in sequence as the user scrolls) remains unchanged
- SVG squiggle decorations remain unchanged
- The section heading "Journey to Healing" and subtitle remain unchanged
- Responsive behavior (mobile stacked, desktop side-alternating) remains unchanged

### Test Updates

- All existing tests must be updated to reflect the new step descriptions
- New assertions for the clickable links: each title renders as a link pointing to the correct route
- Existing animation and layout tests remain unchanged

## Acceptance Criteria

- [ ] All 6 step descriptions match the exact text specified above
- [ ] Each step title is a clickable link navigating to its specified route
- [ ] Links have visible hover and focus states
- [ ] Links are keyboard accessible (Tab navigable, Enter activates)
- [ ] Scroll-triggered stagger animation still works correctly
- [ ] Vertical timeline layout, numbered circles, and squiggle decorations are unchanged
- [ ] All tests pass with the new descriptions and link assertions
- [ ] Build compiles without errors
- [ ] No lint errors

## UX & Design Notes

- **Tone**: Each description should feel like a gentle invitation, not a feature list. The language is warm, personal, and encouraging
- **Colors**: Step titles use Primary `#6D28D9` (deep violet) for link color, matching the existing numbered circles. Hover state lightens to Primary Light `#8B5CF6`
- **Typography**: Step titles in Inter Semi-bold (600), descriptions in Inter Regular (400). No change from current font treatment
- **Responsive**: Mobile-first. On mobile, steps stack vertically with the timeline line on the left. On desktop, steps alternate left/right of the timeline
- **Animations**: No changes to the existing scroll-triggered stagger. Links should have a subtle color transition on hover (`transition-colors`)
- **Link styling**: Step titles should look like natural headings that happen to be clickable — no underlines by default, underline on hover/focus to indicate interactivity

## AI Safety Considerations

- **Crisis detection needed?**: No — this section is static content with navigation links, no user input or AI output
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence

- **Logged-out (demo mode)**: Full section visible. All links navigate to public routes. Zero persistence — no data saved
- **Logged-in**: Same behavior. No auth-dependent differences for this section
- **Route type**: Public (part of the landing page at `/`)

## Out of Scope

- Changing the number of steps (stays at 6)
- Changing the section heading or subtitle
- Modifying the scroll animation timing or behavior
- Adding icons or images to steps
- Adding a CTA button below the section
- Changing the timeline layout structure (vertical line, circles, alternating sides)
- Any backend changes
