# BB-21.5: Plan Browser

**Master Plan Reference:** N/A — standalone feature. Depends on BB-21 (`_specs/bb-21-reading-plans-architecture.md`) for plan types, store, hooks, and detail page.

**Branch:** `bible-redesign` (no new branch — commits directly to this branch)

---

## Overview

The plan browser is the discovery surface where users find reading plans. When a user thinks "what should I read next?", `/bible/plans` is the answer. It lists every plan from the manifest, organized into three sections (in progress, browse, completed), filterable by theme and duration, with a card-based grid that makes each plan feel distinct and inviting. This spec is pure UI — BB-21 already built the architecture (types, store, hooks, detail page, completion celebration). BB-21.5 is the discoverability layer that makes those plans findable.

The manifest is empty at the end of this spec. When BB-22 adds the first real plan (`psalms-30-days`), the browser will display it automatically with no code changes needed in BB-21.5.

## User Story

As a **logged-in user** browsing the Bible section, I want to discover available reading plans filtered by theme and duration so that I can find a plan that matches my current spiritual need and start it.

As a **logged-out visitor**, I want to browse available reading plans so that I can see what's offered before deciding to sign up.

## Requirements

### Functional Requirements

1. New route `/bible/plans` renders `PlanBrowserPage`, lazy-loaded per existing pattern
2. Page has three sections in order: **In Progress** (conditional), **Browse Plans** (always visible), **Completed** (conditional)
3. In Progress section shows only when user has active or paused plans; displays `PlanInProgressCard` for each
4. Completed section shows only when user has completed plans with no active/paused re-attempt; displays `PlanCompletedCard` for each
5. Browse Plans section shows all plans from the manifest that are neither in-progress nor completed, filtered by current filter state
6. A plan appears in exactly one section — most-relevant wins: active/paused > completed > browse
7. Filter bar with two groups: **theme** pills (All + 6 themes from `PlanTheme`) and **duration** pills (Any length, 7 days or less, 8-21 days, 22+ days)
8. Filters are mutually exclusive within each group, AND-combined across groups
9. Filter state persisted in URL query params (`?theme=comfort&duration=short`), updated via router push (back button works)
10. Invalid filter values in URL silently fall through to defaults ("all" / "any")
11. In-progress cards show progress bar, current day preview, and explicit "Continue" button navigating to current day's reader
12. Completed cards show "Completed" badge, completion date, and render at ~85% opacity
13. Browse cards show plan's `coverGradient` background, title, `shortTitle`, duration label, curator label, and theme icon
14. Tapping a browse/completed card navigates to `/bible/plans/{slug}`; tapping Continue on in-progress card navigates to `/bible/plans/{slug}/day/{currentDay}`
15. Bible landing page (`BibleLanding.tsx`) gets a visible "Browse plans" entry point linking to `/bible/plans`
16. `BiblePlanDetail` page gets a "Back to all plans" link at the top navigating to `/bible/plans`
17. `PlanCompletionCelebration` "Start another plan" action navigates to `/bible/plans`
18. Three empty states: (a) no manifest — "No plans available yet" + Open Bible CTA; (b) filtered out — "No plans match these filters" + Clear filters CTA; (c) all started — inline note "You've started every plan..."
19. The `usePlanBrowser` hook is reactive to both the manifest and plansStore — starting/completing a plan updates the browser immediately

### Non-Functional Requirements

- **Performance**: Manifest is loaded synchronously from bundled JSON; no async loading needed for the browser page itself
- **Accessibility**: WCAG AA, keyboard-navigable filter pills with visible focus states, semantic HTML (`<article>` for cards, `aria-label` on interactive elements), all tap targets >= 44px, reduced motion respected (no transform animations under `prefers-reduced-motion`)

## Auth Gating

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| Browse `/bible/plans` | Can view all plans, filter, tap cards | Full access | N/A |
| Tap a browse card | Navigates to plan detail (detail page handles auth for starting) | Navigates to plan detail | N/A |
| Tap Continue on in-progress card | N/A — logged-out users have no progress data, so no in-progress cards render | Navigates to current day | N/A |
| Tap a completed card | N/A — logged-out users have no completion data | Navigates to plan detail | N/A |

The plan browser itself is **fully public** — no auth gates on viewing or filtering. Auth gating for starting/pausing/restarting plans is handled by the detail page (`BiblePlanDetail`), not by the browser.

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | 1-column card grid, filter pills wrap to multiple rows, full-width cards |
| Tablet (640-1024px) | 2-column card grid, filter pills in a single scrollable row |
| Desktop (> 1024px) | 3-column card grid |
| Wide desktop (> 1400px) | 4-column card grid |

- Cards maintain a consistent aspect ratio (~4:3) via `aspect-[4/3]` so the grid stays visually regular
- Section headings and filter bar are full-width
- Filter bar scrolls horizontally on mobile if pills overflow (or wraps — plan phase decides)
- Cards stack on mobile with adequate spacing (`gap-4`)

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required.

