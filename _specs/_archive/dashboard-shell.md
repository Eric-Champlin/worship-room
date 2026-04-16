# Feature: Dashboard Shell

**Master Plan Reference:** `dashboard-growth-spec-plan-v2.md`
- Shared data models: See "localStorage Key Summary" section — this spec owns `wr_auth_simulated`, `wr_user_name`, `wr_dashboard_collapsed`
- Cross-spec dependencies: Spec 1 (Mood Check-In) renders inside this shell conditionally; Specs 3-16 replace placeholder widget content; all specs consume `AuthProvider` context built here
- Shared constants: Time-of-day greeting thresholds, level names/thresholds, widget IDs for collapse state

---

## Overview

The Dashboard Shell is the structural container for the entire logged-in experience. It handles three fundamental responsibilities: (1) route switching so `/` renders the Dashboard when authenticated and the landing page when not, (2) the dark gradient hero section with personalized greeting, streak, and level display, and (3) the widget grid that holds all dashboard cards in a responsive two-column layout.

This spec also delivers the `AuthProvider` context that powers the entire frontend-first authentication system, and the navbar logged-in state that applies globally on every page — not just the dashboard.

The Dashboard is the "home base" for a user's spiritual growth journey. It should feel warm, alive, and encouraging — a place that celebrates your presence without demanding anything.

---

## User Stories

- As a **logged-in user**, I want to see a personalized dashboard at `/` so that I have a home base for my spiritual growth journey.
- As a **logged-in user**, I want to see a time-of-day greeting with my name so that the experience feels warm and personal.
- As a **logged-in user**, I want to see my streak count, level, and faith points in the hero so that I have an at-a-glance sense of my progress.
- As a **logged-in user**, I want to collapse and expand dashboard widgets so that I can customize which information is visible.
- As a **logged-in user**, I want Quick Action buttons to navigate to Pray, Journal, Meditate, and Music so that I can start my daily practice from the dashboard.
- As a **logged-in user**, I want to see a notification bell and avatar dropdown in the navbar on all pages so that I can access my account and notifications from anywhere.
- As a **logged-out visitor**, I want to see the landing page at `/` as before so that my experience is unchanged.
- As a **developer**, I want a "Simulate Login" toggle (dev-only) so that I can test the authenticated experience without real auth.

---

## Requirements

### Route Switching

- The `/` route renders `Dashboard` when `isAuthenticated` is true and `Home` (landing page) when false
- This is a conditional render in the router config, not a redirect — the URL stays as `/`
- All existing routes remain unchanged; only `/` gains conditional behavior
- The Dashboard component conditionally renders the Mood Check-In (Spec 1) or the dashboard content based on whether the user has checked in today

### AuthProvider Context

- A minimal `AuthProvider` context wraps the app (above the router or at the app root)
- Exposes: `isAuthenticated` (boolean), `user` (object with `name` and `id`, or null), `login(name)`, `logout()`
- `login(name)` sets `wr_auth_simulated` to `"true"` and `wr_user_name` to the provided name in localStorage, then updates React state
- `logout()` clears `wr_auth_simulated` and `wr_user_name` from localStorage but preserves ALL other `wr_*` keys (mood entries, points, badges, friends, settings, etc.)
- Reads initial state from localStorage on mount — if `wr_auth_simulated === "true"`, user is authenticated with the name from `wr_user_name`
- Generates a stable `user.id` (stored in localStorage as `wr_user_id`) — created once on first login, never regenerated
- If an existing `useAuth()` hook exists in the codebase, the `AuthProvider` must integrate with or replace it so there is exactly one auth system, not two parallel hooks
- This provider becomes the real JWT auth provider in Phase 3 — only the internals change, not the context API

### "Simulate Login" Dev Toggle

- A small button visible only when `import.meta.env.DEV` is true
- Positioned in the bottom-right corner of the landing page (fixed position, subtle styling)
- Label: "Simulate Login" when logged out, "Simulate Logout" when logged in
- Clicking "Simulate Login" calls `auth.login("Eric")` — the page re-renders, showing the Dashboard
- Clicking "Simulate Logout" calls `auth.logout()` — the page re-renders, showing the landing page
- Logout preserves all user data (mood, points, badges, etc.) — only clears auth state
- Not visible in production builds

