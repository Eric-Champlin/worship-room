# Feature: Site Footer

## Overview
The footer is the final section of the landing page, providing persistent site-wide navigation, crisis resources, and app download teasers. It anchors the bottom of the page in the same dark purple (#0D0620) as the hero, creating visual bookends that frame the entire landing experience. As a safety-critical component, it ensures crisis intervention resources are always visible per AI safety requirements.

## User Story
As a **logged-out visitor**, I want to **find navigation links, crisis resources, and app download information at the bottom of every page** so that **I can easily explore the site, access help if I'm in crisis, and know the app is coming to mobile**.

## Requirements

### Layout (top to bottom within footer)

1. **Logo + Navigation Columns Row**
   - Left side: "Worship Room" logo text in Caveat font, white
   - Right side: 3 navigation columns side-by-side

   | Daily | Music | Support |
   |-------|-------|---------|
   | Pray → /scripture | Worship Playlists → /music/playlists | Prayer Wall → /prayer-wall |
   | Journal → /journal | Ambient Sounds → /music/ambient | Churches → /churches |
   | Meditate → /meditate | Sleep & Rest → /music/sleep | Counselors → /counselors |
   | Verse & Song → /daily | | |

   - Column headings: white, Inter semi-bold
   - Links: muted gray (#9CA3AF), hover transition to white
   - All links are client-side router links (no full page reloads)

2. **Divider** — subtle 1px horizontal line (#2a2040)

3. **App Download Row**
   - Left: "Take Worship Room With You" heading (white, Inter medium, ~18px)
   - Right: Two download badges side-by-side
     - Apple App Store badge (standard black rounded rectangle with Apple logo + "Download on the App Store")
     - Google Play badge (standard black rounded rectangle with Play triangle + "GET IT ON Google Play")
     - Both link to "#" as placeholders
     - "Coming Soon" label in muted gray below or beside badges
   - Badges rendered as inline SVGs or styled elements — no external image URLs

4. **Divider** — same 1px line (#2a2040)

5. **Crisis Resources Row**
   - "If you're in crisis:" label
   - 988 Suicide & Crisis Lifeline: phone number as clickable tel: link (tel:988)
   - Crisis Text Line: "Text HOME to 741741"
   - Subtle styling (~13px font size, muted color)
   - Always present on every page — required per `.claude/rules/01-ai-safety.md`

6. **Copyright Bar**
   - "© 2026 Worship Room. All rights reserved."
   - ~12px font size, muted color, centered

### Exclusions
- No social media links
- No newsletter signup
- No mission statement paragraph

## Acceptance Criteria
- [ ] Footer renders as the last section on the landing page
- [ ] Dark purple (#0D0620) background with light text throughout
- [ ] "Worship Room" logo in Caveat font appears in footer
- [ ] All 3 navigation columns render with correct headings (Daily, Music, Support)
- [ ] All 10 navigation links point to their correct routes
- [ ] Links use client-side routing (no full page reloads)
- [ ] Link hover state transitions from muted gray to white
- [ ] App Store and Google Play badges render (inline SVG or styled elements, no external images)
- [ ] Both badges link to "#" placeholder
- [ ] "Coming Soon" text visible near badges
- [ ] Crisis resources row displays 988 Lifeline with tel: link and Crisis Text Line info
- [ ] Copyright text displays "© 2026 Worship Room. All rights reserved."
- [ ] Dividers render as subtle 1px lines between sections
- [ ] Responsive: desktop shows logo-left/columns-right layout; mobile stacks everything vertically
- [ ] All interactive elements are keyboard accessible with visible focus indicators
- [ ] WCAG AA color contrast met for all text
- [ ] Tests pass: rendering, link hrefs, crisis resources presence, accessibility attributes

## UX & Design Notes
- **Tone**: Clean, minimal, trustworthy. The footer should feel like a stable foundation, not cluttered
- **Background**: Dark purple (#0D0620) matching the hero section, creating visual bookends for the page
- **Background transition**: The quiz section above has a white background. Use either a gradient transition from white → dark purple at the top of the footer, or a clean hard edge — whichever produces the cleaner visual result
- **Colors**: All text is light-colored. Column headings in white. Links in muted gray (#9CA3AF) with hover to white. Crisis text and copyright in muted gray
- **Typography**: Caveat for logo, Inter semi-bold (600) for column headings, Inter regular for links, Inter medium (500) for app download heading
- **Responsive**:
  - Desktop (>1024px): Logo left + 3 columns right in a row. App download text left + badges right
  - Tablet (640-1024px): Logo top, columns below in a row
  - Mobile (<640px): Everything stacks vertically. Logo centered. Columns stack. Badges side-by-side or stacked
- **Spacing**: Generous padding (py-16 or similar), comfortable spacing between sections
- **Dividers**: 1px solid lines in #2a2040 — subtle, not distracting

## AI Safety Considerations
- **Crisis detection needed?**: No (footer is static content, no user input)
- **User input involved?**: No
- **AI-generated content?**: No
- **Crisis resources**: Yes — the footer contains hardcoded crisis intervention resources (988 Lifeline, Crisis Text Line) that must always be present. This is a safety-critical requirement per `.claude/rules/01-ai-safety.md`. The 988 number must be a clickable tel: link for immediate access

## Auth & Persistence
- **Logged-out (demo mode)**: Footer is fully visible and functional. Zero persistence — no data collected
- **Logged-in**: Same footer, no difference in behavior
- **Route type**: Public — renders on all pages (starting with landing page)

## Out of Scope
- Social media links or icons
- Newsletter signup form
- Mission statement or about text
- Dynamic content (all footer content is static/hardcoded)
- Footer appearing on non-landing pages (will be added later as a shared layout component; this spec covers landing page only)
- Actual app store listings (badges are placeholder links to "#")
- SAMHSA helpline in footer (included in crisis resources elsewhere per spec, footer shows the two most critical: 988 and Crisis Text Line)
- Multi-language support (English only per MVP non-goals)
