# Feature: Hero Quiz Teaser

## Overview

The hero section is the first thing visitors see — a moment when they may feel overwhelmed, uncertain, or unsure where to begin their healing journey. This feature adds a gentle, secondary call-to-action below the main typewriter input that invites users to take a short guided quiz instead of typing freely. It provides an alternative entry point for people who don't know what to say or where to start, reducing friction and guiding them toward the right feature for their needs.

## User Story

As a **logged-out visitor**, I want to **see a subtle invitation to take a guided quiz below the hero input** so that **if I'm unsure what to type or where to begin, I have an easy alternative path to finding the right spiritual support for me**.

## Requirements

- Display a line of text below the typewriter input: "Not sure where to start? Take a 30-second quiz and we'll help you find your path."
- "Take a 30-second quiz" must be a clickable element that smooth-scrolls the page down to the Starting Point Quiz section (identified by `id="quiz"`)
- Smooth scrolling must work across all major browsers
- The quiz section does not exist yet — a temporary placeholder target with `id="quiz"` must be added at the correct position in the landing page layout (after the Journey Section, before the Values Section)
- The placeholder will be replaced when the full Starting Point Quiz is built
- Global smooth scroll behavior should be enabled in CSS for the html element

## Acceptance Criteria

- [ ] Text "Not sure where to start? Take a 30-second quiz and we'll help you find your path." is visible below the hero input on all screen sizes
- [ ] "Take a 30-second quiz" is visually distinct as a clickable link (brighter color, underline on hover)
- [ ] Clicking the link smooth-scrolls to the `#quiz` anchor point
- [ ] A placeholder element with `id="quiz"` exists at the correct position in the landing page
- [ ] CSS `scroll-behavior: smooth` is applied to the html element
- [ ] The teaser text does not visually compete with the main typewriter input — it reads as a subtle secondary option
- [ ] Responsive: text is readable and well-spaced on mobile (< 640px), tablet (640-1024px), and desktop (> 1024px)
- [ ] Tests verify the link exists and triggers scroll behavior

## UX & Design Notes

- **Tone**: Gentle, inviting, zero-pressure. This is for someone who feels lost — not a hard sell.
- **Colors**:
  - Surrounding text: a light, muted tone that contrasts against the dark hero gradient — lighter than Text Light (#7F8C8D) since the background is dark purple, not white. Approximate `white/60` or similar soft tone.
  - "Take a 30-second quiz" link: Primary Light (#8B5CF6) or white to stand out as clickable
  - Underline on hover for the link portion
- **Typography**: Inter (sans-serif), 14-16px (text-sm), regular weight. Smaller than the hero subheading.
- **Spacing**: 16-24px margin above the teaser (below the input box). Vertically centered within the hero content flow.
- **Responsive**: Single line on desktop, may wrap naturally on mobile — no special mobile treatment needed beyond normal text flow.
- **Animations**: No animation on the text itself. Smooth scroll is the only motion.

## AI Safety Considerations

- **Crisis detection needed?**: No — this element contains no user input and no AI-generated content. It is static text with a scroll link.
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence

- **Logged-out (demo mode)**: Fully accessible. No data persistence. The quiz teaser is static content with a scroll action — zero data is captured or stored.
- **Logged-in**: Same behavior as logged-out. No additional persistence.
- **Route type**: Public (landing page component)

## Out of Scope

- The actual Starting Point Quiz implementation (separate feature — only a placeholder `id="quiz"` target is added here)
- Quiz question content, logic, or result mapping
- Any data persistence or analytics tracking of teaser clicks
- A/B testing of teaser copy
- Mobile drawer or navbar changes