### Dashboard Hero Section

- Dark gradient background matching the landing page hero family (deep purple to near-black)
- Time-of-day greeting: "Good morning, [Name]" / "Good afternoon, [Name]" / "Good evening, [Name]"
  - Morning: hours 5-11
  - Afternoon: hours 12-16
  - Evening: hours 17-4
- Streak display: flame icon + count + "day streak" label. If streak is 0: "Start your streak today"
  - Note: Streak data comes from Spec 5. For this spec, display placeholder data (e.g., streak: 0, "Start your streak today")
- Level badge: Current level icon + name (e.g., "Seedling") + faith points + small progress bar showing progress to next level
  - Note: Level/points data comes from Spec 5. For this spec, display placeholder data (Level: Seedling, 0 Faith Points, 0% progress)
- Hero height: approximately 180px desktop, 200px mobile (content stacks vertically on mobile)
- No quick-action buttons in the hero — they live in their own widget card below
- Content centered on mobile, left-aligned on desktop

### Widget Grid

- Desktop: 2-column layout using CSS Grid. Left column ~60% width (3 of 5 grid columns), right column ~40% (2 of 5 grid columns). `grid-cols-5` with left spanning `col-span-3` and right spanning `col-span-2`
- Mobile (< 768px): Single column, widgets stack in priority order
- Tablet (768-1023px): Single column but wider cards
- Gap between cards: `gap-4 md:gap-6`

**Widget priority order (determines stacking on mobile):**

| Priority | Widget | Column (Desktop) | Content in This Spec |
|----------|--------|-------------------|----------------------|
| 1 | Streak & Faith Points | Right | Placeholder: "Coming in Spec 6" |
| 2 | 7-Day Mood Chart | Left | Placeholder: "Coming in Spec 3" |
| 3 | Today's Activity Checklist | Left | Placeholder: "Coming in Spec 6" |
| 4 | Friends & Leaderboard Preview | Right | Placeholder: "Coming in Spec 9" |
| 5 | Quick Actions | Full width (spans both columns) | Functional immediately |

**Desktop layout:**
```
[          Hero: Greeting + Streak + Level          ]
[  Left (60%)              ] [  Right (40%)         ]
[  7-Day Mood Chart        ] [  Streak & Points     ]
[  Activity Checklist      ] [  Friends Preview     ]
[  Quick Actions (full width across both columns)   ]
```

### DashboardCard Component

- Reusable frosted glass card for all dashboard widgets
- Props: `title` (string), `icon` (optional ReactNode), `collapsible` (boolean, default true), `defaultCollapsed` (boolean, default false), `action` (optional object with `label` and `to` for a "See More" / "See all" link), `children` (ReactNode), `id` (string — used as the key for collapse persistence)
- Visual style: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- Padding: `p-4 md:p-6`
- Header row: icon + title on the left, collapse chevron toggle + action link on the right
- Collapse animation: smooth height transition with `overflow-hidden`
- Collapse state persisted to `wr_dashboard_collapsed` in localStorage as a JSON object: `{ [widgetId]: boolean }`
- When collapsed, only the header row is visible; card content is hidden

### Quick Actions Card

- Functional immediately (not a placeholder)
- 4 navigation buttons: Pray, Journal, Meditate, Music
- Each button links to the corresponding route: `/daily?tab=pray`, `/daily?tab=journal`, `/daily?tab=meditate`, `/music`
- Button style: frosted glass with icon + label, hover glow effect
- Layout: horizontal row on desktop, 2x2 grid on mobile
- Each button has a Lucide icon (e.g., Heart for Pray, BookOpen for Journal, Brain for Meditate, Music for Music — exact icons deferred to planning)

### Navbar Logged-In State (Global — All Pages)

**This change applies on every page when `isAuthenticated` is true, not just the dashboard.**

