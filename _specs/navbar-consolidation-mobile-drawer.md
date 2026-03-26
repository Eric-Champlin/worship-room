# Feature: Navbar Consolidation and Mobile Drawer Redesign

**Master Plan Reference:** N/A — standalone architecture spec (third of 4 navigation restructure specs)

---

## Overview

Worship Room's navigation has grown organically as features were added, resulting in 8+ top-level items on desktop and a flat 22-item list in the mobile drawer. This cognitive overload works against the app's mission of creating a peaceful, approachable experience — users scanning for "where do I go?" shouldn't feel overwhelmed by choices.

This spec consolidates the desktop navbar to 5 clean top-level items and reorganizes the mobile drawer from a flat list into grouped sections with clear visual hierarchy. Users can find what they need faster by scanning 5-6 groups instead of 15+ individual items. The navbar component itself (currently 957 lines) is extracted into focused sub-components for maintainability.

This is the **third of 4 architecture and navigation specs**, building on Spec 7 (Devotional → Daily Hub tab) and Spec 8 (Grow page tabbed experience) which reduced the number of standalone pages that need top-level nav links.

---

## User Stories

- As a **logged-out visitor**, I want to see a clean, scannable navbar with 5 clear destinations so that I can quickly find what interests me without feeling overwhelmed by options.
- As a **logged-in user**, I want my avatar dropdown to show only the items I actually use (Dashboard, My Prayers, Friends, Insights, Settings) so that I'm not distracted by broken or redundant links.
- As a **mobile user**, I want the drawer menu organized into labeled sections so that I can scan by category (Daily, Study, Community, Listen, Find Help) instead of reading a long flat list.
- As a **returning user** who bookmarked `/ask`, I want the page to still work even though it's no longer in the primary navbar, so that my workflow isn't broken.
- As a **user during a liturgical season**, I want a subtle seasonal indicator in the navbar linking to today's devotional so that I'm reminded of the season without a disruptive banner.

---

## Requirements

### 1. Desktop Navbar — 5 Top-Level Items

#### 1.1 Navigation Links (All Users)

The navbar shows exactly 5 top-level navigation links, visible to both logged-out and logged-in users:

| Position | Label | Route | Active When |
|----------|-------|-------|-------------|
| 1 | Daily Hub | `/daily` | `/daily` (any tab) |
| 2 | Bible | `/bible` | `/bible` or `/bible/:book/:chapter` |
| 3 | Grow | `/grow` | `/grow`, `/reading-plans/:planId`, `/challenges/:challengeId` |
| 4 | Prayer Wall | `/prayer-wall` | `/prayer-wall` or any sub-route (`/prayer-wall/:id`, `/prayer-wall/user/:id`, `/prayer-wall/dashboard`) |
| 5 | Music | `/music` | `/music` or `/music/routines` |

#### 1.2 Items Removed from Top-Level Nav

These items are no longer top-level navbar links:

| Removed Item | Reason | Still Accessible Via |
|-------------|--------|---------------------|
| Ask | Reducing clutter — niche feature | Landing page TypewriterInput hero (submits to `/ask`), SiteFooter nav column, direct URL `/ask` |
| Daily Devotional | Now a tab inside Daily Hub (Spec 7) | `/daily?tab=devotional` |
| Reading Plans | Now a tab inside `/grow` (Spec 8) | `/grow?tab=plans` |
| Challenges | Now a tab inside `/grow` (Spec 8) | `/grow?tab=challenges` |

#### 1.3 Right-Side Elements

**Logged-out:** `[Local Support ▾]` dropdown + `[Log In]` text button + `[Get Started]` outlined button

**Logged-in:** `[Local Support ▾]` dropdown + `[🔔]` notification bell + `[Avatar ▾]` dropdown

#### 1.4 Active Link Indicator

The animated underline indicator on the current page's navbar link. Active state detection:

