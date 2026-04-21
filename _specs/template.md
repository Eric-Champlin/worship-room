# Feature: {feature_title}

## Affected Frontend Routes
<!-- List the user-facing routes this spec touches, one per line as backtick-wrapped markdown bullets, including any query parameters that affect rendering. The /verify-with-playwright skill reads this section (via the plan that inherits it) when invoked plan-only and uses these routes to drive UI verification. If this is a backend-only or non-UI feature, write "N/A — backend-only spec" and omit the bullets. -->
- `/route-1`
- `/route-2?tab=variant`

## Overview
<!-- What is this feature and why does it exist? How does it serve the mission of emotional healing and spiritual support? -->

## User Story
As a **[logged-out visitor / logged-in user / admin]**, I want to **[action]** so that **[benefit/emotional outcome]**.

## Requirements
<!-- What must this feature do? Be specific. -->
-
-
-

## Acceptance Criteria
<!-- How do we know this feature is done? -->
- [ ]
- [ ]
- [ ]

## UX & Design Notes
<!-- Visual direction, tone, interaction behavior. Reference design system values where applicable. -->
- **Tone**: Peaceful, encouraging, non-intrusive
- **Colors**: Use design system palette (Primary Blue #4A90E2, warm off-white #F5F5F5)
- **Typography**: Inter for body, Lora for scripture/spiritual content
- **Responsive**: Mobile-first (< 640px), tablet (640–1024px), desktop (> 1024px)
- **Animations**: Gentle fade-ins preferred; no jarring transitions

## AI Safety Considerations
<!-- Does this feature involve user input or AI output? If yes, address the following. -->
- **Crisis detection needed?**: Yes / No
- **User input involved?**: Yes / No — if yes, describe what
- **AI-generated content?**: Yes / No — if yes, plain text only, no HTML/Markdown rendering

## Auth & Persistence
<!-- Who can access this feature, and what gets saved? -->
- **Logged-out (demo mode)**: [Describe behavior — zero persistence rule applies]
- **Logged-in**: [Describe what gets saved, to which table]
- **Route type**: Public / Protected / Admin

## Out of Scope
<!-- What does this feature explicitly NOT include? -->
-
-