**Desktop changes:**
- "Log In" and "Get Started" buttons are removed
- Notification bell (Lucide `Bell` icon) is added to the right of nav links
  - Unread count badge: small red circle with white number, positioned top-right of the bell icon
  - Badge only renders when count > 0
  - Click behavior is a no-op placeholder until Spec 12 — the icon renders but does nothing on click
  - For this spec, the unread count is hardcoded to 0 (no badge visible)
- User avatar is added to the right of the bell
  - Circular avatar (32px) with the user's initials as fallback (e.g., "E" for "Eric")
  - Background: `bg-primary` with white text
  - Click opens a dropdown menu with the following items:
    - Dashboard (links to `/`)
    - Friends (links to `/friends`)
    - My Journal Entries (links to `/journal/my-entries`)
    - My Prayer Requests (links to `/prayer-wall/dashboard`)
    - My Favorites (links to `/favorites`)
    - Mood Insights (links to `/insights`)
    - Settings (links to `/settings`)
    - Divider line
    - Log Out (calls `auth.logout()`)
  - Dropdown styling: matches existing dropdown panel style (`bg-hero-mid border border-white/15 shadow-lg`, white text)
  - Dropdown has focus management: opens on click, closes on click outside or Escape key

**Mobile drawer changes:**
- "Log In" and "Get Started" buttons at bottom are removed
- Top of drawer: user avatar + name displayed
- Navigation items added (in order): Dashboard, Daily Hub, Prayer Wall, Music, Local Support section, Friends, Mood Insights, My Journal Entries, My Prayer Requests, My Favorites, Settings
- Notifications item added near bottom (with unread count badge if > 0)
- "Log Out" link at the very bottom
- Drawer styling remains consistent with existing mobile drawer (`bg-hero-mid border border-white/15`)

---

## AI Safety Considerations

- **Crisis detection needed?**: No — this spec does not involve user text input. The mood check-in (Spec 1) handles crisis detection for its text field.
- **User input involved?**: No — the dashboard shell is display-only. The only "input" is clicking nav links and toggling card collapse.
- **AI-generated content?**: No — all content is static or derived from localStorage data.

---

## Auth & Persistence

### Logged-out users (demo mode):
- See the landing page at `/` — completely unchanged experience
- Zero data persistence. No cookies, no anonymous IDs, no tracking.
- All existing logged-out flows (Daily Hub, Prayer Wall, Music, etc.) continue to work as before

### Logged-in users:
- See the Dashboard at `/` with personalized hero and widget grid
- `wr_auth_simulated`, `wr_user_name`, `wr_user_id` stored in localStorage for auth state
- `wr_dashboard_collapsed` stored in localStorage for widget collapse preferences
- Logout clears auth state only — all other `wr_*` data is preserved

### Route type:
- `/` is public but conditionally renders based on auth state
- The Dashboard component itself is effectively auth-gated (only renders when authenticated)

### Auth gating per interactive element:

| Element | Logged-out behavior | Logged-in behavior |
|---------|--------------------|--------------------|
| Dashboard at `/` | Not visible — sees landing page | Renders full dashboard |
| Dashboard hero | Not visible | Shows greeting, streak, level |
| Widget cards | Not visible | All 5 cards render with collapse toggle |
| Quick Actions buttons | Not visible (but same pages are accessible via navbar) | Navigate to `/daily?tab=*` and `/music` |
| DashboardCard collapse toggle | Not visible | Toggles visibility, persisted to localStorage |
| Navbar notification bell | Not visible (sees "Log In" / "Get Started" instead) | Renders bell icon (no-op click until Spec 12) |
| Navbar avatar dropdown | Not visible | Opens dropdown with account menu items |
| Avatar dropdown "Log Out" | Not visible | Calls `auth.logout()`, returns to landing page |
| "Simulate Login" dev toggle | Visible in dev mode only — calls `login()` | Visible in dev mode only — calls `logout()` |

---

## UX & Design Notes

### Visual Design