- **Daily Hub**: active when pathname starts with `/daily`
- **Bible**: active when pathname starts with `/bible`
- **Grow**: active when pathname is `/grow`, or starts with `/reading-plans/`, or starts with `/challenges/`
- **Prayer Wall**: active when pathname starts with `/prayer-wall`
- **Music**: active when pathname starts with `/music`

### 2. Local Support Dropdown

Stays as-is — no changes to structure or content:

- Churches → `/local-support/churches`
- Counselors → `/local-support/counselors`
- Celebrate Recovery → `/local-support/celebrate-recovery`

### 3. Avatar Dropdown (Logged-In)

Cleaned up and reorganized. Reduced from 11 items to 7 (including divider and logout):

| Item | Route | Icon |
|------|-------|------|
| Dashboard | `/` | Lucide `LayoutDashboard` or existing icon |
| My Prayers | `/my-prayers` | Lucide `HandHeart` or existing icon |
| Friends | `/friends` | Lucide `Users` or existing icon |
| Mood Insights | `/insights` | Lucide `BarChart3` or existing icon |
| Settings | `/settings` | Lucide `Settings` or existing icon |
| — divider — | | |
| Log Out | (action) | Lucide `LogOut` or existing icon |

**Removed from dropdown:**

| Removed Item | Reason |
|-------------|--------|
| My Journal Entries | Broken 404 link — route never existed |
| My Favorites | Broken 404 link — route never existed |
| My Prayer Requests | Redundant with "My Prayers" |
| Monthly Report | Accessible from within `/insights` — doesn't need its own dropdown link |

### 4. Seasonal Integration Line

If a liturgical season is active (not Ordinary Time), show a thin seasonal notification line inside the navbar's frosted glass container, below the nav links:

- **Content**: Season icon + "It's [Season Name]" in `text-xs text-white/40` + "Read today's devotional" as a `text-primary-lt` link pointing to `/daily?tab=devotional`
- **Dismiss**: Small X button. Dismissal stored in `sessionStorage` (reappears on next browser session/visit).
- **Ordinary Time**: No seasonal line shown.
- **Replaces**: The old standalone seasonal banner that sat above the navbar. That banner is removed.
- **Layout**: The seasonal line sits inside the frosted glass navbar container, below the main nav row. It does not increase the navbar's visual weight significantly — it's a subtle single line.

### 5. Mobile Drawer — Grouped Sections

#### 5.1 Logged-Out Structure

```
DAILY
  Daily Hub

STUDY
  Bible
  Grow
  Ask God's Word

COMMUNITY
  Prayer Wall

LISTEN
  Music

FIND HELP
  Churches
  Counselors
  Celebrate Recovery

──────────────
[Log In]  [Get Started]
```

#### 5.2 Logged-In Structure

```
DAILY
  Daily Hub

STUDY
  Bible
  Grow
  Ask God's Word

COMMUNITY
  Prayer Wall

LISTEN
  Music

FIND HELP
  Churches
  Counselors
  Celebrate Recovery

──────────────

MY WORSHIP ROOM
  Dashboard
  My Prayers
  Friends
  Mood Insights
  Settings

──────────────
🔔 Notifications (with unread badge)
Log Out
```

#### 5.3 Section Headers

- Style: `text-xs uppercase tracking-wide text-white/30`
- Accessibility: `role="heading" aria-level="2"` for screen readers
- Spacing: `mb-2` between sections (subtle spacing, not heavy dividers)

#### 5.4 "Ask God's Word" in Mobile Drawer

"Ask God's Word" appears in the STUDY section (below Bible and Grow) because mobile users rely on the drawer for navigation more than desktop users rely on the footer. On desktop, Ask is accessible via the footer and direct URL.

#### 5.5 Active Item Indicator (Mobile Drawer)

The active/current page item in the mobile drawer gets:
- Left border accent: `border-l-2 border-primary`
- Background highlight: `bg-white/[0.04]`

### 6. Navbar Component Cleanup

