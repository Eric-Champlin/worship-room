# Feature: Grow Page Tabbed Experience

**Master Plan Reference:** N/A -- standalone architecture spec (second of 4 navigation restructure specs)

---

## Overview

Worship Room offers two structured multi-day spiritual journey features -- Reading Plans and Community Challenges -- that share the same user intent: guided, day-by-day spiritual growth over weeks. Currently they live at separate routes (`/reading-plans` and `/challenges`), adding navigation complexity and hiding the conceptual connection between them.

This spec consolidates both into a single `/grow` page with two tabs, creating a unified "Grow in Faith" destination. Users discover and browse all structured journeys in one place, then drill into detail pages for the immersive day-by-day experience. This reduces top-level navigation items and groups features by user intent rather than implementation.

---

## User Stories

- As a **logged-out visitor**, I want to browse both Reading Plans and Community Challenges from a single page so that I can discover all the structured spiritual journeys Worship Room offers without navigating between separate pages.
- As a **logged-in user**, I want to switch between Reading Plans and Challenges tabs while preserving my filter selections so that browsing feels seamless.
- As any user who has bookmarked `/reading-plans` or `/challenges`, I want the old URLs to redirect me to the correct tab on `/grow` so that my bookmarks still work.
- As a **logged-in user** viewing a Reading Plan or Challenge detail page, I want the back link to return me to the correct tab on `/grow` so that navigation feels cohesive.

---

## Requirements

### 1. New `/grow` Route

#### 1.1 Page Hero

The hero follows the flush atmospheric gradient pattern from the Inner Page Hero Redesign spec (Spec 5):

- **Base color**: `#0f0a1e` (page background)
- **Gradient overlay**: `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)`
- **Title**: "Grow in Faith" in Caveat script (`font-script`), centered, with gradient text effect (`bg-gradient-to-r from-white to-primary-lt bg-clip-text text-transparent`)
  - Desktop: `text-4xl`
  - Mobile: `text-3xl`
- **Subtitle**: "Structured journeys to deepen your walk with God" in Lora italic (`font-serif italic`), `text-white/60`
  - Desktop: `text-lg`
  - Mobile: `text-base`
- Full viewport width, no border/box-shadow/border-radius. Hero flows directly into the tab bar below with no gap.
- Spacing: `py-12` desktop, `py-8` mobile, plus navbar clearance padding at top (existing `pt-32 sm:pt-36 lg:pt-40` pattern).

#### 1.2 Tab Bar

Two tabs below the hero, using the same frosted glass sticky pattern as Daily Hub:

| Position | Tab | Icon | Query Param |
|----------|-----|------|-------------|
| 1 | Reading Plans | Lucide `BookOpen` | `?tab=plans` |
| 2 | Challenges | Lucide `Flame` | `?tab=challenges` |