- **Dashboard background**: Dark solid background matching the dashboard theme. Use `bg-[#0f0a1e]` or similar deep dark purple as the page background behind all widgets.
- **Hero gradient**: Dark gradient matching the landing page hero family. Reference the design system recon: use the same gradient colors (`#0D0620`, `#1E0B3E`, `#3B0764`) but in a shorter, more contained section. The hero should feel like the top of the landing page hero but compressed.
- **Hero greeting**: `font-serif text-2xl md:text-3xl text-white/90` — warm and personal
- **Streak display**: Flame emoji or icon, white text, `text-lg font-semibold`
- **Level badge + points**: Smaller text below streak, `text-white/60`, with a thin progress bar (`h-1.5 rounded-full bg-white/10` track, `bg-primary` fill)
- **Widget cards**: Frosted glass per design system — `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6`
- **Card header**: Title in `text-white font-semibold text-base md:text-lg`, icon in `text-white/60`, collapse chevron in `text-white/40`
- **Placeholder text**: `text-white/30 text-sm italic` centered in the card body area
- **Quick Action buttons**: Frosted glass style matching the card pattern but smaller — icon above label, hover creates a subtle glow in the button's accent color
- **Overall tone**: Dark, calm, and encouraging. The dashboard should feel like a quiet sanctuary, not a productivity tool.

### Design System Recon References

- **Hero gradient**: Reference the Homepage Hero gradient pattern from the design system recon (`radial-gradient` with `#3B0764` center, fading through `#0D0620`), but shortened to ~180px height
- **Navbar dropdown**: Matches existing dropdown panel pattern (`bg-hero-mid border-white/15 shadow-lg`)
- **Card pattern**: New "Dashboard Card" pattern — frosted glass on dark background. This is a **new pattern** not captured in the design system recon (existing cards are white-on-light). Flag for `/plan` to mark values as `[UNVERIFIED]` until visually verified.
- **Avatar**: New component pattern — circular with initials fallback. This is a **new pattern**.

### Animations

- **Dashboard entrance**: Gentle fade-in (`opacity 0→1, 400ms ease-in-out`) when dashboard loads after check-in or on direct visit
- **Card collapse/expand**: Smooth height transition (~200ms ease)
- **Quick Action hover**: Subtle scale (1.02x) + glow effect (200ms)
- **Hero streak counter**: Animated count-up (800ms) on first load after check-in (comes alive in Spec 5 when real data exists; for now, static "0")
- **`prefers-reduced-motion`**: All animations disabled, transitions instant

### Responsive Behavior

#### Mobile (< 768px)
- Hero: Content stacked vertically and centered. Greeting, then streak below, then level/points below that. ~200px height.
- Widget grid: Single column, all cards stack in priority order (Streak & Points → Mood Chart → Activity Checklist → Friends Preview → Quick Actions)
- Quick Actions: 2x2 grid of buttons
- Navbar: Hamburger menu with logged-in drawer structure (avatar + name at top, full nav, Log Out at bottom)
- DashboardCard: Full width with `p-4` padding

#### Tablet (768px-1023px)
- Hero: Same as mobile but greeting can be slightly larger (`text-3xl`)
- Widget grid: Single column with wider cards (max-width ~720px centered)
- Quick Actions: Horizontal row (4 across)
- Navbar: Same as desktop (horizontal links + bell + avatar)

#### Desktop (1024px+)
- Hero: Content left-aligned within a max-width container. Greeting on left, streak and level on right or below.
- Widget grid: 2-column layout (60/40 split via `grid-cols-5`)
- Quick Actions: Full width spanning both columns, horizontal row
- Navbar: Horizontal links + bell icon + avatar with dropdown
- DashboardCard: `p-6` padding
- Max content width: `max-w-6xl mx-auto` (matches navbar)

---

## Edge Cases