## Auth & Persistence

- **Logged-out users:** Can browse plans and use filters. Zero persistence — no progress data exists, so In Progress and Completed sections are empty. Filter state lives in URL only (no localStorage).
- **Logged-in users:** Plan progress is read from `bible:plans` localStorage key (managed by `plansStore` from BB-21). Filter state lives in URL query params (no localStorage).
- **localStorage usage:** This spec reads from existing `bible:plans` key only. No new localStorage keys are created.
- **Route type:** Public

## Completion & Navigation

N/A — standalone feature, not part of Daily Hub. The browser is a navigation endpoint, not a trackable activity.

**Cross-feature navigation:**
- Bible landing -> `/bible/plans` (new "Browse plans" link)
- Plan detail page -> `/bible/plans` (back link)
- Plan completion celebration -> `/bible/plans` ("Start another plan" action)
- Plan browser card tap -> `/bible/plans/{slug}` (detail page)
- In-progress card Continue -> `/bible/plans/{slug}/day/{currentDay}` (day reader)

## Design Notes

- **Page background:** `bg-dashboard-dark` with `ATMOSPHERIC_HERO_BG` hero section, matching existing Bible pages (`BibleStub`, `BibleLanding`)
- **Page title:** Use `GRADIENT_TEXT_STYLE` heading, matching existing Bible page heroes
- **Card style:** NOT `FrostedCard` — plan cards use `coverGradient` backgrounds (Tailwind gradient classes from plan definitions) with `rounded-2xl` corners and `border border-white/10`. The gradient IS the card's identity.
- **Card hover:** Subtle `hover:-translate-y-1 hover:shadow-lg` lift. Under `prefers-reduced-motion`, only `hover:border-white/20` shift.
- **Filter pills:** Match the existing pill pattern in the codebase (small rounded-full buttons). Active: `bg-white/15 text-white border-white/20`. Inactive: `bg-transparent text-white/60 border-white/10 hover:text-white/80`. Min height 36px, padding `px-4 py-2`.
- **Section headings:** `text-xl font-semibold text-white` for section titles ("In progress", "Browse plans", "Completed")
- **Progress bar on cards:** Thin bar (`h-1`) at bottom of card using `bg-white/30` track and `bg-white` fill
- **Completed badge:** Small pill in top-right corner: `bg-white/15 text-white/80 text-xs rounded-full px-2 py-0.5`
- **Empty states:** Centered text with muted subtext (`text-white/50`) and a single CTA button using the existing white pill CTA pattern from `09-design-system.md`
- **Typography:** Inter for all text. Plan titles in `text-lg font-semibold text-white`. Subtitles in `text-sm text-white/60`. Duration/curator labels in `text-xs text-white/50`.
- **Layout wrapper:** Use existing `Layout` component. SEO via existing `SEO` component.
- **Zero raw hex values** — all colors via Tailwind custom tokens or `text-white` opacity variants

## Components to Create

| Component | Purpose |
|-----------|---------|
| `frontend/src/pages/bible/PlanBrowserPage.tsx` | Route-level page component |
| `frontend/src/components/bible/plans/PlanBrowseGrid.tsx` | Responsive CSS grid wrapper |
| `frontend/src/components/bible/plans/PlanBrowseCard.tsx` | Default plan card (gradient bg, title, subtitle, duration, curator) |
| `frontend/src/components/bible/plans/PlanInProgressCard.tsx` | Active/paused plan card with progress bar and Continue button |
| `frontend/src/components/bible/plans/PlanCompletedCard.tsx` | Completed plan card with badge and muted opacity |
| `frontend/src/components/bible/plans/PlanFilterBar.tsx` | Theme + duration filter pill rows |
| `frontend/src/components/bible/plans/PlanFilterPill.tsx` | Individual filter pill button |
| `frontend/src/components/bible/plans/PlanBrowserEmptyState.tsx` | Three-variant empty state (no manifest, filtered out, all started) |
| `frontend/src/components/bible/plans/PlanBrowserSection.tsx` | Section heading + grid wrapper for each section |
| `frontend/src/lib/bible/plans/planFilters.ts` | Pure filter logic functions |
| `frontend/src/hooks/bible/usePlanBrowser.ts` | Hook composing manifest + progress + URL filters |

**Note for execution:** The three card variants share substantial layout code. Consider a shared base layout or shared utility rather than three fully independent components — but the plan phase decides the exact approach.

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Add lazy route for `/bible/plans` → `PlanBrowserPage` (replace the `BibleStub` for plans) |
| `frontend/src/pages/BibleLanding.tsx` | Add "Browse plans" link/button visible in the landing content |
| `frontend/src/pages/BiblePlanDetail.tsx` | Add "Back to all plans" link at the top of the page |
| `frontend/src/components/bible/plans/PlanCompletionCelebration.tsx` | Add/update "Start another plan" action to navigate to `/bible/plans` |