- **Default tab**: Reading Plans (`?tab=plans`) when navigating to `/grow` with no tab param.
- **Sticky behavior**: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`, sticky on scroll (same sentinel/Intersection Observer pattern as Daily Hub).
- **Animated sliding underline**: Same implementation as Daily Hub -- purple underline that slides between tabs on switch.
- **Labels always visible**: With only 2 tabs, there is ample width at all breakpoints. Icon + text label on all screen sizes. No icon-only mode needed.
- **Touch targets**: At least 44px height on mobile.

#### 1.3 Active Challenge Notification Dot

If a community challenge is currently active during a liturgical season, the Challenges tab icon shows a small notification dot -- same colored dot pattern as the current Challenges navbar link (pulsing dot using the challenge's `themeColor`). This draws attention to time-sensitive content.

#### 1.4 URL Parameters

- `/grow` -- defaults to Reading Plans tab
- `/grow?tab=plans` -- Reading Plans tab
- `/grow?tab=challenges` -- Challenges tab
- `/grow?tab=plans&create=true` -- Reading Plans tab with AI plan creation flow open

### 2. Reading Plans Tab Content

Move all content from the current `ReadingPlans` (standalone page component) into this tab. The content renders identically -- no visual changes, just relocated:

- **"Create Your Own Plan" featured card** with Sparkles icon (auth-gated: triggers auth modal for logged-out users)
- **Duration filter pills**: All, 7 days, 14 days, 21 days
- **Difficulty filter pills**: All, Beginner, Intermediate
- **Plan cards**: 10 plans + any AI-generated custom plans, in a 2-column grid (desktop) / 1-column (mobile)
- **Confirm dialog** for switching active plans (same behavior as current)
- **`?create=true` flow**: Opens the `CreatePlanFlow` component inline (same as current `/reading-plans?create=true`)

All styling is already dark-themed. No visual changes to the content itself.

### 3. Challenges Tab Content

Move all content from the current `Challenges` (standalone page component) into this tab. Same content, just relocated:

- **Active challenge featured card** (if a season is currently active) with join/resume CTA
- **Upcoming challenges** section
- **Past challenges** with "Hall of Fame" stats
- **Next challenge countdown** timer
- **Switch challenge dialog** (same behavior as current)

All styling is already dark-themed. No visual changes to the content itself.

### 4. Tab Content Mounting

Both tabs are mounted but CSS-hidden when not active (same `hidden` attribute pattern as Daily Hub). This preserves:
- Filter state in the Reading Plans tab (duration, difficulty selections)
- Scroll position within each tab
- Any in-progress dialog state

### 5. Detail Pages Remain Standalone

- `/reading-plans/:planId` stays as its own full page (not a tab). Deep-dive reading experience.
- `/challenges/:challengeId` stays as its own full page. Deep-dive challenge experience.
- These are immersive day-by-day experiences that deserve their own full page layout.

### 6. Back Navigation from Detail Pages

- `/reading-plans/:planId`: Update the "Browse Plans" / back link to navigate to `/grow?tab=plans` (currently navigates to `/reading-plans`)
- `/challenges/:challengeId`: Update the "Back to Challenges" link to navigate to `/grow?tab=challenges` (currently navigates to `/challenges`)
- `PlanNotFound` component: Update "Browse Reading Plans" link to `/grow?tab=plans`
- `ChallengeNotFound` component: Update "Browse Challenges" link to `/grow?tab=challenges`
- `ChallengeCompletionOverlay`: Update navigation to `/grow?tab=challenges`
- `ReadingPlanDetail` SEO breadcrumb: Update the "Reading Plans" breadcrumb item URL to `/grow?tab=plans`

### 7. Redirects

- `/reading-plans` (standalone browser) redirects to `/grow?tab=plans`
- `/challenges` (standalone browser) redirects to `/grow?tab=challenges`
- `/reading-plans?create=true` redirects to `/grow?tab=plans&create=true`
- `/reading-plans/:planId` and `/challenges/:challengeId` stay as-is (no redirect)

Redirects should use `<Navigate replace>` to avoid polluting browser history (back button goes to the page before the old URL, not back to the redirect).

### 8. Internal Link Updates

All links throughout the app that pointed to `/reading-plans` or `/challenges` (standalone browsers) must be updated:

#### Navbar
- `{ label: 'Reading Plans', to: '/reading-plans' }` becomes `{ label: 'Reading Plans', to: '/grow?tab=plans' }`
- `{ label: 'Challenges', to: '/challenges' }` becomes `{ label: 'Challenges', to: '/grow?tab=challenges' }`
- The notification dot logic on the Challenges link changes its `link.to` check from `/challenges` to `/grow?tab=challenges`
- Both links remain as separate items in the navbar. A later spec (Spec 9) will consolidate them into a single "Grow" link.

#### Dashboard Widgets
- `ReadingPlanWidget`: "Browse all plans" and "View all plans" links update to `/grow?tab=plans`
- `ChallengeWidget`: Challenge card links stay as `/challenges/:challengeId` (detail pages unchanged), but any "Browse challenges" link updates to `/grow?tab=challenges`
- `MoodRecommendations`: Reading plan route links stay as `/reading-plans/:planId` (detail page, unchanged)

#### Other Components
- `PlanCard`: Links to `/reading-plans/:planId` stay as-is (detail page)
- `ChallengeStrip`: Links to `/challenges/:challengeId` stay as-is (detail page)
- `ChallengeBanner`: Navigation to `/challenges/:challengeId` stays as-is (detail page)
- `ChallengeShareButton`: Share text mentioning `/challenges/:challengeId` stays as-is

### 9. Component Cleanup

- Remove the standalone `ReadingPlans` page component (or repurpose its content as a tab content component)
- Remove the standalone `Challenges` page component (or repurpose its content as a tab content component)
- Keep `ReadingPlanDetail` and `ChallengeDetail` as standalone route components
- The page-level wrappers (Navbar, SiteFooter, SEO) from the standalone pages are no longer needed -- the `/grow` page provides these

### 10. CLAUDE.md Route Table Update

| Route | Change |
|-------|--------|
| `/grow` | Add as Built -- "Tabbed: Reading Plans \| Challenges" |
| `/reading-plans` | Change to "Redirect -> /grow?tab=plans" |
| `/challenges` | Change to "Redirect -> /grow?tab=challenges" |
| `/reading-plans/:planId` | No change (stays as Built) |
| `/challenges/:challengeId` | No change (stays as Built) |

---

## Auth Gating

The `/grow` page is public -- all users (logged-in and logged-out) can browse.

| Action | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|--------|--------------------|--------------------|-------------------|
| View `/grow` page | Visible, no restrictions | Visible, no restrictions | N/A |
| Switch between tabs | Works, no restrictions | Works, no restrictions | N/A |
| Browse Reading Plans (filter, scroll) | Works, no restrictions | Works, no restrictions | N/A |
| Browse Challenges (view active/upcoming/past) | Works, no restrictions | Works, no restrictions | N/A |
| Click "Create Your Own Plan" | Auth modal appears | Opens CreatePlanFlow | "Sign in to create a reading plan" |
| Click "Start Plan" on a plan card | Auth modal appears | Starts plan (or shows switch dialog if one active) | "Sign in to start a reading plan" |
| Click "Join Challenge" on active challenge | Auth modal appears | Joins challenge (or shows switch dialog) | "Sign in to join this challenge" |
| Click "Resume" on a paused challenge | Auth modal appears | Resumes challenge | "Sign in to resume this challenge" |
| Toggle challenge reminder | Auth modal appears | Toggles reminder | "Sign in to set reminders" |

All auth gates are inherited from the existing `ReadingPlans` and `Challenges` components -- no new gates introduced.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 640px) | Hero: `py-8`, `text-3xl` title, `text-base` subtitle. Tab bar: 2 tabs with icon + label, full-width, comfortable spacing. Reading Plans: 1-column plan card grid, stacked filter pills. Challenges: full-width cards stacked vertically. |
| Tablet (640px - 1024px) | Hero: intermediate sizing. Tab bar: 2 tabs centered. Reading Plans: 2-column plan card grid. Challenges: cards with wider layout. |
| Desktop (> 1024px) | Hero: `py-12`, `text-4xl` title, `text-lg` subtitle. Tab bar: 2 tabs centered within content width. Reading Plans: 2-column grid with generous spacing. Challenges: featured card + grid layout. |

The 2-tab layout is comfortable at all breakpoints -- no icon-only mode needed. Filter pills in the Reading Plans tab wrap naturally on narrow screens.

---

## AI Safety Considerations

N/A -- This feature does not involve AI-generated content or free-text user input. No crisis detection required. The AI plan creation flow is moved from `ReadingPlans` unchanged, with its existing auth gate and input handling.

---

## Auth & Persistence

- **Logged-out users**: Can browse all tabs, view all plan/challenge descriptions, filter plans. Zero persistence -- no localStorage writes.
- **Logged-in users**: All existing persistence unchanged. `wr_reading_plan_progress`, `wr_custom_plans`, `wr_challenge_progress`, `wr_challenge_reminders` continue to work as before.
- **No new localStorage keys** introduced.
- **Route type**: Public (`/grow`). No auth required to view.

---

## Completion & Navigation

N/A -- standalone feature, not part of the Daily Hub tabbed experience. The `/grow` page is a discovery/browser surface. Completion tracking happens on detail pages (`/reading-plans/:planId`, `/challenges/:challengeId`) which are unchanged.

---

## Design Notes

### Existing Components Referenced

- **PageHero** component (updated in Inner Page Hero Redesign spec) -- the `/grow` hero follows the same atmospheric gradient pattern
- **Daily Hub tab bar** -- the frosted glass sticky tab bar pattern (`bg-white/[0.08] backdrop-blur-xl border-b border-white/10`) with animated sliding underline
- **ReadingPlans page content** -- all filter pills, plan cards, CreatePlanFlow, ConfirmDialog
- **Challenges page content** -- all challenge cards (Active, Upcoming, Past), HallOfFame, NextChallengeCountdown, SwitchChallengeDialog
- **Navbar challenge dot** -- the pulsing colored notification dot on the Challenges link

### Design System Recon Reference

Reference `_plans/recon/design-system.md` for:
- **Inner Page Hero** gradient pattern (now the atmospheric radial glow from the hero redesign spec)
- **Tab bar** styling from Daily Hub (frosted glass, sticky, animated underline)
- **Reading Plan card** layout (2-column grid, dark-themed)
- **Challenge card** layout (dark-themed, with season color accents)

### New Visual Patterns

None -- this spec reuses existing patterns exclusively. The atmospheric hero, frosted glass tab bar, and all card layouts already exist. The only change is WHERE the content renders and the addition of a 2-tab bar (vs Daily Hub's 4-tab bar).

---

## Edge Cases

- **Tab persistence across navigation**: If a user is on `/grow?tab=challenges`, navigates to a challenge detail page, then hits the browser back button, they should return to `/grow?tab=challenges` (not the default plans tab). The `?tab=challenges` param in the URL ensures this.
- **Filter persistence within tab**: Switching from the Reading Plans tab (with "14 days" + "Beginner" filters active) to Challenges and back should preserve those filter selections (achieved by mounting both tabs and hiding with CSS).
- **`create=true` with challenges tab**: `/grow?tab=challenges&create=true` -- the `create=true` param is ignored when the Challenges tab is active. It only affects the Reading Plans tab.
- **Active challenge detection for tab dot**: Uses the same `getActiveChallengeInfo()` logic from the Navbar. If no challenge is currently active, no dot appears.
- **Direct navigation to detail pages**: `/reading-plans/finding-peace-in-anxiety` continues to work directly -- it does NOT redirect through `/grow`. Only the browser routes (`/reading-plans`, `/challenges`) redirect.
- **Back button after redirect**: `/reading-plans` -> `/grow?tab=plans` uses `<Navigate replace>`, so the back button goes to the page before `/reading-plans`, not back to the redirect.

---

## Out of Scope

- **Content changes** -- No changes to reading plan data, challenge data, card designs, progress tracking, gamification, or any feature behavior. Only the browser/discovery shell changes.
- **Detail page changes** -- `/reading-plans/:planId` and `/challenges/:challengeId` are unchanged except for back navigation link targets.
- **Navbar consolidation** -- The navbar keeps "Reading Plans" and "Challenges" as separate links (retargeted to `/grow`). A later spec (Spec 9) will replace both with a single "Grow" link.
- **New tab content** -- No new sections, cards, or features added to either tab. Content is moved verbatim.
- **Animations** -- No new animations. The tab sliding underline animation already exists in the Daily Hub pattern.
- **Backend changes** -- Entirely frontend.
- **SEO page-level changes** -- The `/grow` page gets its own SEO title/description. Individual plan/challenge SEO stays unchanged.

---

## Acceptance Criteria

### Page Structure

- [ ] `/grow` route renders a page with atmospheric gradient hero, 2-tab bar, and tab content
- [ ] Hero title "Grow in Faith" uses Caveat script with gradient text effect (white to `primary-lt`)
- [ ] Hero subtitle "Structured journeys to deepen your walk with God" uses Lora italic in `text-white/60`
- [ ] Hero uses the atmospheric radial gradient pattern: `radial-gradient(ellipse at top center, rgba(109, 40, 217, 0.15) 0%, transparent 70%)` on `#0f0a1e` base
- [ ] Hero flows directly into the tab bar with no visible gap or spacer