- **No mood data yet**: Dashboard renders normally without check-in appearing if the user just logged in via Simulate Login and immediately navigated away and back. The check-in logic (Spec 1) handles this, not the shell.
- **Long user names**: The greeting should truncate gracefully with ellipsis if the name exceeds available space
- **Extremely narrow viewports**: Cards should never overflow horizontally; use `min-w-0` to allow flex/grid items to shrink
- **localStorage unavailable**: If localStorage is blocked (e.g., Safari private browsing), auth state defaults to logged-out. Dashboard cards default to expanded (no persisted collapse state).
- **Multiple browser tabs**: Auth state changes in one tab should be reflected when switching to another tab (read localStorage on focus/visibility change or use `storage` event listener)
- **Avatar dropdown overflow**: On very short viewports, the dropdown should not extend below the visible area — use max-height with scroll if needed
- **Dev toggle in production**: The "Simulate Login" button must be completely absent from production builds, not just hidden via CSS

---

## Out of Scope

- **Real mood chart rendering** — Spec 3 (this spec shows placeholder)
- **Real streak/points/level data** — Spec 5-6 (this spec shows placeholder values)
- **Real activity checklist** — Spec 6 (this spec shows placeholder)
- **Real friends/leaderboard preview** — Spec 9-10 (this spec shows placeholder)
- **Notification bell click behavior and panel** — Spec 12 (this spec renders the icon only)
- **Avatar image upload or preset avatars** — Spec 14 (this spec uses initials fallback only)
- **Badge display in hero or anywhere** — Spec 7-8
- **Real authentication (JWT, Spring Security)** — Phase 3
- **Backend API persistence** — Phase 3 (this spec uses localStorage only)
- **Settings page** — Spec 13
- **Profile page** — Spec 14
- **Friends page** — Spec 9
- **Insights page** — Spec 4
- **Empty states with illustrations** — Spec 16 (this spec uses simple placeholder text)
- **Dark mode toggle** — Phase 4 (the dashboard is always dark)
- **Multi-language support** — not in MVP

---

## Acceptance Criteria

### Route Switching
- [ ] Navigating to `/` when not authenticated renders the landing page (Home component) unchanged
- [ ] Navigating to `/` when authenticated renders the Dashboard component
- [ ] URL remains `/` in both cases (no redirect)
- [ ] All existing routes (`/daily`, `/prayer-wall`, `/music`, etc.) continue to work unchanged

### AuthProvider
- [ ] `AuthProvider` context is available app-wide, exposing `isAuthenticated`, `user`, `login()`, `logout()`
- [ ] `login("Eric")` sets `wr_auth_simulated` to `"true"` and `wr_user_name` to `"Eric"` in localStorage
- [ ] After `login()`, `isAuthenticated` is `true` and `user.name` is `"Eric"`
- [ ] `logout()` sets `isAuthenticated` to `false` and `user` to `null`
- [ ] `logout()` clears only `wr_auth_simulated` and `wr_user_name` — all other `wr_*` keys are preserved
- [ ] On page reload, auth state is restored from localStorage (`wr_auth_simulated === "true"`)
- [ ] A stable `user.id` is generated once and stored in `wr_user_id` — not regenerated on subsequent logins

### Dev Toggle
- [ ] "Simulate Login" button is visible only when `import.meta.env.DEV` is true
- [ ] Button is positioned in the bottom-right corner of the landing page, subtle and non-intrusive
- [ ] Clicking "Simulate Login" authenticates and re-renders the page as Dashboard
- [ ] When authenticated, button label changes to "Simulate Logout"
- [ ] Clicking "Simulate Logout" de-authenticates and re-renders as landing page
- [ ] Button is completely absent from production builds (not just hidden)

### Dashboard Hero
- [ ] Hero section has a dark gradient background matching the landing page hero color family
- [ ] Greeting shows "Good morning, [Name]" when hours are 5-11
- [ ] Greeting shows "Good afternoon, [Name]" when hours are 12-16
- [ ] Greeting shows "Good evening, [Name]" when hours are 17-23 or 0-4
- [ ] User's name comes from the auth context (`user.name`)
- [ ] Streak display shows placeholder: flame icon + "Start your streak today" (or "0 day streak")
- [ ] Level display shows placeholder: "Seedling" + "0 Faith Points" + empty progress bar
- [ ] Hero height is approximately 180px on desktop, content stacks on mobile (~200px)