Extract the monolithic `Navbar.tsx` (currently 957 lines) into focused sub-components:

| Component | Responsibility |
|-----------|---------------|
| `Navbar.tsx` | Main orchestrator — logo, 5 nav links, responsive shell. Target: under 300 lines. |
| `MobileDrawer.tsx` | Full mobile drawer with grouped sections, auth-aware content. |
| `AvatarDropdown.tsx` | Logged-in user avatar dropdown menu. |
| `LocalSupportDropdown.tsx` | Local Support dropdown with 3 items. |
| `NotificationPanel.tsx` | Notification bell + dropdown panel. (May already exist — extract if inline.) |
| `SeasonalNavLine.tsx` | Seasonal line with dismiss logic. |

All extracted components live in the same directory as `Navbar.tsx` (currently `components/`). The extraction is a refactor — no visual or behavioral changes beyond what this spec defines.

### 7. Responsive Behavior

#### 7.1 Desktop (> 1024px)

- Full navbar: logo + 5 text links + Local Support dropdown + auth buttons (or bell + avatar)
- All labels visible
- Seasonal line visible below nav links when applicable

#### 7.2 Tablet (768px - 1024px)

- When 5 items + logo + auth elements get tight, consider dropping nav item text labels and showing icon-only with tooltips on hover
- `aria-label` mandatory on icon-only nav items
- Seasonal line visible below nav links when applicable

#### 7.3 Mobile (< 768px)

- Hamburger icon + mobile drawer (existing breakpoint)
- Drawer opens from right (or existing direction)
- Seasonal line not shown in navbar header (season info could be in the drawer if desired, but not required)

### 8. Navbar Frosted Glass Styling

No changes to the existing glassmorphic treatment:
- `bg-white/[0.08] backdrop-blur-xl saturate-[1.8] border border-white/25`
- The `transparent` prop continues to control absolute vs relative positioning (transparent on landing page, opaque with gradient on inner pages)

---

## Auth Gating

All 5 nav links are visible to everyone. Auth only affects the right-side elements and mobile drawer sections.

| Element | Logged-Out Behavior | Logged-In Behavior | Auth Modal Message |
|---------|--------------------|--------------------|-------------------|
| 5 nav links (Daily Hub, Bible, Grow, Prayer Wall, Music) | Visible, clickable, navigate normally | Same | N/A |
| Local Support dropdown | Visible, clickable | Same | N/A |
| Log In / Get Started buttons | Visible (right side of navbar) | Hidden (replaced by bell + avatar) | N/A |
| Notification bell | Hidden | Visible with unread badge | N/A |
| Avatar dropdown | Hidden | Visible with menu items | N/A |
| Mobile drawer nav sections (Daily, Study, Community, Listen, Find Help) | Visible | Visible | N/A |
| Mobile drawer "MY WORSHIP ROOM" section | Hidden | Visible | N/A |
| Mobile drawer Notifications row | Hidden | Visible | N/A |
| Mobile drawer Log Out | Hidden | Visible | N/A |
| Mobile drawer Log In / Get Started | Visible | Hidden | N/A |
| Seasonal line "Read today's devotional" link | Visible, navigates to `/daily?tab=devotional` | Same | N/A |

No auth modals are triggered by any navbar interaction. The navbar is purely navigational — auth gates are enforced by the destination pages themselves.

---

## Responsive Behavior

| Breakpoint | Layout |
|-----------|--------|
| Mobile (< 768px) | Hamburger + mobile drawer. Nav links hidden. Logo + hamburger visible. Seasonal line not in header bar. |
| Tablet (768px - 1024px) | Logo + 5 nav items (icon-only if tight, with `aria-label` and tooltip). Local Support dropdown + auth elements. Seasonal line visible. |
| Desktop (> 1024px) | Logo + 5 nav items with text labels. Local Support dropdown + auth elements. Seasonal line visible. Full horizontal layout. |