### Tab Bar

- [ ] Two tabs display: "Reading Plans" (BookOpen icon) and "Challenges" (Flame icon)
- [ ] Navigating to `/grow` with no tab param defaults to the Reading Plans tab
- [ ] `/grow?tab=plans` selects Reading Plans tab
- [ ] `/grow?tab=challenges` selects Challenges tab
- [ ] Tab bar uses frosted glass styling: `bg-white/[0.08] backdrop-blur-xl border-b border-white/10`
- [ ] Tab bar is sticky on scroll (appears fixed below navbar when scrolling past hero)
- [ ] Animated sliding underline moves between tabs on switch
- [ ] Tab touch targets are at least 44px on mobile
- [ ] Both tabs show icon + text label at all breakpoints (no icon-only mode)
- [ ] When a community challenge is currently active, the Challenges tab shows a pulsing notification dot using the challenge's `themeColor`

### Reading Plans Tab Content

- [ ] All content from the standalone `ReadingPlans` page renders identically in the tab
- [ ] "Create Your Own Plan" featured card is present and functional
- [ ] Duration filter pills (All, 7 days, 14 days, 21 days) are present and functional
- [ ] Difficulty filter pills (All, Beginner, Intermediate) are present and functional
- [ ] Plan cards display in 2-column grid (desktop) / 1-column (mobile)
- [ ] `/grow?tab=plans&create=true` opens the CreatePlanFlow
- [ ] Plan card links still navigate to `/reading-plans/:planId` (detail page)