### Widget Grid
- [ ] 5 widget cards render on the dashboard in the correct priority order
- [ ] Desktop (1024px+): 2-column grid layout with 60/40 split
- [ ] Mobile (< 768px): Single column with all cards stacked
- [ ] Quick Actions card spans full width across both columns on desktop
- [ ] Gap between cards is `gap-4` on mobile, `gap-6` on desktop

### DashboardCard Component
- [ ] Each card has frosted glass styling: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl`
- [ ] Card header shows icon + title on the left, collapse chevron + optional action link on the right
- [ ] Clicking the collapse chevron toggles card content visibility with a smooth height transition
- [ ] Collapse state is persisted to `wr_dashboard_collapsed` in localStorage
- [ ] On page reload, previously collapsed cards remain collapsed
- [ ] Placeholder cards show italic, muted text indicating which spec will replace them (e.g., "Coming in Spec 3")

### Quick Actions
- [ ] Quick Actions card renders 4 buttons: Pray, Journal, Meditate, Music
- [ ] Pray button navigates to `/daily?tab=pray`
- [ ] Journal button navigates to `/daily?tab=journal`
- [ ] Meditate button navigates to `/daily?tab=meditate`
- [ ] Music button navigates to `/music`
- [ ] Buttons display a Lucide icon + text label
- [ ] Layout: horizontal row on desktop, 2x2 grid on mobile
- [ ] Buttons have hover effect (subtle scale or glow)

### Navbar Logged-In State (Global)
- [ ] When authenticated, navbar shows notification bell + avatar on ALL pages (not just dashboard)
- [ ] When authenticated, "Log In" and "Get Started" buttons are hidden on all pages
- [ ] When not authenticated, navbar shows "Log In" and "Get Started" as before
- [ ] Notification bell renders Lucide Bell icon; no badge visible when count is 0
- [ ] Bell click is a no-op (placeholder for Spec 12)
- [ ] Avatar shows user's first initial in a circular badge (`bg-primary`, white text, 32px)
- [ ] Clicking avatar opens a dropdown menu with: Dashboard, Friends, My Journal Entries, My Prayer Requests, My Favorites, Mood Insights, Settings, divider, Log Out
- [ ] Dropdown items navigate to their respective routes
- [ ] "Log Out" dropdown item calls `auth.logout()` and returns to the landing page
- [ ] Dropdown closes when clicking outside or pressing Escape
- [ ] Dropdown styling matches existing dropdown panels (`bg-hero-mid border border-white/15`)

### Mobile Drawer (Logged-In)
- [ ] When authenticated, mobile drawer shows avatar + name at the top
- [ ] Drawer includes: Dashboard, Daily Hub, Prayer Wall, Music, Local Support section, Friends, Mood Insights, My Journal Entries, My Prayer Requests, My Favorites, Settings
- [ ] Notifications item near bottom (with badge count if > 0)
- [ ] "Log Out" link at the very bottom
- [ ] "Log In" / "Get Started" buttons are hidden when authenticated

### Accessibility
- [ ] Dashboard uses `<main>` landmark
- [ ] Each DashboardCard uses `<section>` with `aria-labelledby` pointing to its title
- [ ] Collapse toggles have `aria-expanded` and `aria-controls` attributes pointing to the content panel
- [ ] Quick action buttons have clear accessible labels
- [ ] Avatar dropdown has `aria-haspopup="menu"` and focus management (focus moves into dropdown on open, returns to trigger on close)
- [ ] Notification bell has `aria-label="Notifications"`
- [ ] All interactive elements have visible focus rings
- [ ] `prefers-reduced-motion`: all animations disabled, transitions instant

### Visual Design
- [ ] Dashboard background is dark (deep purple/near-black, not white/neutral)
- [ ] Hero gradient uses the same color family as the landing page hero (#0D0620, #1E0B3E, #3B0764)
- [ ] Widget cards use frosted glass effect visually distinguishable from the dark background
- [ ] Quick Action buttons have distinct icons and are visually balanced
- [ ] Overall dashboard feels warm, calm, and encouraging — not clinical or productivity-focused
