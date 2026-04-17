# BB-51: Bible Polish Round 3 — Edge-to-Edge, Auth Gating, Persistent Fixes

**Master Plan Reference:** N/A — standalone polish spec following BB-47 (scroll-to-top, copy/color fixes), BB-48 (layout/nav fixes), BB-49, and BB-50 (layout, reader UX, devotional fix).

**Status:** Draft
**Date:** 2026-04-17
**Branch:** Stay on current branch (`claude/feature/bible-polish-round-2`)
**Depends on:** BB-47, BB-48, BB-49, BB-50 (all executed on the current branch)
**Depended on by:** None

---

## Overview

Third round of polish fixes for the Bible section. Several items from BB-48 and BB-50 either didn't land or only partially fixed the problem. This spec addresses the remaining gaps with stronger investigation requirements and also introduces two auth-gating decisions: hiding streaks for logged-out users and auth-gating the My Bible page. These changes collectively close the visual and behavioral gaps that make the Bible section feel unfinished — critical for users who treat scripture reading as a daily sanctuary practice.

**Auth policy amendment:** This spec partially amends the "Bible features have NO auth gating" policy in `02-security.md`. The Bible reader, highlighting, notes, bookmarks, memorization, AI Explain/Reflect, search, and push notifications remain fully unauthenticated. Two changes are introduced: (1) the streak UI is hidden for logged-out users (the streak logic still runs in localStorage for dev), and (2) the My Bible aggregated dashboard page shows a conversion card for logged-out users instead of an empty heatmap. Individual personal-layer actions (highlight a verse, take a note, etc.) remain unauthenticated.

## User Story

As a **logged-out or logged-in visitor**, I want the Bible section to have a seamless dark background on every sub-route, consistent heading styles, high-contrast progress indicators, a working focus-mode default, and auth-appropriate content gating so that **the Bible section feels polished and trustworthy — matching the visual quality of the Daily Hub and homepage**.

## Requirements

### Functional Requirements

#### 1. GLOBAL: Edge-to-Edge Dark Background on ALL Bible Routes

**Problem:** The Daily Hub page has a seamless dark background that extends edge-to-edge from the navbar down through the content. Every Bible sub-route (`/bible`, `/bible/my`, Reading Plans, Browse Books) has a constrained-width content area floating on a light gray `#F5F5F5` background with visible gutters. This has been attempted in BB-48 and BB-50 and the fix has not fully landed.

**Root cause:** The issue is NOT in the individual page components. It's in the layout wrapper that wraps all Bible routes. There is likely a parent component (possibly in the router configuration, possibly a layout route, possibly a shared wrapper) that applies a light background or a max-width constraint to everything under `/bible/*`.

**MANDATORY RECON — DO THIS BEFORE WRITING ANY FIX:**

1. Open the Daily Hub page component. Trace its DOM from the outermost element to the first content element. Record every wrapper element and its classes. Note which element applies `bg-hero-bg` or equivalent.
2. Open the BibleBrowser page component. Do the same trace. Compare the two traces side by side. The difference between them IS the bug.
3. Check the router configuration in `App.tsx` (or wherever routes are defined). Do the Bible routes share a layout component or wrapper that other routes don't? If yes, that wrapper is almost certainly where the light background or max-width constraint lives.
4. Check for a `<main>` element or a content wrapper between the Navbar and the page content. If it has classes like `bg-neutral-bg`, `bg-gray-50`, `max-w-4xl`, `max-w-5xl`, `container`, or similar — that's the culprit.

**Fix approach:** The fix must be applied at the LAYOUT level, not at the individual page component level. Wherever the shared wrapper for Bible routes lives, it needs `min-h-screen bg-hero-bg`. If there is no shared Bible layout wrapper and each page independently wraps itself, then the fix goes on a global layout component that wraps ALL routes — and use `bg-hero-bg` globally since the entire app uses the dark theme.

Compare the final result against the Daily Hub. The visual treatment should be identical: dark background seamlessly flowing from the navbar into the page content with no seam, no gap, no color break, no gray gutters at any viewport width.

**Verify on ALL Bible sub-routes:**
- `/bible` (Bible browser home)
- `/bible/my` (My Bible)
- `/bible/:book/:chapter` (BibleReader — already has its own dark theme, verify no regression)
- The Reading Plans page (wherever it routes — `/grow?tab=plans` or `/reading-plans`)
- The Browse Books view (sub-view within `/bible`)

#### 2. "Your Study Bible" Vertical Positioning