### Challenges Tab Content

- [ ] All content from the standalone `Challenges` page renders identically in the tab
- [ ] Active challenge card displays when a season is active
- [ ] Upcoming and past challenge sections display correctly
- [ ] Hall of Fame stats display for completed challenges
- [ ] Challenge card links still navigate to `/challenges/:challengeId` (detail page)

### Tab State Preservation

- [ ] Switching from Reading Plans (with filters active) to Challenges and back preserves filter selections
- [ ] Both tab content areas are mounted but CSS-hidden when not active (same `hidden` attribute pattern as Daily Hub)
- [ ] Scroll position within each tab is preserved when switching

### Redirects

- [ ] `/reading-plans` redirects to `/grow?tab=plans` via `<Navigate replace>`
- [ ] `/challenges` redirects to `/grow?tab=challenges` via `<Navigate replace>`
- [ ] `/reading-plans?create=true` redirects to `/grow?tab=plans&create=true`
- [ ] Browser back button after redirect goes to the page before the old URL, not back to the redirect
- [ ] `/reading-plans/:planId` does NOT redirect (stays as standalone)
- [ ] `/challenges/:challengeId` does NOT redirect (stays as standalone)

### Back Navigation from Detail Pages

- [ ] `ReadingPlanDetail` back/browse link navigates to `/grow?tab=plans` (not `/reading-plans`)
- [ ] `ChallengeDetail` "Back to Challenges" link navigates to `/grow?tab=challenges` (not `/challenges`)
- [ ] `PlanNotFound` "Browse Reading Plans" link navigates to `/grow?tab=plans`
- [ ] `ChallengeNotFound` "Browse Challenges" link navigates to `/grow?tab=challenges`
- [ ] `ChallengeCompletionOverlay` navigation goes to `/grow?tab=challenges`
- [ ] `ReadingPlanDetail` SEO breadcrumb URL for "Reading Plans" points to `/grow?tab=plans`