Additional responsive notes:
- The mobile drawer sections use the same background as existing drawer (`bg-hero-mid`)
- Section headers don't wrap — they're short labels like "DAILY", "STUDY"
- Touch targets: all drawer items maintain 44px minimum height
- The avatar dropdown and Local Support dropdown use existing `animate-dropdown-in` animation

---

## AI Safety Considerations

N/A — This feature does not involve AI-generated content or free-text user input. No crisis detection required. The navbar is purely navigational.

---

## Auth & Persistence

- **Logged-out users**: Can see and use all 5 nav links, Local Support dropdown, and mobile drawer navigation sections. Zero persistence.
- **Logged-in users**: Additionally see notification bell, avatar dropdown, and "MY WORSHIP ROOM" section in mobile drawer. No new persistence beyond existing notification/auth state.
- **Seasonal line dismissal**: Stored in `sessionStorage` (not `localStorage`). Key: `wr_seasonal_nav_dismissed`. Reappears on next browser session.
- **No new localStorage keys** introduced.
- **Route type**: The navbar is a shared component — not a route.

---

## Completion & Navigation

N/A — standalone component, not part of the Daily Hub tabbed experience.

---

## Design Notes

### Existing Components Referenced

- **Navbar.tsx** — the current monolithic component being refactored and restructured
- **NotificationBell.tsx** / **NotificationPanel.tsx** — existing notification components
- **AuthModal / AuthModalProvider** — not directly used by navbar but related auth state
- **`useLiturgicalSeason` hook** — provides current season name and icon for the seasonal line
- **`useAuth()` hook** — determines logged-in/logged-out state for conditional rendering

### Design System Recon Reference