## Critical Edge Cases

1. **Plan in both completed and active state (restarted):** Appears in In Progress only. Completed section does not show it. Historical completion is visible on the detail page.
2. **Invalid URL filter params** (`?theme=badvalue`): Silently treated as defaults. No error, no redirect.
3. **All plans started/completed (Browse section empty):** Inline note below filter bar: "You've started every plan. Finish one to unlock restart from the detail page."
4. **3 active plans cap + tapping a new plan:** Browser navigates to detail page normally; the detail page's start button enforces the cap.
5. **Empty manifest (shipping state):** Full empty state with "No plans available yet" message and "Open Bible" CTA.
6. **Manifest loads synchronously:** `loadManifest()` returns `PlanMetadata[]` synchronously from bundled JSON — no loading spinner needed for the plan list itself.

## Out of Scope

- **No plan content** — manifest remains empty; BB-22 through BB-25 add actual plans
- **No search** — filters only; search deferred until plan count exceeds 30-40
- **No featured/editorial curation** — no "Plan of the week", no "Staff picks"
- **No user ratings or reviews**
- **No sorting controls** — grid order is fixed (manifest order)
- **No save for later / wishlist**
- **No plan sharing** ("share this plan with a friend")
- **No recommendations** ("because you finished Psalms, try John")
- **No preview mode** — card tap always navigates to detail page
- **No pagination** — all plans render in grid (fine for <50 plans)
- **No thumbnail images** — gradient + title + icon is sufficient
- **No streak integration** — browser doesn't read or write streak data
- **No analytics** on browse-vs-start rates
- **No filter beyond theme + duration**

## Acceptance Criteria

- [ ] Route `/bible/plans` renders `PlanBrowserPage` and is lazy-loaded
- [ ] Route replaces the existing `BibleStub` for plans in `App.tsx`
- [ ] Page shows three sections: In Progress, Browse Plans, Completed
- [ ] In Progress section hidden when no active or paused plans exist
- [ ] Completed section hidden when no completed plans exist (or all completed plans are currently re-attempted)
- [ ] Browse Plans section always visible with empty state if manifest is empty
- [ ] Filter bar shows 7 theme pills (All + 6 `PlanTheme` values) and 4 duration pills (Any length, <=7 days, 8-21 days, >=22 days)
- [ ] Only one theme and one duration filter active at a time
- [ ] Filter state stored in URL query params (`?theme=comfort&duration=short`)
- [ ] Invalid filter values in URL fall through to defaults without breaking
- [ ] Filter pill tap updates URL via router push (back button works)
- [ ] Grid shows 1 column on mobile, 2 on tablet, 3 on desktop, 4 on wide desktop
- [ ] Browse card shows `coverGradient` background, title, `shortTitle`, duration label, curator label
- [ ] In-progress card shows progress bar and current day preview text
- [ ] In-progress card has explicit Continue button navigating to `/bible/plans/{slug}/day/{currentDay}`
- [ ] Completed card shows "Completed" badge and completion date
- [ ] Completed card renders at reduced opacity (~85%)
- [ ] Card tap navigates to correct destination (`/bible/plans/{slug}` or day reader)
- [ ] Filter logic is a pure function in `planFilters.ts`, tested in isolation
- [ ] `planFilters.test.ts` covers: no filter, theme only, duration only, both, no matches, invalid input
- [ ] `usePlanBrowser` hook splits plans into in-progress / available / completed based on progress
- [ ] A plan with both completed and active records appears ONLY in In Progress (not duplicated)
- [ ] Hook is reactive to plansStore changes (starting/completing a plan updates browser immediately)
- [ ] Empty state "No plans available yet" shown when manifest is empty, with "Open Bible" button linking to `/bible`
- [ ] Empty state "No plans match these filters" shown when filters exclude everything, with "Clear filters" button
- [ ] Empty state "all started" shows inline note below filter bar
- [ ] Bible landing page has visible link/entry point to `/bible/plans`
- [ ] Plan detail page has "Back to all plans" link at top navigating to `/bible/plans`
- [ ] Completion celebration has "Start another plan" action navigating to `/bible/plans`
- [ ] Responsive on mobile (375px), tablet (768px), and desktop (1280px)
- [ ] All tap targets >= 44px
- [ ] Cards use semantic HTML (`<article>` or link elements with `aria-label`)
- [ ] Filter pills are keyboard navigable with visible focus states
- [ ] Reduced motion: no transform animations on hover, only border-color shift
- [ ] Zero raw hex values in new code
- [ ] Page has appropriate `<SEO>` title and description
- [ ] URL `?theme=comfort&duration=short` renders correctly with both filters active on page load
- [ ] `usePlanBrowser` handles empty manifest without errors
- [ ] `usePlanBrowser.test.ts` covers empty manifest, split logic, filter integration