### Internal Link Updates

- [ ] Navbar "Reading Plans" link points to `/grow?tab=plans`
- [ ] Navbar "Challenges" link points to `/grow?tab=challenges`
- [ ] Navbar challenge notification dot logic works with the updated `/grow?tab=challenges` link
- [ ] `ReadingPlanWidget` "Browse all plans" / "View all plans" links point to `/grow?tab=plans`
- [ ] All other internal links to `/reading-plans` (browser, not detail) updated to `/grow?tab=plans`
- [ ] All other internal links to `/challenges` (browser, not detail) updated to `/grow?tab=challenges`
- [ ] Links to `/reading-plans/:planId` and `/challenges/:challengeId` remain unchanged

### Auth Behavior

- [ ] Logged-out users can view `/grow`, switch tabs, browse plans/challenges, filter, scroll
- [ ] Logged-out users clicking "Create Your Own Plan" see auth modal with "Sign in to create a reading plan"
- [ ] Logged-out users clicking "Start Plan" see auth modal with appropriate message
- [ ] Logged-out users clicking "Join Challenge" see auth modal with appropriate message
- [ ] All existing auth gates from `ReadingPlans` and `Challenges` components are preserved

### Responsive

- [ ] At 375px (mobile): Hero `py-8`, `text-3xl` title, `text-base` subtitle. Tab bar 2 tabs with icon + label. Plan cards 1-column. Challenge cards stacked.
- [ ] At 768px (tablet): Hero intermediate sizing. 2-column plan grid. Comfortable tab spacing.
- [ ] At 1440px (desktop): Hero `py-12`, `text-4xl` title, `text-lg` subtitle. 2-column plan grid with generous spacing.
- [ ] Tab bar never overflows or truncates at any viewport width

### Accessibility

- [ ] All hero text meets WCAG AA contrast on the dark gradient background
- [ ] Tab bar supports keyboard navigation (arrow keys to switch between tabs)
- [ ] Active tab indicated to screen readers (`aria-selected="true"`)
- [ ] Tab panels have `role="tabpanel"` with `aria-labelledby` linking to their tab
- [ ] All interactive elements within tabs (filter pills, plan cards, challenge cards) remain keyboard-accessible
- [ ] Focus indicators visible on the dark background
- [ ] All interactive elements meet 44px minimum touch target on mobile

### Component Cleanup

- [ ] Standalone `ReadingPlans` page component removed (or fully repurposed as tab content)
- [ ] Standalone `Challenges` page component removed (or fully repurposed as tab content)
- [ ] `ReadingPlanDetail` and `ChallengeDetail` remain as standalone route components
- [ ] The `/grow` page includes its own Navbar, SiteFooter, and SEO component

### CLAUDE.md Update

- [ ] Route table updated: `/grow` added as Built, `/reading-plans` changed to redirect, `/challenges` changed to redirect

### No Regressions

- [ ] All reading plan functionality (start, progress, complete, switch plans) unchanged
- [ ] All challenge functionality (join, progress, complete, milestones, community feed) unchanged
- [ ] Dashboard widgets continue to function correctly with updated links
- [ ] All existing tests pass (update assertions for route changes and link targets)
