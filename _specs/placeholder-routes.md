# Feature: Placeholder Routes

## Overview

As Worship Room expands its navigation to include Listen, Reflect (Insights), and Daily Verse & Song, these routes need placeholder pages so that navbar and Journey to Healing links resolve to real content rather than 404 errors. Each placeholder communicates what the feature will offer — giving visitors a sense of the healing journey ahead — while clearly indicating the page is coming soon.

## User Story

As a **logged-out visitor**, I want to see a friendly "coming soon" page when I click on Listen, Reflect, or Daily Verse & Song so that I understand what each feature will provide and feel confident the platform is growing to support my healing journey.

## Requirements

### General (applies to all 3 pages)

- Each page displays a title, a brief description of the upcoming feature, and a "Coming Soon" visual indicator
- Pages are styled consistently with the existing site (design system colors, Inter font, centered layout)
- Each page is registered as a public route in the application router
- Pages are accessible: proper heading hierarchy, sufficient color contrast, keyboard navigable
- Pages are responsive across mobile, tablet, and desktop breakpoints

### Listen Page (`/listen`)

- **Title**: "Listen"
- **Description**: Communicates that this page will offer audio scripture, spoken prayers, and calming content for rest and renewal

### Insights Page (`/insights`)

- **Title**: "Reflect"
- **Description**: Communicates that this page will help users track their spiritual journey and discover patterns in their growth over time

### Daily Page (`/daily`)

- **Title**: "Daily Verse & Song"
- **Description**: Communicates that this page will offer a daily scripture verse and worship song recommendation

## Acceptance Criteria

- [ ] Navigating to `/listen` renders the Listen placeholder page
- [ ] Navigating to `/insights` renders the Insights (Reflect) placeholder page
- [ ] Navigating to `/daily` renders the Daily Verse & Song placeholder page
- [ ] Each page displays a heading, description, and "Coming Soon" indicator
- [ ] All three routes are registered in the router
- [ ] Pages render correctly at mobile (< 640px), tablet (640-1024px), and desktop (> 1024px) breakpoints
- [ ] Each page has a basic test verifying it renders its heading and description
- [ ] No 404 errors when clicking navbar or Journey section links to these routes

## UX & Design Notes

- **Tone**: Warm, encouraging — communicate anticipation rather than absence. "Something beautiful is coming" rather than "This doesn't exist yet"
- **Colors**: Use design system palette — Primary violet (`#6D28D9`) for accents, neutral background (`#F5F5F5`), text dark (`#2C3E50`)
- **Typography**: Inter for all text. Headings in Semi-bold/Bold. Consider Caveat for a decorative "Coming Soon" touch to match the site's personality
- **Responsive**: Centered single-column layout that works at all breakpoints without modification
- **Layout**: Vertically centered content with generous whitespace. Keep it minimal — these are temporary pages

## AI Safety Considerations

- **Crisis detection needed?**: No — placeholder pages contain only static content with no user input and no AI-generated content
- **User input involved?**: No
- **AI-generated content?**: No

## Auth & Persistence

- **Logged-out (demo mode)**: Full access. No data persistence. Zero cookies or tracking.
- **Logged-in**: Same experience as logged-out (no personalization on placeholder pages)
- **Route type**: Public

## Out of Scope

- Building the actual Listen, Insights, or Daily features (separate specs)
- Any backend API endpoints
- Any data persistence or database changes
- Audio playback functionality
- Analytics or mood tracking
- Spotify integration
- Any AI-powered content