Reference `_plans/recon/design-system.md` for:
- **Nav "Get Started" button**: `bg-white/20 text-white font-medium text-sm py-2 px-5 rounded-full border border-white/30`
- **Dropdown animation**: `animate-dropdown-in` (150ms ease-out)
- **Mobile drawer background**: `bg-hero-mid` (#1E0B3E)
- **Dropdown panel styling**: `bg-hero-mid border border-white/15 shadow-lg`, white text, `text-white/50` section headings, `border-white/15` dividers

### New Visual Patterns

1. **Seasonal nav line** — A thin notification strip inside the frosted glass navbar, below the main nav row. `text-xs text-white/40` for season text, `text-primary-lt` for the devotional link, small X dismiss button. This is a new pattern not captured in the design system recon — values should be marked `[UNVERIFIED]` during planning.
2. **Mobile drawer section headers** — `text-xs uppercase tracking-wide text-white/30` category labels. While the style tokens exist, the grouped section pattern itself is new to the drawer.
3. **Mobile active item indicator** — `border-l-2 border-primary bg-white/[0.04]` left border accent on the current page's drawer item.

---

## Edge Cases

- **Active state for `/ask`**: The `/ask` page has no corresponding top-level nav link. No nav item should show an active underline when on `/ask`. The "Ask God's Word" item in the mobile drawer should show the active indicator when on `/ask`.
- **Active state for Local Support pages**: Local Support is a dropdown, not a nav link with an underline. No underline shows for Local Support pages. In the mobile drawer, the specific sub-item (Churches, Counselors, or Celebrate Recovery) shows the active indicator.
- **Active state for `/devotional` redirect**: Since `/devotional` redirects to `/daily?tab=devotional`, the "Daily Hub" nav link correctly shows active after the redirect completes.
- **Seasonal line during Ordinary Time**: No seasonal line rendered at all — not an empty bar, just absent.
- **Seasonal line dismiss then season changes**: If a user dismisses during Lent and then visits during Easter (new session), the Easter line shows fresh (sessionStorage is per-session).
- **Navbar on landing page**: `transparent` prop = absolute positioning over the hero. The 5 nav links are visible. The seasonal line is visible if applicable.
- **Deep link active states**: `/reading-plans/finding-peace-in-anxiety` correctly highlights "Grow" since the route starts with `/reading-plans/`.

---

## Out of Scope

- **Page content changes** — No changes to any page component, routing logic, or feature behavior. Only the navbar, mobile drawer, avatar dropdown, and seasonal line are in scope.
- **SiteFooter changes** — The footer already has an "Ask God's Word" link in its nav columns. No footer changes needed.
- **New routes or redirects** — `/ask` stays as-is. No new redirects introduced. Redirects from Specs 7 and 8 are already handled.
- **Real authentication** — Phase 3. The navbar continues to use `useAuth()` simulated auth.
- **Dark mode** — Phase 4.
- **Notification panel redesign** — The notification panel content is extracted but not redesigned. Same functionality, just in its own component file.
- **Icon selection for nav items** — The spec does not mandate specific Lucide icons for the 5 nav links. If the current navbar uses text-only links (no icons), that's fine for desktop. Icons are needed for the tablet icon-only mode and mobile drawer.

---

## Acceptance Criteria

### Desktop Navbar — Links

- [ ] Exactly 5 top-level nav links visible: Daily Hub, Bible, Grow, Prayer Wall, Music
- [ ] "Ask", "Daily Devotional", "Reading Plans", and "Challenges" are NOT top-level nav items
- [ ] "Grow" link navigates to `/grow` (default tab: Reading Plans)
- [ ] All 5 nav links are visible to both logged-out and logged-in users
- [ ] Local Support dropdown remains with Churches, Counselors, Celebrate Recovery

### Desktop Navbar — Active States

- [ ] "Daily Hub" shows animated underline when on `/daily` (any tab)
- [ ] "Bible" shows animated underline when on `/bible` or `/bible/:book/:chapter`
- [ ] "Grow" shows animated underline when on `/grow`, `/reading-plans/:planId`, or `/challenges/:challengeId`
- [ ] "Prayer Wall" shows animated underline when on `/prayer-wall` or any sub-route
- [ ] "Music" shows animated underline when on `/music` or `/music/routines`
- [ ] No nav item shows active underline when on `/ask`, `/devotional` (before redirect), or Local Support pages

### Desktop Navbar — Right Side

- [ ] Logged-out: shows Local Support dropdown + "Log In" + "Get Started" buttons
- [ ] Logged-in: shows Local Support dropdown + notification bell + avatar dropdown
- [ ] "Get Started" button uses existing style: `bg-white/20 text-white text-sm py-2 px-5 rounded-full border border-white/30`

### Avatar Dropdown (Logged-In)

- [ ] Shows exactly: Dashboard, My Prayers, Friends, Mood Insights, Settings, divider, Log Out
- [ ] "My Journal Entries", "My Favorites", "My Prayer Requests", "Monthly Report" are NOT in the dropdown
- [ ] Dashboard links to `/`
- [ ] My Prayers links to `/my-prayers`
- [ ] Friends links to `/friends`
- [ ] Mood Insights links to `/insights`
- [ ] Settings links to `/settings`
- [ ] Log Out triggers logout action

### Seasonal Line

- [ ] When a liturgical season is active (not Ordinary Time), a thin line appears below the nav links inside the frosted glass container
- [ ] Line shows: season icon + "It's [Season Name]" in `text-xs text-white/40` + "Read today's devotional" link in `text-primary-lt` pointing to `/daily?tab=devotional`
- [ ] Dismiss X button hides the line for the current session (stored in `sessionStorage`)
- [ ] Line reappears on next browser session/visit
- [ ] During Ordinary Time, no seasonal line is rendered
- [ ] Old standalone seasonal banner above the navbar is removed

### Mobile Drawer — Logged-Out

- [ ] Sections displayed: DAILY (Daily Hub), STUDY (Bible, Grow, Ask God's Word), COMMUNITY (Prayer Wall), LISTEN (Music), FIND HELP (Churches, Counselors, Celebrate Recovery)
- [ ] Section headers styled: `text-xs uppercase tracking-wide text-white/30`
- [ ] Section headers have `role="heading" aria-level="2"`
- [ ] Sections separated by subtle spacing (`mb-2`), not heavy dividers
- [ ] Log In and Get Started buttons appear below a divider
- [ ] "MY WORSHIP ROOM" section is NOT visible
- [ ] Notifications row is NOT visible

### Mobile Drawer — Logged-In

- [ ] Same nav sections as logged-out (DAILY, STUDY, COMMUNITY, LISTEN, FIND HELP)
- [ ] Additional "MY WORSHIP ROOM" section below a divider: Dashboard, My Prayers, Friends, Mood Insights, Settings
- [ ] Notifications row with bell icon and unread badge visible
- [ ] Log Out visible
- [ ] Log In / Get Started buttons are NOT visible

### Mobile Drawer — Active States

- [ ] Current page's item shows `border-l-2 border-primary` left border accent
- [ ] Current page's item shows `bg-white/[0.04]` background highlight
- [ ] "Ask God's Word" shows active when on `/ask`
- [ ] Active state detection matches desktop rules (Daily Hub for `/daily`, Grow for `/grow` and detail pages, etc.)

### Mobile Drawer — Accessibility

- [ ] Focus trap maintained (existing behavior preserved)
- [ ] Escape key closes drawer (existing behavior preserved)
- [ ] All items meet 44px minimum touch target
- [ ] Section headers readable by screen readers via `role="heading" aria-level="2"`
- [ ] Keyboard navigation through all items works

### Component Extraction

- [ ] `MobileDrawer` extracted to its own component file
- [ ] `AvatarDropdown` extracted to its own component file
- [ ] `LocalSupportDropdown` extracted to its own component file
- [ ] `NotificationPanel` extracted to its own component file (if previously inline)
- [ ] `SeasonalNavLine` extracted to its own component file
- [ ] Main `Navbar.tsx` is under 300 lines after extraction
- [ ] All extracted components live in the same directory as `Navbar.tsx`
- [ ] No visual or behavioral regressions after extraction

### Responsive

- [ ] At 375px (mobile): hamburger icon visible, 5 nav links hidden, mobile drawer opens with grouped sections
- [ ] At 900px (tablet): 5 nav items visible (icon-only with tooltips if space is tight, with `aria-label`)
- [ ] At 1440px (desktop): 5 nav items visible with full text labels, comfortable spacing
- [ ] Frosted glass styling maintained at all breakpoints: `bg-white/[0.08] backdrop-blur-xl saturate-[1.8] border border-white/25`

### Accessibility (Desktop)

- [ ] All 5 nav items have visible text labels at desktop width
- [ ] At tablet icon-only breakpoint, all nav items have `aria-label` attributes
- [ ] Dropdown menus maintain keyboard navigation (arrow keys, Escape)
- [ ] Focus indicators visible on all interactive elements against the dark/glass background

### "Ask" Feature Accessibility

- [ ] `/ask` page still works and renders correctly (no route removed)
- [ ] "Ask God's Word" appears in the SiteFooter nav columns (existing — verify not removed)
- [ ] "Ask God's Word" appears in the STUDY section of the mobile drawer
- [ ] Landing page TypewriterInput hero still submits/routes to `/ask`

### CLAUDE.md Update

- [ ] Navigation structure notes in CLAUDE.md updated to reflect the new 5-item navbar
- [ ] Route table notes updated if applicable

### No Regressions

- [ ] All existing navbar dropdown animations work (`animate-dropdown-in`)
- [ ] Notification bell and panel continue to function
- [ ] Landing page navbar with `transparent` prop works correctly
- [ ] All existing tests pass (update assertions for removed nav items and restructured dropdown)
- [ ] Mobile drawer sync with desktop dropdown styling maintained (`bg-hero-mid border border-white/15 shadow-lg`)