**Problem:** The heading has excessive top padding, pushing it far below the navbar. Other pages (Daily Hub's "Good Morning!") position their heading closer to the navbar.

**Fix:** Reduce the top padding on the Bible browser hero section. Match the vertical rhythm of the Daily Hub page — the heading should feel like it's in the upper third of the viewport, not centered in a large empty space. Likely changing `pt-24` or `pt-32` (or whatever the current top padding is) to `pt-12` or `pt-16`.

#### 3. Hide Streaks for Logged-Out Users

**Decision:** Streaks are a logged-in feature only. A streak that can't survive a browser clear or cross-device usage isn't meaningful.

**Fix:** Conditionally render the streak display (the "1 day streak" pill and any streak-related UI on the Bible browser and My Bible pages) only when the user is authenticated. Check `isAuthenticated` from the auth context. When logged out, the streak pill simply doesn't render — no placeholder, no "log in to see your streak" message, just absent.

This applies to:
- The streak pill on the Bible browser page
- Any streak display on the My Bible page
- Any streak-related content anywhere in the Bible section

Don't delete the streak logic — it still runs in localStorage for demo/development purposes. Just hide the UI for logged-out users.

#### 4. Auth-Gate My Bible Page

**Decision:** My Bible should be a logged-in feature. The heatmap, reading history, highlights, and bookmarks don't persist across devices without an account, and showing an empty dashboard to a logged-out user is confusing.

**Fix:** When a logged-out user navigates to `/bible/my`, show a clean conversion card instead of the empty heatmap:

```
[FrostedCard, centered on page]
My Bible
Track your reading journey, highlights, notes, and bookmarks
across all your devices.
[Get Started — It's Free] (white pill CTA → auth modal)
```

The card uses the existing `FrostedCard` component and the homepage primary CTA white pill pattern (Pattern 2 from `09-design-system.md`). Tapping the CTA opens the auth modal (existing `useAuthModal()` flow).

Do NOT delete the My Bible page content — just wrap it in an `isAuthenticated` conditional. When logged in, the full My Bible experience renders as it does today.

#### 5. "Read in Context" Scroll Fix

**Problem:** Clicking "Read in context" on the Verse of the Day still pushes the user partway down the destination page, despite BB-47's ScrollToTop component.

**Investigation required:** The ScrollToTop component triggers on `pathname` changes. If "Read in context" navigates using:
- `<a href="...">` instead of React Router's `<Link>` — it bypasses the SPA router entirely
- A hash link (`#verse-16`) on the same page — pathname doesn't change, so ScrollToTop doesn't fire
- `navigate()` with `{ replace: true }` — pathname still changes, ScrollToTop should fire

Find how "Read in context" navigates, fix it to use React Router's `navigate()` or `<Link>` component, and verify ScrollToTop fires on the transition. If the destination is on a different page (the BibleReader), the user should land at the top with the verse scrolled into view via the BibleReader's own verse-scroll logic.

#### 6. Browse Books Animation Fix (REINVESTIGATION)

**Problem:** The book selection animation in Browse Books is still glitched after BB-48/BB-50 attempted to fix it. The cards sliding in and out stutter or overlap.

**MANDATORY INVESTIGATION:** Previous blind CSS fixes have failed. This time:
1. Open the Browse Books component in the browser with DevTools Performance tab recording
2. Click on a book to trigger the animation
3. Capture a Performance trace showing the animation frames
4. Identify whether the issue is:
   - Layout thrashing (elements changing width/height during the animation, triggering reflows)
   - React re-renders mid-animation (state updates causing component unmount/remount during the transition)
   - CSS transition conflicts (multiple transitions firing on the same element)
   - Missing `will-change` or `transform` usage (forcing the browser to repaint instead of composite)
5. If the root cause can be fixed cleanly, fix it. If not, REPLACE the sliding animation with an instant transition (no animation). A clean cut is better than a glitchy slide.

Same investigation for the Reading Plans page if it has a similar sliding animation.

#### 7. Reading Plan Cards Redesign

**Problem:** The reading plan cards still have colored backgrounds that look garish. BB-48 specified FrostedCard styling but the fix either didn't land or didn't match the homepage aesthetic.

**Fix:** Make the reading plan cards visually match the dashboard preview cards on the homepage (the "Mood Insights," "Growth Garden," etc. cards). Specifically:
- Background: `bg-white/5 backdrop-blur-sm`
- Border: `border border-white/10 rounded-2xl`
- Hover: `hover:bg-white/[0.08] hover:border-white/20 transition-all`
- Text: title in `text-white font-semibold`, metadata in `text-white/70`
- Remove ALL existing colored backgrounds (the brown, green, teal gradients)
- Each card should have the same visual weight — no card should stand out more than another through color alone

#### 8. Reading Plans Page Fixes

**Problem:** Three issues:
1. "Reading Plans" heading text is slightly cut off at the bottom — likely an `overflow-hidden` or a `line-height` issue on the heading element
2. Theme and Duration filters are still showing despite BB-47/48 specifying their removal
3. Four cards in a single row (`grid-cols-4`) is too spread on desktop and cramped on mobile

**Fix:**
1. Fix the heading text cutoff: check for `overflow-hidden` on the heading's parent container. If the heading uses the gradient text style (`bg-clip-text`), the clip might be cutting off descenders. Add `pb-1` or `leading-relaxed` to give the text breathing room below the baseline.
2. Remove the Theme and Duration filter UI. Delete the render. This was specified in BB-47 and BB-48 — find out why it didn't execute and remove it now.
3. Change the card grid to `grid-cols-2` on desktop breakpoints. On mobile, the grid collapses to `grid-cols-1` if the cards are too wide at 2-up on 375px.

#### 9. BibleReader Top Bar Persistence

**Problem:** The top toolbar in the BibleReader still fades away after a few seconds despite BB-50 specifying that focus mode should default to OFF.

**Investigation:** Check whether BB-50's fix actually changed the default value of `wr_bible_focus_enabled` from `'true'` to `'false'`. Possible failure modes:
- The default was changed but the user's existing localStorage still has `'true'` from a previous session — the fix needs to handle this by treating absent AND `'false'` as "off" (which it should already do, but verify)
- The default was not actually changed in the code
- The focus mode logic checks a different key or has a hardcoded default somewhere else

Fix whatever the root cause is. The toolbar must remain visible with full opacity at all times when focus mode is off. No fade, no timer.

**Also:** Remove the redundant chapter heading from the reader body. The chapter title (e.g., "Psalms 94") appears both in the top toolbar (interactive, with the chevron for chapter navigation) and as a static heading in the reader body below. Remove the static heading in the reader body. The top toolbar version is the canonical display — it's interactive and always visible (now that focus mode is off by default).

**Do NOT rename the toolbar chapter selector to "Explore More".** "Psalms 94 ▾" is clearer because it tells the user exactly where they are AND signals that tapping opens navigation.

#### 10. My Bible Heading Style

**Problem:** "My" is white and "Bible" is purple gradient. Inconsistent with "Study Bible" and "Reading Plans" which use the gradient on the full text.

**Fix:** Change "My Bible" to render on a single line with the full purple gradient treatment on the entire text. Use the same `GRADIENT_TEXT_STYLE` from `constants/gradients.tsx` applied to "Study Bible" and "Reading Plans." The heading should read "My Bible" — all one line, all gradient, matching the heading treatment across the Bible section.

#### 11. My Bible Completion Box Contrast

**Problem:** The white completion boxes in the Bible Progress Map are still too close in appearance to unread chapter boxes. They blend together.

**Fix:** Increase the contrast between read and unread states:
- Unread chapters: `bg-white/[0.06]` (barely visible, just enough to show the grid cell exists)
- Read chapters: `bg-white/80` (near-solid white, unmistakably filled)

The current implementation likely uses `bg-white/10` for empty and `bg-white/40` for filled, which are too close together on the dark background. The gap between 6% and 80% opacity creates a clear binary distinction.

### Non-Functional Requirements

- **Bundle:** No new dependencies. Auth checks use existing `isAuthenticated` context. Expected delta: negligible.
- **Performance:** No new network requests. All changes are CSS/DOM or conditional rendering.
- **Accessibility:** Conversion card for logged-out My Bible users needs proper heading structure (`<h1>`) and the CTA button needs focus ring (use the existing white pill CTA pattern which includes `focus-visible:ring-2`). The removed static chapter heading in BibleReader does not affect accessibility — the interactive toolbar version is more accessible (it's a button with clear purpose).

## Auth Gating

**Two new auth gates introduced in this spec:**

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View `/bible/my` (My Bible) | Conversion card with "Get Started" CTA | Full My Bible experience (heatmap, progress map, memorization deck, activity feed) | "Sign in to track your Bible reading journey" |
| View streak pill on Bible pages | Not rendered (absent) | Rendered normally | N/A (no modal — element is simply absent) |

**Unchanged auth behavior (all remain unauthenticated):**
- Bible reader (`/bible/:book/:chapter`)
- Highlighting, notes, bookmarks, memorization
- AI Explain, AI Reflect
- Full-text search
- Push notification permission
- Browse Books
- Reading Plans pages

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Reading plan cards: 1-column grid. My Bible conversion card: full width with padding. Chapter completion boxes: same size, same contrast. |
| Tablet (640-1024px) | Reading plan cards: 2-column grid. My Bible conversion card: centered, max-width ~480px. |
| Desktop (> 1024px) | Reading plan cards: 2-column grid. My Bible conversion card: centered, max-width ~480px. Edge-to-edge dark background verified at 1440px+. |

## AI Safety Considerations

N/A — This spec does not involve AI-generated content or free-text user input. No crisis detection required. The existing AI Explain/Reflect features are untouched.

## Auth & Persistence

- **Logged-out users:** Can browse `/bible`, read chapters, use all personal-layer features (highlights, notes, bookmarks, memorization) via localStorage. Cannot see streak UI. Cannot access My Bible page (see conversion card). All existing unauthenticated Bible features remain unchanged.
- **Logged-in users:** Full experience including streaks, My Bible page with heatmap/progress map/memorization deck/activity feed.
- **localStorage usage:** No new keys. Existing keys used: `wr_bible_focus_enabled` (default changed to `'false'`), `wr_bible_highlights`, `bible:bookmarks`, `bible:notes`, `wr_chapters_visited`, `wr_memorization_cards`.

## Completion & Navigation

N/A — standalone polish feature. No completion tracking changes.

## Design Notes

- **Edge-to-edge background:** Must use `bg-hero-bg` (`#08051A`) matching the Daily Hub. Reference the Daily Hub root structure in `09-design-system.md` § "Daily Hub Visual Architecture" — specifically the `bg-hero-bg` on the root div.
- **FrostedCard for conversion card:** Use the existing `FrostedCard` component (`bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] rounded-2xl`).
- **White pill CTA:** Use Pattern 2 (homepage primary CTA) from `09-design-system.md` § "White Pill CTA Patterns" for the "Get Started — It's Free" button.
- **`GRADIENT_TEXT_STYLE`:** From `constants/gradients.tsx` — the white-to-purple gradient via `background-clip: text`. Used for "My Bible" heading to match "Study Bible" and "Reading Plans".
- **Reading plan cards:** Match the `DashboardPreviewCard` aesthetic from the homepage preview section. No colored gradients.
- **Completion box contrast:** The 6% → 80% opacity gap is a deliberate binary distinction. Reference `_plans/recon/design-system.md` for exact computed opacity values on the existing progress map.
- **Animation tokens:** Any animation changes (Browse Books fix) must use canonical tokens from `constants/animation.ts` — `base` (300ms) + `standard` easing for transitions, or remove the animation entirely if the root cause can't be fixed cleanly.

## Out of Scope

- Real authentication (Phase 3 — current auth is simulated)
- Backend sync for personal-layer data (Phase 3)
- Light mode (Phase 4)
- BibleReader theme changes (midnight/parchment/sepia remain as-is)
- Audio player changes (BB-26-29 wave is separate)
- New features or new pages — this is pure polish
- Reading Plans on the `/grow` page (only fixing the Reading Plans view accessible from the Bible section)

## Acceptance Criteria

- [ ] ALL Bible sub-routes (`/bible`, `/bible/my`, Reading Plans, Browse Books) have edge-to-edge dark background matching the Daily Hub's visual treatment. No gray gutters at any viewport width up to 1440px+.
- [ ] "Your Study Bible" heading is vertically closer to the navbar (reduced top padding, matching Daily Hub vertical rhythm).
- [ ] Streak display is hidden for logged-out users across all Bible pages. Streak still renders for logged-in users.
- [ ] Logged-out users visiting `/bible/my` see a centered FrostedCard conversion card with "My Bible" heading, description text, and "Get Started — It's Free" white pill CTA that opens the auth modal.
- [ ] Logged-in users visiting `/bible/my` see the full My Bible experience as before (heatmap, progress map, memorization deck, activity feed).
- [ ] "Read in context" navigates via React Router and lands at the top of the destination page (no mid-page scroll position).
- [ ] Browse Books animation is smooth or replaced with an instant transition (no stutter, no overlap).
- [ ] Reading plan cards use `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl` styling. No garish colored backgrounds.
- [ ] Reading Plans heading text is not cut off (descenders fully visible).
- [ ] Theme and Duration filters are removed from the Reading Plans page (no filter UI rendered).
- [ ] Reading plan cards are in a 2-column grid on desktop, 1-column on mobile.
- [ ] BibleReader top toolbar stays visible at all times by default (focus mode default is OFF, `wr_bible_focus_enabled` defaults to `'false'`).
- [ ] Redundant static chapter heading removed from reader body (toolbar "Psalms 94 ▾" is the canonical display).
- [ ] "My Bible" heading is one line, full purple gradient via `GRADIENT_TEXT_STYLE`, matching "Study Bible" and "Reading Plans" heading style.
- [ ] Chapter completion boxes have high contrast: unread at `bg-white/[0.06]`, read at `bg-white/80`.
- [ ] Conversion card CTA button has a visible focus ring matching the white pill CTA pattern.
- [ ] All existing tests pass with updates for changed behavior (auth-gated My Bible, hidden streaks, focus mode default, removed filters).
